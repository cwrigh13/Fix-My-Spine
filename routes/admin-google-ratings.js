/**
 * Admin Routes for Google Maps Rating Management
 */

const express = require('express');
const router = express.Router();
const GoogleMapsService = require('../services/googleMapsService');

// Middleware to require admin authentication
const requireAdmin = (req, res, next) => {
    if (req.session.adminUser) {
        return next();
    } else {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/admin/login');
    }
};

// GET /admin/google-ratings - Google Maps ratings management page
router.get('/', requireAdmin, async (req, res) => {
    try {
        const googleMapsService = new GoogleMapsService();
        
        // Get businesses with Google rating data
        const businesses = await googleMapsService.getBusinessesWithGoogleRatings();
        
        // Calculate statistics
        const stats = {
            total: businesses.length,
            withGoogleRatings: businesses.filter(b => b.google_rating).length,
            withoutGoogleRatings: businesses.filter(b => !b.google_rating).length,
            averageGoogleRating: businesses
                .filter(b => b.google_rating)
                .reduce((sum, b) => sum + b.google_rating, 0) / 
                businesses.filter(b => b.google_rating).length || 0
        };

        res.render('admin/google-ratings', {
            title: 'Google Maps Ratings Management',
            adminUser: req.session.adminUser,
            businesses: businesses,
            stats: stats,
            apiKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
            error: req.session.error || null,
            success: req.session.success || null
        });

        // Clear session messages
        if (req.session.error) delete req.session.error;
        if (req.session.success) delete req.session.success;

    } catch (error) {
        console.error('Error loading Google ratings admin page:', error);
        res.render('admin/google-ratings', {
            title: 'Google Maps Ratings Management',
            adminUser: req.session.adminUser,
            businesses: [],
            stats: { total: 0, withGoogleRatings: 0, withoutGoogleRatings: 0, averageGoogleRating: 0 },
            apiKeyConfigured: false,
            error: 'Error loading Google ratings data'
        });
    }
});

// POST /admin/google-ratings/update-all - Update all business ratings
router.post('/update-all', requireAdmin, async (req, res) => {
    try {
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            req.session.error = 'Google Maps API key not configured. Please add GOOGLE_MAPS_API_KEY to your .env file.';
            return res.redirect('/admin/google-ratings');
        }

        const googleMapsService = new GoogleMapsService();
        const limit = req.body.limit ? parseInt(req.body.limit) : null;
        
        console.log(`Admin requested Google ratings update${limit ? ` (limit: ${limit})` : ''}`);
        
        // Run the update process
        const results = await googleMapsService.processAllBusinesses(limit);
        
        req.session.success = `Successfully updated ${results.success} businesses. ${results.failed} failed, ${results.skipped} skipped.`;
        
    } catch (error) {
        console.error('Error updating Google ratings:', error);
        req.session.error = 'Error updating Google ratings: ' + error.message;
    }
    
    res.redirect('/admin/google-ratings');
});

// POST /admin/google-ratings/update-business - Update specific business rating
router.post('/update-business', requireAdmin, async (req, res) => {
    try {
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            req.session.error = 'Google Maps API key not configured.';
            return res.redirect('/admin/google-ratings');
        }

        const businessId = parseInt(req.body.businessId);
        if (!businessId) {
            req.session.error = 'Invalid business ID provided.';
            return res.redirect('/admin/google-ratings');
        }

        const googleMapsService = new GoogleMapsService();
        
        // Get business details
        const mysql = require('mysql2/promise');
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'fixmyspine_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const connection = await pool.getConnection();
        const [businesses] = await connection.execute(`
            SELECT id, business_name, address, phone, google_place_id, google_last_updated
            FROM businesses 
            WHERE id = ? AND is_approved = TRUE
        `, [businessId]);

        connection.release();
        await pool.end();

        if (businesses.length === 0) {
            req.session.error = 'Business not found or not approved.';
            return res.redirect('/admin/google-ratings');
        }

        const business = businesses[0];
        const success = await googleMapsService.processBusiness(business);
        
        if (success) {
            req.session.success = `Successfully updated Google rating for ${business.business_name}.`;
        } else {
            req.session.error = `Failed to update Google rating for ${business.business_name}.`;
        }
        
    } catch (error) {
        console.error('Error updating business Google rating:', error);
        req.session.error = 'Error updating business rating: ' + error.message;
    }
    
    res.redirect('/admin/google-ratings');
});

// POST /admin/google-ratings/clear-cache - Clear Google rating cache for a business
router.post('/clear-cache', requireAdmin, async (req, res) => {
    try {
        const businessId = parseInt(req.body.businessId);
        if (!businessId) {
            req.session.error = 'Invalid business ID provided.';
            return res.redirect('/admin/google-ratings');
        }

        const mysql = require('mysql2/promise');
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'fixmyspine_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const connection = await pool.getConnection();
        
        // Clear Google rating data to force refresh
        await connection.execute(`
            UPDATE businesses 
            SET google_place_id = NULL, 
                google_rating = NULL, 
                google_review_count = NULL, 
                google_last_updated = NULL
            WHERE id = ?
        `, [businessId]);

        connection.release();
        await pool.end();

        req.session.success = 'Google rating cache cleared. Next update will fetch fresh data.';
        
    } catch (error) {
        console.error('Error clearing Google rating cache:', error);
        req.session.error = 'Error clearing cache: ' + error.message;
    }
    
    res.redirect('/admin/google-ratings');
});

module.exports = router;
