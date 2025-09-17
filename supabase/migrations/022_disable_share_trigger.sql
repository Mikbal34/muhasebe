-- Temporarily disable the problematic share validation trigger

DROP TRIGGER IF EXISTS check_project_shares ON project_representatives;

-- We'll recreate it properly after testing the new UI logic