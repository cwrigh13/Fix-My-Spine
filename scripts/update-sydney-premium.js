const mysql = require('mysql2');
require('dotenv').config();

// Create a connection to the database
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

async function updateSydneyToPremium() {
    try {
        console.log('🔍 Looking for Sydney Spine Care Clinic...');
        
        // First, let's check the current status
        const checkQuery = 'SELECT id, business_name, listing_tier, is_approved FROM businesses WHERE business_name LIKE ?';
        
        const [checkResults] = await new Promise((resolve, reject) => {
            connection.execute(checkQuery, ['%Sydney Spine Care%'], (err, results) => {
                if (err) reject(err);
                else resolve([results]);
            });
        });

        if (checkResults.length === 0) {
            console.log('❌ Sydney Spine Care Clinic not found in database');
            return;
        }

        const business = checkResults[0];
        console.log(`📋 Found: ${business.business_name}`);
        console.log(`   Current tier: ${business.listing_tier}`);
        console.log(`   Approved: ${business.is_approved}`);

        // Update to premium
        const updateQuery = 'UPDATE businesses SET listing_tier = "premium" WHERE id = ?';
        
        await new Promise((resolve, reject) => {
            connection.execute(updateQuery, [business.id], (err, results) => {
                if (err) reject(err);
                else {
                    console.log(`✅ Updated ${business.business_name} to premium tier!`);
                    console.log(`   Rows affected: ${results.affectedRows}`);
                    resolve();
                }
            });
        });

        // Verify the update
        const verifyQuery = 'SELECT business_name, listing_tier, is_approved FROM businesses WHERE id = ?';
        const [verifyResults] = await new Promise((resolve, reject) => {
            connection.execute(verifyQuery, [business.id], (err, results) => {
                if (err) reject(err);
                else resolve([results]);
            });
        });

        console.log('\n🎯 Verification:');
        console.log(`   Business: ${verifyResults[0].business_name}`);
        console.log(`   Tier: ${verifyResults[0].listing_tier}`);
        console.log(`   Approved: ${verifyResults[0].is_approved}`);

        console.log('\n🌐 You can now view the premium listing at:');
        console.log('   • Homepage: http://localhost:3000/');
        console.log('   • Search results: http://localhost:3000/search');
        console.log('   • Chiropractor category: http://localhost:3000/category/chiropractor');

    } catch (error) {
        console.error('❌ Error updating Sydney Spine Care Clinic:', error.message);
    } finally {
        connection.end();
    }
}

// Check if we're running this script directly
if (require.main === module) {
    updateSydneyToPremium();
}

module.exports = { updateSydneyToPremium };
