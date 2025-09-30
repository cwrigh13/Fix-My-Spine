const express = require('express');
const pool = require('../config/database').promise();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Stripe webhook endpoint for handling subscription events
// This should be configured in your Stripe dashboard as /stripe-webhook
router.post('/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify the webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event.data.object);
            break;

        case 'invoice.payment_succeeded':
            await handleInvoicePaymentSucceeded(event.data.object);
            break;

        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object);
            break;

        case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object);
            break;

        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
});

// Handle successful checkout session completion (initial subscription creation)
async function handleCheckoutSessionCompleted(session) {
    try {
        console.log('Processing checkout.session.completed:', session.id);

        // Extract business_id from session metadata
        const businessId = session.metadata?.business_id;
        const userId = session.metadata?.user_id;

        if (!businessId || !userId) {
            console.error('Missing business_id or user_id in session metadata');
            return;
        }

        // Retrieve the subscription
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // Calculate subscription end date (1 year from now)
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

        // Start database transaction
        await pool.execute('START TRANSACTION');

        // Update the business listing to premium
        const updateResult = await pool.execute(`
            UPDATE businesses 
            SET 
                listing_tier = 'premium',
                stripe_subscription_id = ?,
                subscription_status = 'active',
                subscription_ends_at = ?
            WHERE id = ? AND user_id = ?
        `, [
            subscription.id,
            subscriptionEndDate,
            businessId,
            userId
        ]);

        if (updateResult[0].affectedRows === 0) {
            throw new Error('Business not found or user mismatch');
        }

        // Log the subscription event
        await pool.execute(`
            INSERT INTO subscription_events (business_id, event_type, stripe_event_id, event_data, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [
            businessId,
            'subscription.created',
            session.id,
            JSON.stringify({
                subscription_id: subscription.id,
                customer_id: subscription.customer,
                amount: subscription.items.data[0].price.unit_amount,
                currency: subscription.currency
            })
        ]);

        // Commit the transaction
        await pool.execute('COMMIT');
        
        console.log(`Successfully activated subscription ${subscription.id} for business ${businessId}`);

    } catch (error) {
        // Rollback the transaction on error
        await pool.execute('ROLLBACK');
        console.error('Error processing checkout.session.completed:', error);
        throw error;
    }
}

// Handle successful recurring payment
async function handleInvoicePaymentSucceeded(invoice) {
    try {
        console.log('Processing invoice.payment_succeeded:', invoice.id);

        if (!invoice.subscription) {
            console.log('Invoice is not associated with a subscription, skipping');
            return;
        }

        // Find the business by subscription ID
        const [businesses] = await pool.execute(
            'SELECT id, user_id FROM businesses WHERE stripe_subscription_id = ?',
            [invoice.subscription]
        );

        if (businesses.length === 0) {
            console.error(`No business found with subscription ID: ${invoice.subscription}`);
            return;
        }

        const business = businesses[0];

        // Calculate new subscription end date (1 year from now)
        const newSubscriptionEndDate = new Date();
        newSubscriptionEndDate.setFullYear(newSubscriptionEndDate.getFullYear() + 1);

        // Update subscription end date
        await pool.execute(`
            UPDATE businesses 
            SET subscription_ends_at = ?
            WHERE stripe_subscription_id = ?
        `, [newSubscriptionEndDate, invoice.subscription]);

        // Log the renewal event
        await pool.execute(`
            INSERT INTO subscription_events (business_id, event_type, stripe_event_id, event_data, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [
            business.id,
            'subscription.renewed',
            invoice.id,
            JSON.stringify({
                subscription_id: invoice.subscription,
                amount: invoice.amount_paid,
                currency: invoice.currency
            })
        ]);

        console.log(`Successfully renewed subscription ${invoice.subscription} for business ${business.id}`);

    } catch (error) {
        console.error('Error processing invoice.payment_succeeded:', error);
        throw error;
    }
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription) {
    try {
        console.log('Processing customer.subscription.deleted:', subscription.id);

        // Find the business by subscription ID
        const [businesses] = await pool.execute(
            'SELECT id, user_id FROM businesses WHERE stripe_subscription_id = ?',
            [subscription.id]
        );

        if (businesses.length === 0) {
            console.error(`No business found with subscription ID: ${subscription.id}`);
            return;
        }

        const business = businesses[0];

        // Update subscription status to cancelled
        // Note: We keep the listing as premium until the end of the billing period
        await pool.execute(`
            UPDATE businesses 
            SET subscription_status = 'cancelled'
            WHERE stripe_subscription_id = ?
        `, [subscription.id]);

        // Log the cancellation event
        await pool.execute(`
            INSERT INTO subscription_events (business_id, event_type, stripe_event_id, event_data, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [
            business.id,
            'subscription.cancelled',
            subscription.id,
            JSON.stringify({
                subscription_id: subscription.id,
                cancelled_at: subscription.canceled_at,
                cancel_at_period_end: subscription.cancel_at_period_end
            })
        ]);

        console.log(`Successfully cancelled subscription ${subscription.id} for business ${business.id}`);

    } catch (error) {
        console.error('Error processing customer.subscription.deleted:', error);
        throw error;
    }
}

// Handle failed payment
async function handleInvoicePaymentFailed(invoice) {
    try {
        console.log('Processing invoice.payment_failed:', invoice.id);

        if (!invoice.subscription) {
            console.log('Invoice is not associated with a subscription, skipping');
            return;
        }

        // Find the business by subscription ID
        const [businesses] = await pool.execute(
            'SELECT id, user_id FROM businesses WHERE stripe_subscription_id = ?',
            [invoice.subscription]
        );

        if (businesses.length === 0) {
            console.error(`No business found with subscription ID: ${invoice.subscription}`);
            return;
        }

        const business = businesses[0];

        // Update subscription status to past_due
        await pool.execute(`
            UPDATE businesses 
            SET subscription_status = 'past_due'
            WHERE stripe_subscription_id = ?
        `, [invoice.subscription]);

        // Log the payment failure event
        await pool.execute(`
            INSERT INTO subscription_events (business_id, event_type, stripe_event_id, event_data, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [
            business.id,
            'payment.failed',
            invoice.id,
            JSON.stringify({
                subscription_id: invoice.subscription,
                amount: invoice.amount_due,
                currency: invoice.currency,
                failure_reason: invoice.last_payment_error?.message
            })
        ]);

        // TODO: Send notification email to user about failed payment
        console.log(`Payment failed for subscription ${invoice.subscription} for business ${business.id}`);

    } catch (error) {
        console.error('Error processing invoice.payment_failed:', error);
        throw error;
    }
}

// Handle subscription updates (e.g., plan changes)
async function handleSubscriptionUpdated(subscription) {
    try {
        console.log('Processing customer.subscription.updated:', subscription.id);

        // Find the business by subscription ID
        const [businesses] = await pool.execute(
            'SELECT id FROM businesses WHERE stripe_subscription_id = ?',
            [subscription.id]
        );

        if (businesses.length === 0) {
            console.error(`No business found with subscription ID: ${subscription.id}`);
            return;
        }

        const business = businesses[0];

        // Update subscription status based on Stripe status
        let subscriptionStatus = 'active';
        if (subscription.status === 'canceled') {
            subscriptionStatus = 'cancelled';
        } else if (subscription.status === 'past_due') {
            subscriptionStatus = 'past_due';
        } else if (subscription.status === 'unpaid') {
            subscriptionStatus = 'past_due';
        }

        await pool.execute(`
            UPDATE businesses 
            SET subscription_status = ?
            WHERE stripe_subscription_id = ?
        `, [subscriptionStatus, subscription.id]);

        // Log the subscription update event
        await pool.execute(`
            INSERT INTO subscription_events (business_id, event_type, stripe_event_id, event_data, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `, [
            business.id,
            'subscription.updated',
            subscription.id,
            JSON.stringify({
                subscription_id: subscription.id,
                status: subscription.status,
                current_period_end: subscription.current_period_end
            })
        ]);

        console.log(`Successfully updated subscription ${subscription.id} status to ${subscriptionStatus}`);

    } catch (error) {
        console.error('Error processing customer.subscription.updated:', error);
        throw error;
    }
}

module.exports = router;
