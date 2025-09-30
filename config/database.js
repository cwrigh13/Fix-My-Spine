const mysql = require('mysql2');

// Database configuration based on environment
const getDatabaseConfig = () => {
  const baseConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Use test database when in test environment
  if (process.env.NODE_ENV === 'test') {
    return {
      ...baseConfig,
      database: process.env.DB_DATABASE || 'fixmyspine_test_db'
    };
  }

  // Use production database
  return {
    ...baseConfig,
    database: process.env.DB_DATABASE || 'fixmyspine_db'
  };
};

// Create connection pool
const pool = mysql.createPool(getDatabaseConfig());

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  
  const dbName = process.env.NODE_ENV === 'test' ? 'test' : 'production';
  console.log(`Successfully connected to the MySQL ${dbName} database.`);
  connection.release();
});

module.exports = pool;
