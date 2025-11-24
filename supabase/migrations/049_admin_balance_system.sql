-- Migration 049: Admin Balance System
-- Creates automatic commission income and expense deduction system for admin (TTO)

-- =====================================================
-- 1. Initialize admin balance if not exists
-- =====================================================

-- Create balance record for admin user if they don't have one
DO $$
DECLARE
  v_admin_id UUID;
  v_balance_exists BOOLEAN;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id FROM public.users WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    -- Check if balance already exists
    SELECT EXISTS(SELECT 1 FROM public.balances WHERE public.balances.user_id = v_admin_id) INTO v_balance_exists;

    IF NOT v_balance_exists THEN
      -- Create balance record
      INSERT INTO public.balances (user_id, personnel_id, available_amount, debt_amount, reserved_amount)
      VALUES (v_admin_id, NULL, 0, 0, 0);

      RAISE NOTICE 'Admin balance created successfully';
    ELSE
      RAISE NOTICE 'Admin balance already exists';
    END IF;
  ELSE
    RAISE WARNING 'No admin user found';
  END IF;
END $$;

-- =====================================================
-- 2. Commission to Admin Balance Trigger
-- =====================================================

-- Function to automatically add commission income to admin balance
CREATE OR REPLACE FUNCTION public.add_commission_to_admin_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id uuid;
  v_project_name text;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Get project name if available
  BEGIN
    SELECT COALESCE(code || ' - ' || name, name) INTO v_project_name
    FROM public.projects
    WHERE id = NEW.project_id;
  EXCEPTION WHEN OTHERS THEN
    v_project_name := 'Bilinmeyen proje';
  END;

  -- Add commission to admin balance using existing update_balance function
  PERFORM public.update_balance(
    'income',            -- p_type
    NEW.amount,          -- p_amount (positive for income)
    v_admin_id,          -- p_user_id
    NULL,                -- p_personnel_id
    'commission',        -- p_reference_type
    NEW.id,              -- p_reference_id
    'Proje komisyon geliri: ' || COALESCE(v_project_name, 'Bilinmeyen proje')  -- p_description
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after commission is inserted
CREATE TRIGGER commission_to_admin_balance_trigger
AFTER INSERT ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.add_commission_to_admin_balance();

-- =====================================================
-- 3. Expense Deduction from Admin Balance Trigger
-- =====================================================

-- Function to automatically deduct expenses from admin balance
CREATE OR REPLACE FUNCTION public.deduct_expense_from_admin_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Deduct expense from admin balance using 'payment' type
  PERFORM public.update_balance(
    'payment',           -- p_type (deducts from available balance)
    NEW.amount,          -- p_amount (positive amount to deduct)
    v_admin_id,          -- p_user_id
    NULL,                -- p_personnel_id
    'expense',           -- p_reference_type
    NEW.id,              -- p_reference_id
    'Gider: ' || COALESCE(NEW.description, 'Açıklama yok')  -- p_description
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after expense is inserted
CREATE TRIGGER expense_deduction_trigger
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.deduct_expense_from_admin_balance();

-- =====================================================
-- 4. Reverse Expense Deletion Trigger
-- =====================================================

-- Function to add back expense amount when expense is deleted
CREATE OR REPLACE FUNCTION public.reverse_expense_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Add back the expense amount to admin balance using 'income' type
  PERFORM public.update_balance(
    'income',            -- p_type (reversing an expense is income)
    OLD.amount,          -- p_amount (positive to add back)
    v_admin_id,          -- p_user_id
    NULL,                -- p_personnel_id
    'expense_reversal',  -- p_reference_type
    OLD.id,              -- p_reference_id
    'Gider iptali: ' || COALESCE(OLD.description, 'Açıklama yok')  -- p_description
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after expense is deleted
CREATE TRIGGER expense_deletion_reversal_trigger
AFTER DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.reverse_expense_deletion();

-- =====================================================
-- 5. Create index for better performance
-- =====================================================

-- Index for finding admin balance transactions quickly
CREATE INDEX IF NOT EXISTS idx_balance_transactions_admin_commission
ON public.balance_transactions(balance_id, reference_type)
WHERE reference_type = 'commission';

CREATE INDEX IF NOT EXISTS idx_balance_transactions_admin_expense
ON public.balance_transactions(balance_id, reference_type)
WHERE reference_type IN ('expense', 'expense_reversal');

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION public.add_commission_to_admin_balance() IS
'Automatically adds commission income to admin balance when a new commission record is created';

COMMENT ON FUNCTION public.deduct_expense_from_admin_balance() IS
'Automatically deducts expense from admin balance when a new expense is created';

COMMENT ON FUNCTION public.reverse_expense_deletion() IS
'Reverses the expense deduction from admin balance when an expense is deleted';

COMMENT ON TRIGGER commission_to_admin_balance_trigger ON public.commissions IS
'Triggers admin balance update when commission is created';

COMMENT ON TRIGGER expense_deduction_trigger ON public.expenses IS
'Triggers admin balance deduction when expense is created';

COMMENT ON TRIGGER expense_deletion_reversal_trigger ON public.expenses IS
'Triggers admin balance reversal when expense is deleted';
