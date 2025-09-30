# Tiered Listing System Implementation

This document outlines the implementation of the Free vs. Premium tiered listing system for the FixMySpine directory application.

## 🎯 Overview

The tiered listing system allows businesses to upgrade from free listings to premium listings, which provides:
- **Priority placement** in search results
- **Visual differentiation** with premium styling
- **Enhanced visibility** with premium badges

## 📊 Database Schema

### Existing Schema
The `businesses` table already includes the `listing_tier` column:

```sql
CREATE TABLE businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    location_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    description TEXT,
    listing_tier ENUM('free', 'premium') DEFAULT 'free',  -- ✅ Already implemented
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

### For Existing Databases
If you need to add the `listing_tier` column to an existing database:

```sql
ALTER TABLE businesses ADD COLUMN listing_tier ENUM('free', 'premium') DEFAULT 'free' AFTER description;
```

## 🔍 Search Query Prioritization

### Updated ORDER BY Clauses
All search queries in `routes/public.js` now prioritize premium listings:

```sql
ORDER BY (listing_tier = 'premium') DESC, business_name ASC
```

This sorting logic:
1. **Premium listings first**: `(listing_tier = 'premium') DESC` puts premium listings at the top
2. **Alphabetical within tiers**: `business_name ASC` sorts alphabetically within each tier

### Affected Routes
- **Homepage** (`GET /`): Featured listings
- **Search** (`GET /search`): Main search functionality
- **Category pages** (`GET /category/:slug`): Category-specific listings
- **Location pages** (`GET /location/:suburb`): Location-specific listings

## 💳 Payment Integration

### Stripe Webhook Handler
Created `routes/payments.js` with comprehensive payment processing:

#### Webhook Endpoint (`POST /payments/webhook`)
- **Verifies Stripe signatures** for security
- **Handles payment success events** (`payment_intent.succeeded`)
- **Updates business to premium** tier
- **Records payment** in the payments table
- **Uses database transactions** for data integrity

#### Payment Success Callback (`GET /payments/success/:businessId`)
- **Fallback method** for redirect-based payments
- **Retrieves payment session** from Stripe
- **Upgrades business** if payment successful
- **Redirects to dashboard** with success message

### Database Transaction Safety
```javascript
await pool.execute('START TRANSACTION');
// Update business to premium
await pool.execute('UPDATE businesses SET listing_tier = "premium" WHERE id = ?', [businessId]);
// Record payment
await pool.execute('INSERT INTO payments (...) VALUES (...)');
await pool.execute('COMMIT');
```

## 🎨 Visual Differentiation

### Premium Badge
Premium listings display a "Premium" badge in the search results:

```ejs
<% if (listing.listing_tier === 'premium') { %>
    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent text-white">
        Premium
    </span>
<% } %>
```

### Premium Styling
Premium listings have enhanced visual styling:

```css
.is-premium {
    @apply relative;
    box-shadow: 0 4px 12px rgba(249, 168, 38, 0.15);
}

.is-premium::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(135deg, #F9A826, #FFD700);
    border-radius: 8px;
    z-index: -1;
}
```

### Template Integration
Search results template applies premium styling:

```ejs
<div class="card hover:shadow-lg transition-shadow duration-300 <%= listing.listing_tier === 'premium' ? 'is-premium border-accent border-2' : '' %>">
```

## 🔧 Configuration

### Environment Variables
Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Dependencies
Stripe package added to `package.json`:

```json
{
  "dependencies": {
    "stripe": "^16.11.0"
  }
}
```

### Route Registration
Payments router added to `app.js`:

```javascript
var paymentsRouter = require('./routes/payments');
app.use('/payments', paymentsRouter);
```

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Stripe
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Add keys to your `.env` file
4. Configure webhook endpoint: `https://yourdomain.com/payments/webhook`

### 3. Build CSS
```bash
npm run build:css:prod
```

### 4. Test the Implementation
1. **Create test listings** with both free and premium tiers
2. **Verify search prioritization** - premium listings should appear first
3. **Check visual styling** - premium listings should have golden border and badge
4. **Test payment flow** - webhook should upgrade listings after payment

## 📋 Webhook Configuration

### Stripe Dashboard Setup
1. Go to **Developers > Webhooks** in your Stripe dashboard
2. Click **Add endpoint**
3. Set URL to: `https://yourdomain.com/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded` (for subscriptions)
5. Copy the webhook signing secret to your environment variables

### Webhook Security
The webhook handler includes:
- **Signature verification** using Stripe's webhook secret
- **Event type validation** to handle only relevant events
- **Error handling** with proper HTTP status codes
- **Database transactions** for data consistency

## 🔍 Testing

### Manual Testing
1. **Database Test**: Verify `listing_tier` column exists and defaults to 'free'
2. **Search Test**: Create test listings and verify premium listings appear first
3. **Visual Test**: Check that premium listings have enhanced styling
4. **Payment Test**: Use Stripe test cards to simulate payments

### Test Cards
Use Stripe's test card numbers:
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Requires Authentication**: `4000002500003155`

## 🛡️ Security Considerations

### Payment Security
- **Webhook signature verification** prevents unauthorized requests
- **Database transactions** ensure data consistency
- **Input validation** prevents SQL injection
- **Error logging** without exposing sensitive data

### Data Protection
- **No sensitive data** stored in logs
- **Secure environment variables** for API keys
- **HTTPS required** for production webhooks
- **Regular security updates** for dependencies

## 📈 Monitoring

### Payment Monitoring
- **Webhook logs** for payment events
- **Database logs** for tier upgrades
- **Error tracking** for failed payments
- **Success metrics** for conversion rates

### Performance Monitoring
- **Database query performance** for search results
- **Webhook response times** for payment processing
- **Error rates** for payment failures
- **User experience metrics** for premium features

## 🔮 Future Enhancements

### Potential Improvements
- **Subscription billing** for recurring premium listings
- **Tiered pricing** with multiple premium levels
- **Analytics dashboard** for premium listing performance
- **Automated downgrades** for expired payments
- **Email notifications** for payment status changes
- **Admin interface** for managing premium listings

### Advanced Features
- **A/B testing** for premium listing effectiveness
- **Dynamic pricing** based on location or category
- **Bulk upgrade options** for multiple listings
- **Premium listing analytics** for business owners
- **Integration with CRM** systems

## 📞 Support

### Common Issues
1. **Webhook not receiving events**: Check URL and SSL certificate
2. **Premium listings not appearing first**: Verify ORDER BY clause in queries
3. **Styling not applied**: Rebuild CSS with `npm run build:css:prod`
4. **Payment not upgrading listing**: Check webhook logs and database transactions

### Debugging
- **Enable debug logging** in development
- **Check Stripe dashboard** for webhook delivery status
- **Monitor database transactions** for upgrade events
- **Test with Stripe CLI** for local development

This implementation provides a robust foundation for a tiered listing system that can scale with your business needs while maintaining security and performance standards.
