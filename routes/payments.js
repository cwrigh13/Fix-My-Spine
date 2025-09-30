const express = require('express');
const router = express.Router();
const pool = require('../config/database').promise();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe webhook endpoint for handling payment confirmations
// This should be configured in your Stripe dashboard
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
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
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            
            // Extract business ID from payment metadata
            const businessId = paymentIntent.metadata.business_id;
            const userId = paymentIntent.metadata.user_id;
            
            if (!businessId || !userId) {
                console.error('Missing business_id or user_id in payment metadata');
                return res.status(400).json({ error: 'Missing required metadata' });
            }

            try {
                // Start a database transaction
                await pool.execute('START TRANSACTION');

                // Update the business listing to premium
                const updateResult = await pool.execute(`
                    UPDATE businesses 
                    SET listing_tier = 'premium' 
                    WHERE id = ? AND user_id = ?
                `, [businessId, userId]);

                if (updateResult[0].affectedRows === 0) {
                    throw new Error('Business not found or user mismatch');
                }

                // Record the payment in the payments table
                await pool.execute(`
                    INSERT INTO payments (user_id, business_id, stripe_payment_id, amount, payment_date)
                    VALUES (?, ?, ?, ?, NOW())
                `, [
                    userId, 
                    businessId, 
                    paymentIntent.id, 
                    paymentIntent.amount / 100 // Convert from cents to dollars
                ]);

                // Commit the transaction
                await pool.execute('COMMIT');
                
                console.log(`Successfully upgraded business ${businessId} to premium tier`);
                console.log(`Payment ${paymentIntent.id} recorded for user ${userId}`);

            } catch (dbError) {
                // Rollback the transaction on error
                await pool.execute('ROLLBACK');
                console.error('Database error during payment processing:', dbError);
                
                // Log the error but don't fail the webhook
                // Stripe will retry the webhook if we return a non-2xx status
                return res.status(500).json({ error: 'Database error' });
            }
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            
            // Log the failure but don't take any action
            // You might want to send an email notification to the user
            break;

        case 'invoice.payment_succeeded':
            const invoice = event.data.object;
            console.log('Invoice payment succeeded:', invoice.id);
            
            // Handle recurring payments if you implement subscription model
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
});

// Alternative: Payment success callback route (for redirect-based payments)
// This can be used as a fallback or for simpler payment flows
router.get('/success/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const sessionId = req.query.session_id;

        if (!sessionId) {
            return res.status(400).render('error', {
                message: 'Missing payment session information',
                error: {}
            });
        }

        // Retrieve the payment session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
            // Update the business to premium
            const updateResult = await pool.execute(`
                UPDATE businesses 
                SET listing_tier = 'premium' 
                WHERE id = ? AND is_approved = TRUE
            `, [businessId]);

            if (updateResult[0].affectedRows > 0) {
                // Record the payment
                await pool.execute(`
                    INSERT INTO payments (user_id, business_id, stripe_payment_id, amount, payment_date)
                    VALUES (?, ?, ?, ?, NOW())
                `, [
                    session.metadata.user_id,
                    businessId,
                    session.payment_intent,
                    session.amount_total / 100
                ]);

                console.log(`Successfully upgraded business ${businessId} to premium via success callback`);
                
                // Redirect to dashboard with success message
                return res.redirect('/dashboard?payment=success');
            }
        }

        // If we get here, something went wrong
        return res.redirect('/dashboard?payment=error');

    } catch (error) {
        console.error('Payment success callback error:', error);
        return res.redirect('/dashboard?payment=error');
    }
});

// Payment failure callback route
router.get('/cancel', (req, res) => {
    res.redirect('/dashboard?payment=cancelled');
});

module.exports = router;
