-- Database Migration: Add Google Maps Integration for Ratings
-- This migration adds fields to store Google Maps place data and external ratings

USE fixmyspine_db;

-- Add Google Maps integration fields to businesses table
ALTER TABLE businesses 
ADD COLUMN google_place_id VARCHAR(255) NULL DEFAULT NULL,
ADD COLUMN google_rating DECIMAL(3,2) NULL DEFAULT NULL,
ADD COLUMN google_review_count INT NULL DEFAULT NULL,
ADD COLUMN google_last_updated TIMESTAMP NULL DEFAULT NULL,
ADD INDEX idx_google_place_id (google_place_id);

-- Create table to store Google Maps reviews (optional - for caching)
CREATE TABLE google_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    google_review_id VARCHAR(255) NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    review_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_google_review (business_id, google_review_id),
    INDEX idx_business_id (business_id)
);

-- Add comments for documentation
ALTER TABLE businesses 
MODIFY COLUMN google_place_id VARCHAR(255) NULL DEFAULT NULL COMMENT 'Google Maps Place ID for this business',
MODIFY COLUMN google_rating DECIMAL(3,2) NULL DEFAULT NULL COMMENT 'Average Google Maps rating (0.0-5.0)',
MODIFY COLUMN google_review_count INT NULL DEFAULT NULL COMMENT 'Number of Google Maps reviews',
MODIFY COLUMN google_last_updated TIMESTAMP NULL DEFAULT NULL COMMENT 'Last time Google rating data was fetched';
