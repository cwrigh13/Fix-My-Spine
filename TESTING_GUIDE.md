# Complete Testing Guide for FixMySpine Directory Application

This guide provides comprehensive instructions for setting up and running the test suite for your Express.js directory application.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install --save-dev jest supertest
```

### 2. Set Up Test Database
```bash
# Create and configure test database
npm run test:db
```

### 3. Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📋 Test Suite Overview

The test suite includes **3 comprehensive test files** covering all admin functionality:

### 1. Authentication Tests (`admin.auth.test.js`)
- ✅ Admin login form rendering
- ✅ Successful admin authentication
- ✅ Failed login attempts (wrong password, non-admin user)
- ✅ Session management and persistence
- ✅ Protected route access control
- ✅ Logout functionality
- ✅ Form validation and error handling

### 2. Listing Management Tests (`admin.listings.test.js`)
- ✅ View all business listings
- ✅ Approve business listings
- ✅ Edit business listings with form validation
- ✅ Delete business listings
- ✅ Error handling for non-existent records
- ✅ Authentication requirements for all operations

### 3. Management Tests (`admin.management.test.js`)
- ✅ User management (view and delete business owners)
- ✅ Category management (add and delete categories)
- ✅ Location management (add and delete locations)
- ✅ Business rule enforcement (prevent deletion of in-use records)
- ✅ Form validation and error handling
- ✅ Authentication requirements for all operations

## 🗄️ Database Configuration

### Test Database Setup
The test suite uses a separate test database (`fixmyspine_test_db`) to ensure:
- No interference with production data
- Clean state for each test run
- Safe testing of database operations

### Environment Configuration
Create a `.env.test` file in your project root:
```env
NODE_ENV=test
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=fixmyspine_test_db
SESSION_SECRET=test-secret-key
```

## 🧪 Test Structure

### Database Helper
The `tests/helpers/database.js` provides:
- Database connection management
- Test data seeding
- Table cleanup utilities
- Query execution helpers

### Test Data
Each test run includes:
- **Admin user**: `admin@test.com` / `admin123`
- **Regular user**: `user@test.com` / `user123`
- **Sample categories**: Chiropractor, Physiotherapist, Massage Therapy
- **Sample locations**: Sydney, Melbourne, Brisbane
- **Sample business**: Test Chiropractic Clinic

## 📊 Coverage Areas

The test suite provides comprehensive coverage of:

### Routes Tested
- `GET /admin/login` - Login form
- `POST /admin/login` - Authentication
- `GET /admin/logout` - Session destruction
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/listings` - Business listings
- `POST /admin/listings/:id/approve` - Approve listings
- `GET /admin/listings/:id/edit` - Edit form
- `POST /admin/listings/:id/edit` - Update listings
- `POST /admin/listings/:id/delete` - Delete listings
- `GET /admin/taxonomy` - Categories and locations
- `POST /admin/categories/add` - Add categories
- `POST /admin/categories/:id/delete` - Delete categories
- `POST /admin/locations/add` - Add locations
- `POST /admin/locations/:id/delete` - Delete locations
- `GET /admin/users` - User management
- `POST /admin/users/:id/delete` - Delete users

### Middleware Tested
- `requireAdmin` - Authentication middleware
- Session management
- Error handling

### Database Operations Tested
- User authentication queries
- Business listing CRUD operations
- Category management
- Location management
- User management
- Foreign key constraints
- Data validation

## 🔧 Available Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Set up test database only
npm run test:db

# Set up test database and run tests
npm run test:setup
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Ensure MySQL is running and credentials are correct in `.env.test`

#### Test Database Not Found
```
Error: Unknown database 'fixmyspine_test_db'
```
**Solution**: Run `npm run test:db` to create the test database

#### Permission Denied
```
Error: Access denied for user 'root'@'localhost'
```
**Solution**: Update database credentials in `.env.test` file

#### Session Errors
```
Error: secret option required for sessions
```
**Solution**: Ensure `SESSION_SECRET` is set in `.env.test`

### Debug Mode
Run tests with verbose output:
```bash
npm test -- --verbose
```

### Individual Test Files
```bash
# Run only authentication tests
npm test admin.auth.test.js

# Run only listing management tests
npm test admin.listings.test.js

# Run only management tests
npm test admin.management.test.js
```

## 📈 Test Results

When you run the tests, you should see output similar to:

```
PASS tests/admin.auth.test.js
PASS tests/admin.listings.test.js
PASS tests/admin.management.test.js

Test Suites: 3 passed, 3 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        2.456 s
```

## 🎯 Best Practices

### Running Tests
1. **Before committing**: Always run `npm test` to ensure no regressions
2. **During development**: Use `npm run test:watch` for continuous testing
3. **Before deployment**: Run `npm run test:coverage` to check coverage

### Adding New Tests
1. Follow the existing test structure
2. Use descriptive test names
3. Test both success and failure scenarios
4. Include authentication tests for protected routes
5. Clean up test data after each test

### Database Testing
1. Always use the test database
2. Clear tables before each test run
3. Seed test data as needed
4. Verify database state in assertions

## 🔍 Test Coverage

The test suite aims for comprehensive coverage including:
- ✅ All admin routes
- ✅ Authentication and authorisation
- ✅ Database operations
- ✅ Form validation
- ✅ Error handling
- ✅ Session management
- ✅ Business logic enforcement

## 📝 Maintenance

### Regular Tasks
1. **Update tests** when adding new features
2. **Review coverage** to ensure comprehensive testing
3. **Clean up** old test data and unused tests
4. **Update dependencies** regularly

### Test Data Management
- Test data is automatically seeded and cleaned
- No manual intervention required
- Each test run starts with a clean database state

This comprehensive test suite ensures your Express.js directory application is robust, reliable, and ready for production deployment! 🚀
