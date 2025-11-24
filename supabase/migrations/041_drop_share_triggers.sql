-- Drop triggers and functions that reference share_percentage
-- These are no longer needed with the manual allocation system

BEGIN;

-- 1. Drop the share validation trigger
DROP TRIGGER IF EXISTS check_project_shares ON project_representatives;

-- 2. Drop the share validation function
DROP FUNCTION IF EXISTS check_total_shares();

-- 3. Drop the income distribution trigger (we'll recreate it without share_percentage later)
DROP TRIGGER IF EXISTS process_income_distribution_trigger ON incomes;

-- 4. Drop the income distribution function
DROP FUNCTION IF EXISTS process_income_distribution();

-- 5. Remove is_lead column from project_representatives (cleanup from old system)
ALTER TABLE public.project_representatives
DROP COLUMN IF EXISTS is_lead;

COMMIT;

-- Note: Income distribution is now manual through the balance allocation system
-- Representatives are identified by their role (project_leader vs researcher)
-- No automatic percentage-based distribution
