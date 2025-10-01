#!/usr/bin/env node

/**
 * Sitemap Generator for FixMySpine
 * 
 * This script automatically generates a sitemap.xml file that includes:
 * - Static pages (home, about, contact, etc.)
 * - Dynamic category pages
 * - Dynamic location pages  
 * - Individual business listing pages
 * 
 * The sitemap is regenerated whenever new listings are added to ensure
 * search engines can discover all content.
 */

require('dotenv').config();
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Database configuration
const getDatabaseConfig = () => {
    const baseConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    if (process.env.NODE_ENV === 'test') {
        return {
            ...baseConfig,
            database: process.env.DB_DATABASE || 'fixmyspine_test_db'
        };
    }

    return {
        ...baseConfig,
        database: process.env.DB_DATABASE || 'fixmyspine_db'
    };
};

// Create connection pool
const pool = mysql.createPool(getDatabaseConfig()).promise();

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://fixmyspine.com.au';
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Generate XML sitemap content
 */
function generateSitemapXml(urls) {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const urlsetClose = '</urlset>';
    
    let xmlContent = xmlHeader + urlsetOpen;
    
    urls.forEach(url => {
        xmlContent += '  <url>\n';
        xmlContent += `    <loc>${escapeXml(url.loc)}</loc>\n`;
        if (url.lastmod) {
            xmlContent += `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n`;
        }
        if (url.changefreq) {
            xmlContent += `    <changefreq>${escapeXml(url.changefreq)}</changefreq>\n`;
        }
        if (url.priority) {
            xmlContent += `    <priority>${escapeXml(url.priority)}</priority>\n`;
        }
        xmlContent += '  </url>\n';
    });
    
    xmlContent += urlsetClose;
    return xmlContent;
}

/**
 * Get static pages URLs
 */
function getStaticPages() {
    const staticPages = [
        {
            loc: `${SITE_URL}/`,
            changefreq: 'daily',
            priority: '1.0'
        },
        {
            loc: `${SITE_URL}/search`,
            changefreq: 'daily',
            priority: '0.9'
        },
        {
            loc: `${SITE_URL}/about`,
            changefreq: 'monthly',
            priority: '0.7'
        },
        {
            loc: `${SITE_URL}/contact`,
            changefreq: 'monthly',
            priority: '0.6'
        },
        {
            loc: `${SITE_URL}/pricing`,
            changefreq: 'weekly',
            priority: '0.8'
        },
        {
            loc: `${SITE_URL}/blog`,
            changefreq: 'weekly',
            priority: '0.7'
        },
        {
            loc: `${SITE_URL}/blog/5-exercises-for-lower-back-pain`,
            changefreq: 'monthly',
            priority: '0.6'
        },
        {
            loc: `${SITE_URL}/blog/what-is-sciatica`,
            changefreq: 'monthly',
            priority: '0.6'
        },
        {
            loc: `${SITE_URL}/terms-of-service`,
            changefreq: 'yearly',
            priority: '0.3'
        },
        {
            loc: `${SITE_URL}/privacy-policy`,
            changefreq: 'yearly',
            priority: '0.3'
        }
    ];

    return staticPages;
}

/**
 * Get category pages from database
 */
async function getCategoryPages() {
    try {
        const [categories] = await pool.execute(`
            SELECT id, name, slug, created_at
            FROM categories 
            ORDER BY name ASC
        `);

        return categories.map(category => ({
            loc: `${SITE_URL}/category/${category.slug}`,
            lastmod: new Date(category.created_at).toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.8'
        }));
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

/**
 * Get location pages from database
 */
async function getLocationPages() {
    try {
        const [locations] = await pool.execute(`
            SELECT id, suburb, state, postcode, created_at
            FROM locations 
            ORDER BY suburb, state ASC
        `);

        return locations.map(location => ({
            loc: `${SITE_URL}/location/${location.id}`,
            lastmod: new Date(location.created_at).toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.7'
        }));
    } catch (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
}

/**
 * Get individual business listing pages from database
 */
async function getBusinessListingPages() {
    try {
        const [businesses] = await pool.execute(`
            SELECT b.id, b.business_name, b.created_at, b.updated_at,
                   c.slug as category_slug
            FROM businesses b
            LEFT JOIN categories c ON b.category_id = c.id
            WHERE b.is_approved = TRUE
            ORDER BY b.created_at DESC
        `);

        return businesses.map(business => {
            // Create a URL-friendly slug from business name
            const businessSlug = business.business_name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-');

            // Use updated_at if available, otherwise use created_at
            const lastmod = business.updated_at || business.created_at;

            return {
                loc: `${SITE_URL}/listing/${business.id}/${businessSlug}`,
                lastmod: new Date(lastmod).toISOString().split('T')[0],
                changefreq: 'monthly',
                priority: '0.6'
            };
        });
    } catch (error) {
        console.error('Error fetching businesses:', error);
        return [];
    }
}

/**
 * Generate the complete sitemap
 */
async function generateSitemap() {
    try {
        console.log('🚀 Starting sitemap generation...');
        
        // Get all URL types
        const staticPages = getStaticPages();
        const categoryPages = await getCategoryPages();
        const locationPages = await getLocationPages();
        const businessPages = await getBusinessListingPages();
        
        // Combine all URLs
        const allUrls = [
            ...staticPages,
            ...categoryPages,
            ...locationPages,
            ...businessPages
        ];
        
        console.log(`📊 Found ${allUrls.length} URLs:`);
        console.log(`   - Static pages: ${staticPages.length}`);
        console.log(`   - Category pages: ${categoryPages.length}`);
        console.log(`   - Location pages: ${locationPages.length}`);
        console.log(`   - Business listings: ${businessPages.length}`);
        
        // Generate XML
        const xmlContent = generateSitemapXml(allUrls);
        
        // Write to file
        fs.writeFileSync(SITEMAP_PATH, xmlContent, 'utf8');
        
        console.log(`✅ Sitemap generated successfully at ${SITEMAP_PATH}`);
        console.log(`📄 Total URLs: ${allUrls.length}`);
        
        return {
            success: true,
            totalUrls: allUrls.length,
            breakdown: {
                static: staticPages.length,
                categories: categoryPages.length,
                locations: locationPages.length,
                businesses: businessPages.length
            }
        };
        
    } catch (error) {
        console.error('❌ Error generating sitemap:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        // Close database connection
        await pool.end();
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');
    
    if (verbose) {
        console.log('🔧 Verbose mode enabled');
        console.log(`🌐 Site URL: ${SITE_URL}`);
        console.log(`📁 Sitemap path: ${SITEMAP_PATH}`);
        console.log(`🗄️  Database: ${process.env.DB_DATABASE || 'fixmyspine_db'}`);
    }
    
    const result = await generateSitemap();
    
    if (result.success) {
        console.log('\n🎉 Sitemap generation completed successfully!');
        if (verbose) {
            console.log('\n📈 Breakdown:');
            console.log(`   Static pages: ${result.breakdown.static}`);
            console.log(`   Categories: ${result.breakdown.categories}`);
            console.log(`   Locations: ${result.breakdown.locations}`);
            console.log(`   Businesses: ${result.breakdown.businesses}`);
        }
        process.exit(0);
    } else {
        console.error('\n💥 Sitemap generation failed:', result.error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = {
    generateSitemap,
    getStaticPages,
    getCategoryPages,
    getLocationPages,
    getBusinessListingPages
};
