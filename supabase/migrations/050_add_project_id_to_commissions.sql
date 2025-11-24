-- Migration 050: Add project_id to commissions table
-- Enables project-based commission tracking and fixes migration 049 trigger

-- =====================================================
-- 1. Add project_id column to commissions
-- =====================================================

-- Add project_id column (nullable at first for existing data)
ALTER TABLE public.commissions
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- =====================================================
-- 2. Populate project_id for existing commissions
-- =====================================================

-- Update existing commissions with project_id from related income
UPDATE public.commissions c
SET project_id = i.project_id
FROM public.incomes i
WHERE c.income_id = i.id
  AND c.project_id IS NULL;

-- =====================================================
-- 3. Make project_id NOT NULL after population
-- =====================================================

-- Now make it NOT NULL since all existing records are updated
ALTER TABLE public.commissions
ALTER COLUMN project_id SET NOT NULL;

-- =====================================================
-- 4. Create index for better performance
-- =====================================================

-- Index for project-based commission queries
CREATE INDEX IF NOT EXISTS idx_commissions_project_id
ON public.commissions(project_id);

-- Composite index for income and project lookup
CREATE INDEX IF NOT EXISTS idx_commissions_income_project
ON public.commissions(income_id, project_id);

-- =====================================================
-- 5. Add comment
-- =====================================================

COMMENT ON COLUMN public.commissions.project_id IS
'Project reference for commission tracking and reporting';

-- =====================================================
-- 6. Update process_income_distribution trigger
-- =====================================================

-- Update the trigger function to include project_id when creating commission
CREATE OR REPLACE FUNCTION public.process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  v_net_amount DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(15,2);
  v_distributable_amount DECIMAL(15,2);
  v_project_id UUID;
BEGIN
  -- Get project details
  SELECT p.company_rate, i.project_id
  INTO v_commission_rate, v_project_id
  FROM public.projects p
  INNER JOIN public.incomes i ON i.project_id = p.id
  WHERE i.id = NEW.id;

  -- Calculate commission
  v_commission_amount := NEW.net_amount * (v_commission_rate / 100);

  -- Calculate distributable amount (net - commission)
  v_distributable_amount := NEW.net_amount - v_commission_amount;

  -- Create commission record WITH project_id
  INSERT INTO public.commissions (income_id, project_id, rate, amount)
  VALUES (NEW.id, v_project_id, v_commission_rate, v_commission_amount);

  -- Create income distributions for project representatives
  INSERT INTO public.income_distributions (
    income_id,
    user_id,
    personnel_id,
    amount,
    share_percentage
  )
  SELECT
    NEW.id,
    pr.user_id,
    pr.personnel_id,
    v_distributable_amount * (pr.share_percentage / 100),
    pr.share_percentage
  FROM public.project_representatives pr
  WHERE pr.project_id = v_project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ project_id column added to commissions table';
  RAISE NOTICE '✓ Existing commissions updated with project_id';
  RAISE NOTICE '✓ Indexes created for performance';
  RAISE NOTICE '✓ process_income_distribution updated to include project_id';
  RAISE NOTICE '✓ Migration 049 trigger will now work correctly';
END $$;
