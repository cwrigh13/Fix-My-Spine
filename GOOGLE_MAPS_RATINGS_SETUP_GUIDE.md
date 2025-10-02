# Google Maps Ratings Integration Setup Guide

This guide will help you set up Google Maps ratings integration for your FixMySpine directory, allowing you to display real Google Maps star ratings and review counts for each business listing.

## Overview

The Google Maps integration system:
- **Automatically finds** businesses on Google Maps using their name and address
- **Fetches real ratings** and review counts from Google Maps
- **Prioritizes Google ratings** over internal patient reviews when available
- **Shows both ratings** when available (Google Maps + Patient reviews)
- **Updates weekly** to keep ratings current while respecting API limits
- **Provides admin interface** for manual updates and management

## Prerequisites

1. **Google Cloud Platform Account** - You'll need a Google account
2. **Billing enabled** - Google Maps API requires billing (but has free tier)
3. **Node.js dependencies** - The system uses `axios` for API calls

## Step 1: Set Up Google Maps API

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Give your project a name (e.g., "FixMySpine Directory")

### 1.2 Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Places API** (for business details and ratings)
   - **Maps JavaScript API** (optional, for future map features)

### 1.3 Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your API key
4. **Important**: Restrict your API key for security:
   - Click on your API key to edit it
   - Under "Application restrictions", choose "HTTP referrers"
   - Add your domain(s): `https://fixmyspine.com.au/*`, `https://www.fixmyspine.com.au/*`
   - Under "API restrictions", select "Restrict key" and choose only "Places API"

### 1.4 Set Up Billing

1. Go to "Billing" in the Google Cloud Console
2. Link a payment method (required even for free tier)
3. The Places API has a generous free tier: 1,000 requests per month

## Step 2: Configure Your Application

### 2.1 Add API Key to Environment

Add your Google Maps API key to your `.env` file:

```bash
# Google Maps Integration
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 2.2 Install Dependencies

The system uses `axios` which should already be installed. If not:

```bash
npm install axios
```

### 2.3 Run Database Migration

Run the database migration to add Google rating fields:

```bash
# Connect to your MySQL database and run:
mysql -u your_username -p your_database_name < DATABASE_MIGRATION_GOOGLE_RATINGS.sql
```

Or run it manually:
```sql
USE fixmyspine_db;

-- Add Google Maps integration fields to businesses table
ALTER TABLE businesses 
ADD COLUMN google_place_id VARCHAR(255) NULL DEFAULT NULL,
ADD COLUMN google_rating DECIMAL(3,2) NULL DEFAULT NULL,
ADD COLUMN google_review_count INT NULL DEFAULT NULL,
ADD COLUMN google_last_updated TIMESTAMP NULL DEFAULT NULL,
ADD INDEX idx_google_place_id (google_place_id);

-- Add comments for documentation
ALTER TABLE businesses 
MODIFY COLUMN google_place_id VARCHAR(255) NULL DEFAULT NULL COMMENT 'Google Maps Place ID for this business',
MODIFY COLUMN google_rating DECIMAL(3,2) NULL DEFAULT NULL COMMENT 'Average Google Maps rating (0.0-5.0)',
MODIFY COLUMN google_review_count INT NULL DEFAULT NULL COMMENT 'Number of Google Maps reviews',
MODIFY COLUMN google_last_updated TIMESTAMP NULL DEFAULT NULL COMMENT 'Last time Google rating data was fetched';
```

## Step 3: Initial Rating Update

### 3.1 Test with a Small Batch

First, test the system with a small number of businesses:

```bash
node scripts/update-google-ratings.js --limit 5 --dry-run
```

This will show you what would be updated without making changes.

### 3.2 Run Initial Update

Once you're confident, run the initial update:

```bash
# Update first 10 businesses
node scripts/update-google-ratings.js --limit 10

# Or update all businesses (recommended for small directories)
node scripts/update-google-ratings.js
```

### 3.3 Monitor the Results

Check the console output for:
- ✅ Successfully processed businesses
- ❌ Failed businesses (may need manual Place ID lookup)
- ⏭️ Skipped businesses (recently updated)

## Step 4: Admin Interface

### 4.1 Access Admin Panel

1. Go to `/admin/google-ratings` in your browser
2. Log in with your admin credentials
3. You'll see:
   - **Statistics** showing total businesses and rating coverage
   - **Bulk actions** to update all ratings
   - **Individual business management** with update/clear cache options

### 4.2 Using the Admin Interface

- **Update All Ratings**: Processes all businesses (use limit for testing)
- **Update Individual Business**: Click the sync icon next to any business
- **Clear Cache**: Forces fresh data fetch for a specific business

## Step 5: Set Up Automated Updates

### 5.1 Create a Cron Job (Linux/Mac)

Add to your crontab to update ratings weekly:

```bash
# Edit crontab
crontab -e

# Add this line to update ratings every Sunday at 2 AM
0 2 * * 0 cd /path/to/your/app && node scripts/update-google-ratings.js >> logs/google-ratings.log 2>&1
```

### 5.2 Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to weekly
4. Set action to start program: `node`
5. Add arguments: `scripts/update-google-ratings.js`
6. Set start in: your application directory

## How It Works

### Rating Display Priority

1. **Google Maps Rating** (if available) - Shows with blue "Google Maps" badge
2. **Patient Reviews** (fallback) - Shows with green "Patient Reviews" badge
3. **Both Ratings** (when available) - Shows Google rating prominently, patient rating below

### Business Matching Process

1. **Search by name + address** using Google Places Text Search API
2. **Phone number verification** to ensure correct business match
3. **Fallback to first result** if no phone match found
4. **Store Place ID** for future updates (avoids repeated searches)

### Rate Limiting & Caching

- **1-second delay** between API calls to respect rate limits
- **Weekly updates** to keep ratings current
- **Smart caching** prevents unnecessary API calls
- **Manual refresh** available through admin interface

## Troubleshooting

### Common Issues

**"No Google Place found"**
- Business may not be on Google Maps
- Try different search terms
- Manually find Place ID using [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)

**"API key not configured"**
- Check your `.env` file has `GOOGLE_MAPS_API_KEY`
- Restart your application after adding the key

**"Quota exceeded"**
- Check your Google Cloud Console billing
- Wait for quota reset (monthly)
- Consider upgrading your Google Maps API plan

**"Business not found"**
- Verify business name and address are correct
- Try updating individual business through admin interface
- Check if business has Google Maps listing

### Manual Place ID Lookup

If automatic matching fails:

1. Go to [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Search for the business
3. Copy the Place ID
4. Update the business manually in database:

```sql
UPDATE businesses 
SET google_place_id = 'ChIJ...' 
WHERE id = business_id;
```

## Cost Considerations

### Google Maps API Pricing (as of 2024)

- **Places API Text Search**: $32 per 1,000 requests
- **Places API Details**: $17 per 1,000 requests
- **Free tier**: $200 credit per month (≈6,000 text searches)

### Estimated Costs

For 100 businesses:
- **Initial setup**: ~200 API calls = ~$10
- **Weekly updates**: ~100 API calls = ~$5/month
- **Annual cost**: ~$60 for 100 businesses

### Cost Optimization Tips

1. **Use limits** in testing to avoid unnecessary charges
2. **Update weekly** instead of daily
3. **Cache Place IDs** to avoid repeated searches
4. **Monitor usage** in Google Cloud Console

## Advanced Features

### Custom Rating Display

You can customize the rating display by modifying `views/public/listing-detail.ejs`:

```ejs
<!-- Custom rating logic -->
<% if (business.google_rating && business.google_rating >= 4.5) { %>
    <span class="badge bg-success">Highly Rated</span>
<% } %>
```

### Integration with Other Services

The system can be extended to integrate with:
- **Yelp API** for additional ratings
- **Facebook Reviews** for social proof
- **Industry-specific directories**

## Support

If you encounter issues:

1. **Check the logs** in your application console
2. **Verify API key** is correctly configured
3. **Test with dry-run** mode first
4. **Check Google Cloud Console** for API usage and errors

## Next Steps

After successful setup:

1. **Monitor ratings** through the admin interface
2. **Set up automated updates** via cron job
3. **Consider premium features** like review text display
4. **Optimize for SEO** with structured data markup

The Google Maps integration will significantly enhance your directory's credibility by showing real, verified ratings from Google Maps users!
