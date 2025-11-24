-- Migration 052: Add Commission Trigger for Income
-- Creates automatic commission calculation when income is created
-- Does NOT handle distribution (manual allocation is used for that)

-- =====================================================
-- 1. Drop old trigger if exists
-- =====================================================

DROP TRIGGER IF EXISTS process_income_distribution_trigger ON public.incomes;
DROP TRIGGER IF EXISTS process_income_commission_trigger ON public.incomes;

-- =====================================================
-- 2. Create Commission Trigger Function
-- =====================================================

-- Function to create commission record when income is inserted
CREATE OR REPLACE FUNCTION public.process_income_commission()
RETURNS TRIGGER AS $$
DECLARE
  commission_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
BEGIN
  -- Get project's commission rate
  SELECT company_rate INTO project_commission_rate
  FROM public.projects WHERE id = NEW.project_id;

  -- Use project's commission rate, fallback to 10% if not set
  project_commission_rate := COALESCE(project_commission_rate, 10.00);

  -- Calculate commission from NET amount (after VAT)
  -- NET amount is already calculated by calculate_income_amounts_trigger (BEFORE trigger)
  commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);

  -- Insert commission record with project_id
  -- This will trigger commission_to_admin_balance_trigger (migration 049)
  -- which automatically adds the commission to admin balance
  INSERT INTO public.commissions (income_id, project_id, rate, amount)
  VALUES (NEW.id, NEW.project_id, project_commission_rate, commission_amount);

  -- NOTE: We do NOT distribute to team members here
  -- Distribution is done manually via the allocation page

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Create Trigger
-- =====================================================

-- Create trigger that fires AFTER income is inserted
-- This runs AFTER calculate_income_amounts_trigger so net_amount is already calculated
CREATE TRIGGER process_income_commission_trigger
AFTER INSERT ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION public.process_income_commission();

-- =====================================================
-- 4. Backfill: Create commissions for existing incomes
-- =====================================================

-- Create commission records for incomes that don't have one yet
DO $$
DECLARE
  income_record RECORD;
  commission_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
  created_count INTEGER := 0;
BEGIN
  -- Loop through all incomes that don't have a commission
  FOR income_record IN
    SELECT i.id, i.project_id, i.net_amount, p.company_rate
    FROM public.incomes i
    JOIN public.projects p ON i.project_id = p.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.commissions c WHERE c.income_id = i.id
    )
  LOOP
    -- Get commission rate
    project_commission_rate := COALESCE(income_record.company_rate, 10.00);

    -- Calculate commission amount
    commission_amount := ROUND(income_record.net_amount * project_commission_rate / 100, 2);

    -- Insert commission record
    INSERT INTO public.commissions (income_id, project_id, rate, amount)
    VALUES (income_record.id, income_record.project_id, project_commission_rate, commission_amount);

    created_count := created_count + 1;
  END LOOP;

  RAISE NOTICE 'Created % commission records for existing incomes', created_count;
END $$;

-- =====================================================
-- 5. Verify and Comment
-- =====================================================

COMMENT ON FUNCTION public.process_income_commission() IS
'Automatically creates commission record when income is inserted. Commission is calculated from net_amount (after VAT). Does NOT distribute to team members - that is done manually via allocation page.';

COMMENT ON TRIGGER process_income_commission_trigger ON public.incomes IS
'Triggers commission creation after income is inserted. Works with commission_to_admin_balance_trigger to automatically add TTO commission to admin balance.';

-- Example calculation:
-- Gross: 40,000 TL
-- VAT (18%): 40,000 × 18 ÷ 118 = 6,101.69 TL
-- Net: 40,000 - 6,101.69 = 33,898.31 TL
-- Commission (10%): 33,898.31 × 10 ÷ 100 = 3,389.83 TL (goes to admin balance)
-- Distributable: 33,898.31 - 3,389.83 = 30,508.48 TL (manually allocated to team)

DO $$
BEGIN
  RAISE NOTICE '✓ Commission trigger function created';
  RAISE NOTICE '✓ Commission trigger created on incomes table';
  RAISE NOTICE '✓ Backfilled commissions for existing incomes';
  RAISE NOTICE '✓ Migration 052 completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'HOW IT WORKS:';
  RAISE NOTICE '1. Income inserted → calculate_income_amounts_trigger (BEFORE) calculates VAT and net_amount';
  RAISE NOTICE '2. Income inserted → process_income_commission_trigger (AFTER) creates commission record';
  RAISE NOTICE '3. Commission inserted → commission_to_admin_balance_trigger adds to admin balance';
  RAISE NOTICE '4. Team allocation → Done manually via allocation page';
END $$;
