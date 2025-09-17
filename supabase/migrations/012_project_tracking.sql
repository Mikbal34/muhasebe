-- Add project tracking columns and functions

-- First add updated_at column if it doesn't exist
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add tracking columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_received DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (total_received >= 0),
ADD COLUMN IF NOT EXISTS company_rate DECIMAL(5,2) DEFAULT 15.00 NOT NULL CHECK (company_rate >= 0 AND company_rate <= 100),
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 18.00 NOT NULL CHECK (vat_rate >= 0 AND vat_rate <= 100);

-- Add computed column for remaining budget (check if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'remaining_budget'
  ) THEN
    ALTER TABLE projects
    ADD COLUMN remaining_budget DECIMAL(15,2) GENERATED ALWAYS AS (budget - total_received) STORED;
  END IF;
END $$;

-- Create function to update project total_received when income is added/updated/deleted
CREATE OR REPLACE FUNCTION update_project_total_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE projects
    SET total_received = (
      SELECT COALESCE(SUM(gross_amount), 0)
      FROM incomes
      WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;

    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE projects
    SET total_received = (
      SELECT COALESCE(SUM(gross_amount), 0)
      FROM incomes
      WHERE project_id = OLD.project_id
    )
    WHERE id = OLD.project_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating project total_received (drop if exists)
DROP TRIGGER IF EXISTS update_project_total_received_trigger ON incomes;
CREATE TRIGGER update_project_total_received_trigger
  AFTER INSERT OR UPDATE OR DELETE ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_total_received();

-- Update existing projects with current totals
UPDATE projects
SET total_received = (
  SELECT COALESCE(SUM(gross_amount), 0)
  FROM incomes
  WHERE incomes.project_id = projects.id
);

-- Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_incomes_project_gross ON incomes(project_id, gross_amount);

-- Add helpful view for project summary (drop and recreate)
DROP VIEW IF EXISTS project_summary;
CREATE VIEW project_summary AS
SELECT
  p.id,
  p.code,
  p.name,
  p.budget,
  p.total_received,
  p.remaining_budget,
  p.company_rate,
  p.vat_rate,
  p.status,
  p.start_date,
  p.end_date,
  p.created_at,
  -- Calculate progress percentage
  CASE
    WHEN p.budget > 0 THEN ROUND((p.total_received / p.budget * 100), 2)
    ELSE 0
  END as progress_percentage,
  -- Calculate distributable amount from total received
  p.total_received - (p.total_received * p.vat_rate / (100 + p.vat_rate)) -
  ((p.total_received - (p.total_received * p.vat_rate / (100 + p.vat_rate))) * p.company_rate / 100) as total_distributable,
  -- Count representatives
  (SELECT COUNT(*) FROM project_representatives WHERE project_id = p.id) as representatives_count,
  -- Count income records
  (SELECT COUNT(*) FROM incomes WHERE project_id = p.id) as income_count
FROM projects p;