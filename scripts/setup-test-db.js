#!/usr/bin/env node

/**
 * Script to set up the test database with the complete schema
 * This script creates the test database and runs the schema.sql file
 */

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

console.log('🗄️  Setting up test database...\n');

// Create connection
const connection = mysql.createConnection(dbConfig);

// First create the database
console.log('📋 Creating test database...');

connection.query('CREATE DATABASE IF NOT EXISTS fixmyspine_test_db', (err) => {
  if (err) {
    console.error('❌ Error creating test database:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Test database created successfully!');
  
  // Now read and run the schema
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Replace the database name in the schema for test
  const testSchema = schema.replace('USE fixmyspine_db;', 'USE fixmyspine_test_db;');

  console.log('📋 Running schema on test database...');

  connection.query(testSchema, (err) => {
    if (err) {
      console.error('❌ Error running schema:', err.message);
      process.exit(1);
    }
    
    console.log('✅ Schema applied successfully!');
    console.log('\n🎉 Test database is ready for testing!');
    console.log('\nTo run tests:');
    console.log('  npm test');
    console.log('  npm run test:watch');
    console.log('  npm run test:coverage');
    
    connection.end();
  });
});
