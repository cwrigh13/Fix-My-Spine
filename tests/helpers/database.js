const mysql = require('mysql2');

// Load environment variables
require('dotenv').config();

// Database helper functions for testing
class DatabaseHelper {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  // Execute a query and return results
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.pool.execute(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  // Clear all tables
  async clearAllTables() {
    const tables = ['payments', 'reviews', 'businesses', 'users', 'locations', 'categories'];
    
    try {
      // Disable foreign key checks temporarily
      await this.query('SET FOREIGN_KEY_CHECKS = 0');
      
      for (const table of tables) {
        try {
          // Use DELETE instead of TRUNCATE to avoid lock issues
          await this.query(`DELETE FROM ${table}`);
          // Reset auto increment
          await this.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        } catch (err) {
          // Table might not exist or be empty, continue
          if (!err.message.includes('doesn\'t exist') && !err.message.includes('Unknown table')) {
            console.warn(`Warning: Could not clear table ${table}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.warn('Warning: Error during table clearing:', err.message);
    } finally {
      // Re-enable foreign key checks
      try {
        await this.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (err) {
        console.warn('Warning: Could not re-enable foreign key checks:', err.message);
      }
    }
  }

  // Seed test data
  async seedTestData() {
    // Create test categories
    await this.query(`
      INSERT INTO categories (name, slug) VALUES 
      ('Chiropractor', 'chiropractor'),
      ('Physiotherapist', 'physiotherapist'),
      ('Massage Therapy', 'massage-therapy')
    `);

    // Create test locations
    await this.query(`
      INSERT INTO locations (suburb, postcode, state) VALUES 
      ('Sydney', '2000', 'NSW'),
      ('Melbourne', '3000', 'VIC'),
      ('Brisbane', '4000', 'QLD')
    `);

    // Create test users (including admin)
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    await this.query(`
      INSERT INTO users (name, email, password, is_admin) VALUES 
      ('Admin User', 'admin@test.com', ?, TRUE),
      ('Test User', 'user@test.com', ?, FALSE)
    `, [adminPassword, userPassword]);

    // Create test business
    await this.query(`
      INSERT INTO businesses (user_id, category_id, location_id, business_name, address, phone, website, description, listing_tier, is_approved) VALUES 
      (2, 1, 1, 'Test Chiropractic Clinic', '123 Test St, Sydney', '02 1234 5678', 'https://testclinic.com', 'A test chiropractic clinic', 'free', FALSE)
    `);
  }

  // Close connection
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = DatabaseHelper;
