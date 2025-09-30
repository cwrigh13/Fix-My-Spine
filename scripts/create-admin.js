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

async function createAdminUser() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    try {
        console.log('=== Create Admin User ===\n');
        
        const name = await question('Enter admin name: ');
        const email = await question('Enter admin email: ');
        const password = await question('Enter admin password: ');
        
        if (!name || !email || !password) {
            console.log('Error: All fields are required!');
            rl.close();
            return;
        }

        // Hash the password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Insert the admin user
        const query = 'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, TRUE)';
        
        connection.execute(query, [name, email, hashedPassword], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.log('Error: A user with this email already exists!');
                } else {
                    console.error('Database error:', err.message);
                }
            } else {
                console.log(`\n✅ Admin user created successfully!`);
                console.log(`   Name: ${name}`);
                console.log(`   Email: ${email}`);
                console.log(`   User ID: ${results.insertId}`);
                console.log(`\nYou can now login at: http://localhost:3000/admin/login`);
            }
            rl.close();
            connection.end();
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        rl.close();
        connection.end();
    }
}

// Check if we're running this script directly
if (require.main === module) {
    createAdminUser();
}

module.exports = { createAdminUser };
