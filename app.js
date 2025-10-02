var createError = require('http-errors');
require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
// --- DATABASE CONNECTION ---
const pool = require('./config/database');
// --- END DATABASE CONNECTION ---
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
var adminGoogleRatingsRouter = require('./routes/admin-google-ratings');
var authRouter = require('./routes/auth');
var dashboardRouter = require('./routes/dashboard');
var publicRouter = require('./routes/public');
var paymentsRouter = require('./routes/payments');
var subscriptionsRouter = require('./routes/subscriptions');
var webhooksRouter = require('./routes/webhooks');
// --- REDIRECT MIDDLEWARE ---
const { handleRedirects, handleIndexFallback } = require('./middleware/redirects');
// --- END REDIRECT MIDDLEWARE ---
// --- AUTHENTICATION MIDDLEWARE ---
const { userLocals } = require('./middleware/auth');
// --- END AUTHENTICATION MIDDLEWARE ---

// --- CRON SERVICE ---
const cronService = require('./services/cronService');
// --- END CRON SERVICE ---

// --- SITEMAP SERVICE ---
const sitemapService = require('./services/sitemapService');
// --- END SITEMAP SERVICE ---

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// --- AUTHENTICATION MIDDLEWARE ---
// Make user data available to all views
app.use(userLocals);
// --- END AUTHENTICATION MIDDLEWARE ---

// --- REDIRECT MIDDLEWARE ---
// Handle all redirects from the original .htaccess file
app.use(handleRedirects);
// --- END REDIRECT MIDDLEWARE ---

app.use('/', publicRouter);
app.use('/', authRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);
app.use('/admin/google-ratings', adminGoogleRatingsRouter);
app.use('/dashboard', dashboardRouter);
app.use('/dashboard/subscription', subscriptionsRouter);
app.use('/payments', paymentsRouter);
app.use('/', webhooksRouter);

// --- START CRON JOBS ---
cronService.start();
// --- END CRON JOBS ---

// --- INITIALIZE SITEMAP SERVICE ---
sitemapService.initialize().catch(error => {
    console.error('Failed to initialize sitemap service:', error);
});
// --- END INITIALIZE SITEMAP SERVICE ---

// --- FALLBACK HANDLER ---
// Handle any unmatched routes (equivalent to the catch-all in .htaccess)
app.use(handleIndexFallback);
// --- END FALLBACK HANDLER ---

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
