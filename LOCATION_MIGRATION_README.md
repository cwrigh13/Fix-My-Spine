# Location Migration & Postcode-Based Proximity Search

This migration transforms the location search functionality from a dropdown selection to a postcode-based proximity search system. The system calculates distances using the Haversine formula and displays results sorted by proximity to the user's location.

## What This Migration Does

1. **Adds Geolocation Fields**: Adds `latitude` and `longitude` columns to the `locations` table
2. **Adds Population Field**: Adds a `population` column to the `locations` table
3. **Populates Data**: Inserts location data with coordinates for major Australian cities
4. **Replaces UI**: Changes location dropdown to a postcode input field
5. **Implements Proximity Search**: Calculates and displays distances from entered postcode
6. **Improves UX**: Shows practitioners sorted by distance with km indicators

## Cities Included (Population > 75,000)

### New South Wales
- Sydney (5.3M), Newcastle (322K), Wollongong (296K), Maitland (92K)

### Victoria  
- Melbourne (5.1M), Geelong (271K), Ballarat (112K), Bendigo (103K), Shepparton (51K)

### Queensland
- Brisbane (2.6M), Gold Coast (710K), Townsville (195K), Cairns (154K), Toowoomba (142K), Rockhampton (82K), Mackay (81K), Bundaberg (71K)

### Western Australia
- Perth (2.1M), Rockingham (131K), Mandurah (90K), Bunbury (75K)

### South Australia
- Adelaide (1.3M), Mount Gambier (26K)

### Tasmania
- Hobart (247K), Launceston (87K)

### Australian Capital Territory
- Canberra (454K)

### Northern Territory
- Darwin (140K)

## How to Run the Migration

### Option 1: Using the Migration Script
```bash
node scripts/migrate-locations.js
```

### Option 2: Manual SQL Execution
```bash
mysql -u your_username -p your_database < DATABASE_MIGRATION.sql
```

## Files Modified

- `schema.sql` - Added population, latitude, and longitude fields to locations table
- `DATABASE_MIGRATION.sql` - Migration SQL with population and coordinate data
- `routes/public.js` - Implemented postcode-based proximity search with Haversine formula
- `views/public/index.ejs` - Replaced location dropdown with postcode input
- `views/public/search-results.ejs` - Added distance display and postcode input

## How It Works

### 1. User Input
Users enter a 4-digit Australian postcode (e.g., 2000 for Sydney CBD)

### 2. Coordinate Lookup
The system looks up the latitude and longitude for the entered postcode from the locations table

### 3. Distance Calculation
For each practitioner, the system calculates the distance using the Haversine formula:
```
distance = 6371 × arccos(
    cos(lat1) × cos(lat2) × cos(lng2 - lng1) + 
    sin(lat1) × sin(lat2)
)
```
Where 6371 is Earth's radius in kilometers

### 4. Results Sorting
Results are sorted by:
1. Premium tier listings first
2. Distance from the entered postcode (closest first)

### 5. Distance Display
Each listing shows the calculated distance with a badge (e.g., "5 km away")

## Data Source

Population data is based on the Australian Bureau of Statistics (ABS) 2021 Census data.

## Benefits

1. **Personalised Results**: Users get practitioners sorted by actual proximity to their location
2. **Better UX**: Simple postcode entry instead of scrolling through long dropdowns
3. **Transparent Distance**: Users see exactly how far each practitioner is
4. **Flexible Search**: Works with any valid Australian postcode in the database
5. **SEO Friendly**: Search results pages show location-specific titles
6. **Premium Priority**: Premium listings still appear first, then sorted by distance

## Example Usage

### Search by Postcode
1. User enters "2000" (Sydney CBD)
2. System finds Sydney's coordinates: -33.8688, 151.2093
3. Calculates distance to all practitioners
4. Shows results: "5 km away", "12 km away", "25 km away", etc.

### Search Without Postcode
If no postcode is entered, results are sorted alphabetically with premium listings first (no distance calculation).

## Reverting Changes

If you need to revert this migration:

1. Restore location dropdown in views (copy from previous version)
2. Update routes/public.js to use location_id instead of postcode
3. Optionally drop the coordinate columns:
   ```sql
   ALTER TABLE locations DROP COLUMN latitude;
   ALTER TABLE locations DROP COLUMN longitude;
   ALTER TABLE locations DROP COLUMN population;
   ```

## Testing

After running the migration:

1. **Homepage Test**: 
   - Visit the homepage
   - Verify postcode input field is displayed instead of dropdown
   - Try entering a valid postcode (e.g., "2000")
   - Confirm form validation requires 4-digit numeric input

2. **Search Test**:
   - Enter postcode "2000" and search
   - Verify results show distance badges (e.g., "5 km away")
   - Confirm results are sorted by distance (closest first)
   - Check premium listings still appear before non-premium

3. **Search Without Postcode**:
   - Leave postcode blank and search
   - Verify results still display correctly
   - Confirm no distance badges appear
   - Check alphabetical sorting is maintained

4. **Invalid Postcode Test**:
   - Try entering invalid postcodes (letters, <4 digits, etc.)
   - Verify HTML5 validation prevents invalid submissions

5. **Database Test**:
   - Run: `SELECT suburb, postcode, latitude, longitude FROM locations WHERE latitude IS NOT NULL LIMIT 5;`
   - Verify coordinates are populated correctly
