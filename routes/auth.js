const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { redirectIfLoggedIn } = require('../middleware/auth');
const router = express.Router();

// GET /register - Render the user registration form
router.get('/register', redirectIfLoggedIn, (req, res) => {
    res.render('auth/register', { 
        title: 'Register - Fix My Spine',
        error: null,
        success: null
    });
});

// POST /register - Handle user registration form submission
router.post('/register', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    
    try {
        // Validate input
        if (!name || !email || !password || !confirmPassword) {
            return res.render('auth/register', {
                title: 'Register - Fix My Spine',
                error: 'All fields are required',
                success: null,
                formData: { name, email }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('auth/register', {
                title: 'Register - Fix My Spine',
                error: 'Please enter a valid email address',
                success: null,
                formData: { name, email }
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.render('auth/register', {
                title: 'Register - Fix My Spine',
                error: 'Password must be at least 6 characters long',
                success: null,
                formData: { name, email }
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('auth/register', {
                title: 'Register - Fix My Spine',
                error: 'Passwords do not match',
                success: null,
                formData: { name, email }
            });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.render('auth/register', {
                title: 'Register - Fix My Spine',
                error: 'An account with this email already exists',
                success: null,
                formData: { name, email }
            });
        }

        // Hash the password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user into database
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, false]
        );

        // Registration successful - redirect to login with success message
        req.session.registrationSuccess = 'Registration successful! Please log in to continue.';
        res.redirect('/login');

    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            title: 'Register - Fix My Spine',
            error: 'An error occurred during registration. Please try again.',
            success: null,
            formData: { name, email }
        });
    }
});

// GET /login - Render the user login form
router.get('/login', redirectIfLoggedIn, (req, res) => {
    const successMessage = req.session.registrationSuccess;
    const errorMessage = req.session.loginError;
    
    // Clear the messages from session
    delete req.session.registrationSuccess;
    delete req.session.loginError;
    
    res.render('auth/login', { 
        title: 'Login - Fix My Spine',
        error: errorMessage,
        success: successMessage,
        formData: { email: '' }
    });
});

// POST /login - Handle user login form submission
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Validate input
        if (!email || !password) {
            return res.render('auth/login', {
                title: 'Login - Fix My Spine',
                error: 'Email and password are required',
                success: null,
                formData: { email }
            });
        }

        // Find user by email
        const [users] = await pool.execute(
            'SELECT id, name, email, password, is_admin FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.render('auth/login', {
                title: 'Login - Fix My Spine',
                error: 'Invalid email or password',
                success: null,
                formData: { email }
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.render('auth/login', {
                title: 'Login - Fix My Spine',
                error: 'Invalid email or password',
                success: null,
                formData: { email }
            });
        }

        // Create session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        req.session.isAdmin = user.is_admin;

        // Redirect to appropriate dashboard
        if (user.is_admin) {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/dashboard');
        }

    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login - Fix My Spine',
            error: 'An error occurred during login. Please try again.',
            success: null,
            formData: { email }
        });
    }
});

// GET /logout - Destroy user session and redirect to homepage
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.redirect('/');
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        res.redirect('/?loggedOut=true');
    });
});

// GET /dashboard - Business owner dashboard (placeholder for now)
router.get('/dashboard', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        req.session.loginError = 'Please log in to access the dashboard';
        return res.redirect('/login');
    }

    res.render('auth/dashboard', {
        title: 'Dashboard - Fix My Spine',
        user: {
            id: req.session.userId,
            name: req.session.userName,
            email: req.session.userEmail,
            isAdmin: req.session.isAdmin
        }
    });
});

module.exports = router;
