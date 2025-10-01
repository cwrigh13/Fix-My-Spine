const express = require('express');
const router = express.Router();
const pool = require('../config/database').promise();

// Homepage route - GET /
router.get('/', async (req, res) => {
    try {
        console.log('Loading homepage...');
        
        // Initialize with default values
        let featuredListings = [];
        let categories = [];
        let locations = [];

        // Try to fetch featured listings
        try {
            console.log('Fetching featured listings...');
            const result = await pool.execute(`
                SELECT b.*, c.name as category_name, c.slug as category_slug, 
                       l.suburb, l.state, l.postcode,
                       AVG(r.rating) as avg_rating,
                       COUNT(r.id) as review_count
                FROM businesses b
                LEFT JOIN categories c ON b.category_id = c.id
                LEFT JOIN locations l ON b.location_id = l.id
                LEFT JOIN reviews r ON b.id = r.business_id
                WHERE b.is_approved = TRUE
                GROUP BY b.id
                ORDER BY (b.listing_tier = 'premium') DESC, b.business_name ASC
                LIMIT 6
            `);
            
            if (result && Array.isArray(result) && result.length > 0) {
                featuredListings = result[0] || [];
            }
            console.log('Featured listings found:', featuredListings.length);
        } catch (listingError) {
            console.log('Error fetching listings:', listingError.message);
            featuredListings = [];
        }

        // Try to fetch categories
        try {
            console.log('Fetching categories...');
            const result = await pool.execute(`
                SELECT id, name, slug 
                FROM categories 
                ORDER BY name ASC
            `);
            
            if (result && Array.isArray(result) && result.length > 0) {
                categories = result[0] || [];
            }
            console.log('Categories found:', categories.length);
        } catch (categoryError) {
            console.log('Error fetching categories:', categoryError.message);
            categories = [
                { id: 1, name: 'Chiropractor', slug: 'chiropractor' },
                { id: 2, name: 'Physiotherapist', slug: 'physiotherapist' },
                { id: 3, name: 'Osteopath', slug: 'osteopath' },
                { id: 4, name: 'Massage Therapist', slug: 'massage-therapist' }
            ];
        }

        // Try to fetch locations
        try {
            console.log('Fetching locations...');
            const result = await pool.execute(`
                SELECT id, suburb, state, postcode 
                FROM locations 
                ORDER BY state ASC, suburb ASC
            `);
            
            if (result && Array.isArray(result) && result.length > 0) {
                locations = result[0] || [];
            }
            console.log('Locations found:', locations.length);
        } catch (locationError) {
            console.log('Error fetching locations:', locationError.message);
            locations = [
                { id: 1, suburb: 'Sydney', state: 'NSW', postcode: '2000' },
                { id: 2, suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
                { id: 3, suburb: 'Brisbane', state: 'QLD', postcode: '4000' },
                { id: 4, suburb: 'Perth', state: 'WA', postcode: '6000' }
            ];
        }

        console.log('Rendering homepage with data...');
        res.render('public/index', {
            title: 'Find Trusted Chiropractors & Allied Health Professionals | FixMySpine',
            featuredListings,
            categories,
            locations
        });
    } catch (error) {
        console.error('Critical error in homepage route:', error);
        res.status(500).render('error', { 
            message: 'Unable to load homepage data',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Search functionality - GET /search
router.get('/search', async (req, res) => {
    try {
        const { keyword, category, location } = req.query;
        
        // Build dynamic SQL query
        let sql = `
            SELECT b.*, c.name as category_name, c.slug as category_slug,
                   l.suburb, l.state, l.postcode,
                   AVG(r.rating) as avg_rating,
                   COUNT(r.id) as review_count
            FROM businesses b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN locations l ON b.location_id = l.id
            LEFT JOIN reviews r ON b.id = r.business_id
            WHERE b.is_approved = TRUE
        `;
        
        const params = [];
        
        // Add keyword search
        if (keyword && keyword.trim()) {
            sql += ` AND (b.business_name LIKE ? OR b.description LIKE ?)`;
            const searchTerm = `%${keyword.trim()}%`;
            params.push(searchTerm, searchTerm);
        }
        
        // Add category filter
        if (category && category !== '') {
            sql += ` AND b.category_id = ?`;
            params.push(category);
        }
        
        // Add location filter
        if (location && location !== '') {
            sql += ` AND b.location_id = ?`;
            params.push(location);
        }
        
        sql += ` GROUP BY b.id ORDER BY (b.listing_tier = 'premium') DESC, b.business_name ASC`;
        
        const [listings] = await pool.execute(sql, params);
        
        // Get search form data
        const [categories] = await pool.execute(`
            SELECT id, name, slug 
            FROM categories 
            ORDER BY name ASC
        `);
        
        const [locations] = await pool.execute(`
            SELECT id, suburb, state, postcode 
            FROM locations 
            ORDER BY state ASC, suburb ASC
        `);
        
        res.render('public/search-results', {
            title: `Search Results${keyword ? ` for "${keyword}"` : ''} | FixMySpine`,
            listings,
            categories,
            locations,
            searchParams: { keyword, category, location }
        });
    } catch (error) {
        console.error('Error performing search:', error);
        res.status(500).render('error', { 
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Category page - GET /category/:slug
router.get('/category/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Get category details
        const [categoryRows] = await pool.execute(`
            SELECT id, name, slug 
            FROM categories 
            WHERE slug = ?
        `, [slug]);
        
        if (categoryRows.length === 0) {
            return res.status(404).render('error', { 
                message: 'Category not found',
                error: {}
            });
        }
        
        const category = categoryRows[0];
        
        // Get all approved businesses in this category
        const [listings] = await pool.execute(`
            SELECT b.*, c.name as category_name, c.slug as category_slug,
                   l.suburb, l.state, l.postcode,
                   AVG(r.rating) as avg_rating,
                   COUNT(r.id) as review_count
            FROM businesses b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN locations l ON b.location_id = l.id
            LEFT JOIN reviews r ON b.id = r.business_id
            WHERE b.is_approved = TRUE AND b.category_id = ?
            GROUP BY b.id
            ORDER BY (b.listing_tier = 'premium') DESC, b.business_name ASC
        `, [category.id]);
        
        // Get search form data
        const [categories] = await pool.execute(`
            SELECT id, name, slug 
            FROM categories 
            ORDER BY name ASC
        `);
        
        const [locations] = await pool.execute(`
            SELECT id, suburb, state, postcode 
            FROM locations 
            ORDER BY state ASC, suburb ASC
        `);
        
        res.render('public/search-results', {
            title: `Best ${category.name}s in Australia | FixMySpine`,
            listings,
            categories,
            locations,
            categoryName: category.name,
            searchParams: { category: category.id }
        });
    } catch (error) {
        console.error('Error fetching category page:', error);
        res.status(500).render('error', { 
            message: 'Unable to load category page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Location page - GET /location/:suburb
router.get('/location/:suburb', async (req, res) => {
    try {
        const { suburb } = req.params;
        
        // Get location details
        const [locationRows] = await pool.execute(`
            SELECT id, suburb, state, postcode 
            FROM locations 
            WHERE suburb = ?
        `, [suburb]);
        
        if (locationRows.length === 0) {
            return res.status(404).render('error', { 
                message: 'Location not found',
                error: {}
            });
        }
        
        const location = locationRows[0];
        
        // Get all approved businesses in this location
        const [listings] = await pool.execute(`
            SELECT b.*, c.name as category_name, c.slug as category_slug,
                   l.suburb, l.state, l.postcode,
                   AVG(r.rating) as avg_rating,
                   COUNT(r.id) as review_count
            FROM businesses b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN locations l ON b.location_id = l.id
            LEFT JOIN reviews r ON b.id = r.business_id
            WHERE b.is_approved = TRUE AND b.location_id = ?
            GROUP BY b.id
            ORDER BY (b.listing_tier = 'premium') DESC, b.business_name ASC
        `, [location.id]);
        
        // Get search form data
        const [categories] = await pool.execute(`
            SELECT id, name, slug 
            FROM categories 
            ORDER BY name ASC
        `);
        
        const [locations] = await pool.execute(`
            SELECT id, suburb, state, postcode 
            FROM locations 
            ORDER BY state ASC, suburb ASC
        `);
        
        res.render('public/search-results', {
            title: `Best Health Professionals in ${location.suburb}, ${location.state} | FixMySpine`,
            listings,
            categories,
            locations,
            locationName: `${location.suburb}, ${location.state}`,
            searchParams: { location: location.id }
        });
    } catch (error) {
        console.error('Error fetching location page:', error);
        res.status(500).render('error', { 
            message: 'Unable to load location page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// Individual listing page - GET /listing/:id/:slug
router.get('/listing/:id/:slug', async (req, res) => {
    try {
        const { id, slug } = req.params;
        
        console.log(`Fetching listing details for ID: ${id}, slug: ${slug}`);
        
        // Get business details with category and location info
        const businessResult = await pool.execute(`
            SELECT b.*, c.name as category_name, c.slug as category_slug,
                   l.suburb, l.state, l.postcode,
                   AVG(r.rating) as avg_rating,
                   COUNT(r.id) as review_count
            FROM businesses b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN locations l ON b.location_id = l.id
            LEFT JOIN reviews r ON b.id = r.business_id
            WHERE b.id = ? AND b.is_approved = TRUE
            GROUP BY b.id
        `, [id]);
        
        let businessRows = [];
        if (businessResult && Array.isArray(businessResult) && businessResult.length > 0) {
            businessRows = businessResult[0] || [];
        }
        
        console.log(`Business rows found: ${businessRows.length}`);
        
        if (businessRows.length === 0) {
            return res.status(404).render('error', { 
                message: 'Listing not found',
                error: {}
            });
        }
        
        const business = businessRows[0];
        console.log(`Found business: ${business.business_name}`);
        
        // Get all approved reviews for this business
        const reviewsResult = await pool.execute(`
            SELECT * FROM reviews 
            WHERE business_id = ? 
            ORDER BY created_at DESC
        `, [id]);
        
        let reviews = [];
        if (reviewsResult && Array.isArray(reviewsResult) && reviewsResult.length > 0) {
            reviews = reviewsResult[0] || [];
        }
        
        console.log(`Reviews found: ${reviews.length}`);
        
        res.render('public/listing-detail', {
            title: `${business.business_name} - ${business.category_name} in ${business.suburb}, ${business.state} | FixMySpine`,
            business,
            reviews
        });
    } catch (error) {
        console.error('Error fetching listing details:', error);
        res.status(500).render('error', { 
            message: 'Unable to load listing details',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

// About page - GET /about
router.get('/about', (req, res) => {
    res.render('public/about', {
        title: 'About Us - Our Mission | FixMySpine'
    });
});

// Contact page - GET /contact
router.get('/contact', (req, res) => {
    res.render('public/contact', {
        title: 'Contact Us | FixMySpine'
    });
});

// Pricing page - GET /pricing
router.get('/pricing', (req, res) => {
    // Check if user has already provided email (stored in session)
    const hasEmailAccess = req.session.pricingEmailAccess || false;
    
    res.render('public/pricing', {
        title: 'Pricing - List Your Practice | FixMySpine',
        hasEmailAccess: hasEmailAccess,
        email: req.session.pricingEmail || ''
    });
});

// Pricing page - POST /pricing (email submission)
router.post('/pricing', (req, res) => {
    const { email, reset_access } = req.body;
    
    // Handle reset access request
    if (reset_access) {
        req.session.pricingEmailAccess = false;
        req.session.pricingEmail = '';
        return res.render('public/pricing', {
            title: 'Pricing - List Your Practice | FixMySpine',
            hasEmailAccess: false,
            email: ''
        });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
        return res.render('public/pricing', {
            title: 'Pricing - List Your Practice | FixMySpine',
            hasEmailAccess: false,
            email: email || '',
            error: 'Please enter a valid email address'
        });
    }
    
    // Store email in session to grant access
    req.session.pricingEmailAccess = true;
    req.session.pricingEmail = email;
    
    res.render('public/pricing', {
        title: 'Pricing - List Your Practice | FixMySpine',
        hasEmailAccess: true,
        email: email
    });
});

// Terms of Service page - GET /terms-of-service
router.get('/terms-of-service', (req, res) => {
    res.render('public/terms-of-service', {
        title: 'Terms of Service | FixMySpine'
    });
});

// Privacy Policy page - GET /privacy-policy
router.get('/privacy-policy', (req, res) => {
    res.render('public/privacy-policy', {
        title: 'Privacy Policy | FixMySpine'
    });
});

module.exports = router;
