-- Migration: Add authentication columns to people table
-- Run this if you have an existing database without email, password, and role columns

-- Add email column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'email'
    ) THEN
        ALTER TABLE people ADD COLUMN email TEXT UNIQUE;
    END IF;
END $$;

-- Add password column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'password'
    ) THEN
        ALTER TABLE people ADD COLUMN password TEXT;
    END IF;
END $$;

-- Add role column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'role'
    ) THEN
        ALTER TABLE people ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    END IF;
END $$;

-- Add updated_at column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE people ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Remove UNIQUE constraint from name if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'people_name_key'
    ) THEN
        ALTER TABLE people DROP CONSTRAINT people_name_key;
    END IF;
END $$;

-- Update existing users to have default role if NULL
UPDATE people SET role = 'user' WHERE role IS NULL;

-- Create an admin user (update credentials as needed)
INSERT INTO people (user_id, name, email, password, role, embedding)
VALUES (
    'admin001',
    'System Administrator',
    'admin@example.com',
    'admin123',  -- CHANGE THIS PASSWORD!
    'admin',
    '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]'::vector
)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON COLUMN people.email IS 'User email for authentication';
COMMENT ON COLUMN people.password IS 'User password (should be hashed in production)';
COMMENT ON COLUMN people.role IS 'User role: admin or user';
COMMENT ON COLUMN people.updated_at IS 'Last update timestamp';
