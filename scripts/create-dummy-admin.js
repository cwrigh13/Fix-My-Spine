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

async function createDummyAdmins() {
    try {
        console.log('🔐 Creating dummy admin users...\n');

        const adminUsers = [
            {
                name: 'Super Admin',
                email: 'admin@fixmyspine.com.au',
                password: 'admin123'
            },
            {
                name: 'Test Admin',
                email: 'test@fixmyspine.com.au',
                password: 'test123'
            },
            {
                name: 'Demo Admin',
                email: 'demo@fixmyspine.com.au',
                password: 'demo123'
            }
        ];

        for (const admin of adminUsers) {
            const hashedPassword = await bcrypt.hash(admin.password, 12);
            const query = 'INSERT IGNORE INTO users (name, email, password, is_admin) VALUES (?, ?, ?, TRUE)';
            
            await new Promise((resolve, reject) => {
                connection.execute(query, [admin.name, admin.email, hashedPassword], (err, results) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            console.log(`   ⚠️  Admin ${admin.email} already exists`);
                        } else {
                            console.log(`   ❌ Error creating ${admin.email}: ${err.message}`);
                        }
                    } else {
                        console.log(`   ✅ Created admin: ${admin.email}`);
                    }
                    resolve();
                });
            });
        }

        console.log('\n🎉 Admin users created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('   • Email: admin@fixmyspine.com.au | Password: admin123');
        console.log('   • Email: test@fixmyspine.com.au | Password: test123');
        console.log('   • Email: demo@fixmyspine.com.au | Password: demo123');
        console.log('\n🌐 Access URL: http://localhost:3000/admin/login');

    } catch (error) {
        console.error('❌ Error creating admin users:', error.message);
    } finally {
        connection.end();
    }
}

// Check if we're running this script directly
if (require.main === module) {
    createDummyAdmins();
}

module.exports = { createDummyAdmins };
