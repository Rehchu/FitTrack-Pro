-- Migration: Add trainer profile fields
-- Description: Adds logo, QR code, and profile completion tracking to trainers table

-- Add logo_url column for storing trainer branding
ALTER TABLE trainers ADD COLUMN logo_url TEXT;

-- Add qr_code column for storing generated QR code URL
ALTER TABLE trainers ADD COLUMN qr_code TEXT;

-- Add profile_completed flag to track if trainer has finished setup
ALTER TABLE trainers ADD COLUMN profile_completed INTEGER DEFAULT 0;

-- Update existing trainers to have profile_completed = 0
UPDATE trainers SET profile_completed = 0 WHERE profile_completed IS NULL;

-- Index for fast lookup of completed profiles
CREATE INDEX IF NOT EXISTS idx_trainers_profile_completed ON trainers(profile_completed);
