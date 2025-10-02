#!/usr/bin/env node

/**
 * Google Maps Rating Update Script
 * 
 * This script fetches Google Maps ratings for all businesses in the database
 * and updates their rating information.
 * 
 * Usage:
 *   node scripts/update-google-ratings.js [options]
 * 
 * Options:
 *   --limit N        Process only N businesses (useful for testing)
 *   --business-id N  Process only a specific business ID
 *   --force          Force update even if recently updated
 *   --dry-run        Show what would be updated without making changes
 */

require('dotenv').config();
const GoogleMapsService = require('../services/googleMapsService');

async function main() {
  const args = process.argv.slice(2);
  const options = {
    limit: null,
    businessId: null,
    force: false,
    dryRun: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[++i]);
        break;
      case '--business-id':
        options.businessId = parseInt(args[++i]);
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Google Maps Rating Update Script

Usage: node scripts/update-google-ratings.js [options]

Options:
  --limit N        Process only N businesses (useful for testing)
  --business-id N  Process only a specific business ID
  --force          Force update even if recently updated
  --dry-run        Show what would be updated without making changes
  --help           Show this help message

Examples:
  node scripts/update-google-ratings.js
  node scripts/update-google-ratings.js --limit 10
  node scripts/update-google-ratings.js --business-id 123
  node scripts/update-google-ratings.js --dry-run
        `);
        process.exit(0);
    }
  }

  console.log('🚀 Google Maps Rating Update Script');
  console.log('=====================================');
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  try {
    const googleMapsService = new GoogleMapsService();

    // Check if API key is configured
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('❌ Error: GOOGLE_MAPS_API_KEY not found in environment variables');
      console.error('Please add your Google Maps API key to the .env file:');
      console.error('GOOGLE_MAPS_API_KEY=your_api_key_here');
      process.exit(1);
    }

    let results;

    if (options.businessId) {
      // Process specific business
      console.log(`🎯 Processing specific business ID: ${options.businessId}`);
      results = await processSpecificBusiness(googleMapsService, options.businessId, options.dryRun);
    } else {
      // Process all businesses
      console.log(`📊 Processing all businesses${options.limit ? ` (limit: ${options.limit})` : ''}`);
      results = await googleMapsService.processAllBusinesses(options.limit);
    }

    // Display results
    console.log('\n📈 Final Results:');
    console.log(`✅ Successfully processed: ${results.success || 0}`);
    console.log(`❌ Failed: ${results.failed || 0}`);
    console.log(`⏭️  Skipped: ${results.skipped || 0}`);
    console.log(`📊 Total: ${results.total || 0}`);

    if (results.success > 0) {
      console.log('\n🎉 Google Maps ratings have been updated successfully!');
      console.log('💡 Ratings will now appear on business listing pages.');
    }

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

/**
 * Process a specific business by ID
 */
async function processSpecificBusiness(googleMapsService, businessId, dryRun) {
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

  try {
    const connection = await pool.getConnection();
    const [businesses] = await connection.execute(`
      SELECT id, business_name, address, phone, google_place_id, google_last_updated
      FROM businesses 
      WHERE id = ? AND is_approved = TRUE
    `, [businessId]);

    connection.release();

    if (businesses.length === 0) {
      console.error(`❌ Business with ID ${businessId} not found or not approved`);
      return { success: 0, failed: 1, skipped: 0, total: 1 };
    }

    const business = businesses[0];

    if (dryRun) {
      console.log(`🔍 Would process: ${business.business_name}`);
      console.log(`   Current Google rating: ${business.google_place_id ? 'Has Place ID' : 'No Place ID'}`);
      return { success: 0, failed: 0, skipped: 0, total: 1 };
    }

    const success = await googleMapsService.processBusiness(business);
    return {
      success: success ? 1 : 0,
      failed: success ? 0 : 1,
      skipped: 0,
      total: 1
    };

  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main };
