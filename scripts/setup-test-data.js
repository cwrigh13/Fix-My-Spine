const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
require('dotenv').config();

// Create a connection to the database
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

async function setupTestData() {
    try {
        console.log('🚀 Setting up test data for FixMySpine Admin Dashboard...\n');

        // 1. Create Admin Users
        console.log('📝 Creating admin users...');
        const adminUsers = [
            {
                name: 'Admin User',
                email: 'admin@fixmyspine.com.au',
                password: 'admin123'
            },
            {
                name: 'Test Admin',
                email: 'test@fixmyspine.com.au',
                password: 'test123'
            }
        ];

        for (const admin of adminUsers) {
            const hashedPassword = await bcrypt.hash(admin.password, 12);
            const query = 'INSERT IGNORE INTO users (name, email, password, is_admin) VALUES (?, ?, ?, TRUE)';
            
            await new Promise((resolve, reject) => {
                connection.execute(query, [admin.name, admin.email, hashedPassword], (err, results) => {
                    if (err) {
                        console.log(`   ⚠️  Admin ${admin.email} already exists or error occurred`);
                    } else {
                        console.log(`   ✅ Created admin: ${admin.email}`);
                    }
                    resolve();
                });
            });
        }

        // 2. Create Categories
        console.log('\n🏥 Creating service categories...');
        const categories = [
            'Chiropractor',
            'Physiotherapist',
            'Osteopath',
            'Massage Therapist',
            'Acupuncturist',
            'Podiatrist',
            'Sports Medicine',
            'Rehabilitation Specialist',
            'Pain Management',
            'Wellness Center'
        ];

        for (const category of categories) {
            const slug = category.toLowerCase().replace(/\s+/g, '-');
            const query = 'INSERT IGNORE INTO categories (name, slug) VALUES (?, ?)';
            
            await new Promise((resolve, reject) => {
                connection.execute(query, [category, slug], (err, results) => {
                    if (err) {
                        console.log(`   ⚠️  Category ${category} already exists or error occurred`);
                    } else {
                        console.log(`   ✅ Created category: ${category}`);
                    }
                    resolve();
                });
            });
        }

        // 3. Create Locations
        console.log('\n📍 Creating locations...');
        const locations = [
            { suburb: 'Sydney CBD', postcode: '2000', state: 'NSW' },
            { suburb: 'Melbourne CBD', postcode: '3000', state: 'VIC' },
            { suburb: 'Brisbane CBD', postcode: '4000', state: 'QLD' },
            { suburb: 'Perth CBD', postcode: '6000', state: 'WA' },
            { suburb: 'Adelaide CBD', postcode: '5000', state: 'SA' },
            { suburb: 'Hobart CBD', postcode: '7000', state: 'TAS' },
            { suburb: 'Darwin CBD', postcode: '0800', state: 'NT' },
            { suburb: 'Canberra CBD', postcode: '2600', state: 'ACT' },
            { suburb: 'Parramatta', postcode: '2150', state: 'NSW' },
            { suburb: 'Gold Coast', postcode: '4217', state: 'QLD' }
        ];

        for (const location of locations) {
            const query = 'INSERT IGNORE INTO locations (suburb, postcode, state) VALUES (?, ?, ?)';
            
            await new Promise((resolve, reject) => {
                connection.execute(query, [location.suburb, location.postcode, location.state], (err, results) => {
                    if (err) {
                        console.log(`   ⚠️  Location ${location.suburb} already exists or error occurred`);
                    } else {
                        console.log(`   ✅ Created location: ${location.suburb}, ${location.state}`);
                    }
                    resolve();
                });
            });
        }

        // 4. Create Regular Users (Business Owners)
        console.log('\n👥 Creating business owner users...');
        const businessOwners = [
            {
                name: 'Dr. Sarah Johnson',
                email: 'sarah@spinecare.com.au',
                password: 'password123'
            },
            {
                name: 'Michael Chen',
                email: 'michael@wellnessplus.com.au',
                password: 'password123'
            },
            {
                name: 'Dr. Emma Wilson',
                email: 'emma@backpainclinic.com.au',
                password: 'password123'
            },
            {
                name: 'James Thompson',
                email: 'james@physiohealth.com.au',
                password: 'password123'
            }
        ];

        const userIds = [];
        for (const owner of businessOwners) {
            const hashedPassword = await bcrypt.hash(owner.password, 12);
            const query = 'INSERT IGNORE INTO users (name, email, password, is_admin) VALUES (?, ?, ?, FALSE)';
            
            await new Promise((resolve, reject) => {
                connection.execute(query, [owner.name, owner.email, hashedPassword], (err, results) => {
                    if (err) {
                        console.log(`   ⚠️  User ${owner.email} already exists or error occurred`);
                    } else {
                        console.log(`   ✅ Created user: ${owner.email}`);
                        userIds.push(results.insertId);
                    }
                    resolve();
                });
            });
        }

        // 5. Create Business Listings
        console.log('\n🏢 Creating business listings...');
        
        // First, get category and location IDs
        const categoryQuery = 'SELECT id, name FROM categories ORDER BY name';
        const locationQuery = 'SELECT id, suburb FROM locations ORDER BY suburb';
        const userQuery = 'SELECT id, name FROM users WHERE is_admin = FALSE ORDER BY id';
        
        const [categoryResults] = await new Promise((resolve, reject) => {
            connection.execute(categoryQuery, (err, results) => {
                if (err) reject(err);
                else resolve([results]);
            });
        });

        const [locationResults] = await new Promise((resolve, reject) => {
            connection.execute(locationQuery, (err, results) => {
                if (err) reject(err);
                else resolve([results]);
            });
        });

        const [userResults] = await new Promise((resolve, reject) => {
            connection.execute(userQuery, (err, results) => {
                if (err) reject(err);
                else resolve([results]);
            });
        });

        const businessListings = [
            {
                business_name: 'Sydney Spine Care Clinic',
                address: '123 George Street, Sydney NSW 2000',
                phone: '(02) 9123 4567',
                website: 'https://sydneyspinecare.com.au',
                description: 'Professional chiropractic care for all ages. Specializing in back pain, neck pain, and sports injuries. State-of-the-art equipment and personalized treatment plans.',
                listing_tier: 'premium',
                is_approved: true,
                category_name: 'Chiropractor',
                location_suburb: 'Sydney CBD',
                user_name: 'Dr. Sarah Johnson'
            },
            {
                business_name: 'Melbourne Wellness Plus',
                address: '456 Collins Street, Melbourne VIC 3000',
                phone: '(03) 9123 4567',
                website: 'https://wellnessplus.com.au',
                description: 'Comprehensive wellness services including physiotherapy, massage therapy, and acupuncture. Helping you achieve optimal health and wellbeing.',
                listing_tier: 'free',
                is_approved: false,
                category_name: 'Wellness Center',
                location_suburb: 'Melbourne CBD',
                user_name: 'Michael Chen'
            },
            {
                business_name: 'Brisbane Back Pain Clinic',
                address: '789 Queen Street, Brisbane QLD 4000',
                phone: '(07) 3123 4567',
                website: 'https://brisbanebackpain.com.au',
                description: 'Specialized treatment for chronic back pain and spinal conditions. Our experienced team uses the latest techniques to provide effective pain relief.',
                listing_tier: 'premium',
                is_approved: true,
                category_name: 'Pain Management',
                location_suburb: 'Brisbane CBD',
                user_name: 'Dr. Emma Wilson'
            },
            {
                business_name: 'Perth Physio Health',
                address: '321 St Georges Terrace, Perth WA 6000',
                phone: '(08) 9123 4567',
                website: 'https://perthphysiohealth.com.au',
                description: 'Expert physiotherapy services for injury recovery and prevention. We work with athletes, office workers, and everyone in between.',
                listing_tier: 'free',
                is_approved: true,
                category_name: 'Physiotherapist',
                location_suburb: 'Perth CBD',
                user_name: 'James Thompson'
            },
            {
                business_name: 'Adelaide Sports Medicine',
                address: '654 Rundle Mall, Adelaide SA 5000',
                phone: '(08) 8123 4567',
                website: 'https://adelaidesportsmed.com.au',
                description: 'Specialized sports medicine and rehabilitation services. Helping athletes and active individuals recover from injuries and improve performance.',
                listing_tier: 'premium',
                is_approved: false,
                category_name: 'Sports Medicine',
                location_suburb: 'Adelaide CBD',
                user_name: 'Dr. Sarah Johnson'
            }
        ];

        for (const business of businessListings) {
            // Find matching category and location
            const category = categoryResults.find(c => c.name === business.category_name);
            const location = locationResults.find(l => l.suburb === business.location_suburb);
            const user = userResults.find(u => u.name === business.user_name);

            if (category && location && user) {
                const query = `INSERT IGNORE INTO businesses 
                    (user_id, category_id, location_id, business_name, address, phone, website, description, listing_tier, is_approved) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                await new Promise((resolve, reject) => {
                    connection.execute(query, [
                        user.id,
                        category.id,
                        location.id,
                        business.business_name,
                        business.address,
                        business.phone,
                        business.website,
                        business.description,
                        business.listing_tier,
                        business.is_approved
                    ], (err, results) => {
                        if (err) {
                            console.log(`   ⚠️  Business ${business.business_name} already exists or error occurred`);
                        } else {
                            console.log(`   ✅ Created business: ${business.business_name} (${business.is_approved ? 'Approved' : 'Pending'})`);
                        }
                        resolve();
                    });
                });
            }
        }

        console.log('\n🎉 Test data setup completed successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   Admin Users:');
        console.log('   • Email: admin@fixmyspine.com.au | Password: admin123');
        console.log('   • Email: test@fixmyspine.com.au | Password: test123');
        console.log('\n   Business Owner Users:');
        console.log('   • Email: sarah@spinecare.com.au | Password: password123');
        console.log('   • Email: michael@wellnessplus.com.au | Password: password123');
        console.log('   • Email: emma@backpainclinic.com.au | Password: password123');
        console.log('   • Email: james@physiohealth.com.au | Password: password123');
        console.log('\n🌐 Access URLs:');
        console.log('   • Admin Login: http://localhost:3000/admin/login');
        console.log('   • Admin Dashboard: http://localhost:3000/admin/dashboard');
        console.log('   • Business Listings: http://localhost:3000/admin/listings');
        console.log('\n💡 Test Features:');
        console.log('   • Login with admin credentials to access the dashboard');
        console.log('   • View business listings with approve/edit/delete actions');
        console.log('   • Test the approval workflow with pending listings');
        console.log('   • Edit business information and test form validation');

    } catch (error) {
        console.error('❌ Error setting up test data:', error.message);
    } finally {
        connection.end();
    }
}

// Check if we're running this script directly
if (require.main === module) {
    setupTestData();
}

module.exports = { setupTestData };
