-- Drop all policies that depend on the user_role enum or users.role column
-- This is necessary because we cannot alter the column type while policies depend on it

-- Projects
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
DROP POLICY IF EXISTS "Finance officers can view all projects" ON projects;
DROP POLICY IF EXISTS "Academicians can view their own projects" ON projects;
DROP POLICY IF EXISTS "Admins and Finance Officers can create projects" ON projects;
DROP POLICY IF EXISTS "Admins and Finance Officers can update projects" ON projects;
DROP POLICY IF EXISTS "Admins and Finance Officers can delete projects" ON projects;
-- Drop new policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Admins and Managers can manage all projects" ON projects;
DROP POLICY IF EXISTS "Project representatives can view their projects" ON projects;

-- Users
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "admin_all" ON users;
-- Ensure we clean up any other potential policies that might block access or be duplicates
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all users" ON users;
DROP POLICY IF EXISTS "Admins and Managers can manage users" ON users;

-- Project Representatives
DROP POLICY IF EXISTS "Admins can manage all project representatives" ON project_representatives;
DROP POLICY IF EXISTS "Finance officers can view all representatives" ON project_representatives;
DROP POLICY IF EXISTS "Users can view their own representations" ON project_representatives;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can manage all project representatives" ON project_representatives;

-- Incomes
DROP POLICY IF EXISTS "Admins and finance officers can manage incomes" ON incomes;
DROP POLICY IF EXISTS "Academicians can view their project incomes" ON incomes;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can manage incomes" ON incomes;
DROP POLICY IF EXISTS "Project representatives can view project incomes" ON incomes;

-- Balances
DROP POLICY IF EXISTS "Admins and finance officers can view all balances" ON balances;
DROP POLICY IF EXISTS "Admins and finance officers can update balances" ON balances;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all balances" ON balances;
DROP POLICY IF EXISTS "Admins and Managers can update balances" ON balances;

-- Balance Transactions
DROP POLICY IF EXISTS "Admins and finance officers can view all transactions" ON balance_transactions;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all transactions" ON balance_transactions;

-- Payment Instructions
DROP POLICY IF EXISTS "Admins and finance officers can view all payment instructions" ON payment_instructions;
DROP POLICY IF EXISTS "Finance officers can create payment instructions" ON payment_instructions;
DROP POLICY IF EXISTS "Finance officers can update payment instructions" ON payment_instructions;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can manage payment instructions" ON payment_instructions;

-- Payment Instruction Items
DROP POLICY IF EXISTS "Admins and finance officers can view all payment items" ON payment_instruction_items;
DROP POLICY IF EXISTS "Finance officers can manage payment items" ON payment_instruction_items;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can manage payment items" ON payment_instruction_items;

-- Commissions
DROP POLICY IF EXISTS "Admins and finance officers can view commissions" ON commissions;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view commissions" ON commissions;

-- Income Distributions
DROP POLICY IF EXISTS "Admins and finance officers can view all distributions" ON income_distributions;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all distributions" ON income_distributions;

-- Reports
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all reports" ON reports;

-- Report Exports
DROP POLICY IF EXISTS "Admins can view all report exports" ON report_exports;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all report exports" ON report_exports;

-- Audit Logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
-- Drop new policies if they exist
DROP POLICY IF EXISTS "Admins and Managers can view all audit logs" ON audit_logs;


-- Create a new enum type with the desired values
DROP TYPE IF EXISTS user_role_new;
CREATE TYPE user_role_new AS ENUM ('admin', 'manager');

-- Drop the check constraint if it exists (this is causing the error)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Update the users table to use the new enum type
-- First, we need to handle the conversion of existing data
-- We'll temporarily change the column type to text to facilitate the update
ALTER TABLE public.users 
ALTER COLUMN role DROP DEFAULT; -- Drop the old default value first

ALTER TABLE public.users 
ALTER COLUMN role TYPE text;

-- Update existing roles mapping to the new schema
-- finance_officer -> manager
-- academician -> manager
UPDATE public.users 
SET role = 'manager' 
WHERE role IN ('finance_officer', 'academician');

-- Ensure all roles are valid according to the new enum
-- Any other values (shouldn't be any based on previous constraints) default to manager for safety
UPDATE public.users 
SET role = 'manager' 
WHERE role NOT IN ('admin', 'manager');

-- Now cast the column to the new enum type
ALTER TABLE public.users 
ALTER COLUMN role TYPE user_role_new 
USING role::user_role_new;

-- Set the new default value
ALTER TABLE public.users 
ALTER COLUMN role SET DEFAULT 'manager'::user_role_new;

-- Drop the old enum type
DROP TYPE IF EXISTS user_role;

-- Rename the new enum type to the original name
ALTER TYPE user_role_new RENAME TO user_role;


-- RECREATE POLICIES

-- Projects
CREATE POLICY "Admins and Managers can manage all projects"
ON projects FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Project representatives can view their projects"
ON projects FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT project_id FROM project_representatives WHERE user_id = auth.uid()
  )
);

-- Users
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Admins and Managers can view all users"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and Managers can manage users"
ON users FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Project Representatives
CREATE POLICY "Admins and Managers can manage all project representatives"
ON project_representatives FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Users can view their own representations"
ON project_representatives FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Incomes
CREATE POLICY "Admins and Managers can manage incomes"
ON incomes FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Project representatives can view project incomes"
ON incomes FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id FROM project_representatives WHERE user_id = auth.uid()
  )
);

-- Balances
CREATE POLICY "Admins and Managers can view all balances"
ON balances FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and Managers can update balances"
ON balances FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Balance Transactions
CREATE POLICY "Admins and Managers can view all transactions"
ON balance_transactions FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Payment Instructions
CREATE POLICY "Admins and Managers can manage payment instructions"
ON payment_instructions FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Payment Instruction Items
CREATE POLICY "Admins and Managers can manage payment items"
ON payment_instruction_items FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Commissions
CREATE POLICY "Admins and Managers can view commissions"
ON commissions FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Income Distributions
CREATE POLICY "Admins and Managers can view all distributions"
ON income_distributions FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Reports
CREATE POLICY "Admins and Managers can view all reports"
ON reports FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Report Exports
CREATE POLICY "Admins and Managers can view all report exports"
ON report_exports FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);

-- Audit Logs
CREATE POLICY "Admins and Managers can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'manager')
  )
);
