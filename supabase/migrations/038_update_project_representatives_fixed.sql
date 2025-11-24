-- Update project_representatives table for personnel support (Fixed)

BEGIN;

-- Drop existing constraints first
ALTER TABLE project_representatives DROP CONSTRAINT IF EXISTS project_representatives_user_id_fkey;
ALTER TABLE project_representatives DROP CONSTRAINT IF EXISTS project_representatives_project_id_user_id_key;
ALTER TABLE project_representatives DROP CONSTRAINT IF EXISTS project_representatives_project_person_unique;
ALTER TABLE project_representatives DROP CONSTRAINT IF EXISTS project_representatives_user_or_personnel_check;

-- Make user_id nullable
ALTER TABLE project_representatives ALTER COLUMN user_id DROP NOT NULL;

-- Add personnel_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_representatives' AND column_name = 'personnel_id'
  ) THEN
    ALTER TABLE project_representatives ADD COLUMN personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add role column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_representatives' AND column_name = 'role'
  ) THEN
    ALTER TABLE project_representatives ADD COLUMN role VARCHAR(20) CHECK (role IN ('project_leader', 'researcher'));
  END IF;
END $$;

-- Drop share_percentage and is_lead columns (no longer needed)
ALTER TABLE project_representatives DROP COLUMN IF EXISTS share_percentage;
ALTER TABLE project_representatives DROP COLUMN IF EXISTS is_lead;

-- Recreate foreign key with proper constraint
ALTER TABLE project_representatives ADD CONSTRAINT project_representatives_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add unique constraint for either user or personnel
ALTER TABLE project_representatives
  ADD CONSTRAINT project_representatives_project_person_unique
  UNIQUE(project_id, user_id, personnel_id);

-- Add check constraint to ensure either user_id or personnel_id is provided
ALTER TABLE project_representatives
  ADD CONSTRAINT project_representatives_user_or_personnel_check
  CHECK (
    (user_id IS NOT NULL AND personnel_id IS NULL) OR
    (user_id IS NULL AND personnel_id IS NOT NULL)
  );

-- Update existing records to have a role (default to researcher for backwards compatibility)
UPDATE project_representatives
SET role = 'researcher'
WHERE role IS NULL;

-- Make role NOT NULL after updating existing records
ALTER TABLE project_representatives ALTER COLUMN role SET NOT NULL;

-- Create indexes for better query performance
DROP INDEX IF EXISTS idx_project_representatives_personnel;
DROP INDEX IF EXISTS idx_project_representatives_user;
DROP INDEX IF EXISTS idx_project_representatives_project_role;

CREATE INDEX idx_project_representatives_personnel
  ON project_representatives(personnel_id) WHERE personnel_id IS NOT NULL;

CREATE INDEX idx_project_representatives_user
  ON project_representatives(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_project_representatives_project_role
  ON project_representatives(project_id, role);

COMMIT;
