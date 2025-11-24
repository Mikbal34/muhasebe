-- Create all_people view to unify users and personnel for easier querying
-- This view is useful for reports, dropdowns, and any place where we need to show all people

BEGIN;

-- Drop view if exists (for rerunning migration)
DROP VIEW IF EXISTS public.all_people CASCADE;

-- Create unified view of all people (users + personnel)
CREATE VIEW public.all_people AS
SELECT
  id,
  full_name,
  email,
  phone,
  iban,
  'user' as person_type,
  is_active,
  created_at,
  updated_at,
  -- User-specific fields
  role::TEXT as user_role,
  NULL::TEXT as notes,
  NULL::VARCHAR(11) as tc_no
FROM public.users

UNION ALL

SELECT
  id,
  full_name,
  email,
  phone,
  iban,
  'personnel' as person_type,
  is_active,
  created_at,
  updated_at,
  -- Personnel-specific fields
  NULL::TEXT as user_role,
  notes,
  tc_no
FROM public.personnel;

-- Add comment
COMMENT ON VIEW public.all_people IS 'Unified view of all people in the system (users + personnel)';

-- Grant permissions (RLS applies to underlying tables)
GRANT SELECT ON public.all_people TO authenticated;

-- Create helper function to search all people
CREATE OR REPLACE FUNCTION public.search_all_people(
  search_term TEXT DEFAULT NULL,
  include_inactive BOOLEAN DEFAULT false,
  person_type_filter VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  iban VARCHAR,
  person_type VARCHAR,
  is_active BOOLEAN,
  user_role VARCHAR,
  notes TEXT,
  tc_no VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.id,
    ap.full_name,
    ap.email,
    ap.phone,
    ap.iban,
    ap.person_type,
    ap.is_active,
    ap.user_role,
    ap.notes,
    ap.tc_no
  FROM public.all_people ap
  WHERE
    (include_inactive OR ap.is_active = true)
    AND (person_type_filter IS NULL OR ap.person_type = person_type_filter)
    AND (
      search_term IS NULL
      OR ap.full_name ILIKE '%' || search_term || '%'
      OR ap.email ILIKE '%' || search_term || '%'
    )
  ORDER BY ap.full_name ASC;
END;
$$;

COMMENT ON FUNCTION public.search_all_people IS 'Search function for all people (users + personnel) with filters';

-- Create function to get person balance
CREATE OR REPLACE FUNCTION public.get_person_balance(
  p_user_id UUID DEFAULT NULL,
  p_personnel_id UUID DEFAULT NULL
)
RETURNS TABLE (
  available_amount DECIMAL,
  debt_amount DECIMAL,
  total_income DECIMAL,
  total_payment DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.available_amount,
    b.debt_amount,
    b.total_income,
    b.total_payment
  FROM public.balances b
  WHERE
    (p_user_id IS NOT NULL AND b.user_id = p_user_id)
    OR (p_personnel_id IS NOT NULL AND b.personnel_id = p_personnel_id);
END;
$$;

COMMENT ON FUNCTION public.get_person_balance IS 'Get balance for a person (user or personnel)';

-- Create function to get person projects
CREATE OR REPLACE FUNCTION public.get_person_projects(
  p_user_id UUID DEFAULT NULL,
  p_personnel_id UUID DEFAULT NULL
)
RETURNS TABLE (
  project_id UUID,
  project_code VARCHAR,
  project_name VARCHAR,
  role VARCHAR,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as project_id,
    p.code as project_code,
    p.name as project_name,
    pr.role,
    p.is_active
  FROM public.project_representatives pr
  INNER JOIN public.projects p ON pr.project_id = p.id
  WHERE
    (p_user_id IS NOT NULL AND pr.user_id = p_user_id)
    OR (p_personnel_id IS NOT NULL AND pr.personnel_id = p_personnel_id)
  ORDER BY p.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_person_projects IS 'Get all projects for a person (user or personnel)';

COMMIT;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '✓ all_people view created successfully!';
  RAISE NOTICE '✓ Helper functions created:';
  RAISE NOTICE '  - search_all_people(): Search with filters';
  RAISE NOTICE '  - get_person_balance(): Get balance for user or personnel';
  RAISE NOTICE '  - get_person_projects(): Get projects for user or personnel';
  RAISE NOTICE '✓ Use this view in reports and UI dropdowns';
END $$;
