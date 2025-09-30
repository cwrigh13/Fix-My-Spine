const express = require('express');
const pool = require('../config/database');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

// Apply requireLogin middleware to all routes in this router
router.use(requireLogin);

// GET / - Main dashboard view showing user's listings
router.get('/', async (req, res) => {
    try {
        // Query the businesses table for all listings belonging to the logged-in user
        const [listings] = await pool.execute(`
            SELECT 
                b.id,
                b.business_name,
                b.address,
                b.phone,
                b.website,
                b.description,
                b.listing_tier,
                b.is_approved,
                b.created_at,
                c.name as category_name,
                l.suburb,
                l.postcode,
                l.state
            FROM businesses b
            JOIN categories c ON b.category_id = c.id
            JOIN locations l ON b.location_id = l.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [req.session.userId]);

        // Get success message from session and clear it
        const successMessage = req.session.successMessage;
        delete req.session.successMessage;

        res.render('dashboard/index', {
            title: 'Dashboard - Fix My Spine',
            listings: listings,
            successMessage: successMessage,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', {
            message: 'An error occurred while loading your dashboard',
            error: { status: 500 }
        });
    }
});

// GET /submit - Show form to submit new listing
router.get('/submit', async (req, res) => {
    try {
        // Fetch all categories and locations for the form dropdowns
        const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
        const [locations] = await pool.execute('SELECT id, suburb, postcode, state FROM locations ORDER BY suburb, state');

        res.render('dashboard/submit', {
            title: 'Submit New Listing - Fix My Spine',
            categories: categories,
            locations: locations,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            }
        });
    } catch (error) {
        console.error('Submit form error:', error);
        res.status(500).render('error', {
            message: 'An error occurred while loading the submission form',
            error: { status: 500 }
        });
    }
});

// POST /submit - Handle new listing submission
router.post('/submit', async (req, res) => {
    const { 
        business_name, 
        category_id, 
        location_id, 
        address, 
        phone, 
        website, 
        description, 
        listing_tier 
    } = req.body;

    try {
        // Validate required fields
        if (!business_name || !category_id || !location_id) {
            // Re-fetch categories and locations for form re-rendering
            const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
            const [locations] = await pool.execute('SELECT id, suburb, postcode, state FROM locations ORDER BY suburb, state');
            
            return res.render('dashboard/submit', {
                title: 'Submit New Listing - Fix My Spine',
                categories: categories,
                locations: locations,
                error: 'Business name, category, and location are required',
                formData: req.body,
                user: {
                    id: req.session.userId,
                    name: req.session.userName,
                    email: req.session.userEmail
                }
            });
        }

        // Insert new business listing
        await pool.execute(`
            INSERT INTO businesses 
            (user_id, category_id, location_id, business_name, address, phone, website, description, listing_tier, is_approved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.session.userId,
            category_id,
            location_id,
            business_name,
            address || null,
            phone || null,
            website || null,
            description || null,
            listing_tier || 'free',
            false // New listings are not approved by default
        ]);

        // Redirect to dashboard with success message
        req.session.successMessage = 'Your listing has been submitted successfully! It will be reviewed before being published.';
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Submit listing error:', error);
        
        // Re-fetch categories and locations for form re-rendering
        const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
        const [locations] = await pool.execute('SELECT id, suburb, postcode, state FROM locations ORDER BY suburb, state');
        
        res.render('dashboard/submit', {
            title: 'Submit New Listing - Fix My Spine',
            categories: categories,
            locations: locations,
            error: 'An error occurred while submitting your listing. Please try again.',
            formData: req.body,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            }
        });
    }
});

// GET /listings/:id/edit - Show edit form for a specific listing
router.get('/listings/:id/edit', async (req, res) => {
    const listingId = req.params.id;

    try {
        // First verify that the listing belongs to the logged-in user
        const [listings] = await pool.execute(
            'SELECT * FROM businesses WHERE id = ? AND user_id = ?',
            [listingId, req.session.userId]
        );

        if (listings.length === 0) {
            return res.status(403).render('error', {
                message: 'Forbidden - You can only edit your own listings',
                error: { status: 403 }
            });
        }

        const listing = listings[0];

        // Fetch all categories and locations for the form dropdowns
        const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
        const [locations] = await pool.execute('SELECT id, suburb, postcode, state FROM locations ORDER BY suburb, state');

        res.render('dashboard/edit', {
            title: 'Edit Listing - Fix My Spine',
            listing: listing,
            categories: categories,
            locations: locations,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            }
        });

    } catch (error) {
        console.error('Edit listing error:', error);
        res.status(500).render('error', {
            message: 'An error occurred while loading the edit form',
            error: { status: 500 }
        });
    }
});

// POST /listings/:id/edit - Handle listing update
router.post('/listings/:id/edit', async (req, res) => {
    const listingId = req.params.id;
    const { 
        business_name, 
        category_id, 
        location_id, 
        address, 
        phone, 
        website, 
        description, 
        listing_tier 
    } = req.body;

    try {
        // First verify that the listing belongs to the logged-in user
        const [listings] = await pool.execute(
            'SELECT * FROM businesses WHERE id = ? AND user_id = ?',
            [listingId, req.session.userId]
        );

        if (listings.length === 0) {
            return res.status(403).render('error', {
                message: 'Forbidden - You can only edit your own listings',
                error: { status: 403 }
            });
        }

        // Validate required fields
        if (!business_name || !category_id || !location_id) {
            // Re-fetch data for form re-rendering
            const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
            const [locations] = await pool.execute('SELECT id, suburb, postcode, state FROM locations ORDER BY suburb, state');
            
            return res.render('dashboard/edit', {
                title: 'Edit Listing - Fix My Spine',
                listing: { ...listings[0], ...req.body },
                categories: categories,
                locations: locations,
                error: 'Business name, category, and location are required',
                user: {
                    id: req.session.userId,
                    name: req.session.userName,
                    email: req.session.userEmail
                }
            });
        }

        // Update the business listing
        await pool.execute(`
            UPDATE businesses 
            SET category_id = ?, location_id = ?, business_name = ?, address = ?, 
                phone = ?, website = ?, description = ?, listing_tier = ?
            WHERE id = ? AND user_id = ?
        `, [
            category_id,
            location_id,
            business_name,
            address || null,
            phone || null,
            website || null,
            description || null,
            listing_tier || 'free',
            listingId,
            req.session.userId
        ]);

        // Redirect to dashboard with success message
        req.session.successMessage = 'Your listing has been updated successfully!';
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Update listing error:', error);
        
        // Re-fetch data for form re-rendering
        const [categories] = await pool.execute('SELECT id, name FROM categories ORDER BY name');
        const [locations] = await pool.execute('SELECT id, suburb, postcode, state FROM locations ORDER BY suburb, state');
        
        res.render('dashboard/edit', {
            title: 'Edit Listing - Fix My Spine',
            listing: { ...req.body, id: listingId },
            categories: categories,
            locations: locations,
            error: 'An error occurred while updating your listing. Please try again.',
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            }
        });
    }
});

// POST /listings/:id/delete - Handle listing deletion
router.post('/listings/:id/delete', async (req, res) => {
    const listingId = req.params.id;

    try {
        // First verify that the listing belongs to the logged-in user
        const [listings] = await pool.execute(
            'SELECT * FROM businesses WHERE id = ? AND user_id = ?',
            [listingId, req.session.userId]
        );

        if (listings.length === 0) {
            return res.status(403).render('error', {
                message: 'Forbidden - You can only delete your own listings',
                error: { status: 403 }
            });
        }

        // Delete the business listing
        await pool.execute(
            'DELETE FROM businesses WHERE id = ? AND user_id = ?',
            [listingId, req.session.userId]
        );

        // Redirect to dashboard with success message
        req.session.successMessage = 'Your listing has been deleted successfully!';
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).render('error', {
            message: 'An error occurred while deleting your listing',
            error: { status: 500 }
        });
    }
});

module.exports = router;
