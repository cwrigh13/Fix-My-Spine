// Authentication middleware for admin routes
const requireAdmin = (req, res, next) => {
    // Check if user is authenticated as admin
    if (req.session && req.session.isAdmin) {
        return next(); // User is admin, proceed to the next middleware/route
    } else {
        // User is not admin, redirect to login page
        return res.redirect('/admin/login');
    }
};

module.exports = {
    requireAdmin
};
