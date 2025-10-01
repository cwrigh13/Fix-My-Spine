const cron = require('node-cron');
const pool = require('../config/database');
const notificationService = require('./notificationService');

class CronService {
    constructor() {
        this.jobs = new Map();
        this.initializeJobs();
    }

    initializeJobs() {
        // Run daily at 9:00 AM to check for expiring subscriptions
        this.scheduleRenewalNotifications();
        
        // Run daily at 10:00 AM to handle expired subscriptions
        this.scheduleExpiredSubscriptionHandler();
        
        // Run weekly on Monday at 9:00 AM for subscription health check
        this.scheduleSubscriptionHealthCheck();
    }

    // Schedule renewal notification job
    scheduleRenewalNotifications() {
        const job = cron.schedule('0 9 * * *', async () => {
            console.log('Running renewal notification check...');
            await this.checkAndSendRenewalNotifications();
        }, {
            scheduled: true,
            timezone: "Australia/Sydney"
        });

        this.jobs.set('renewal_notifications', job);
        console.log('Renewal notification job scheduled (daily at 9:00 AM AEST)');
    }

    // Schedule expired subscription handler
    scheduleExpiredSubscriptionHandler() {
        const job = cron.schedule('0 10 * * *', async () => {
            console.log('Running expired subscription handler...');
            await this.handleExpiredSubscriptions();
        }, {
            scheduled: true,
            timezone: "Australia/Sydney"
        });

        this.jobs.set('expired_subscriptions', job);
        console.log('Expired subscription handler scheduled (daily at 10:00 AM AEST)');
    }

    // Schedule subscription health check
    scheduleSubscriptionHealthCheck() {
        const job = cron.schedule('0 9 * * 1', async () => {
            console.log('Running subscription health check...');
            await this.performSubscriptionHealthCheck();
        }, {
            scheduled: true,
            timezone: "Australia/Sydney"
        });

        this.jobs.set('subscription_health_check', job);
        console.log('Subscription health check scheduled (Mondays at 9:00 AM AEST)');
    }

    // Check for businesses with expiring subscriptions and send notifications
    async checkAndSendRenewalNotifications() {
        try {
            // Check for subscriptions expiring in 7 days
            const businesses7Days = await notificationService.getBusinessesWithExpiringSubscriptions(7);
            
            // Check for subscriptions expiring in 3 days
            const businesses3Days = await notificationService.getBusinessesWithExpiringSubscriptions(3);
            
            // Check for subscriptions expiring in 1 day
            const businesses1Day = await notificationService.getBusinessesWithExpiringSubscriptions(1);

            // Send notifications for 7-day reminders
            for (const business of businesses7Days) {
                await this.sendRenewalNotification(business, 7);
            }

            // Send notifications for 3-day reminders
            for (const business of businesses3Days) {
                await this.sendRenewalNotification(business, 3);
            }

            // Send notifications for 1-day reminders
            for (const business of businesses1Day) {
                await this.sendRenewalNotification(business, 1);
            }

            console.log(`Renewal notification check completed:
                - 7-day reminders: ${businesses7Days.length}
                - 3-day reminders: ${businesses3Days.length}
                - 1-day reminders: ${businesses1Day.length}`);

        } catch (error) {
            console.error('Error in renewal notification check:', error);
        }
    }

    // Send renewal notification for a specific business
    async sendRenewalNotification(business, daysUntilExpiry) {
        try {
            // Check if we've already sent a notification for this business and days
            const [existingNotifications] = await pool.execute(`
                SELECT COUNT(*) as count
                FROM subscription_events 
                WHERE business_id = ? 
                AND event_type = 'notification.renewal_reminder'
                AND JSON_EXTRACT(event_data, '$.days_until_expiry') = ?
                AND DATE(created_at) = CURDATE()
            `, [business.id, daysUntilExpiry]);

            if (existingNotifications[0].count > 0) {
                console.log(`Renewal reminder already sent today for business ${business.id} (${daysUntilExpiry} days)`);
                return;
            }

            await notificationService.sendRenewalReminder(business, {
                name: business.user_name,
                email: business.email
            }, daysUntilExpiry);

            console.log(`Sent ${daysUntilExpiry}-day renewal reminder to ${business.email} for business ${business.business_name}`);

        } catch (error) {
            console.error(`Failed to send renewal notification for business ${business.id}:`, error);
        }
    }

    // Handle expired subscriptions
    async handleExpiredSubscriptions() {
        try {
            // Find subscriptions that expired yesterday
            const [expiredBusinesses] = await pool.execute(`
                SELECT 
                    b.id,
                    b.business_name,
                    b.subscription_status,
                    b.subscription_ends_at,
                    u.name as user_name,
                    u.email
                FROM businesses b
                JOIN users u ON b.user_id = u.id
                WHERE b.subscription_status IN ('active', 'past_due')
                AND b.subscription_ends_at IS NOT NULL
                AND DATE(b.subscription_ends_at) < CURDATE()
            `);

            for (const business of expiredBusinesses) {
                await this.handleExpiredSubscription(business);
            }

            console.log(`Expired subscription handler completed: ${expiredBusinesses.length} subscriptions processed`);

        } catch (error) {
            console.error('Error in expired subscription handler:', error);
        }
    }

    // Handle a single expired subscription
    async handleExpiredSubscription(business) {
        try {
            // Update subscription status and downgrade listing
            await pool.execute(`
                UPDATE businesses 
                SET 
                    subscription_status = 'cancelled',
                    listing_tier = 'free',
                    stripe_subscription_id = NULL
                WHERE id = ?
            `, [business.id]);

            // Log the expiration event
            await pool.execute(`
                INSERT INTO subscription_events (business_id, event_type, event_data, created_at)
                VALUES (?, ?, ?, NOW())
            `, [
                business.id,
                'subscription.expired',
                JSON.stringify({
                    expired_at: business.subscription_ends_at,
                    downgraded_to: 'free'
                })
            ]);

            console.log(`Subscription expired and downgraded for business ${business.id} (${business.business_name})`);

        } catch (error) {
            console.error(`Failed to handle expired subscription for business ${business.id}:`, error);
        }
    }

    // Perform subscription health check
    async performSubscriptionHealthCheck() {
        try {
            // Check for subscriptions with inconsistent status
            const [inconsistentSubscriptions] = await pool.execute(`
                SELECT 
                    b.id,
                    b.business_name,
                    b.subscription_status,
                    b.subscription_ends_at,
                    b.stripe_subscription_id
                FROM businesses b
                WHERE b.subscription_status = 'active'
                AND (
                    b.subscription_ends_at IS NULL 
                    OR b.subscription_ends_at < NOW()
                    OR b.stripe_subscription_id IS NULL
                )
            `);

            console.log(`Subscription health check found ${inconsistentSubscriptions.length} inconsistent subscriptions`);

            // Log inconsistent subscriptions for manual review
            for (const subscription of inconsistentSubscriptions) {
                await pool.execute(`
                    INSERT INTO subscription_events (business_id, event_type, event_data, created_at)
                    VALUES (?, ?, ?, NOW())
                `, [
                    subscription.id,
                    'subscription.health_check_inconsistent',
                    JSON.stringify({
                        subscription_status: subscription.subscription_status,
                        subscription_ends_at: subscription.subscription_ends_at,
                        stripe_subscription_id: subscription.stripe_subscription_id
                    })
                ]);
            }

            // Check for businesses with active subscriptions but no recent activity
            const [inactiveSubscriptions] = await pool.execute(`
                SELECT 
                    b.id,
                    b.business_name,
                    b.subscription_status,
                    b.created_at
                FROM businesses b
                WHERE b.subscription_status = 'active'
                AND b.created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
                AND NOT EXISTS (
                    SELECT 1 FROM subscription_events se 
                    WHERE se.business_id = b.id 
                    AND se.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
                )
            `);

            console.log(`Found ${inactiveSubscriptions.length} subscriptions with no recent activity`);

        } catch (error) {
            console.error('Error in subscription health check:', error);
        }
    }

    // Start all scheduled jobs
    start() {
        this.jobs.forEach((job, name) => {
            job.start();
            console.log(`Started cron job: ${name}`);
        });
    }

    // Stop all scheduled jobs
    stop() {
        this.jobs.forEach((job, name) => {
            job.stop();
            console.log(`Stopped cron job: ${name}`);
        });
    }

    // Get status of all jobs
    getStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: job.running,
                scheduled: job.scheduled
            };
        });
        return status;
    }
}

module.exports = new CronService();
