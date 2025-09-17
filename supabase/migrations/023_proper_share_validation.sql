-- Proper share validation for new UI logic
-- Company rate + academician shares = 100%

CREATE OR REPLACE FUNCTION check_total_shares()
RETURNS TRIGGER AS $$
DECLARE
  total_academician_shares DECIMAL(5,2);
  company_rate DECIMAL(5,2);
  project_total DECIMAL(5,2);
BEGIN
  -- Get the project's company rate
  SELECT p.company_rate INTO company_rate
  FROM projects p
  WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);

  -- Set default if null
  company_rate := COALESCE(company_rate, 15.00);

  -- Calculate total academician shares for the project
  SELECT COALESCE(SUM(share_percentage), 0)
  INTO total_academician_shares
  FROM project_representatives
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND (TG_OP = 'DELETE' OR id != COALESCE(NEW.id, OLD.id));

  -- Add new share if inserting or updating
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    total_academician_shares := total_academician_shares + NEW.share_percentage;
  END IF;

  -- Calculate project total (company + academicians)
  project_total := company_rate + total_academician_shares;

  -- Check if total equals 100%
  IF project_total != 100.00 THEN
    RAISE EXCEPTION 'Total percentages must equal 100%%. Company: %%, Academicians: %%, Total: %%',
      company_rate, total_academician_shares, project_total;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE CONSTRAINT TRIGGER check_project_shares
  AFTER INSERT OR UPDATE OR DELETE ON project_representatives
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION check_total_shares();