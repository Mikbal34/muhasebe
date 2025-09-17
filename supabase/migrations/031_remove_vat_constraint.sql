-- Remove old VAT calculation constraint that's blocking the new calculation

-- Check if the constraint exists and drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_vat_calculation'
        AND table_name = 'incomes'
    ) THEN
        ALTER TABLE incomes DROP CONSTRAINT check_vat_calculation;
    END IF;
END $$;

-- Also check for any other VAT-related constraints
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name LIKE '%vat%'
        AND table_name = 'incomes'
    ) THEN
        -- List and remove any VAT constraints
        ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_vat_amount_check;
        ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_vat_rate_check;
    END IF;
END $$;