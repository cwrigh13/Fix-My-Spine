# Test Suite for FixMySpine Directory Application

This directory contains comprehensive tests for the Express.js directory application using Jest and Supertest.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install --save-dev jest supertest
```

### 2. Create Test Database
Run the following SQL commands to create the test database:

```sql
-- Create the test database
CREATE DATABASE IF NOT EXISTS fixmyspine_test_db;

-- Use the test database
USE fixmyspine_test_db;

-- Run the main schema.sql script on the test database
-- From your terminal, run:
mysql -u your_username -p fixmyspine_test_db < schema.sql
```

### 3. Configure Environment Variables
Create a `.env.test` file in the project root with your test database credentials:

```env
NODE_ENV=test
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=fixmyspine_test_db
SESSION_SECRET=test-secret-key
```

### 4. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Files

### `admin.auth.test.js`
Tests for admin authentication functionality:
- Login form rendering
- Successful admin login
- Failed login attempts (wrong password, non-admin user)
- Session management
- Protected route access
- Logout functionality

### `admin.listings.test.js`
Tests for business listing management:
- Viewing all listings
- Approving listings
- Editing listings
- Deleting listings
- Form validation
- Error handling

### `admin.management.test.js`
Tests for user and taxonomy management:
- User management (viewing and deleting users)
- Category management (adding and deleting categories)
- Location management (adding and deleting locations)
- Business rule enforcement (preventing deletion of in-use categories/locations)

## Test Structure

Each test file follows this pattern:
1. **Setup**: Clear and seed test database
2. **Authentication**: Login as admin for protected routes
3. **Test Execution**: Run specific functionality tests
4. **Cleanup**: Clean up after tests

## Database Helper

The `helpers/database.js` file provides utilities for:
- Database connection management
- Test data seeding
- Table cleanup
- Query execution

## Coverage

The test suite aims for comprehensive coverage of:
- All admin routes and middleware
- Authentication and authorization
- Database operations
- Error handling
- Form validation
- Business logic

## Running Individual Test Files

```bash
# Run only authentication tests
npm test admin.auth.test.js

# Run only listing management tests
npm test admin.listings.test.js

# Run only management tests
npm test admin.management.test.js
```

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running
- Verify database credentials in `.env.test`
- Check that the test database exists and has the correct schema

### Test Failures
- Check that all dependencies are installed
- Verify the test database is properly seeded
- Ensure no other processes are using the test database

### Session Issues
- Make sure the SESSION_SECRET is set in your test environment
- Check that the session middleware is properly configured
