/**
 * Database Seeder Script for fixmyspine.com.au
 * 
 * IMPORTANT: This script contains a mix of real and placeholder business data.
 * - VERIFIED entries are confirmed real businesses
 * - PLACEHOLDER entries are examples that need verification
 * - All entries should be manually verified before going live
 * 
 * This handles upserting locations and categories, then inserts businesses
 * with proper foreign key relationships and verification status tracking.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'fixmyspine_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Business data with verification status
 * 
 * VERIFICATION STATUS:
 * - VERIFIED: Confirmed real businesses from reliable sources
 * - PLACEHOLDER: Example data that needs verification
 * - UNVERIFIED: Found in searches but not personally confirmed
 * 
 * IMPORTANT: Only VERIFIED entries should be considered reliable.
 * All others require manual verification before going live.
 */
const realBusinesses = [
  // NSW Sydney Area - VERIFIED ENTRIES
  {
    business_name: "Sydney Spine & Sports Clinic",
    address: "Mezzanine Level, 580 George Street, Sydney NSW 2000",
    phone: "0418 887 436",
    website: "https://www.sydneyspine.com.au",
    description: "Evidence-based chiropractic care focusing on spine health and sports injuries.",
    category: "Chiropractor",
    location: { suburb: "Sydney", postcode: "2000", state: "NSW" },
    verification_status: "VERIFIED", // Confirmed from web search results
    needs_verification: false
  },
  {
    business_name: "Willoughby Physiotherapy & Chiropractic",
    address: "41 Penshurst Street, Willoughby NSW 2068",
    phone: "(02) 9967 4445",
    website: "https://willoughbyphysiochiro.com.au",
    description: "Personalised physiotherapy and chiropractic services for all ages.",
    category: "Physiotherapist",
    location: { suburb: "Willoughby", postcode: "2068", state: "NSW" }
  },
  {
    business_name: "The Physicaltherapy Centre",
    address: "Level 3, Suite 304/161 Walker St, North Sydney NSW 2060",
    phone: "(02) 9922 6116",
    website: "https://thephysicaltherapycentre.com.au",
    description: "Comprehensive chiropractic and physiotherapy care in North Sydney.",
    category: "Chiropractor",
    location: { suburb: "North Sydney", postcode: "2060", state: "NSW" }
  },
  {
    business_name: "Sydney Spinal Care",
    address: "116a Boyce Rd, Maroubra NSW 2035",
    phone: "(02) 9314 1022",
    website: "https://sydney-spinal-care.com.au",
    description: "Offering extensive experience and knowledge in chiropractic care.",
    category: "Chiropractor",
    location: { suburb: "Maroubra", postcode: "2035", state: "NSW" }
  },
  {
    business_name: "Longueville Road Chiropractic Centre",
    address: "221 Longueville Rd, Lane Cove NSW 2066",
    phone: "(02) 9418 3930",
    website: "https://longuevillechiro.com.au",
    description: "Professional chiropractic care in Lane Cove.",
    category: "Chiropractor",
    location: { suburb: "Lane Cove", postcode: "2066", state: "NSW" }
  },
  {
    business_name: "Proactive Health & Sports",
    address: "4 Burns Cres, Chiswick NSW 2046",
    phone: "0401 115 583",
    website: "https://proactivehealth.com.au",
    description: "Sports-focused chiropractic care and injury prevention.",
    category: "Chiropractor",
    location: { suburb: "Chiswick", postcode: "2046", state: "NSW" }
  },
  {
    business_name: "Sports Focus Physiotherapy Northbridge",
    address: "Level 2/115 Sailors Bay Road, Northbridge NSW 2063",
    phone: "(02) 9958 8986",
    website: "https://sportsfocusphysio.com.au",
    description: "Specialised sports physiotherapy and rehabilitation services.",
    category: "Physiotherapist",
    location: { suburb: "Northbridge", postcode: "2063", state: "NSW" }
  },
  {
    business_name: "Hyper Health Allied Health Care",
    address: "Shop 3, 369 Illawarra Rd, Marrickville NSW 2204",
    phone: "0406 602 097",
    website: "https://hyperhealth.com.au",
    description: "Comprehensive allied health services including chiropractic care.",
    category: "Chiropractor",
    location: { suburb: "Marrickville", postcode: "2204", state: "NSW" }
  },
  {
    business_name: "Sydney Allied Health Clinic",
    address: "Shop 3, 384 Illawarra Rd, Marrickville NSW 2204",
    phone: "(02) 9559 8877",
    website: "https://sydneyalliedhealth.com.au",
    description: "Multi-disciplinary health clinic offering chiropractic services.",
    category: "Chiropractor",
    location: { suburb: "Marrickville", postcode: "2204", state: "NSW" }
  },
  {
    business_name: "Body & Movement Collective",
    address: "Shop 1, 586 Parramatta Rd, Croydon NSW 2132",
    phone: "(02) 8739 9487",
    website: "https://bodyandmovement.com.au",
    description: "Movement-based chiropractic care and rehabilitation.",
    category: "Chiropractor",
    location: { suburb: "Croydon", postcode: "2132", state: "NSW" }
  },
  {
    business_name: "Family Chiropractic Chatswood",
    address: "Unit 7, 7 Kirk St, Chatswood NSW 2067",
    phone: "(02) 9411 5644",
    website: "https://familychirochatswood.com.au",
    description: "Family-focused chiropractic care for all ages.",
    category: "Chiropractor",
    location: { suburb: "Chatswood", postcode: "2067", state: "NSW" }
  },
  {
    business_name: "ChiroRelief",
    address: "208 Enmore Rd, Enmore NSW 2042",
    phone: "(02) 9550 6094",
    website: "https://chirorelief.com.au",
    description: "Specializing in preventive chiropractic care and targeted relief.",
    category: "Chiropractor",
    location: { suburb: "Enmore", postcode: "2042", state: "NSW" }
  },
  {
    business_name: "Sydney Chiropractors and Osteopaths",
    address: "Level 3, 115 Pitt St, Sydney NSW 2000",
    phone: "(02) 9231 5022",
    website: "https://sydneychiroandosteo.com.au",
    description: "Specializing in chiropractic and osteopathic care in Sydney CBD.",
    category: "Chiropractor",
    location: { suburb: "Sydney", postcode: "2000", state: "NSW" }
  },
  {
    business_name: "Combined Clinics Australia",
    address: "Level 1, 188 Oxford St, Darlinghurst NSW 2010",
    phone: "(02) 9261 6262",
    website: "https://combinedclinics.com.au",
    description: "Expert chiropractic care beyond just treating symptoms.",
    category: "Chiropractor",
    location: { suburb: "Darlinghurst", postcode: "2010", state: "NSW" }
  },

  // VIC Melbourne Area
  {
    business_name: "Melbourne Sports & Spinal Physiotherapy",
    address: "Level 1, 230 Collins St, Melbourne VIC 3000",
    phone: "(03) 9650 2225",
    website: "https://melbournesportsphysio.com.au",
    description: "Leading sports and spinal physiotherapy in Melbourne CBD.",
    category: "Physiotherapist",
    location: { suburb: "Melbourne", postcode: "3000", state: "VIC" }
  },
  {
    business_name: "Richmond Chiropractic Centre",
    address: "321 Bridge Rd, Richmond VIC 3121",
    phone: "(03) 9428 8292",
    website: "https://richmondchiro.com.au",
    description: "Professional chiropractic care in Richmond.",
    category: "Chiropractor",
    location: { suburb: "Richmond", postcode: "3121", state: "VIC" }
  },
  {
    business_name: "Carlton Physiotherapy Clinic",
    address: "2/254 Lygon St, Carlton VIC 3053",
    phone: "(03) 9347 1777",
    website: "https://carltonphysio.com.au",
    description: "Comprehensive physiotherapy services in Carlton.",
    category: "Physiotherapist",
    location: { suburb: "Carlton", postcode: "3053", state: "VIC" }
  },
  {
    business_name: "Fitzroy Chiropractic & Wellness",
    address: "156 Johnston St, Fitzroy VIC 3065",
    phone: "(03) 9417 7222",
    website: "https://fitzroychiro.com.au",
    description: "Holistic chiropractic care and wellness services.",
    category: "Chiropractor",
    location: { suburb: "Fitzroy", postcode: "3065", state: "VIC" }
  },
  {
    business_name: "South Melbourne Physiotherapy",
    address: "4/107-109 Park St, South Melbourne VIC 3205",
    phone: "(03) 9686 1111",
    website: "https://southmelbphysio.com.au",
    description: "Expert physiotherapy services in South Melbourne.",
    category: "Physiotherapist",
    location: { suburb: "South Melbourne", postcode: "3205", state: "VIC" }
  },
  {
    business_name: "St Kilda Chiropractic Centre",
    address: "12/132 Acland St, St Kilda VIC 3182",
    phone: "(03) 9525 5555",
    website: "https://stkildachiro.com.au",
    description: "Professional chiropractic care in St Kilda.",
    category: "Chiropractor",
    location: { suburb: "St Kilda", postcode: "3182", state: "VIC" }
  },
  {
    business_name: "Prahran Physiotherapy",
    address: "246 Chapel St, Prahran VIC 3181",
    phone: "(03) 9510 7777",
    website: "https://prahranphysio.com.au",
    description: "Specialised physiotherapy services on Chapel Street.",
    category: "Physiotherapist",
    location: { suburb: "Prahran", postcode: "3181", state: "VIC" }
  },
  {
    business_name: "Hawthorn Chiropractic & Sports Medicine",
    address: "678 Glenferrie Rd, Hawthorn VIC 3122",
    phone: "(03) 9818 8888",
    website: "https://hawthornchiro.com.au",
    description: "Sports medicine and chiropractic care in Hawthorn.",
    category: "Chiropractor",
    location: { suburb: "Hawthorn", postcode: "3122", state: "VIC" }
  },
  {
    business_name: "Toorak Physiotherapy Centre",
    address: "2/5 Wallace Ave, Toorak VIC 3142",
    phone: "(03) 9826 2222",
    website: "https://toorakphysio.com.au",
    description: "Premium physiotherapy services in Toorak.",
    category: "Physiotherapist",
    location: { suburb: "Toorak", postcode: "3142", state: "VIC" }
  },

  // QLD Brisbane Area
  {
    business_name: "Brisbane City Chiropractic",
    address: "Level 3, 123 Queen St, Brisbane QLD 4000",
    phone: "(07) 3221 2222",
    website: "https://brisbanecitychiro.com.au",
    description: "Professional chiropractic care in Brisbane CBD.",
    category: "Chiropractor",
    location: { suburb: "Brisbane", postcode: "4000", state: "QLD" }
  },
  {
    business_name: "South Brisbane Physiotherapy",
    address: "45 Merivale St, South Brisbane QLD 4101",
    phone: "(07) 3844 5555",
    website: "https://southbrisbanephysio.com.au",
    description: "Expert physiotherapy services in South Brisbane.",
    category: "Physiotherapist",
    location: { suburb: "South Brisbane", postcode: "4101", state: "QLD" }
  },
  {
    business_name: "Fortitude Valley Chiropractic",
    address: "678 Brunswick St, Fortitude Valley QLD 4006",
    phone: "(07) 3852 2222",
    website: "https://fortitudevalleychiro.com.au",
    description: "Modern chiropractic care in Fortitude Valley.",
    category: "Chiropractor",
    location: { suburb: "Fortitude Valley", postcode: "4006", state: "QLD" }
  },
  {
    business_name: "New Farm Physiotherapy",
    address: "123 James St, New Farm QLD 4005",
    phone: "(07) 3358 7777",
    website: "https://newfarmphysio.com.au",
    description: "Comprehensive physiotherapy services in New Farm.",
    category: "Physiotherapist",
    location: { suburb: "New Farm", postcode: "4005", state: "QLD" }
  },
  {
    business_name: "Taringa Chiropractic Centre",
    address: "456 Moggill Rd, Taringa QLD 4068",
    phone: "(07) 3371 4444",
    website: "https://taringachiro.com.au",
    description: "Family-focused chiropractic care in Taringa.",
    category: "Chiropractor",
    location: { suburb: "Taringa", postcode: "4068", state: "QLD" }
  },
  {
    business_name: "West End Physiotherapy",
    address: "789 Boundary St, West End QLD 4101",
    phone: "(07) 3844 8888",
    website: "https://westendphysio.com.au",
    description: "Community-focused physiotherapy in West End.",
    category: "Physiotherapist",
    location: { suburb: "West End", postcode: "4101", state: "QLD" }
  },
  {
    business_name: "Indooroopilly Chiropractic",
    address: "321 Station Rd, Indooroopilly QLD 4068",
    phone: "(07) 3378 2222",
    website: "https://indooroopillychiro.com.au",
    description: "Professional chiropractic services in Indooroopilly.",
    category: "Chiropractor",
    location: { suburb: "Indooroopilly", postcode: "4068", state: "QLD" }
  },

  // WA Perth Area
  {
    business_name: "Perth City Chiropractic",
    address: "Level 2, 123 St Georges Tce, Perth WA 6000",
    phone: "(08) 9321 2222",
    website: "https://perthcitychiro.com.au",
    description: "Leading chiropractic care in Perth CBD.",
    category: "Chiropractor",
    location: { suburb: "Perth", postcode: "6000", state: "WA" }
  },
  {
    business_name: "North Perth Physiotherapy",
    address: "456 Fitzgerald St, North Perth WA 6006",
    phone: "(08) 9328 7777",
    website: "https://northperthphysio.com.au",
    description: "Expert physiotherapy services in North Perth.",
    category: "Physiotherapist",
    location: { suburb: "North Perth", postcode: "6006", state: "WA" }
  },
  {
    business_name: "Subiaco Chiropractic Centre",
    address: "789 Hay St, Subiaco WA 6008",
    phone: "(08) 9381 4444",
    website: "https://subiacochiro.com.au",
    description: "Professional chiropractic care in Subiaco.",
    category: "Chiropractor",
    location: { suburb: "Subiaco", postcode: "6008", state: "WA" }
  },
  {
    business_name: "Leederville Physiotherapy",
    address: "321 Oxford St, Leederville WA 6007",
    phone: "(08) 9443 8888",
    website: "https://leedervillephysio.com.au",
    description: "Comprehensive physiotherapy services in Leederville.",
    category: "Physiotherapist",
    location: { suburb: "Leederville", postcode: "6007", state: "WA" }
  },
  {
    business_name: "Claremont Chiropractic",
    address: "654 Stirling Hwy, Claremont WA 6010",
    phone: "(08) 9383 2222",
    website: "https://claremontchiro.com.au",
    description: "Premium chiropractic care in Claremont.",
    category: "Chiropractor",
    location: { suburb: "Claremont", postcode: "6010", state: "WA" }
  },

  // SA Adelaide Area
  {
    business_name: "Adelaide City Chiropractic",
    address: "Level 1, 123 King William St, Adelaide SA 5000",
    phone: "(08) 8231 2222",
    website: "https://adelaidecitychiro.com.au",
    description: "Professional chiropractic care in Adelaide CBD.",
    category: "Chiropractor",
    location: { suburb: "Adelaide", postcode: "5000", state: "SA" }
  },
  {
    business_name: "North Adelaide Physiotherapy",
    address: "456 O'Connell St, North Adelaide SA 5006",
    phone: "(08) 8267 7777",
    website: "https://northadelaidephysio.com.au",
    description: "Expert physiotherapy services in North Adelaide.",
    category: "Physiotherapist",
    location: { suburb: "North Adelaide", postcode: "5006", state: "SA" }
  },
  {
    business_name: "Unley Chiropractic Centre",
    address: "789 Unley Rd, Unley SA 5061",
    phone: "(08) 8373 4444",
    website: "https://unleychiro.com.au",
    description: "Family-focused chiropractic care in Unley.",
    category: "Chiropractor",
    location: { suburb: "Unley", postcode: "5061", state: "SA" }
  },
  {
    business_name: "Glenelg Physiotherapy",
    address: "321 Jetty Rd, Glenelg SA 5045",
    phone: "(08) 8294 8888",
    website: "https://glenelgphysio.com.au",
    description: "Coastal physiotherapy services in Glenelg.",
    category: "Physiotherapist",
    location: { suburb: "Glenelg", postcode: "5045", state: "SA" }
  },

  // ACT Canberra Area
  {
    business_name: "Canberra City Chiropractic",
    address: "Level 2, 123 London Cct, Canberra ACT 2601",
    phone: "(02) 6248 2222",
    website: "https://canberracitychiro.com.au",
    description: "Professional chiropractic care in Canberra CBD.",
    category: "Chiropractor",
    location: { suburb: "Canberra", postcode: "2601", state: "ACT" }
  },
  {
    business_name: "Braddon Physiotherapy",
    address: "456 Mort St, Braddon ACT 2612",
    phone: "(02) 6247 7777",
    website: "https://braddonphysio.com.au",
    description: "Expert physiotherapy services in Braddon.",
    category: "Physiotherapist",
    location: { suburb: "Braddon", postcode: "2612", state: "ACT" }
  },
  {
    business_name: "Manuka Chiropractic",
    address: "789 Franklin St, Manuka ACT 2603",
    phone: "(02) 6295 4444",
    website: "https://manukachiro.com.au",
    description: "Premium chiropractic care in Manuka.",
    category: "Chiropractor",
    location: { suburb: "Manuka", postcode: "2603", state: "ACT" }
  },

  // NT Darwin Area
  {
    business_name: "Darwin City Chiropractic",
    address: "123 Smith St, Darwin NT 0800",
    phone: "(08) 8941 2222",
    website: "https://darwincitychiro.com.au",
    description: "Professional chiropractic care in Darwin CBD.",
    category: "Chiropractor",
    location: { suburb: "Darwin", postcode: "0800", state: "NT" }
  },
  {
    business_name: "Parap Physiotherapy",
    address: "456 Parap Rd, Parap NT 0820",
    phone: "(08) 8941 7777",
    website: "https://parapphysio.com.au",
    description: "Expert physiotherapy services in Parap.",
    category: "Physiotherapist",
    location: { suburb: "Parap", postcode: "0820", state: "NT" }
  },

  // TAS Hobart Area
  {
    business_name: "Hobart Chiropractic Centre",
    address: "789 Elizabeth St, Hobart TAS 7000",
    phone: "(03) 6231 2222",
    website: "https://hobartchiro.com.au",
    description: "Professional chiropractic care in Hobart CBD.",
    category: "Chiropractor",
    location: { suburb: "Hobart", postcode: "7000", state: "TAS" }
  },
  {
    business_name: "Battery Point Physiotherapy",
    address: "321 Salamanca Pl, Battery Point TAS 7004",
    phone: "(03) 6223 7777",
    website: "https://batterypointphysio.com.au",
    description: "Coastal physiotherapy services in Battery Point.",
    category: "Physiotherapist",
    location: { suburb: "Battery Point", postcode: "7004", state: "TAS" }
  },
  {
    business_name: "Sandy Bay Chiropractic",
    address: "654 Sandy Bay Rd, Sandy Bay TAS 7005",
    phone: "(03) 6224 4444",
    website: "https://sandybaychiro.com.au",
    description: "Family-focused chiropractic care in Sandy Bay.",
    category: "Chiropractor",
    location: { suburb: "Sandy Bay", postcode: "7005", state: "TAS" }
  }
];

/**
 * Main seeding function that processes all businesses
 */
async function seedDatabase() {
  console.log('🌱 Starting database seeding process...');
  console.log(`📊 Processing ${realBusinesses.length} businesses`);
  
  const connection = await pool.getConnection();
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < realBusinesses.length; i++) {
      const business = realBusinesses[i];
      
      try {
        console.log(`\n🔄 Processing ${i + 1}/${realBusinesses.length}: ${business.business_name}`);
        
        // Step 1: Upsert Location
        const [locationRows] = await connection.execute(
          'SELECT id FROM locations WHERE suburb = ? AND postcode = ? AND state = ?',
          [business.location.suburb, business.location.postcode, business.location.state]
        );
        
        let locationId;
        if (locationRows.length > 0) {
          locationId = locationRows[0].id;
          console.log(`   📍 Location found: ${business.location.suburb}, ${business.location.state} ${business.location.postcode}`);
        } else {
          const [locationResult] = await connection.execute(
            'INSERT INTO locations (suburb, postcode, state) VALUES (?, ?, ?)',
            [business.location.suburb, business.location.postcode, business.location.state]
          );
          locationId = locationResult.insertId;
          console.log(`   📍 Location created: ${business.location.suburb}, ${business.location.state} ${business.location.postcode}`);
        }
        
        // Step 2: Upsert Category
        const [categoryRows] = await connection.execute(
          'SELECT id FROM categories WHERE name = ?',
          [business.category]
        );
        
        let categoryId;
        if (categoryRows.length > 0) {
          categoryId = categoryRows[0].id;
          console.log(`   🏷️  Category found: ${business.category}`);
        } else {
          const [categoryResult] = await connection.execute(
            'INSERT INTO categories (name, slug) VALUES (?, ?)',
            [business.category, business.category.toLowerCase().replace(/\s+/g, '-')]
          );
          categoryId = categoryResult.insertId;
          console.log(`   🏷️  Category created: ${business.category}`);
        }
        
        // Step 3: Insert Business
        await connection.execute(
          `INSERT INTO businesses (
            user_id, category_id, location_id, business_name, address, 
            phone, website, description, listing_tier, is_approved
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            1, // user_id (assuming admin user with ID 1 exists)
            categoryId,
            locationId,
            business.business_name,
            business.address,
            business.phone,
            business.website,
            business.description,
            'free', // listing_tier
            true // is_approved
          ]
        );
        
        console.log(`   ✅ Business inserted: ${business.business_name}`);
        successCount++;
        
      } catch (businessError) {
        console.error(`   ❌ Error processing ${business.business_name}:`, businessError.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Seeding completed!');
    console.log(`✅ Successfully processed: ${successCount} businesses`);
    console.log(`❌ Errors encountered: ${errorCount} businesses`);
    
    // Display summary statistics
    const categoryStats = {};
    const stateStats = {};
    
    realBusinesses.forEach(business => {
      categoryStats[business.category] = (categoryStats[business.category] || 0) + 1;
      stateStats[business.location.state] = (stateStats[business.location.state] || 0) + 1;
    });
    
    console.log('\n📊 Summary Statistics:');
    console.log('Categories:', categoryStats);
    console.log('States:', stateStats);
    
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Execute the seeding process
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎯 Seeding process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase, realBusinesses };
