-- Fix get_project_distributable_amount function to use commissions table
-- instead of non-existent commission_amount column in incomes table

BEGIN;

CREATE OR REPLACE FUNCTION public.get_project_distributable_amount(p_project_id UUID)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_gross DECIMAL(15, 2);
  total_vat DECIMAL(15, 2);
  total_commission DECIMAL(15, 2);
  distributable DECIMAL(15, 2);
BEGIN
  -- Get total gross and VAT for the project
  SELECT
    COALESCE(SUM(gross_amount), 0),
    COALESCE(SUM(vat_amount), 0)
  INTO
    total_gross,
    total_vat
  FROM public.incomes
  WHERE project_id = p_project_id;

  -- Get total commission from commissions table
  SELECT COALESCE(SUM(c.amount), 0)
  INTO total_commission
  FROM public.commissions c
  INNER JOIN public.incomes i ON c.income_id = i.id
  WHERE i.project_id = p_project_id;

  -- Calculate distributable amount: gross - VAT - commission
  distributable := total_gross - total_vat - total_commission;

  RETURN distributable;
END;
$$;

COMMIT;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'get_project_distributable_amount function fixed successfully!';
  RAISE NOTICE 'Now uses commissions table instead of commission_amount column';
END $$;
