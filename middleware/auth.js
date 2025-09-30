// Authentication middleware for protecting routes

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    } else {
        req.session.loginError = 'Please log in to access this page';
        return res.redirect('/login');
    }
};

// Alias for requireAuth - this is the requireLogin function requested
const requireLogin = requireAuth;

// Middleware to check if user is an admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.isAdmin) {
        return next();
    } else if (req.session && req.session.userId) {
        // User is logged in but not admin
        return res.status(403).render('error', {
            message: 'Access denied. Administrator privileges required.',
            error: { status: 403 }
        });
    } else {
        req.session.loginError = 'Please log in to access this page';
        return res.redirect('/login');
    }
};

// Middleware to check if user is already logged in (for login/register pages)
const redirectIfLoggedIn = (req, res, next) => {
    if (req.session && req.session.userId) {
        // Redirect to appropriate dashboard based on user type
        if (req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/dashboard');
        }
    }
    return next();
};

// Middleware to make user data available to all views
const userLocals = (req, res, next) => {
    if (req.session && req.session.userId) {
        res.locals.user = {
            id: req.session.userId,
            name: req.session.userName,
            email: req.session.userEmail,
            isAdmin: req.session.isAdmin
        };
    } else {
        res.locals.user = null;
    }
    next();
};

module.exports = {
    requireAuth,
    requireLogin,
    requireAdmin,
    redirectIfLoggedIn,
    userLocals
};