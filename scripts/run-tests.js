#!/usr/bin/env node

/**
 * Test runner script for the FixMySpine directory application
 * This script sets up the test environment and runs the test suite
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Setting up test environment...\n');

// Check if .env.test exists
const envTestPath = path.join(__dirname, '..', '.env.test');
if (!fs.existsSync(envTestPath)) {
  console.log('⚠️  .env.test file not found. Creating from template...');
  
  const envTestContent = `# Test environment configuration
NODE_ENV=test
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_DATABASE=fixmyspine_test_db
SESSION_SECRET=test-secret-key
`;
  
  fs.writeFileSync(envTestPath, envTestContent);
  console.log('✅ Created .env.test file. Please update with your database credentials.\n');
}

// Check if test database exists
console.log('🔍 Checking test database...');
try {
  const mysql = require('mysql2');
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  connection.query('CREATE DATABASE IF NOT EXISTS fixmyspine_test_db', (err) => {
    if (err) {
      console.error('❌ Error creating test database:', err.message);
      process.exit(1);
    }
    console.log('✅ Test database ready');
    
    connection.end();
    
    // Run the tests
    console.log('\n🚀 Running tests...\n');
    try {
      execSync('npm test', { stdio: 'inherit' });
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Tests failed:', error.message);
      process.exit(1);
    }
  });
} catch (error) {
  console.error('❌ Error connecting to database:', error.message);
  console.log('\nPlease ensure:');
  console.log('1. MySQL is running');
  console.log('2. Database credentials are correct in .env.test');
  console.log('3. You have permission to create databases');
  process.exit(1);
}
