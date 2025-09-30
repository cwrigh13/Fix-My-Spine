-- Database Migration for Annual Subscription System
-- Run these commands to add subscription functionality to your existing database

USE fixmyspine_db;

-- Add subscription-related columns to the businesses table
ALTER TABLE businesses 
ADD COLUMN stripe_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN subscription_status ENUM('active', 'cancelled', 'past_due') NULL,
ADD COLUMN subscription_ends_at TIMESTAMP NULL;

-- Add an index on stripe_subscription_id for faster lookups
CREATE INDEX idx_stripe_subscription_id ON businesses(stripe_subscription_id);

-- Add an index on subscription_ends_at for renewal notifications
CREATE INDEX idx_subscription_ends_at ON businesses(subscription_ends_at);

-- Optional: Add a table to track subscription events for audit purposes
CREATE TABLE subscription_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    stripe_event_id VARCHAR(255),
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    INDEX idx_business_id (business_id),
    INDEX idx_event_type (event_type),
    INDEX idx_stripe_event_id (stripe_event_id)
);

-- Ensure email column exists in users table (safe to run even if column exists)
-- If the email column doesn't exist, this will add it
-- If it exists, this will fail gracefully
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'email') > 0,
    'SELECT "Email column already exists" as message',
    'ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_businesses,
    COUNT(CASE WHEN subscription_status IS NOT NULL THEN 1 END) as businesses_with_subscriptions
FROM businesses;
