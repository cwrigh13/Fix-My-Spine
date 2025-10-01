-- This script creates the database schema for the fixmyspine.com.au directory.
-- It defines all the necessary tables and their relationships.

-- Use the database we created earlier.
USE fixmyspine_db;

-- Table for service categories (e.g., Chiropractor, Physiotherapist)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for locations (suburbs/cities)
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suburb VARCHAR(255) NOT NULL,
    postcode VARCHAR(10) NOT NULL,
    state VARCHAR(50) NOT NULL,
    population INT DEFAULT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for business owners who can log in and manage their listings
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The main table for business listings
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
    listing_tier ENUM('free', 'premium') DEFAULT 'free',
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Table for patient reviews
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    reviewer_name VARCHAR(255) NOT NULL,
    rating TINYINT NOT NULL, -- A rating from 1 to 5
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Table to log payments for premium listings
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    business_id INT NOT NULL,
    stripe_payment_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);
