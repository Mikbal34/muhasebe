-- Add polymorphic person references to financial tables
-- This allows tables to reference either users (system users) OR personnel (non-system users)

BEGIN;

-- ============================================================================
-- 1. UPDATE BALANCES TABLE
-- ============================================================================

-- Add personnel_id column
ALTER TABLE public.balances
ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE;

-- Make user_id nullable (was NOT NULL)
ALTER TABLE public.balances
ALTER COLUMN user_id DROP NOT NULL;

-- Drop old UNIQUE constraint on user_id only
ALTER TABLE public.balances
DROP CONSTRAINT IF EXISTS balances_user_id_key;

-- Add CHECK constraint: must have EITHER user_id OR personnel_id, but NOT both
ALTER TABLE public.balances
ADD CONSTRAINT balances_person_check
CHECK (
  (user_id IS NOT NULL AND personnel_id IS NULL) OR
  (user_id IS NULL AND personnel_id IS NOT NULL)
);

-- Add UNIQUE constraints for both user_id and personnel_id
CREATE UNIQUE INDEX IF NOT EXISTS balances_user_id_unique
  ON public.balances(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS balances_personnel_id_unique
  ON public.balances(personnel_id)
  WHERE personnel_id IS NOT NULL;

-- Add index for personnel_id lookups
CREATE INDEX IF NOT EXISTS idx_balances_personnel_id ON public.balances(personnel_id);

-- Add columns for better financial tracking (if not exist from earlier migrations)
ALTER TABLE public.balances
ADD COLUMN IF NOT EXISTS total_income DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
ADD COLUMN IF NOT EXISTS total_payment DECIMAL(15,2) DEFAULT 0.00 NOT NULL;

-- Update balances comment
COMMENT ON TABLE public.balances IS 'Financial balances for users and personnel';
COMMENT ON COLUMN public.balances.user_id IS 'Reference to system user (NULL if personnel)';
COMMENT ON COLUMN public.balances.personnel_id IS 'Reference to personnel (NULL if user)';

-- ============================================================================
-- 2. UPDATE PROJECT_REPRESENTATIVES TABLE
-- ============================================================================

-- Add personnel_id column
ALTER TABLE public.project_representatives
ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE;

-- Make user_id nullable
ALTER TABLE public.project_representatives
ALTER COLUMN user_id DROP NOT NULL;

-- Drop old UNIQUE constraint
ALTER TABLE public.project_representatives
DROP CONSTRAINT IF EXISTS project_representatives_project_id_user_id_key;

-- Add CHECK constraint
ALTER TABLE public.project_representatives
ADD CONSTRAINT project_representatives_person_check
CHECK (
  (user_id IS NOT NULL AND personnel_id IS NULL) OR
  (user_id IS NULL AND personnel_id IS NOT NULL)
);

-- Add new UNIQUE constraints to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS project_representatives_project_user_unique
  ON public.project_representatives(project_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_representatives_project_personnel_unique
  ON public.project_representatives(project_id, personnel_id)
  WHERE personnel_id IS NOT NULL;

-- Add index for personnel_id lookups
CREATE INDEX IF NOT EXISTS idx_project_representatives_personnel_id
  ON public.project_representatives(personnel_id);

COMMENT ON COLUMN public.project_representatives.user_id IS 'Reference to system user (NULL if personnel)';
COMMENT ON COLUMN public.project_representatives.personnel_id IS 'Reference to personnel (NULL if user)';

-- ============================================================================
-- 3. UPDATE PAYMENT_INSTRUCTIONS TABLE
-- ============================================================================

-- Add personnel_id column (recipient can be personnel)
ALTER TABLE public.payment_instructions
ADD COLUMN IF NOT EXISTS recipient_personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE;

-- Make user_id nullable (recipient can be user OR personnel)
ALTER TABLE public.payment_instructions
ALTER COLUMN user_id DROP NOT NULL;

-- Rename user_id to recipient_user_id for clarity (optional, adds clarity)
-- Note: We'll keep user_id for backward compatibility but add comment
COMMENT ON COLUMN public.payment_instructions.user_id IS 'Recipient user ID (NULL if recipient is personnel)';
COMMENT ON COLUMN public.payment_instructions.recipient_personnel_id IS 'Recipient personnel ID (NULL if recipient is user)';

-- Add CHECK constraint for recipient
ALTER TABLE public.payment_instructions
ADD CONSTRAINT payment_instructions_recipient_check
CHECK (
  (user_id IS NOT NULL AND recipient_personnel_id IS NULL) OR
  (user_id IS NULL AND recipient_personnel_id IS NOT NULL)
);

-- Add index for personnel recipient lookups
CREATE INDEX IF NOT EXISTS idx_payment_instructions_recipient_personnel
  ON public.payment_instructions(recipient_personnel_id);

-- ============================================================================
-- 4. UPDATE INCOME_DISTRIBUTIONS TABLE
-- ============================================================================

-- Add personnel_id column
ALTER TABLE public.income_distributions
ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE;

-- Make user_id nullable
ALTER TABLE public.income_distributions
ALTER COLUMN user_id DROP NOT NULL;

-- Add CHECK constraint
ALTER TABLE public.income_distributions
ADD CONSTRAINT income_distributions_person_check
CHECK (
  (user_id IS NOT NULL AND personnel_id IS NULL) OR
  (user_id IS NULL AND personnel_id IS NOT NULL)
);

-- Add index for personnel_id lookups
CREATE INDEX IF NOT EXISTS idx_income_distributions_personnel_id
  ON public.income_distributions(personnel_id);

COMMENT ON COLUMN public.income_distributions.user_id IS 'Reference to system user (NULL if personnel)';
COMMENT ON COLUMN public.income_distributions.personnel_id IS 'Reference to personnel (NULL if user)';

-- ============================================================================
-- 5. UPDATE MANUAL_BALANCE_ALLOCATIONS TABLE
-- ============================================================================

-- Add personnel_id column
ALTER TABLE public.manual_balance_allocations
ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES public.personnel(id) ON DELETE CASCADE;

-- Make user_id nullable
ALTER TABLE public.manual_balance_allocations
ALTER COLUMN user_id DROP NOT NULL;

-- Add CHECK constraint
ALTER TABLE public.manual_balance_allocations
ADD CONSTRAINT manual_balance_allocations_person_check
CHECK (
  (user_id IS NOT NULL AND personnel_id IS NULL) OR
  (user_id IS NULL AND personnel_id IS NOT NULL)
);

-- Add index for personnel_id lookups
CREATE INDEX IF NOT EXISTS idx_manual_balance_allocations_personnel_id
  ON public.manual_balance_allocations(personnel_id);

COMMENT ON COLUMN public.manual_balance_allocations.user_id IS 'Reference to system user (NULL if personnel)';
COMMENT ON COLUMN public.manual_balance_allocations.personnel_id IS 'Reference to personnel (NULL if user)';

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get person info (user or personnel)
CREATE OR REPLACE FUNCTION public.get_person_info(
  p_user_id UUID,
  p_personnel_id UUID
)
RETURNS TABLE (
  id UUID,
  full_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  iban VARCHAR,
  person_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.iban,
      'user'::VARCHAR as person_type
    FROM public.users u
    WHERE u.id = p_user_id;
  ELSIF p_personnel_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.phone,
      p.iban,
      'personnel'::VARCHAR as person_type
    FROM public.personnel p
    WHERE p.id = p_personnel_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_person_info IS 'Get person information whether user or personnel';

-- ============================================================================
-- 7. UPDATE EXISTING TRIGGERS IF NEEDED
-- ============================================================================

-- Update the handle_new_user function to work with new balance structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create balance record with user_id (personnel_id will be NULL)
  INSERT INTO public.balances (
    user_id,
    personnel_id,
    available_amount,
    debt_amount,
    total_income,
    total_payment
  )
  VALUES (
    NEW.id,
    NULL,
    0,
    0,
    0,
    0
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Balance already exists, ignore
    RETURN NEW;
END;
$$;

COMMIT;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '✓ Polymorphic person references added successfully!';
  RAISE NOTICE '✓ Tables updated: balances, project_representatives, payment_instructions, income_distributions, manual_balance_allocations';
  RAISE NOTICE '✓ Each table can now reference EITHER users OR personnel';
  RAISE NOTICE '✓ CHECK constraints ensure only one type is referenced';
  RAISE NOTICE '✓ Helper function get_person_info() created';
END $$;
