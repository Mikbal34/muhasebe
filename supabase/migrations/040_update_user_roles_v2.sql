-- Update user_role enum to only have admin and manager
-- Safe version that handles existing enum values properly

BEGIN;

-- 1. First, convert the column to TEXT to bypass enum constraints
ALTER TABLE public.users
ALTER COLUMN role TYPE TEXT;

-- 2. Now update all existing users with old roles to new roles
UPDATE public.users
SET role = 'manager'
WHERE role IN ('academician', 'finance_officer');

-- 3. Update any remaining roles that might be in unexpected states
UPDATE public.users
SET role = 'manager'
WHERE role NOT IN ('admin', 'manager');

-- 4. Drop the old enum type if it exists
DROP TYPE IF EXISTS user_role CASCADE;

-- 5. Create the new enum type with only admin and manager
CREATE TYPE user_role AS ENUM ('admin', 'manager');

-- 6. Convert the column back to the new enum type
ALTER TABLE public.users
ALTER COLUMN role TYPE user_role USING role::user_role;

-- 7. Set NOT NULL constraint
ALTER TABLE public.users
ALTER COLUMN role SET NOT NULL;

-- 8. Set default
ALTER TABLE public.users
ALTER COLUMN role SET DEFAULT 'manager'::user_role;

COMMIT;

-- Verify the changes
DO $$
DECLARE
  admin_count INTEGER;
  manager_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'admin';
  SELECT COUNT(*) INTO manager_count FROM public.users WHERE role = 'manager';
  SELECT COUNT(*) INTO total_count FROM public.users;

  RAISE NOTICE 'User role migration completed successfully!';
  RAISE NOTICE 'Total users: %', total_count;
  RAISE NOTICE 'Admins: %', admin_count;
  RAISE NOTICE 'Managers: %', manager_count;
END $$;
