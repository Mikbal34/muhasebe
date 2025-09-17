-- Fix user creation by allowing security definer functions to insert users
-- This policy allows the handle_new_user() trigger function to insert users

-- Drop existing policies that might be blocking user creation
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Temporarily disable RLS to clear all policies, then re-enable
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create new policy structure that allows trigger functions to work

-- 1. Users can view their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile (but not change role)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- 3. Service role and postgres can do anything (for triggers and admin operations)
CREATE POLICY "service_role_all" ON users
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    current_user IN ('postgres', 'supabase_admin')
  );

-- 4. Admins can manage all users
CREATE POLICY "admin_all" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );