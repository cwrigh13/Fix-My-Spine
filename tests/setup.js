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

// Ensure test schema has required columns used by routes
async function ensureSchemaConsistency() {
  const dbName = process.env.DB_DATABASE;
  const conn = global.testPool.promise();

  // Helper to check and add a column if it doesn't exist
  async function ensureColumn(tableName, columnName, addSql) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbName, tableName, columnName]
    );
    if (!rows[0] || rows[0].cnt === 0) {
      await conn.query(`ALTER TABLE ${tableName} ${addSql}`);
    }
  }

  // locations.population is required by /location/:suburb route filter
  await ensureColumn('locations', 'population', 'ADD COLUMN population INT DEFAULT NULL AFTER state');

  // Also ensure latitude/longitude exist for search route compatibility
  await ensureColumn('locations', 'latitude', 'ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL AFTER population');
  await ensureColumn('locations', 'longitude', 'ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL AFTER latitude');
}

// Clean up before each test file
beforeAll(async () => {
  await ensureSchemaConsistency();
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
