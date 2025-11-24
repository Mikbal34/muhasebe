-- Update project_representatives table for personnel support

-- Drop old constraints
ALTER TABLE project_representatives DROP CONSTRAINT IF EXISTS project_representatives_user_id_fkey;
ALTER TABLE project_representatives DROP CONSTRAINT IF EXISTS project_representatives_project_id_user_id_key;

-- Make user_id nullable
ALTER TABLE project_representatives ALTER COLUMN user_id DROP NOT NULL;

-- Add personnel_id column
ALTER TABLE project_representatives ADD COLUMN IF NOT EXISTS personnel_id UUID REFERENCES personnel(id) ON DELETE CASCADE;

-- Add role column
ALTER TABLE project_representatives ADD COLUMN IF NOT EXISTS role VARCHAR(20) CHECK (role IN ('project_leader', 'researcher'));

-- Drop share_percentage and is_lead columns (no longer needed with polymorphic design)
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_representatives_personnel
  ON project_representatives(personnel_id) WHERE personnel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_representatives_user
  ON project_representatives(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_representatives_project_role
  ON project_representatives(project_id, role);
