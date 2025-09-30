const express = require('express');
const pool = require('../config/database').promise();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

// Apply requireLogin middleware to all routes in this router
router.use(requireLogin);

// GET /subscriptions/create - Create a new annual subscription
router.post('/create', async (req, res) => {
    const { business_id } = req.body;
    
    if (!business_id) {
        return res.status(400).json({ error: 'Business ID is required' });
    }

    try {
        // Verify the business belongs to the logged-in user
        const [businesses] = await pool.execute(
            'SELECT * FROM businesses WHERE id = ? AND user_id = ?',
            [business_id, req.session.userId]
        );

        if (businesses.length === 0) {
            return res.status(403).json({ error: 'Business not found or access denied' });
        }

        const business = businesses[0];

        // Check if business already has an active subscription
        if (business.subscription_status === 'active') {
            return res.status(400).json({ error: 'Business already has an active subscription' });
        }

        // Get user information for Stripe customer
        const [users] = await pool.execute(
            'SELECT name, email FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Create or retrieve Stripe customer
        let customer;
        try {
            const existingCustomers = await stripe.customers.list({
                email: user.email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
            } else {
                customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name,
                    metadata: {
                        user_id: req.session.userId.toString()
                    }
                });
            }
        } catch (stripeError) {
            console.error('Stripe customer creation error:', stripeError);
            return res.status(500).json({ error: 'Failed to create customer' });
        }

        // Create Stripe checkout session for subscription
        // You'll need to create a price in your Stripe dashboard for annual premium listing
        // Replace 'price_XXXXXXXXXXXXXX' with your actual Stripe price ID
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_ANNUAL_PRICE_ID, // Set this in your .env file
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.protocol}://${req.get('host')}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.protocol}://${req.get('host')}/dashboard/subscription/cancel`,
            metadata: {
                business_id: business_id.toString(),
                user_id: req.session.userId.toString()
            },
            subscription_data: {
                metadata: {
                    business_id: business_id.toString(),
                    user_id: req.session.userId.toString()
                }
            }
        });

        res.json({ 
            sessionId: session.id,
            url: session.url 
        });

    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// GET /subscriptions/success - Handle successful subscription creation
router.get('/success', async (req, res) => {
    try {
        const sessionId = req.query.session_id;

        if (!sessionId) {
            return res.status(400).render('error', {
                message: 'Missing payment session information',
                error: {}
            });
        }

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
            // Get the subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            
            // Extract business_id from metadata
            const businessId = session.metadata.business_id;
            
            if (!businessId) {
                console.error('Missing business_id in session metadata');
                return res.status(400).render('error', {
                    message: 'Invalid payment session',
                    error: {}
                });
            }

            // Update the business with subscription information
            const subscriptionEndDate = new Date();
            subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

            await pool.execute(`
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
                req.session.userId
            ]);

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

            console.log(`Successfully created subscription ${subscription.id} for business ${businessId}`);
            
            // Redirect to dashboard with success message
            req.session.successMessage = 'Your annual premium subscription has been activated successfully!';
            return res.redirect('/dashboard');
        }

        // If we get here, something went wrong
        return res.redirect('/dashboard?subscription=error');

    } catch (error) {
        console.error('Subscription success callback error:', error);
        return res.redirect('/dashboard?subscription=error');
    }
});

// GET /subscriptions/cancel - Handle subscription cancellation
router.get('/cancel', (req, res) => {
    res.redirect('/dashboard?subscription=cancelled');
});

// GET /subscriptions/portal - Create customer portal session
router.get('/portal', async (req, res) => {
    try {
        // Get user information
        const [users] = await pool.execute(
            'SELECT email FROM users WHERE id = ?',
            [req.session.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Find the Stripe customer
        const customers = await stripe.customers.list({
            email: user.email,
            limit: 1
        });

        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'No subscription found' });
        }

        const customer = customers.data[0];

        // Create customer portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: `${req.protocol}://${req.get('host')}/dashboard`,
        });

        res.redirect(portalSession.url);

    } catch (error) {
        console.error('Customer portal error:', error);
        res.status(500).render('error', {
            message: 'Failed to access billing portal',
            error: { status: 500 }
        });
    }
});

// GET /subscriptions/status - Get subscription status for a business
router.get('/status/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;

        // Verify the business belongs to the logged-in user
        const [businesses] = await pool.execute(
            'SELECT id, listing_tier, subscription_status, subscription_ends_at, stripe_subscription_id FROM businesses WHERE id = ? AND user_id = ?',
            [businessId, req.session.userId]
        );

        if (businesses.length === 0) {
            return res.status(403).json({ error: 'Business not found or access denied' });
        }

        const business = businesses[0];

        res.json({
            business_id: business.id,
            listing_tier: business.listing_tier,
            subscription_status: business.subscription_status,
            subscription_ends_at: business.subscription_ends_at,
            has_subscription: !!business.stripe_subscription_id
        });

    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

module.exports = router;
