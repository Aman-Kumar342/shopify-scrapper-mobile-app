-- Fix: Add store_name column to scrape_jobs table
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS store_name TEXT;
