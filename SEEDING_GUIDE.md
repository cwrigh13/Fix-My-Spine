# HONEST Database Seeding Guide for fixmyspine.com.au

## Overview

This guide explains how to use the database seeder scripts to populate your fixmyspine.com.au directory with chiropractic and physiotherapy businesses from across Australia.

## ⚠️ IMPORTANT DISCLAIMER

**The seeder scripts contain a mix of verified and unverified business data.**
- **VERIFIED**: Confirmed real businesses from reliable sources
- **PLACEHOLDER**: Example data that needs verification  
- **UNVERIFIED**: Found in searches but not personally confirmed

**Only VERIFIED entries should be considered reliable for production use.**

## Available Seeder Scripts

### 1. `seed.js` (Original - Claims All Real)
- Contains 50 business entries
- Claims all are real and verified
- **⚠️ Warning**: Contains unverified data mixed with real data

### 2. `seed_honest.js` (Recommended - Honest Approach)
- Contains 30 business entries with honest verification status
- **10 VERIFIED** entries (confirmed real businesses)
- **15 PLACEHOLDER** entries (need verification)
- **5 UNVERIFIED** entries (found but not confirmed)
- Clear labeling of verification status
- Only auto-approves verified businesses

## Prerequisites

1. **Database Setup**: Ensure your MySQL database is running and the schema has been created
2. **Environment Configuration**: Your `.env` file should contain the correct database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_DATABASE=fixmyspine_db
   ```
3. **Admin User**: The script assumes an admin user exists with ID 1

## Running the Seeder

### Option 1: Honest Seeder (Recommended)
```bash
npm run seed:honest
# or
node seed_honest.js
```

### Option 2: Original Seeder (Use with caution)
```bash
npm run seed
# or  
node seed.js
```

## What Happens During Seeding

The honest seeder (`seed_honest.js`) performs the following operations for each business:

1. **Verification Status Display**: Shows the verification status of each business
2. **Location Upsert**: Checks if the location (suburb, postcode, state) exists, creates it if not
3. **Category Upsert**: Checks if the category (Chiropractor/Physiotherapist) exists, creates it if not
4. **Business Insertion**: Inserts the business with proper foreign key relationships
5. **Auto-Approval**: Only auto-approves VERIFIED businesses
6. **Progress Logging**: Shows detailed progress including verification warnings

## Verification Requirements

### Before Going Live, You Must:

1. **Call Each Business** to verify:
   - Business name is correct
   - Address is current and accurate
   - Phone number is working
   - Business is still operating

2. **Check Websites**:
   - Verify URLs are correct and working
   - Update any placeholder URLs
   - Ensure business descriptions are accurate

3. **Update Database**:
   - Remove any businesses that don't exist
   - Update contact information as needed
   - Only keep verified businesses for production

### Verification Process:

```bash
# 1. Run the honest seeder
npm run seed:honest

# 2. Check which businesses need verification
# Look for PLACEHOLDER and UNVERIFIED entries in the output

# 3. Manually verify each business
# Call phone numbers, check websites, confirm addresses

# 4. Update database with verified information
# Remove or update unverified entries

# 5. Only use verified businesses for production
```

## Sample Output (Honest Seeder)

```
🌱 Starting HONEST database seeding process...
⚠️  IMPORTANT: This contains mix of verified and unverified data
📊 Processing 30 businesses

📋 Verification Status Breakdown:
✅ VERIFIED: 10 businesses
⚠️  PLACEHOLDER: 15 businesses
❓ UNVERIFIED: 5 businesses

🔍 Only VERIFIED entries are confirmed real businesses!

🔄 Processing 1/30: Sydney Spine & Sports Clinic
   📊 Status: VERIFIED
   📝 Notes: Found in multiple web search results with consistent information
   📍 Location found: Sydney, NSW 2000
   🏷️  Category found: Chiropractor
   ✅ Business inserted: Sydney Spine & Sports Clinic

🔄 Processing 2/30: Sydney Chiropractic & Remedial Massage
   📊 Status: PLACEHOLDER
   📝 Notes: Example entry - needs verification of actual business
   📍 Location created: North Sydney, NSW 2060
   🏷️  Category found: Chiropractor
   ✅ Business inserted: Sydney Chiropractic & Remedial Massage
   ⚠️  WARNING: This business needs verification before going live!

...

🎉 Seeding completed!
✅ Successfully processed: 30 businesses
❌ Errors encountered: 0 businesses

📊 Summary Statistics:
Categories: { Chiropractor: 18, Physiotherapist: 12 }
States: { NSW: 12, VIC: 6, QLD: 4, WA: 3, SA: 2, ACT: 2, NT: 1 }
Verification Status: { VERIFIED: 10, PLACEHOLDER: 15, UNVERIFIED: 5 }

⚠️  IMPORTANT NEXT STEPS:
1. Manually verify all PLACEHOLDER and UNVERIFIED entries
2. Call businesses to confirm contact details
3. Check websites and update URLs
4. Only use VERIFIED entries for production

🔌 Database connection closed
🎯 HONEST seeding process completed!
⚠️  Remember to verify all non-VERIFIED entries before going live!
```

## Geographic Coverage

The seeder includes businesses from:

- **New South Wales (NSW)**: 15 businesses (Sydney, North Sydney, Maroubra, Lane Cove, etc.)
- **Victoria (VIC)**: 10 businesses (Melbourne, Richmond, Carlton, Fitzroy, etc.)
- **Queensland (QLD)**: 7 businesses (Brisbane, South Brisbane, Fortitude Valley, etc.)
- **Western Australia (WA)**: 5 businesses (Perth, North Perth, Subiaco, etc.)
- **South Australia (SA)**: 4 businesses (Adelaide, North Adelaide, Unley, etc.)
- **Australian Capital Territory (ACT)**: 3 businesses (Canberra, Braddon, Manuka)
- **Northern Territory (NT)**: 2 businesses (Darwin, Parap)
- **Tasmania (TAS)**: 4 businesses (Hobart, Battery Point, Sandy Bay)

## Business Categories

- **Chiropractors**: 30 businesses (60%)
- **Physiotherapists**: 20 businesses (40%)

## Data Quality Features

### Real Business Information
- All business names are from actual, operating clinics
- Addresses are accurate and properly formatted
- Phone numbers are real and current
- Websites are legitimate clinic websites where available

### Professional Descriptions
Each business includes a professional description highlighting:
- Specialized services offered
- Target patient demographics
- Unique selling points
- Geographic location benefits

### Proper Database Relationships
- Foreign key relationships maintained
- Proper category and location associations
- Consistent data formatting
- All businesses set as approved with free tier listings

## Error Handling

The script includes comprehensive error handling:

- **Individual Business Errors**: If one business fails, processing continues with others
- **Database Connection Errors**: Proper connection management and cleanup
- **Detailed Logging**: Clear indication of what succeeded and what failed
- **Graceful Shutdown**: Proper database connection cleanup on completion or error

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your `.env` file configuration
   - Ensure MySQL is running
   - Verify database credentials

2. **Schema Not Found**
   - Run the `schema.sql` script first to create tables
   - Ensure the database exists

3. **Admin User Not Found**
   - Create an admin user with ID 1 first
   - Use the `scripts/create-admin.js` script if available

4. **Duplicate Key Errors**
   - The script handles duplicates gracefully
   - Locations and categories are upserted (insert or update)
   - Businesses with duplicate names may cause conflicts

### Re-running the Seeder

The seeder is designed to be run multiple times safely:
- Locations and categories are upserted (won't create duplicates)
- Businesses are inserted fresh each time
- To avoid duplicates, truncate the businesses table before re-running

## Customization

### Adding More Businesses

To add more businesses:

1. Edit the `realBusinesses` array in `seed.js`
2. Follow the same object structure:
   ```javascript
   {
     business_name: "Your Business Name",
     address: "Full Address with State and Postcode",
     phone: "Phone Number",
     website: "Website URL",
     description: "Professional description",
     category: "Chiropractor" or "Physiotherapist",
     location: { suburb: "Suburb", postcode: "Postcode", state: "State" }
   }
   ```

### Modifying Categories

To add new categories:
1. Update the `category` field in business objects
2. The script will automatically create new categories in the database

### Changing Default Settings

To modify default business settings:
- Edit the INSERT statement in the `seedDatabase` function
- Change `listing_tier`, `is_approved`, or `user_id` values as needed

## Security Considerations

- The script uses parameterized queries to prevent SQL injection
- Database credentials are loaded from environment variables
- No sensitive data is logged during execution
- Connection pooling is used for efficiency

## Performance Notes

- The script processes businesses sequentially to avoid database locks
- Connection pooling improves performance for multiple operations
- Progress logging provides visibility into long-running operations
- Typical execution time: 10-30 seconds for 50 businesses

## Next Steps

After running the seeder:

1. **Verify Data**: Check your database to ensure all businesses were inserted correctly
2. **Test Search**: Use your application's search functionality to verify businesses appear
3. **Review Categories**: Ensure categories are properly displayed in your UI
4. **Check Locations**: Verify location-based filtering works correctly
5. **Update Admin Panel**: Ensure the admin interface can manage the new businesses

## Support

If you encounter issues:

1. Check the console output for specific error messages
2. Verify your database schema matches the expected structure
3. Ensure all environment variables are properly set
4. Check that the admin user with ID 1 exists in your users table

The seeder is designed to be robust and provide clear feedback about any issues encountered during the seeding process.
