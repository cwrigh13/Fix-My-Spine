# Sitemap Generation System

This document explains the automatic sitemap generation system implemented for FixMySpine.

## Overview

The sitemap system automatically generates and maintains a `sitemap.xml` file that includes all public pages on the website. It updates automatically when new content is added and can be manually regenerated when needed.

## Features

- **Automatic Updates**: Sitemap regenerates when new listings are added or approved
- **Comprehensive Coverage**: Includes static pages, categories, locations, and business listings
- **SEO Optimised**: Proper XML formatting with priorities and change frequencies
- **Manual Control**: Scripts for manual generation and testing
- **Error Handling**: Graceful handling of database errors and edge cases

## Components

### 1. Main Generation Script (`scripts/generate-sitemap.js`)

The core script that generates the sitemap.xml file.

**Usage:**
```bash
# Generate sitemap
npm run sitemap

# Generate with verbose output
npm run sitemap:verbose
```

**What it includes:**
- Static pages (home, about, contact, pricing, blog, etc.)
- Dynamic category pages from database
- Dynamic location pages from database  
- Individual business listing pages from database

### 2. Sitemap Service (`services/sitemapService.js`)

A service that manages automatic sitemap updates.

**Features:**
- Queues multiple update requests to prevent conflicts
- Schedules delayed updates to batch rapid changes
- Checks sitemap freshness and regenerates if stale
- Provides status checking and force update capabilities

### 3. Route Handler (`routes/public.js`)

Serves the sitemap.xml file at `/sitemap.xml`.

**Features:**
- Serves existing sitemap if available
- Generates sitemap on-the-fly if missing
- Proper XML content type headers

## Automatic Updates

The sitemap automatically updates when:

1. **New Business Listings Added**: When users submit new listings via dashboard
2. **Listings Approved**: When admin approves pending listings
3. **App Startup**: Checks and regenerates if sitemap is stale (>24 hours old)

### Update Triggers

```javascript
// In dashboard.js - when new listing is submitted
sitemapService.scheduleUpdate(`New business listing added: ${business_name}`, 5000);

// In admin.js - when listing is approved  
sitemapService.scheduleUpdate(`Business listing approved: ID ${businessId}`, 5000);

// In app.js - on startup
sitemapService.initialize();
```

## URL Structure

The sitemap includes these types of URLs:

### Static Pages
- `/` (priority: 1.0, changefreq: daily)
- `/search` (priority: 0.9, changefreq: daily)
- `/about` (priority: 0.7, changefreq: monthly)
- `/contact` (priority: 0.6, changefreq: monthly)
- `/pricing` (priority: 0.8, changefreq: weekly)
- `/blog` (priority: 0.7, changefreq: weekly)
- `/blog/[slug]` (priority: 0.6, changefreq: monthly)
- `/terms-of-service` (priority: 0.3, changefreq: yearly)
- `/privacy-policy` (priority: 0.3, changefreq: yearly)

### Dynamic Pages
- `/category/[slug]` (priority: 0.8, changefreq: weekly)
- `/location/[id]` (priority: 0.7, changefreq: weekly)
- `/listing/[id]/[slug]` (priority: 0.6, changefreq: monthly)

## Configuration

### Environment Variables

```bash
# Site URL for sitemap generation
SITE_URL=https://fixmyspine.com.au

# Database configuration (already configured)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=fixmyspine_db
```

### File Locations

- Generated sitemap: `public/sitemap.xml`
- Generation script: `scripts/generate-sitemap.js`
- Service: `services/sitemapService.js`
- Route handler: `routes/public.js`

## Manual Operations

### Generate Sitemap
```bash
npm run sitemap
```

### Verbose Generation (for debugging)
```bash
npm run sitemap:verbose
```

### Access Sitemap
Visit: `https://your-domain.com/sitemap.xml`

## Monitoring and Maintenance

### Check Sitemap Status
The sitemap service provides status checking:
```javascript
const status = sitemapService.checkSitemapStatus();
console.log(status);
// { exists: true, isRecent: true, lastModified: Date, ageHours: 2.5 }
```

### Force Update
```javascript
await sitemapService.forceUpdate('Manual force update');
```

### Logs
Monitor application logs for sitemap-related messages:
- `🗺️ Sitemap update requested: [reason]`
- `✅ Sitemap updated successfully`
- `❌ Sitemap update failed`

## Error Handling

The system handles various error scenarios:

1. **Database Connection Issues**: Gracefully continues with static pages only
2. **File System Errors**: Logs errors and continues operation
3. **Concurrent Updates**: Queues multiple update requests to prevent conflicts
4. **Missing Sitemap**: Generates on-the-fly when requested

## Performance Considerations

- **Batched Updates**: Multiple rapid changes are batched with a 30-second delay
- **Queued Processing**: Prevents concurrent sitemap generation
- **Efficient Queries**: Uses optimised database queries for content fetching
- **Cached Generation**: Serves existing sitemap when available

## SEO Benefits

- **Complete Coverage**: All public pages included in sitemap
- **Proper Priorities**: High-priority pages (home, search) get priority 1.0/0.9
- **Change Frequencies**: Helps search engines understand update patterns
- **Last Modified Dates**: Provides freshness indicators for dynamic content

## Troubleshooting

### Sitemap Not Updating
1. Check application logs for error messages
2. Verify database connection and data
3. Run manual generation: `npm run sitemap:verbose`
4. Check file permissions on `public/sitemap.xml`

### Missing URLs
1. Verify database has categories, locations, and approved businesses
2. Check URL generation logic in the script
3. Ensure all routes are properly defined

### Performance Issues
1. Monitor database query performance
2. Check for excessive automatic updates
3. Consider adjusting update delays in the service

## Future Enhancements

Potential improvements for the sitemap system:

1. **Sitemap Index**: For sites with >50,000 URLs
2. **Image Sitemaps**: Include business photos and logos
3. **Video Sitemaps**: If video content is added
4. **News Sitemaps**: For blog/news content
5. **Hreflang Support**: For internationalization
6. **Caching Layer**: Redis/memcached for large sites
7. **Webhook Integration**: Notify search engines of updates
8. **Analytics Integration**: Track sitemap performance

## Security Considerations

- Sitemap generation is read-only (no database modifications)
- Proper input sanitization for XML generation
- No sensitive data exposed in URLs
- Rate limiting on sitemap generation (via queuing)

## Testing

To test the sitemap system:

1. **Generate Test Data**: Use seed scripts to create test listings
2. **Manual Generation**: Run `npm run sitemap:verbose`
3. **Verify XML**: Check generated sitemap.xml for proper formatting
4. **Test Updates**: Add new listings and verify automatic updates
5. **Validate URLs**: Ensure all URLs in sitemap are accessible

## Support

For issues with the sitemap system:
1. Check application logs
2. Run verbose generation for debugging
3. Verify database connectivity and data
4. Test manual generation first
5. Review this documentation for configuration issues
