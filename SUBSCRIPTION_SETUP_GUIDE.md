# Annual Subscription System Setup Guide

This guide will help you set up the complete annual subscription system for your Fix My Spine directory application using Stripe.

## Prerequisites

1. **Stripe Account**: You need a Stripe account with API keys
2. **Node.js Dependencies**: Install the new dependencies
3. **Database Updates**: Run the database schema updates
4. **Email Configuration**: Set up SMTP for notifications

## Installation Steps

### 1. Install Dependencies

```bash
npm install node-cron nodemailer
```

### 2. Database Setup

Run the SQL commands in `schema_subscription_updates.sql` to add subscription columns to your database:

```bash
mysql -u your_username -p fixmyspine_db < schema_subscription_updates.sql
```

### 3. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret
STRIPE_ANNUAL_PRICE_ID=price_... # Your annual subscription price ID

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Fix My Spine" <your-email@gmail.com>

# Application Configuration
BASE_URL=https://yourdomain.com # Your application's base URL
SESSION_SECRET=your-session-secret-key
```

### 4. Stripe Configuration

#### Create a Product and Price in Stripe Dashboard:

1. Go to your Stripe Dashboard → Products
2. Create a new product called "Premium Annual Listing"
3. Add a price with:
   - **Price**: Your desired annual amount (e.g., $299.00 AUD)
   - **Billing period**: Every 12 months
   - **Currency**: AUD (or your preferred currency)
4. Copy the Price ID (starts with `price_`) and add it to your `.env` file as `STRIPE_ANNUAL_PRICE_ID`

#### Configure Webhooks:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/stripe-webhook`
3. Select these events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
4. Copy the webhook signing secret and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### 5. Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: Google Account → Security → App passwords
3. Use the App Password in your `SMTP_PASS` environment variable

For other email providers, adjust the SMTP settings accordingly.

## Features Implemented

### 1. Database Schema Updates
- Added subscription tracking columns to `businesses` table
- Created `subscription_events` table for audit logging
- Added proper indexes for performance

### 2. Subscription Management
- **Create Subscription**: `/dashboard/subscription/create` (POST)
- **Success Callback**: `/dashboard/subscription/success`
- **Cancel Callback**: `/dashboard/subscription/cancel`
- **Customer Portal**: `/dashboard/subscription/portal`
- **Status Check**: `/dashboard/subscription/status/:businessId`

### 3. Webhook Handling
- **Endpoint**: `/stripe-webhook` (POST)
- **Signature Verification**: Secure webhook validation
- **Event Processing**: Complete subscription lifecycle management

### 4. Automated Notifications
- **Renewal Reminders**: 7, 3, and 1 day before expiry
- **Payment Failure Alerts**: Immediate notification on failed payments
- **Subscription Cancelled**: Notification when subscription is cancelled
- **Cron Jobs**: Automated daily checks and notifications

### 5. Billing Management Interface
- **Dashboard Integration**: Added billing management to main dashboard
- **Subscription Overview**: Visual status and statistics
- **Action Buttons**: Upgrade, manage, and reactivate subscriptions

## Usage

### For Business Owners:

1. **Upgrade to Premium**:
   - Go to Dashboard → Manage Billing
   - Click "Upgrade to Premium" for any free listing
   - Complete Stripe Checkout process

2. **Manage Subscription**:
   - Click "Manage Subscription" in billing dashboard
   - Access Stripe Customer Portal to update payment methods, view invoices, or cancel

3. **View Status**:
   - Check subscription status and expiry dates
   - Receive email notifications for renewals and issues

### For Administrators:

1. **Monitor Subscriptions**:
   - Check `subscription_events` table for audit trail
   - Monitor webhook logs for any issues

2. **Email Notifications**:
   - Automated renewal reminders
   - Payment failure alerts
   - Subscription status changes

## Testing

### Test the Complete Flow:

1. **Create Test Subscription**:
   ```bash
   curl -X POST http://localhost:3000/dashboard/subscription/create \
     -H "Content-Type: application/json" \
     -d '{"business_id": 1}' \
     --cookie "connect.sid=your-session-cookie"
   ```

2. **Test Webhook** (using Stripe CLI):
   ```bash
   stripe listen --forward-to localhost:3000/stripe-webhook
   ```

3. **Test Notifications**:
   - Manually trigger cron jobs for testing
   - Check email delivery

## Security Considerations

1. **Webhook Security**: Always verify Stripe signatures
2. **Environment Variables**: Keep API keys secure
3. **Database Security**: Use prepared statements (already implemented)
4. **Session Management**: Secure session handling

## Monitoring and Maintenance

### Daily Tasks (Automated):
- Check for expiring subscriptions (7, 3, 1 day reminders)
- Handle expired subscriptions (downgrade to free)
- Send payment failure notifications

### Weekly Tasks (Automated):
- Subscription health check
- Identify inconsistent subscription states

### Manual Monitoring:
- Check webhook delivery success rates
- Monitor email delivery
- Review subscription event logs

## Troubleshooting

### Common Issues:

1. **Webhook Not Receiving Events**:
   - Check webhook URL is correct and accessible
   - Verify webhook secret in environment variables
   - Check Stripe webhook logs

2. **Email Notifications Not Sending**:
   - Verify SMTP credentials
   - Check email server logs
   - Test email configuration

3. **Subscription Status Inconsistencies**:
   - Run subscription health check
   - Review subscription_events table
   - Check for failed webhook deliveries

### Debug Commands:

```bash
# Check cron job status
node -e "const cron = require('./services/cronService'); console.log(cron.getStatus());"

# Test email configuration
node -e "const notif = require('./services/notificationService'); console.log('Email service initialized');"
```

## Support

For issues or questions:
1. Check the logs in your application
2. Review the `subscription_events` table for audit trail
3. Check Stripe Dashboard for webhook delivery status
4. Verify environment variables are correctly set

## Next Steps

After setup, consider:
1. Setting up monitoring and alerting
2. Implementing additional notification channels (SMS, push notifications)
3. Adding subscription analytics and reporting
4. Creating admin tools for subscription management
