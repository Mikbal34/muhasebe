-- Fix infinite recursion in RLS policies

-- Drop ALL users policies to start fresh
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "service_role_all" ON users;
DROP POLICY IF EXISTS "admin_all" ON users;

-- Temporarily disable RLS to avoid any recursion issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- 1. Service role can do everything (for API operations)
CREATE POLICY "service_role_access" ON users
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 2. Users can view their own profile
CREATE POLICY "own_profile_select" ON users
  FOR SELECT USING (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "own_profile_update" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Note: We'll handle admin access through the service role in API routes
-- This avoids the infinite recursion problem entirely