-- Add URL slug support for custom trainer/client URLs
-- Allows fittrack-{slug}.workers.dev or custom domains

-- Add url_slug to trainers table (without UNIQUE constraint initially)
ALTER TABLE trainers ADD COLUMN url_slug TEXT;

-- Add url_slug to clients table (without UNIQUE constraint initially)
ALTER TABLE clients ADD COLUMN url_slug TEXT;

-- Helper function to generate slug from name
-- Example usage: UPDATE trainers SET url_slug = LOWER(REPLACE(business_name, ' ', '-')) WHERE url_slug IS NULL;

-- Update existing trainers with slugs (if any exist)
-- This will convert "John's Fitness" -> "john's-fitness"
UPDATE trainers 
SET url_slug = LOWER(REPLACE(REPLACE(REPLACE(business_name, ' ', '-'), '''', ''), '.', ''))
WHERE business_name IS NOT NULL AND url_slug IS NULL;

-- Update existing clients with slugs (if any exist)  
-- This will convert "Jane Doe" -> "jane-doe"
UPDATE clients 
SET url_slug = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '''', ''), '.', ''))
WHERE name IS NOT NULL AND url_slug IS NULL;

-- Create unique indexes after data is populated
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainers_slug ON trainers(url_slug) WHERE url_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_slug ON clients(url_slug) WHERE url_slug IS NOT NULL;
