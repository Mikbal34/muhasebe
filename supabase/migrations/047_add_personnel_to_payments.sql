-- Add personnel support to payment instructions

BEGIN;

-- Add personnel_id column to payment_instructions table
ALTER TABLE payment_instructions
  ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE;

-- Make user_id nullable (either user_id or personnel_id must be present)
ALTER TABLE payment_instructions ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or personnel_id is provided
ALTER TABLE payment_instructions
  ADD CONSTRAINT payment_instructions_user_or_personnel_check
  CHECK (
    (user_id IS NOT NULL AND personnel_id IS NULL) OR
    (user_id IS NULL AND personnel_id IS NOT NULL)
  );

-- Create index for personnel_id
CREATE INDEX IF NOT EXISTS idx_payment_instructions_personnel_id
  ON payment_instructions(personnel_id)
  WHERE personnel_id IS NOT NULL;

COMMIT;
