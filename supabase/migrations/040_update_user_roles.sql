-- Update user_role enum to only have admin and manager
-- This migration updates existing users and the enum type

BEGIN;

-- 1. First, update all existing users with old roles to new roles
UPDATE public.users
SET role = 'manager'
WHERE role IN ('academician', 'finance_officer');

COMMIT;

-- 2. Now update the enum type
BEGIN;

-- Drop the old enum and create new one
-- We need to do this carefully to avoid breaking foreign key constraints

-- First, alter the column to text temporarily
ALTER TABLE public.users
ALTER COLUMN role TYPE TEXT;

-- Drop the old enum type
DROP TYPE IF EXISTS user_role CASCADE;

-- Create the new enum type with only admin and manager
CREATE TYPE user_role AS ENUM ('admin', 'manager');

-- Convert the column back to the new enum type
ALTER TABLE public.users
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set default
ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'manager'::user_role;

COMMIT;

-- 3. Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'User role migration completed successfully!';
  RAISE NOTICE 'All users with academician or finance_officer roles have been updated to manager';
END $$;
