/**
 * Redirect Middleware
 * Replicates the functionality of .htaccess redirects for Node.js/Express.js
 * This middleware handles all the 301 redirects that were previously handled by Apache
 */

const redirects = [
    // Services redirects
    {
        from: '/services/sports-injuries',
        to: 'http://fixmyspine.com.au/directory/sports-injury-clinics/',
        status: 301
    },
    {
        from: '/services/chiropractic-care',
        to: 'http://fixmyspine.com.au/directory/chiropractors/',
        status: 301
    },
    {
        from: '/services/spinal-decompression',
        to: 'http://fixmyspine.com.au/directory/spinal-decompression-therapy/',
        status: 301
    },
    
    // Blog redirects - these are now internal routes handled by the blog router
    // The old URLs will redirect to the new blog post pages
    
    // General page redirects
    {
        from: '/about-us',
        to: 'http://fixmyspine.com.au/about/',
        status: 301
    },
    {
        from: '/contact-us',
        to: 'http://fixmyspine.com.au/contact/',
        status: 301
    },
    {
        from: '/testimonials',
        to: 'http://fixmyspine.com.au/reviews/',
        status: 301
    },
    {
        from: '/new-patients',
        to: 'http://fixmyspine.com.au/',
        status: 301
    }
];

/**
 * Middleware function to handle redirects
 * This should be placed early in the middleware stack, before your main routes
 */
function handleRedirects(req, res, next) {
    const requestedPath = req.path;
    
    // Check if the requested path matches any of our redirect rules
    const redirect = redirects.find(rule => rule.from === requestedPath);
    
    if (redirect) {
        // Perform the redirect
        return res.redirect(redirect.status, redirect.to);
    }
    
    // If no redirect matches, continue to the next middleware
    next();
}

/**
 * Middleware to handle the catch-all routing that was in .htaccess
 * This replicates the "RewriteRule . /index.php [L]" functionality
 * but routes to your Express app instead of index.php
 */
function handleCatchAll(req, res, next) {
    // This middleware will only be reached if no other route matches
    // In Express, this is typically handled by the 404 handler in app.js
    // But we can add custom logic here if needed
    
    // For now, just pass to the next middleware (which should be the 404 handler)
    next();
}

/**
 * Middleware to handle requests that would have gone to index.php
 * This provides a fallback for any unmatched routes
 */
function handleIndexFallback(req, res, next) {
    // If we reach here, it means no route matched
    // In the original .htaccess, this would go to index.php
    // In our Express app, we can either:
    // 1. Redirect to the home page
    // 2. Show a 404 page
    // 3. Handle it as a custom route
    
    // For now, let's redirect to home page (similar to the /new-patients redirect)
    // Exclude known routes from the catch-all redirect
    if (req.path !== '/' && 
        !req.path.startsWith('/admin') && 
        !req.path.startsWith('/users') && 
        !req.path.startsWith('/dashboard') && 
        !req.path.startsWith('/blog') && 
        !req.path.startsWith('/search') && 
        !req.path.startsWith('/category') && 
        !req.path.startsWith('/location') && 
        !req.path.startsWith('/listing') && 
        !req.path.startsWith('/about') && 
        !req.path.startsWith('/contact') && 
        !req.path.startsWith('/pricing') && 
        !req.path.startsWith('/terms') && 
        !req.path.startsWith('/privacy') && 
        !req.path.startsWith('/payments') && 
        req.path !== '/login' && 
        req.path !== '/register' && 
        req.path !== '/logout') {
        return res.redirect(301, '/');
    }
    
    next();
}

module.exports = {
    handleRedirects,
    handleCatchAll,
    handleIndexFallback,
    redirects // Export the redirects array in case you need to reference it elsewhere
};
