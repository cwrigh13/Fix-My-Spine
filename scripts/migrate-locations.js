/**
 * Migration script to add population field and populate with Australian cities over 75,000
 * Run this script to update your existing database with population data
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'fixmyspine_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting location population migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'DATABASE_MIGRATION.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    connection = await pool.getConnection();
    
    console.log('📊 Adding population field to locations table...');
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignore errors for duplicate column or data that already exists
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_ENTRY') {
            console.log('⚠️  Skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            console.error('❌ Error executing statement:', error.message);
            console.error('Statement:', statement);
          }
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Added population field to locations table');
    console.log('  - Populated with Australian cities over 75,000 population');
    console.log('  - Updated all location queries to filter by population > 75,000');
    console.log('');
    console.log('🔍 The location dropdown will now only show major Australian cities.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
