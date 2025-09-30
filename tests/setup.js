// Test setup file for Jest
const mysql = require('mysql2');
const DatabaseHelper = require('./helpers/database');

// Load environment variables
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'fixmyspine_test_db';

// Global test timeout
jest.setTimeout(10000);

// Global test database connection
global.testPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Global database helper
global.dbHelper = new DatabaseHelper();

// Clean up before each test file
beforeAll(async () => {
  // Clear and seed database before each test file
  await global.dbHelper.clearAllTables();
  await global.dbHelper.seedTestData();
});

// Clean up after all tests
afterAll(async () => {
  if (global.testPool) {
    await global.testPool.end();
  }
  if (global.dbHelper) {
    await global.dbHelper.close();
  }
});
