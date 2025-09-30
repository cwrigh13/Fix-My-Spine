require('dotenv').config();
const pool = require('./config/database');

async function checkDatabase() {
    try {
        console.log('Checking database...');
        
        const [businesses] = await pool.promise().execute('SELECT * FROM businesses');
        console.log(`\n📊 Businesses found: ${businesses.length}`);
        
        if (businesses.length > 0) {
            console.log('\nBusinesses:');
            businesses.forEach(b => {
                console.log(`  - ID: ${b.id}, Name: ${b.business_name}, Approved: ${b.is_approved}`);
            });
        }
        
        const [categories] = await pool.promise().execute('SELECT * FROM categories');
        console.log(`\n📋 Categories found: ${categories.length}`);
        
        const [locations] = await pool.promise().execute('SELECT * FROM locations');
        console.log(`📍 Locations found: ${locations.length}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDatabase();
