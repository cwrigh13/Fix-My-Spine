const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

        console.log('Rendering homepage with data...');
        res.render('public/index', {
            title: 'Find Trusted Chiropractors & Allied Health Professionals | Fix My Spine',
            description: 'Your trusted directory for Chiropractors, Physiotherapists, and more in Australia. Search by location, specialty, and read verified patient reviews.',
            featuredListings,
            categories
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
        const { keyword, category, postcode } = req.query;
        
        // Initialize variables for proximity search
        let searchLat = null;
        let searchLng = null;
        let locationName = null;
        
        // If postcode is provided, look up its coordinates
        if (postcode && postcode.trim() && /^\d{4}$/.test(postcode.trim())) {
            const [locationResult] = await pool.execute(
                `SELECT suburb, state, latitude, longitude 
                 FROM locations 
                 WHERE postcode = ? AND latitude IS NOT NULL AND longitude IS NOT NULL
                 LIMIT 1`,
                [postcode.trim()]
            );
            
            if (locationResult.length > 0) {
                searchLat = locationResult[0].latitude;
                searchLng = locationResult[0].longitude;
                locationName = `${locationResult[0].suburb}, ${locationResult[0].state}`;
            }
        }
        
        // Build dynamic SQL query with distance calculation
        let sql = `
            SELECT b.*, c.name as category_name, c.slug as category_slug,
                   l.suburb, l.state, l.postcode,
                   l.latitude, l.longitude,
                   AVG(r.rating) as avg_rating,
                   COUNT(r.id) as review_count`;
        
        // Add distance calculation if we have search coordinates
        if (searchLat !== null && searchLng !== null) {
            sql += `,
                   (6371 * acos(
                       cos(radians(?)) * cos(radians(l.latitude)) * 
                       cos(radians(l.longitude) - radians(?)) + 
                       sin(radians(?)) * sin(radians(l.latitude))
                   )) AS distance_km`;
        }
        
        sql += `
            FROM businesses b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN locations l ON b.location_id = l.id
            LEFT JOIN reviews r ON b.id = r.business_id
            WHERE b.is_approved = TRUE`;
        
        const params = [];
        
        // Add distance parameters if applicable
        if (searchLat !== null && searchLng !== null) {
            params.push(searchLat, searchLng, searchLat);
        }
        
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
        
        // Group by business
        sql += ` GROUP BY b.id`;
        
        // Order by proximity if we have coordinates, otherwise by premium tier and name
        if (searchLat !== null && searchLng !== null) {
            sql += ` ORDER BY (b.listing_tier = 'premium') DESC, distance_km ASC`;
        } else {
            sql += ` ORDER BY (b.listing_tier = 'premium') DESC, b.business_name ASC`;
        }
        
        const [listings] = await pool.execute(sql, params);
        
        // Get search form data
        const [categories] = await pool.execute(`
            SELECT id, name, slug 
            FROM categories 
            ORDER BY name ASC
        `);
        
        // Get category name if category filter is applied
        let categoryName = null;
        if (category && category !== '') {
            const [categoryResult] = await pool.execute(
                'SELECT name FROM categories WHERE id = ?',
                [category]
            );
            if (categoryResult.length > 0) {
                categoryName = categoryResult[0].name;
            }
        }

        // Construct SEO-optimized title and description for search results
        let searchTitle = 'Search Results';
        if (postcode && locationName) {
            searchTitle = `Practitioners near ${locationName} (${postcode})`;
        } else if (keyword) {
            searchTitle = `Search Results for "${keyword}"`;
        }
        searchTitle += ' | Fix My Spine';
        
        const searchDescription = keyword 
            ? `Find trusted healthcare professionals for "${keyword}". Read reviews, compare practitioners, and book appointments with verified specialists.`
            : 'Search our comprehensive directory of healthcare professionals. Find trusted practitioners by specialty, location, and read patient reviews.';

        res.render('public/search-results', {
            title: searchTitle,
            description: searchDescription,
            listings,
            categories,
            categoryName,
            locationName,
            searchParams: { keyword, category, postcode }
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
        
        // Construct SEO-optimized title and description
        const seoTitle = `Find the Best ${category.name}s in Australia | Fix My Spine`;
        const seoDescription = `Browse our comprehensive directory of verified ${category.name}s. Read reviews, compare practitioners, and find the right specialist for your needs.`;

        res.render('public/search-results', {
            title: seoTitle,
            description: seoDescription,
            listings,
            categories,
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
            SELECT id, suburb, state, postcode, population 
            FROM locations 
            WHERE suburb = ? AND population > 75000
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
        
        // Construct SEO-optimized title and description
        const seoTitle = `Top Chiropractors & Physios in ${location.suburb} | Fix My Spine`;
        const seoDescription = `Discover the top-rated allied health professionals in ${location.suburb}. Search our directory to find trusted practitioners near you.`;

        res.render('public/search-results', {
            title: seoTitle,
            description: seoDescription,
            listings,
            categories,
            locationName: `${location.suburb}, ${location.state}`,
            searchParams: { postcode: location.postcode }
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
        
        // Construct SEO-optimized title and description
        const seoTitle = `${business.business_name} - ${business.category_name} in ${business.suburb}, ${business.state} | Fix My Spine`;
        const seoDescription = `Find contact details, patient reviews, and services for ${business.business_name}, a trusted ${business.category_name} located in ${business.suburb}. Book an appointment today.`;

        res.render('public/listing-detail', {
            title: seoTitle,
            description: seoDescription,
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
        title: 'About Us - Our Mission | Fix My Spine',
        description: 'Learn about FixMySpine\'s mission to connect Australians with trusted allied health professionals. Discover our story from a North Sydney clinic to a nationwide directory.'
    });
});

// Contact page - GET /contact
router.get('/contact', (req, res) => {
    res.render('public/contact', {
        title: 'Contact Us | Fix My Spine',
        description: 'Get in touch with FixMySpine. Contact us for support, inquiries, or to learn more about listing your practice on Australia\'s trusted allied health directory.'
    });
});

// Pricing page - GET /pricing
router.get('/pricing', (req, res) => {
    // Check if user has already provided email (stored in session)
    const hasEmailAccess = req.session.pricingEmailAccess || false;
    
    res.render('public/pricing', {
        title: 'Pricing - List Your Practice | Fix My Spine',
        description: 'List your allied health practice on FixMySpine. Choose from free basic listings or premium features to grow your practice and connect with more patients across Australia.',
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
            title: 'Pricing - List Your Practice | Fix My Spine',
            description: 'List your allied health practice on FixMySpine. Choose from free basic listings or premium features to grow your practice and connect with more patients across Australia.',
            hasEmailAccess: false,
            email: ''
        });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
        return res.render('public/pricing', {
            title: 'Pricing - List Your Practice | Fix My Spine',
            description: 'List your allied health practice on FixMySpine. Choose from free basic listings or premium features to grow your practice and connect with more patients across Australia.',
            hasEmailAccess: false,
            email: email || '',
            error: 'Please enter a valid email address'
        });
    }
    
    // Store email in session to grant access
    req.session.pricingEmailAccess = true;
    req.session.pricingEmail = email;
    
    res.render('public/pricing', {
        title: 'Pricing - List Your Practice | Fix My Spine',
        description: 'List your allied health practice on FixMySpine. Choose from free basic listings or premium features to grow your practice and connect with more patients across Australia.',
        hasEmailAccess: true,
        email: email
    });
});

// Terms of Service page - GET /terms-of-service
router.get('/terms-of-service', (req, res) => {
    res.render('public/terms-of-service', {
        title: 'Terms of Service | Fix My Spine',
        description: 'Read FixMySpine\'s terms of service. Understand the terms and conditions for using Australia\'s trusted allied health directory.'
    });
});

// Privacy Policy page - GET /privacy-policy
router.get('/privacy-policy', (req, res) => {
    res.render('public/privacy-policy', {
        title: 'Privacy Policy | Fix My Spine',
        description: 'Learn how FixMySpine protects your privacy. Read our comprehensive privacy policy for Australia\'s trusted allied health directory.'
    });
});

// Blog post: 5 Exercises for Lower Back Pain - GET /blog/5-exercises-for-lower-back-pain
// NOTE: Specific routes must come BEFORE general routes in Express
router.get('/blog/5-exercises-for-lower-back-pain', (req, res) => {
    res.render('public/blog/5-exercises-for-lower-back-pain', {
        title: '5 Effective Exercises for Lower Back Pain Relief | Fix My Spine',
        description: 'Discover 5 evidence-based exercises to relieve lower back pain. Expert-recommended stretches and strengthening exercises for lasting relief.',
        publishDate: 'October 1, 2025',
        author: 'FixMySpine Editorial Team'
    });
});

// Blog post: What is Sciatica - GET /blog/what-is-sciatica
router.get('/blog/what-is-sciatica', (req, res) => {
    res.render('public/blog/what-is-sciatica', {
        title: 'What is Sciatica? Symptoms, Causes & Treatment Options | Fix My Spine',
        description: 'Learn about sciatica symptoms, causes, and effective treatment options. Expert insights on managing sciatic nerve pain and finding relief.',
        publishDate: 'October 1, 2025',
        author: 'FixMySpine Editorial Team'
    });
});

// Blog index page - GET /blog
// NOTE: This general route must come AFTER specific blog post routes
router.get('/blog', (req, res) => {
    res.render('public/blog/index', {
        title: 'Health & Wellness Blog | Fix My Spine',
        description: 'Expert advice on spinal health, back pain relief, and wellness. Read evidence-based articles from healthcare professionals.'
    });
});

// Sitemap route - GET /sitemap.xml
router.get('/sitemap.xml', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    
    // Check if sitemap exists
    if (fs.existsSync(sitemapPath)) {
        res.set('Content-Type', 'application/xml');
        res.sendFile(sitemapPath);
    } else {
        // If sitemap doesn't exist, generate it on-the-fly
        console.log('Sitemap not found, generating...');
        const generateSitemap = require('../scripts/generate-sitemap');
        
        generateSitemap.generateSitemap().then(result => {
            if (result.success) {
                res.set('Content-Type', 'application/xml');
                res.sendFile(sitemapPath);
            } else {
                res.status(500).send('Error generating sitemap');
            }
        }).catch(error => {
            console.error('Error generating sitemap:', error);
            res.status(500).send('Error generating sitemap');
        });
    }
});

module.exports = router;
