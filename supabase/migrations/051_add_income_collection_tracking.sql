-- Migration 051: Add Income Collection Tracking
-- Enables tracking of collected (tahsil edilen) vs outstanding (açık bakiye) amounts

-- =====================================================
-- 1. Add collection tracking fields to incomes table
-- =====================================================

-- Add collected_amount field (default 0)
ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS collected_amount DECIMAL(15,2) DEFAULT 0 NOT NULL;

-- Add collection_date field (nullable - null if not yet collected)
ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS collection_date DATE;

-- =====================================================
-- 2. Add constraints
-- =====================================================

-- Ensure collected_amount cannot exceed gross_amount
ALTER TABLE public.incomes
ADD CONSTRAINT check_collected_amount_valid
CHECK (collected_amount >= 0 AND collected_amount <= gross_amount);

-- =====================================================
-- 3. Create computed columns via views (optional)
-- =====================================================

-- Create a view with computed fields for easier querying
CREATE OR REPLACE VIEW public.income_collection_status AS
SELECT
  i.*,
  (i.gross_amount - i.collected_amount) AS outstanding_amount,
  CASE
    WHEN i.collected_amount = 0 THEN 'invoiced'
    WHEN i.collected_amount > 0 AND i.collected_amount < i.gross_amount THEN 'partially_collected'
    WHEN i.collected_amount >= i.gross_amount THEN 'fully_collected'
    ELSE 'unknown'
  END AS collection_status
FROM public.incomes i;

-- =====================================================
-- 4. Create indexes for performance
-- =====================================================

-- Index for collection queries
CREATE INDEX IF NOT EXISTS idx_incomes_collected_amount
ON public.incomes(collected_amount);

-- Index for filtering by collection status
CREATE INDEX IF NOT EXISTS idx_incomes_collection_date
ON public.incomes(collection_date);

-- =====================================================
-- 5. Add comments
-- =====================================================

COMMENT ON COLUMN public.incomes.collected_amount IS
'Amount that has been collected/paid (tahsil edilen). Outstanding = gross_amount - collected_amount';

COMMENT ON COLUMN public.incomes.collection_date IS
'Date when the income was fully or partially collected. NULL if not yet collected.';

COMMENT ON VIEW public.income_collection_status IS
'View providing computed collection status fields: outstanding_amount and collection_status';

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ collected_amount column added to incomes table';
  RAISE NOTICE '✓ collection_date column added to incomes table';
  RAISE NOTICE '✓ Constraint added: collected_amount <= gross_amount';
  RAISE NOTICE '✓ View income_collection_status created with computed fields';
  RAISE NOTICE '✓ Indexes created for performance';
  RAISE NOTICE '✓ Migration 051 completed successfully';
END $$;
