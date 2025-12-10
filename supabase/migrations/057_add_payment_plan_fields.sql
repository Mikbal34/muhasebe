-- Migration 057: Add Payment Plan Fields to Incomes Table
-- Enables tracking of planned installments from payment plans

-- =====================================================
-- 1. Add payment plan related fields to incomes table
-- =====================================================

-- is_planned: Marks if this income was auto-created from a payment plan
ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT false NOT NULL;

-- installment_number: Sequential number of the installment (1, 2, 3...)
ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS installment_number INTEGER;

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_incomes_is_planned
ON public.incomes(is_planned);

CREATE INDEX IF NOT EXISTS idx_incomes_installment_number
ON public.incomes(installment_number);

-- Composite index for querying planned installments by project
CREATE INDEX IF NOT EXISTS idx_incomes_project_planned
ON public.incomes(project_id, is_planned)
WHERE is_planned = true;

-- =====================================================
-- 3. Add comments
-- =====================================================

COMMENT ON COLUMN public.incomes.is_planned IS
'Ödeme planından otomatik oluşturulmuş taksit mi? true = planlanan taksit, false = manuel gelir';

COMMENT ON COLUMN public.incomes.installment_number IS
'Ödeme planı içindeki taksit sıra numarası (1, 2, 3, ...)';

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ is_planned column added to incomes table';
  RAISE NOTICE '✓ installment_number column added to incomes table';
  RAISE NOTICE '✓ Indexes created for payment plan queries';
  RAISE NOTICE '✓ Migration 057 completed successfully';
END $$;
