# Admin Login System Setup Guide

This guide explains how to set up and use the secure admin login system for your Express.js application.

## 🚀 Quick Start

### 1. Install Dependencies
The required packages have already been installed:
- `bcryptjs` - For secure password hashing
- `express-session` - For session management

### 2. Database Setup
Run the updated SQL schema to add the `is_admin` column to your users table:

```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

### 3. Environment Variables
Make sure your `.env` file includes the session secret:

```env
# Add this to your .env file
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

### 4. Create an Admin User
Use the provided script to create an admin user:

```bash
node scripts/create-admin.js
```

Follow the prompts to enter:
- Admin name
- Admin email
- Admin password

## 🔐 Security Features

### Password Security
- Passwords are hashed using `bcryptjs` with a salt rounds of 12
- Passwords are never stored in plain text
- Secure password comparison using `bcrypt.compare()`

### Session Management
- Sessions are configured with secure defaults
- Session data is stored server-side
- Automatic session expiration (24 hours)
- Session destruction on logout

### Authentication Middleware
- `requireAdmin` middleware protects admin routes
- Automatic redirect to login page for unauthorized users
- Session validation on each protected route

## 📁 File Structure

```
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   └── admin.js             # Admin routes (login, dashboard, logout)
├── views/
│   └── admin/
│       ├── login.ejs        # Admin login form
│       └── dashboard.ejs    # Admin dashboard
├── scripts/
│   └── create-admin.js      # Utility to create admin users
└── app.js                   # Updated with session and admin routes
```

## 🛠️ Available Routes

### Public Routes
- `GET /admin/login` - Display login form
- `POST /admin/login` - Process login credentials

### Protected Routes (require admin authentication)
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/logout` - Logout and destroy session

## 🎨 UI Features

### Login Page
- Modern, responsive design with Bootstrap 5
- Gradient background and card-based layout
- Form validation and error message display
- Secure password input field

### Dashboard
- Professional admin interface
- User information display
- Quick action buttons (ready for future features)
- System information panel
- Responsive navigation with user dropdown

## 🔧 Configuration

### Session Configuration
The session is configured in `app.js` with the following settings:

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
```

### Database Connection
The admin routes use the same database connection pool as the main application, ensuring consistency and efficiency.

## 🚨 Security Best Practices

1. **Change the session secret** in production
2. **Use HTTPS** in production and set `secure: true` in session config
3. **Regularly update** dependencies for security patches
4. **Monitor** admin login attempts
5. **Use strong passwords** for admin accounts
6. **Consider implementing** rate limiting for login attempts

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot find module 'bcryptjs'"**
   - Run `npm install bcryptjs express-session`

2. **"Database connection error"**
   - Check your `.env` file database credentials
   - Ensure MySQL is running

3. **"Session not working"**
   - Verify `SESSION_SECRET` is set in `.env`
   - Check that session middleware is before routes

4. **"Admin user not found"**
   - Ensure `is_admin` column exists in users table
   - Verify admin user was created with `is_admin = TRUE`

### Testing the System

1. Start your application: `npm start`
2. Navigate to: `http://localhost:3000/admin/login`
3. Use the admin credentials you created
4. Verify you can access the dashboard
5. Test logout functionality

## 🔄 Next Steps

The admin system is now ready! You can extend it by:

1. Adding more admin-specific routes
2. Implementing user management features
3. Adding business listing management
4. Creating admin reports and analytics
5. Adding role-based permissions
6. Implementing audit logging

## 📞 Support

If you encounter any issues, check:
1. Console logs for error messages
2. Database connection status
3. Environment variables configuration
4. File permissions and paths

The system is designed to be secure, scalable, and easy to maintain. All admin routes are protected and the authentication system follows industry best practices.
