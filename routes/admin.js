const express = require('express');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Create a connection pool to the database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET /admin/login - Render the admin login form
router.get('/login', (req, res) => {
    // If user is already logged in as admin, redirect to dashboard
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin/dashboard');
    }
    
    res.render('admin/login', { 
        title: 'Admin Login',
        error: req.session.loginError || null
    });
    
    // Clear any error messages after displaying them
    if (req.session.loginError) {
        delete req.session.loginError;
    }
});

// POST /admin/login - Handle admin login form submission
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
        req.session.loginError = 'Email and password are required';
        return res.redirect('/admin/login');
    }
    
    try {
        // Find user by email and check if they are admin
        const query = 'SELECT id, name, email, password FROM users WHERE email = ? AND is_admin = TRUE';
        
        pool.execute(query, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                req.session.loginError = 'An error occurred. Please try again.';
                return res.redirect('/admin/login');
            }
            
            if (results.length === 0) {
                req.session.loginError = 'Invalid email or password';
                return res.redirect('/admin/login');
            }
            
            const user = results[0];
            
            // Compare the provided password with the hashed password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                req.session.loginError = 'Invalid email or password';
                return res.redirect('/admin/login');
            }
            
            // Set admin session
            req.session.isAdmin = true;
            req.session.adminUser = {
                id: user.id,
                name: user.name,
                email: user.email
            };
            
            // Redirect to admin dashboard
            res.redirect('/admin/dashboard');
        });
        
    } catch (error) {
        console.error('Login error:', error);
        req.session.loginError = 'An error occurred. Please try again.';
        res.redirect('/admin/login');
    }
});

// GET /admin/dashboard - Protected admin dashboard
router.get('/dashboard', requireAdmin, (req, res) => {
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        adminUser: req.session.adminUser
    });
});

// GET /admin/logout - Logout and destroy session
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/admin/login');
    });
});

// GET /admin/listings - List all business listings
router.get('/listings', requireAdmin, (req, res) => {
    const query = `
        SELECT 
            b.id,
            b.business_name,
            b.address,
            b.phone,
            b.website,
            b.description,
            b.listing_tier,
            b.is_approved,
            b.created_at,
            c.name as category_name,
            l.suburb as location_name
        FROM businesses b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN locations l ON b.location_id = l.id
        ORDER BY b.created_at DESC
    `;
    
    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('admin/listings', {
                title: 'Business Listings',
                adminUser: req.session.adminUser,
                listings: [],
                error: 'Error fetching listings',
                success: null
            });
        }
        
        // Get session messages and clear them
        const success = req.session.success || null;
        const error = req.session.error || null;
        
        if (req.session.success) delete req.session.success;
        if (req.session.error) delete req.session.error;
        
        res.render('admin/listings', {
            title: 'Business Listings',
            adminUser: req.session.adminUser,
            listings: results,
            error: error,
            success: success,
            req: req
        });
    });
});

// POST /admin/listings/:id/approve - Approve a business listing
router.post('/listings/:id/approve', requireAdmin, (req, res) => {
    const businessId = req.params.id;
    
    const query = 'UPDATE businesses SET is_approved = TRUE WHERE id = ?';
    
    pool.execute(query, [businessId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error approving listing';
        } else if (results.affectedRows === 0) {
            req.session.error = 'Listing not found';
        } else {
            req.session.success = 'Listing approved successfully';
        }
        
        res.redirect('/admin/listings');
    });
});

// GET /admin/listings/:id/edit - Show edit form for a business listing
router.get('/listings/:id/edit', requireAdmin, (req, res) => {
    const businessId = req.params.id;
    
    // First, get the business data
    const businessQuery = `
        SELECT 
            b.*,
            c.name as category_name,
            l.suburb as location_name
        FROM businesses b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN locations l ON b.location_id = l.id
        WHERE b.id = ?
    `;
    
    pool.execute(businessQuery, [businessId], (err, businessResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.redirect('/admin/listings');
        }
        
        if (businessResults.length === 0) {
            req.session.error = 'Business listing not found';
            return res.redirect('/admin/listings');
        }
        
        const business = businessResults[0];
        
        // Get all categories and locations for dropdowns
        const categoriesQuery = 'SELECT id, name FROM categories ORDER BY name';
        const locationsQuery = 'SELECT id, suburb FROM locations ORDER BY suburb';
        
        pool.execute(categoriesQuery, (err, categories) => {
            if (err) {
                console.error('Database error:', err);
                return res.redirect('/admin/listings');
            }
            
            pool.execute(locationsQuery, (err, locations) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.redirect('/admin/listings');
                }
                
                res.render('admin/edit-listing', {
                    title: 'Edit Business Listing',
                    adminUser: req.session.adminUser,
                    business: business,
                    categories: categories,
                    locations: locations,
                    error: null,
                    req: req
                });
            });
        });
    });
});

// POST /admin/listings/:id/edit - Update a business listing
router.post('/listings/:id/edit', requireAdmin, (req, res) => {
    const businessId = req.params.id;
    const { business_name, address, phone, website, description, category_id, location_id, listing_tier } = req.body;
    
    // Basic validation
    if (!business_name || !category_id || !location_id) {
        req.session.error = 'Business name, category, and location are required';
        return res.redirect(`/admin/listings/${businessId}/edit`);
    }
    
    const query = `
        UPDATE businesses 
        SET business_name = ?, address = ?, phone = ?, website = ?, 
            description = ?, category_id = ?, location_id = ?, listing_tier = ?
        WHERE id = ?
    `;
    
    const values = [business_name, address, phone, website, description, category_id, location_id, listing_tier, businessId];
    
    pool.execute(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error updating listing';
        } else if (results.affectedRows === 0) {
            req.session.error = 'Listing not found';
        } else {
            req.session.success = 'Listing updated successfully';
        }
        
        res.redirect('/admin/listings');
    });
});

// POST /admin/listings/:id/delete - Delete a business listing
router.post('/listings/:id/delete', requireAdmin, (req, res) => {
    const businessId = req.params.id;
    
    const query = 'DELETE FROM businesses WHERE id = ?';
    
    pool.execute(query, [businessId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error deleting listing';
        } else if (results.affectedRows === 0) {
            req.session.error = 'Listing not found';
        } else {
            req.session.success = 'Listing deleted successfully';
        }
        
        res.redirect('/admin/listings');
    });
});

// GET /admin/taxonomy - Manage categories and locations
router.get('/taxonomy', requireAdmin, (req, res) => {
    // Perform parallel database queries for categories and locations
    const categoriesQuery = 'SELECT id, name, slug, created_at FROM categories ORDER BY name';
    const locationsQuery = 'SELECT id, suburb, postcode, state, created_at FROM locations ORDER BY suburb, state';
    
    // Execute both queries in parallel
    pool.execute(categoriesQuery, (err, categories) => {
        if (err) {
            console.error('Database error fetching categories:', err);
            req.session.error = 'Error fetching categories';
            return res.redirect('/admin/dashboard');
        }
        
        pool.execute(locationsQuery, (err, locations) => {
            if (err) {
                console.error('Database error fetching locations:', err);
                req.session.error = 'Error fetching locations';
                return res.redirect('/admin/dashboard');
            }
            
            // Get session messages and clear them
            const success = req.session.success || null;
            const error = req.session.error || null;
            
            if (req.session.success) delete req.session.success;
            if (req.session.error) delete req.session.error;
            
            res.render('admin/taxonomy', {
                title: 'Manage Categories & Locations',
                adminUser: req.session.adminUser,
                categories: categories,
                locations: locations,
                error: error,
                success: success
            });
        });
    });
});

// POST /admin/categories/add - Add a new category
router.post('/categories/add', requireAdmin, (req, res) => {
    const { name } = req.body;
    
    // Basic validation
    if (!name || name.trim() === '') {
        req.session.error = 'Category name is required';
        return res.redirect('/admin/taxonomy');
    }
    
    // Generate URL-friendly slug from name
    const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
    
    const query = 'INSERT INTO categories (name, slug) VALUES (?, ?)';
    
    pool.execute(query, [name.trim(), slug], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                req.session.error = 'A category with this name already exists';
            } else {
                req.session.error = 'Error adding category';
            }
        } else {
            req.session.success = 'Category added successfully';
        }
        
        res.redirect('/admin/taxonomy');
    });
});

// POST /admin/locations/add - Add a new location
router.post('/locations/add', requireAdmin, (req, res) => {
    const { suburb, postcode, state } = req.body;
    
    // Basic validation
    if (!suburb || !postcode || !state) {
        req.session.error = 'Suburb, postcode, and state are required';
        return res.redirect('/admin/taxonomy');
    }
    
    const query = 'INSERT INTO locations (suburb, postcode, state) VALUES (?, ?, ?)';
    
    pool.execute(query, [suburb.trim(), postcode.trim(), state.trim()], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error adding location';
        } else {
            req.session.success = 'Location added successfully';
        }
        
        res.redirect('/admin/taxonomy');
    });
});

// POST /admin/categories/:id/delete - Delete a category
router.post('/categories/:id/delete', requireAdmin, (req, res) => {
    const categoryId = req.params.id;
    
    // First check if any businesses are using this category
    const checkQuery = 'SELECT COUNT(*) as count FROM businesses WHERE category_id = ?';
    
    pool.execute(checkQuery, [categoryId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error checking category usage';
            return res.redirect('/admin/taxonomy');
        }
        
        if (results[0].count > 0) {
            req.session.error = 'Cannot delete category: it is being used by business listings';
            return res.redirect('/admin/taxonomy');
        }
        
        // Delete the category
        const deleteQuery = 'DELETE FROM categories WHERE id = ?';
        
        pool.execute(deleteQuery, [categoryId], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                req.session.error = 'Error deleting category';
            } else if (results.affectedRows === 0) {
                req.session.error = 'Category not found';
            } else {
                req.session.success = 'Category deleted successfully';
            }
            
            res.redirect('/admin/taxonomy');
        });
    });
});

// POST /admin/locations/:id/delete - Delete a location
router.post('/locations/:id/delete', requireAdmin, (req, res) => {
    const locationId = req.params.id;
    
    // First check if any businesses are using this location
    const checkQuery = 'SELECT COUNT(*) as count FROM businesses WHERE location_id = ?';
    
    pool.execute(checkQuery, [locationId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error checking location usage';
            return res.redirect('/admin/taxonomy');
        }
        
        if (results[0].count > 0) {
            req.session.error = 'Cannot delete location: it is being used by business listings';
            return res.redirect('/admin/taxonomy');
        }
        
        // Delete the location
        const deleteQuery = 'DELETE FROM locations WHERE id = ?';
        
        pool.execute(deleteQuery, [locationId], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                req.session.error = 'Error deleting location';
            } else if (results.affectedRows === 0) {
                req.session.error = 'Location not found';
            } else {
                req.session.success = 'Location deleted successfully';
            }
            
            res.redirect('/admin/taxonomy');
        });
    });
});

// GET /admin/users - List all registered business owners (non-admin users)
router.get('/users', requireAdmin, (req, res) => {
    const query = `
        SELECT 
            id,
            name,
            email,
            created_at
        FROM users 
        WHERE is_admin = FALSE 
        ORDER BY created_at DESC
    `;
    
    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('admin/users', {
                title: 'Manage Users',
                adminUser: req.session.adminUser,
                users: [],
                error: 'Error fetching users',
                success: null
            });
        }
        
        // Get session messages and clear them
        const success = req.session.success || null;
        const error = req.session.error || null;
        
        if (req.session.success) delete req.session.success;
        if (req.session.error) delete req.session.error;
        
        res.render('admin/users', {
            title: 'Manage Users',
            adminUser: req.session.adminUser,
            users: results,
            error: error,
            success: success
        });
    });
});

// POST /admin/users/:id/delete - Delete a user and all their businesses
router.post('/users/:id/delete', requireAdmin, (req, res) => {
    const userId = req.params.id;
    
    // First, check if the user exists and is not an admin
    const checkQuery = 'SELECT id, name, is_admin FROM users WHERE id = ?';
    
    pool.execute(checkQuery, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            req.session.error = 'Error checking user';
            return res.redirect('/admin/users');
        }
        
        if (results.length === 0) {
            req.session.error = 'User not found';
            return res.redirect('/admin/users');
        }
        
        const user = results[0];
        
        if (user.is_admin) {
            req.session.error = 'Cannot delete admin users';
            return res.redirect('/admin/users');
        }
        
        // Delete the user (this will cascade delete their businesses due to ON DELETE CASCADE)
        const deleteQuery = 'DELETE FROM users WHERE id = ?';
        
        pool.execute(deleteQuery, [userId], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                req.session.error = 'Error deleting user';
            } else if (results.affectedRows === 0) {
                req.session.error = 'User not found';
            } else {
                req.session.success = `User "${user.name}" and all associated businesses deleted successfully`;
            }
            
            res.redirect('/admin/users');
        });
    });
});

module.exports = router;
