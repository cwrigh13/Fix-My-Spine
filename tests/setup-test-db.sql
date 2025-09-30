-- SQL commands to create the test database
-- Run these commands in your MySQL client before running tests

-- Create the test database
CREATE DATABASE IF NOT EXISTS fixmyspine_test_db;

-- Use the test database
USE fixmyspine_test_db;

-- Run the main schema.sql script on the test database
-- You need to copy the contents of schema.sql here or run:
-- mysql -u your_username -p fixmyspine_test_db < schema.sql

-- Alternatively, you can run this command from your terminal:
-- mysql -u your_username -p fixmyspine_test_db < schema.sql
