# Admin Setup Scripts

This directory contains scripts to set up admin users and test data for the FixMySpine admin dashboard.

## Available Scripts

### 1. Create Dummy Admin Users Only
```bash
node scripts/create-dummy-admin.js
```
Creates 3 admin users with simple credentials for testing.

**Admin Credentials:**
- Email: `admin@fixmyspine.com.au` | Password: `admin123`
- Email: `test@fixmyspine.com.au` | Password: `test123`
- Email: `demo@fixmyspine.com.au` | Password: `demo123`

### 2. Full Test Data Setup
```bash
node scripts/setup-test-data.js
```
Creates comprehensive test data including:
- Admin users
- Service categories
- Locations (Australian cities)
- Business owner users
- Sample business listings (approved and pending)

### 3. Interactive Admin Creation
```bash
node scripts/create-admin.js
```
Interactive script that prompts you to enter admin details.

## Prerequisites

1. Make sure your `.env` file is configured with database credentials
2. Ensure your database is running and accessible
3. The database schema should be created (run `schema.sql` first)

## Environment Variables Required

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=fixmyspine_db
```

## Quick Start

1. **Set up your environment:**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

2. **Create the database schema:**
   ```bash
   mysql -u your_username -p < schema.sql
   ```

3. **Create admin users:**
   ```bash
   node scripts/create-dummy-admin.js
   ```

4. **Start your application:**
   ```bash
   npm start
   ```

5. **Access the admin dashboard:**
   - Go to: http://localhost:3000/admin/login
   - Use any of the admin credentials above

## Test Data Features

The full test data setup includes:

### Admin Users
- Multiple admin accounts for testing different scenarios

### Service Categories
- Chiropractor, Physiotherapist, Osteopath
- Massage Therapist, Acupuncturist, Podiatrist
- Sports Medicine, Rehabilitation Specialist
- Pain Management, Wellness Centre

### Locations
- Major Australian cities (Sydney, Melbourne, Brisbane, Perth, Adelaide, etc.)
- Includes postcodes and states

### Business Listings
- Mix of approved and pending listings
- Different listing tiers (free and premium)
- Realistic business information
- Various service categories and locations

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your `.env` file configuration
   - Ensure MySQL is running
   - Verify database credentials

2. **"User already exists" warnings**
   - These are normal if you run the script multiple times
   - The script uses `INSERT IGNORE` to prevent duplicates

3. **Permission Errors**
   - Make sure your database user has INSERT privileges
   - Check that the database exists

### Getting Help

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your database connection
3. Ensure all required tables exist in your database
4. Check that your `.env` file is properly configured

## Security Note

⚠️ **Important:** These scripts create users with simple passwords for testing purposes only. In production, always use strong, unique passwords and proper security measures.
