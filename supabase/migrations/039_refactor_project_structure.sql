-- Refactor project representative structure and add referee approval system
-- This migration removes percentage-based automatic distribution and adds manual allocation

-- 1. Add referee approval fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS sent_to_referee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referee_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referee_approval_date TIMESTAMP WITH TIME ZONE;

-- 2. Add role column to project_representatives and remove share_percentage
-- First, add the role column
ALTER TABLE public.project_representatives
ADD COLUMN IF NOT EXISTS role TEXT;

-- Create enum type for roles
DO $$ BEGIN
  CREATE TYPE project_representative_role AS ENUM ('project_leader', 'researcher');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update the role column to use the enum type
-- First, update existing data: make first representative of each project the leader
WITH first_reps AS (
  SELECT DISTINCT ON (project_id)
    id,
    project_id
  FROM public.project_representatives
  ORDER BY project_id, created_at ASC
)
UPDATE public.project_representatives
SET role = CASE
  WHEN id IN (SELECT id FROM first_reps) THEN 'project_leader'
  ELSE 'researcher'
END
WHERE role IS NULL;

-- Now we can safely change the column type
ALTER TABLE public.project_representatives
ALTER COLUMN role TYPE project_representative_role
USING role::project_representative_role;

-- Make role NOT NULL
ALTER TABLE public.project_representatives
ALTER COLUMN role SET NOT NULL;

-- Set default for new rows
ALTER TABLE public.project_representatives
ALTER COLUMN role SET DEFAULT 'researcher'::project_representative_role;

-- Remove share_percentage column (no longer needed)
ALTER TABLE public.project_representatives
DROP COLUMN IF EXISTS share_percentage;

-- 3. Add constraint: Only one project_leader per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_project_leader_per_project
ON public.project_representatives (project_id)
WHERE role = 'project_leader';

-- 4. Create manual_balance_allocations table to track manual balance changes
CREATE TABLE IF NOT EXISTS public.manual_balance_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for manual_balance_allocations
CREATE INDEX IF NOT EXISTS idx_manual_allocations_project ON public.manual_balance_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_manual_allocations_user ON public.manual_balance_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_allocations_created_by ON public.manual_balance_allocations(created_by);

-- Enable RLS on manual_balance_allocations
ALTER TABLE public.manual_balance_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for manual_balance_allocations
CREATE POLICY "Admins and Managers can view all allocations"
ON public.manual_balance_allocations FOR SELECT
TO authenticated
USING (is_admin_or_manager());

CREATE POLICY "Admins and Managers can create allocations"
ON public.manual_balance_allocations FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager());

-- 5. Create function to get total allocated balance for a project
CREATE OR REPLACE FUNCTION public.get_project_total_allocated(p_project_id UUID)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_allocated DECIMAL(15, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO total_allocated
  FROM public.manual_balance_allocations
  WHERE project_id = p_project_id;

  RETURN total_allocated;
END;
$$;

-- 6. Create function to get project distributable amount
CREATE OR REPLACE FUNCTION public.get_project_distributable_amount(p_project_id UUID)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_income DECIMAL(15, 2);
  total_vat DECIMAL(15, 2);
  total_commission DECIMAL(15, 2);
  distributable DECIMAL(15, 2);
BEGIN
  -- Get total income, VAT, and commission for the project
  SELECT
    COALESCE(SUM(gross_amount), 0),
    COALESCE(SUM(vat_amount), 0),
    COALESCE(SUM(commission_amount), 0)
  INTO
    total_income,
    total_vat,
    total_commission
  FROM public.incomes
  WHERE project_id = p_project_id;

  -- Calculate distributable amount: gross - VAT - commission
  distributable := total_income - total_vat - total_commission;

  RETURN distributable;
END;
$$;

-- 7. Create function to validate allocation doesn't exceed project budget
CREATE OR REPLACE FUNCTION public.validate_allocation_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  distributable DECIMAL(15, 2);
  current_allocated DECIMAL(15, 2);
  new_total DECIMAL(15, 2);
BEGIN
  -- Get distributable amount for this project
  distributable := get_project_distributable_amount(NEW.project_id);

  -- Get current total allocated (excluding this new record)
  SELECT COALESCE(SUM(amount), 0)
  INTO current_allocated
  FROM public.manual_balance_allocations
  WHERE project_id = NEW.project_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Calculate new total
  new_total := current_allocated + NEW.amount;

  -- Check if new total exceeds distributable amount
  IF new_total > distributable THEN
    RAISE EXCEPTION 'Toplam dağıtılan tutar (%) projenin dağıtılabilir tutarını (%) aşamaz',
      new_total, distributable;
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to validate allocations
DROP TRIGGER IF EXISTS validate_allocation_trigger ON public.manual_balance_allocations;
CREATE TRIGGER validate_allocation_trigger
  BEFORE INSERT OR UPDATE ON public.manual_balance_allocations
  FOR EACH ROW
  EXECUTE FUNCTION validate_allocation_amount();

-- 8. Add comment explaining the new system
COMMENT ON COLUMN public.projects.sent_to_referee IS 'Proje hakem heyetine gönderildi mi?';
COMMENT ON COLUMN public.projects.referee_approved IS 'Hakem heyeti onayı alındı mı?';
COMMENT ON COLUMN public.projects.referee_approval_date IS 'Hakem heyeti onay tarihi';
COMMENT ON COLUMN public.project_representatives.role IS 'Proje temsilcisinin rolü (project_leader veya researcher)';
COMMENT ON TABLE public.manual_balance_allocations IS 'Proje gelirlerinin ekip üyelerine manuel olarak dağıtım kayıtları';
