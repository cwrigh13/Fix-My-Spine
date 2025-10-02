/**
 * Google Maps Places API Service
 * Handles fetching business ratings and reviews from Google Maps
 */

require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'fixmyspine_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    
    if (!this.apiKey) {
      console.warn('⚠️  GOOGLE_MAPS_API_KEY not found in environment variables');
    }
  }

  /**
   * Find Google Place ID for a business using text search
   * @param {string} businessName - Name of the business
   * @param {string} address - Business address
   * @param {string} phone - Business phone number
   * @returns {Promise<string|null>} Google Place ID or null if not found
   */
  async findPlaceId(businessName, address, phone) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      // Try searching by business name and address first
      const searchQuery = `${businessName} ${address}`;
      const response = await axios.get(`${this.baseUrl}/textsearch/json`, {
        params: {
          query: searchQuery,
          key: this.apiKey,
          region: 'au' // Focus on Australia
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        // Find the best match by comparing phone numbers
        const bestMatch = response.data.results.find(place => {
          // If phone number matches, this is likely the correct place
          return place.formatted_phone_number && 
                 this.normalizePhone(place.formatted_phone_number) === this.normalizePhone(phone);
        });

        if (bestMatch) {
          console.log(`✅ Found Google Place ID for ${businessName}: ${bestMatch.place_id}`);
          return bestMatch.place_id;
        }

        // If no phone match, return the first result
        console.log(`⚠️  Found Google Place ID for ${businessName} (no phone match): ${response.data.results[0].place_id}`);
        return response.data.results[0].place_id;
      }

      console.log(`❌ No Google Place found for ${businessName}`);
      return null;
    } catch (error) {
      console.error(`Error finding Place ID for ${businessName}:`, error.message);
      return null;
    }
  }

  /**
   * Get detailed place information including ratings
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object|null>} Place details with ratings
   */
  async getPlaceDetails(placeId) {
    if (!this.apiKey || !placeId) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,reviews,formatted_phone_number,formatted_address',
          key: this.apiKey
        }
      });

      if (response.data.result) {
        const place = response.data.result;
        return {
          placeId: placeId,
          name: place.name,
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          reviews: place.reviews || [],
          phone: place.formatted_phone_number,
          address: place.formatted_address
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching place details for ${placeId}:`, error.message);
      return null;
    }
  }

  /**
   * Update business with Google Maps rating data
   * @param {number} businessId - Database business ID
   * @param {string} placeId - Google Place ID
   * @param {Object} placeData - Place data from Google API
   * @returns {Promise<boolean>} Success status
   */
  async updateBusinessRating(businessId, placeId, placeData) {
    try {
      const connection = await pool.getConnection();
      
      await connection.execute(`
        UPDATE businesses 
        SET google_place_id = ?, 
            google_rating = ?, 
            google_review_count = ?, 
            google_last_updated = NOW()
        WHERE id = ?
      `, [placeId, placeData.rating, placeData.reviewCount, businessId]);

      connection.release();
      
      console.log(`✅ Updated business ${businessId} with Google rating: ${placeData.rating} (${placeData.reviewCount} reviews)`);
      return true;
    } catch (error) {
      console.error(`Error updating business ${businessId} with Google rating:`, error.message);
      return false;
    }
  }

  /**
   * Process a single business - find Place ID and update ratings
   * @param {Object} business - Business object from database
   * @returns {Promise<boolean>} Success status
   */
  async processBusiness(business) {
    console.log(`\n🔍 Processing business: ${business.business_name}`);
    
    // Skip if already has Google Place ID and recently updated
    if (business.google_place_id && business.google_last_updated) {
      const lastUpdated = new Date(business.google_last_updated);
      const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) { // Don't update more than once per week
        console.log(`⏭️  Skipping ${business.business_name} - recently updated (${Math.round(daysSinceUpdate)} days ago)`);
        return true;
      }
    }

    // Find Google Place ID
    const placeId = business.google_place_id || 
                   await this.findPlaceId(business.business_name, business.address, business.phone);
    
    if (!placeId) {
      console.log(`❌ Could not find Google Place ID for ${business.business_name}`);
      return false;
    }

    // Get place details with ratings
    const placeData = await this.getPlaceDetails(placeId);
    
    if (!placeData) {
      console.log(`❌ Could not fetch place details for ${business.business_name}`);
      return false;
    }

    // Update business with rating data
    const success = await this.updateBusinessRating(business.id, placeId, placeData);
    
    // Add delay to respect API rate limits
    await this.delay(1000);
    
    return success;
  }

  /**
   * Process all businesses in the database
   * @param {number} limit - Maximum number of businesses to process (optional)
   * @returns {Promise<Object>} Processing results
   */
  async processAllBusinesses(limit = null) {
    console.log('🚀 Starting Google Maps rating update process...');
    
    if (!this.apiKey) {
      console.error('❌ Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY in your .env file');
      return { success: 0, failed: 0, skipped: 0 };
    }

    try {
      const connection = await pool.getConnection();
      
      // Get businesses that need Google rating updates
      const limitClause = limit ? `LIMIT ${limit}` : '';
      const [businesses] = await connection.execute(`
        SELECT id, business_name, address, phone, google_place_id, google_last_updated
        FROM businesses 
        WHERE is_approved = TRUE
        ORDER BY google_last_updated IS NULL DESC, google_last_updated ASC
        ${limitClause}
      `);

      connection.release();

      console.log(`📊 Found ${businesses.length} businesses to process`);

      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const business of businesses) {
        try {
          const result = await this.processBusiness(business);
          if (result) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`❌ Error processing ${business.business_name}:`, error.message);
          failedCount++;
        }
      }

      const results = {
        total: businesses.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount
      };

      console.log('\n🎉 Google Maps rating update completed!');
      console.log(`✅ Successfully processed: ${results.success}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`⏭️  Skipped: ${results.skipped}`);
      console.log(`📊 Total: ${results.total}`);

      return results;
    } catch (error) {
      console.error('💥 Fatal error during Google Maps processing:', error);
      throw error;
    }
  }

  /**
   * Get businesses with Google ratings for display
   * @param {Object} filters - Optional filters (category, location, etc.)
   * @returns {Promise<Array>} Businesses with Google rating data
   */
  async getBusinessesWithGoogleRatings(filters = {}) {
    try {
      const connection = await pool.getConnection();
      
      let query = `
        SELECT 
          b.id, b.business_name, b.address, b.phone, b.website, b.description,
          b.google_rating, b.google_review_count, b.google_last_updated,
          c.name as category_name, c.slug as category_slug,
          l.suburb, l.state, l.postcode,
          AVG(r.rating) as internal_avg_rating,
          COUNT(r.id) as internal_review_count
        FROM businesses b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN locations l ON b.location_id = l.id
        LEFT JOIN reviews r ON b.id = r.business_id
        WHERE b.is_approved = TRUE
      `;

      const params = [];

      // Add filters
      if (filters.category_id) {
        query += ' AND b.category_id = ?';
        params.push(filters.category_id);
      }

      if (filters.location_id) {
        query += ' AND b.location_id = ?';
        params.push(filters.location_id);
      }

      if (filters.suburb) {
        query += ' AND l.suburb = ?';
        params.push(filters.suburb);
      }

      query += `
        GROUP BY b.id
        ORDER BY 
          CASE WHEN b.google_rating IS NOT NULL THEN b.google_rating ELSE 0 END DESC,
          b.business_name ASC
      `;

      const [businesses] = await connection.execute(query, params);
      connection.release();

      return businesses;
    } catch (error) {
      console.error('Error fetching businesses with Google ratings:', error);
      throw error;
    }
  }

  /**
   * Utility function to normalize phone numbers for comparison
   * @param {string} phone - Phone number to normalize
   * @returns {string} Normalized phone number
   */
  normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/[\s\-\(\)\+]/g, '').replace(/^61/, '0');
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GoogleMapsService;
