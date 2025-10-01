const nodemailer = require('nodemailer');
const pool = require('../config/database').promise();

class NotificationService {
    constructor() {
        // Initialize email transporter
        try {
            this.transporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            // Verify transporter configuration
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('Email transporter verification failed:', error);
                } else {
                    console.log('Email transporter is ready to send messages');
                }
            });
        } catch (error) {
            console.warn('Email service not initialized:', error.message);
            console.warn('Email notifications will be disabled. Configure SMTP settings to enable.');
            this.transporter = null;
        }
    }

    // Send renewal reminder email
    async sendRenewalReminder(business, user, daysUntilExpiry) {
        if (!this.transporter) {
            console.warn('Email service not available. Skipping renewal reminder email.');
            return;
        }
        try {
            const mailOptions = {
                from: `"Fix My Spine" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: user.email,
                subject: `Premium Listing Renewal Reminder - ${business.business_name}`,
                html: this.getRenewalReminderTemplate(business, user, daysUntilExpiry),
                text: this.getRenewalReminderText(business, user, daysUntilExpiry)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Renewal reminder sent to ${user.email} for business ${business.id}: ${info.messageId}`);
            
            // Log the notification
            await this.logNotification(business.id, 'renewal_reminder', {
                email: user.email,
                days_until_expiry: daysUntilExpiry,
                message_id: info.messageId
            });

            return info;
        } catch (error) {
            console.error('Failed to send renewal reminder:', error);
            throw error;
        }
    }

    // Send payment failure notification
    async sendPaymentFailureNotification(business, user, failureReason) {
        if (!this.transporter) {
            console.warn('Email service not available. Skipping payment failure notification email.');
            return;
        }
        try {
            const mailOptions = {
                from: `"Fix My Spine" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: user.email,
                subject: `Payment Failed - Premium Listing for ${business.business_name}`,
                html: this.getPaymentFailureTemplate(business, user, failureReason),
                text: this.getPaymentFailureText(business, user, failureReason)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Payment failure notification sent to ${user.email} for business ${business.id}: ${info.messageId}`);
            
            // Log the notification
            await this.logNotification(business.id, 'payment_failure', {
                email: user.email,
                failure_reason: failureReason,
                message_id: info.messageId
            });

            return info;
        } catch (error) {
            console.error('Failed to send payment failure notification:', error);
            throw error;
        }
    }

    // Send subscription cancelled notification
    async sendSubscriptionCancelledNotification(business, user) {
        if (!this.transporter) {
            console.warn('Email service not available. Skipping subscription cancelled notification email.');
            return;
        }
        try {
            const mailOptions = {
                from: `"Fix My Spine" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: user.email,
                subject: `Subscription Cancelled - Premium Listing for ${business.business_name}`,
                html: this.getSubscriptionCancelledTemplate(business, user),
                text: this.getSubscriptionCancelledText(business, user)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Subscription cancelled notification sent to ${user.email} for business ${business.id}: ${info.messageId}`);
            
            // Log the notification
            await this.logNotification(business.id, 'subscription_cancelled', {
                email: user.email,
                message_id: info.messageId
            });

            return info;
        } catch (error) {
            console.error('Failed to send subscription cancelled notification:', error);
            throw error;
        }
    }

    // Get businesses with expiring subscriptions
    async getBusinessesWithExpiringSubscriptions(daysAhead = 7) {
        try {
            const [businesses] = await pool.execute(`
                SELECT 
                    b.id,
                    b.business_name,
                    b.subscription_ends_at,
                    u.name as user_name,
                    u.email
                FROM businesses b
                JOIN users u ON b.user_id = u.id
                WHERE b.subscription_status = 'active'
                AND b.subscription_ends_at IS NOT NULL
                AND DATE(b.subscription_ends_at) = DATE(DATE_ADD(NOW(), INTERVAL ? DAY))
            `, [daysAhead]);

            return businesses;
        } catch (error) {
            console.error('Failed to get businesses with expiring subscriptions:', error);
            throw error;
        }
    }

    // Log notification to database
    async logNotification(businessId, notificationType, data) {
        try {
            await pool.execute(`
                INSERT INTO subscription_events (business_id, event_type, event_data, created_at)
                VALUES (?, ?, ?, NOW())
            `, [
                businessId,
                `notification.${notificationType}`,
                JSON.stringify(data)
            ]);
        } catch (error) {
            console.error('Failed to log notification:', error);
        }
    }

    // Email templates
    getRenewalReminderTemplate(business, user, daysUntilExpiry) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Premium Listing Renewal Reminder</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Premium Listing Renewal Reminder</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${user.name},</h2>
                        <p>Your premium listing for <strong>${business.business_name}</strong> will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong>.</p>
                        
                        <p>To maintain your premium listing benefits and continue reaching more customers, please renew your subscription before it expires.</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.BASE_URL}/dashboard" class="button">Manage Subscription</a>
                        </div>
                        
                        <h3>Premium Listing Benefits:</h3>
                        <ul>
                            <li>Enhanced visibility in search results</li>
                            <li>Priority placement in directory listings</li>
                            <li>Detailed business information display</li>
                            <li>Professional appearance and branding</li>
                        </ul>
                        
                        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from Fix My Spine Directory.</p>
                        <p>If you no longer wish to receive these reminders, please update your subscription preferences.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getRenewalReminderText(business, user, daysUntilExpiry) {
        return `
            Premium Listing Renewal Reminder
            
            Hello ${user.name},
            
            Your premium listing for "${business.business_name}" will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.
            
            To maintain your premium listing benefits and continue reaching more customers, please renew your subscription before it expires.
            
            Manage your subscription: ${process.env.BASE_URL}/dashboard
            
            Premium Listing Benefits:
            - Enhanced visibility in search results
            - Priority placement in directory listings
            - Detailed business information display
            - Professional appearance and branding
            
            If you have any questions or need assistance, please don't hesitate to contact our support team.
            
            This is an automated message from Fix My Spine Directory.
        `;
    }

    getPaymentFailureTemplate(business, user, failureReason) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Payment Failed - Premium Listing</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Payment Failed - Premium Listing</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${user.name},</h2>
                        <p>We were unable to process the payment for your premium listing for <strong>${business.business_name}</strong>.</p>
                        
                        <p><strong>Reason:</strong> ${failureReason || 'Payment method declined'}</p>
                        
                        <p>To continue enjoying your premium listing benefits, please update your payment method and retry the payment.</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.BASE_URL}/dashboard" class="button">Update Payment Method</a>
                        </div>
                        
                        <p><strong>Important:</strong> Your premium listing will remain active for a grace period, but may be downgraded if payment is not received soon.</p>
                        
                        <p>If you need assistance or have questions about your payment, please contact our support team.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from Fix My Spine Directory.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getPaymentFailureText(business, user, failureReason) {
        return `
            Payment Failed - Premium Listing
            
            Hello ${user.name},
            
            We were unable to process the payment for your premium listing for "${business.business_name}".
            
            Reason: ${failureReason || 'Payment method declined'}
            
            To continue enjoying your premium listing benefits, please update your payment method and retry the payment.
            
            Update your payment method: ${process.env.BASE_URL}/dashboard
            
            Important: Your premium listing will remain active for a grace period, but may be downgraded if payment is not received soon.
            
            If you need assistance or have questions about your payment, please contact our support team.
            
            This is an automated message from Fix My Spine Directory.
        `;
    }

    getSubscriptionCancelledTemplate(business, user) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Subscription Cancelled</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #95a5a6; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Subscription Cancelled</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${user.name},</h2>
                        <p>Your premium subscription for <strong>${business.business_name}</strong> has been cancelled.</p>
                        
                        <p>Your premium listing benefits will remain active until the end of your current billing period. After that, your listing will be downgraded to a free listing.</p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.BASE_URL}/dashboard" class="button">Reactivate Subscription</a>
                        </div>
                        
                        <p>We're sorry to see you go! If you change your mind, you can reactivate your premium subscription at any time from your dashboard.</p>
                        
                        <p>Thank you for being part of the Fix My Spine Directory community.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from Fix My Spine Directory.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    getSubscriptionCancelledText(business, user) {
        return `
            Subscription Cancelled
            
            Hello ${user.name},
            
            Your premium subscription for "${business.business_name}" has been cancelled.
            
            Your premium listing benefits will remain active until the end of your current billing period. After that, your listing will be downgraded to a free listing.
            
            Reactivate your subscription: ${process.env.BASE_URL}/dashboard
            
            We're sorry to see you go! If you change your mind, you can reactivate your premium subscription at any time from your dashboard.
            
            Thank you for being part of the Fix My Spine Directory community.
            
            This is an automated message from Fix My Spine Directory.
        `;
    }
}

module.exports = new NotificationService();
