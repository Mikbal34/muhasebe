-- Fix infinite recursion in RLS policies
-- The problem: policies that check user role create infinite loops
-- Solution: Use a security definer function to bypass RLS when checking roles

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins and Managers can view all users" ON users;
DROP POLICY IF EXISTS "Admins and Managers can manage users" ON users;
DROP POLICY IF EXISTS "Admins and Managers can manage all projects" ON projects;
DROP POLICY IF EXISTS "Admins and Managers can manage all project representatives" ON project_representatives;
DROP POLICY IF EXISTS "Admins and Managers can manage incomes" ON incomes;
DROP POLICY IF EXISTS "Admins and Managers can view all balances" ON balances;
DROP POLICY IF EXISTS "Admins and Managers can update balances" ON balances;
DROP POLICY IF EXISTS "Admins and Managers can view all transactions" ON balance_transactions;
DROP POLICY IF EXISTS "Admins and Managers can manage payment instructions" ON payment_instructions;
DROP POLICY IF EXISTS "Admins and Managers can manage payment items" ON payment_instruction_items;
DROP POLICY IF EXISTS "Admins and Managers can view commissions" ON commissions;
DROP POLICY IF EXISTS "Admins and Managers can view all distributions" ON income_distributions;
DROP POLICY IF EXISTS "Admins and Managers can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins and Managers can view all report exports" ON report_exports;
DROP POLICY IF EXISTS "Admins and Managers can view all audit logs" ON audit_logs;

-- Create a security definer function to check user role without RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN user_role;
END;
$$;

-- Create a helper function to check if current user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := get_user_role(auth.uid());
  RETURN user_role IN ('admin', 'manager');
END;
$$;

-- Create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := get_user_role(auth.uid());
  RETURN user_role = 'admin';
END;
$$;

-- RECREATE POLICIES USING THE HELPER FUNCTIONS

-- Users
CREATE POLICY "Admins and Managers can view all users"
ON users FOR SELECT
TO authenticated
USING (is_admin_or_manager());

CREATE POLICY "Admins and Managers can manage users"
ON users FOR ALL
TO authenticated
USING (is_admin_or_manager());

-- Projects
CREATE POLICY "Admins and Managers can manage all projects"
ON projects FOR ALL
TO authenticated
USING (is_admin_or_manager());

-- Project Representatives
CREATE POLICY "Admins and Managers can manage all project representatives"
ON project_representatives FOR ALL
TO authenticated
USING (is_admin_or_manager());

-- Incomes
CREATE POLICY "Admins and Managers can manage incomes"
ON incomes FOR ALL
TO authenticated
USING (is_admin_or_manager());

-- Balances
CREATE POLICY "Admins and Managers can view all balances"
ON balances FOR SELECT
TO authenticated
USING (is_admin_or_manager());

CREATE POLICY "Admins and Managers can update balances"
ON balances FOR UPDATE
TO authenticated
USING (is_admin_or_manager());

-- Balance Transactions
CREATE POLICY "Admins and Managers can view all transactions"
ON balance_transactions FOR SELECT
TO authenticated
USING (is_admin_or_manager());

-- Payment Instructions
CREATE POLICY "Admins and Managers can manage payment instructions"
ON payment_instructions FOR ALL
TO authenticated
USING (is_admin_or_manager());

-- Payment Instruction Items
CREATE POLICY "Admins and Managers can manage payment items"
ON payment_instruction_items FOR ALL
TO authenticated
USING (is_admin_or_manager());

-- Commissions
CREATE POLICY "Admins and Managers can view commissions"
ON commissions FOR SELECT
TO authenticated
USING (is_admin_or_manager());

-- Income Distributions
CREATE POLICY "Admins and Managers can view all distributions"
ON income_distributions FOR SELECT
TO authenticated
USING (is_admin_or_manager());

-- Reports
CREATE POLICY "Admins and Managers can view all reports"
ON reports FOR SELECT
TO authenticated
USING (is_admin_or_manager());

-- Report Exports
CREATE POLICY "Admins and Managers can view all report exports"
ON report_exports FOR SELECT
TO authenticated
USING (is_admin_or_manager());

-- Audit Logs
CREATE POLICY "Admins and Managers can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (is_admin_or_manager());
