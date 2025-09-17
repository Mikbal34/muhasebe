-- Fix share percentage validation with correct RAISE syntax

-- Update the share validation function
CREATE OR REPLACE FUNCTION check_total_shares()
RETURNS TRIGGER AS $$
DECLARE
  total_shares DECIMAL(5,2);
  company_rate DECIMAL(5,2);
  required_academician_total DECIMAL(5,2);
BEGIN
  -- Get the project's company rate
  SELECT p.company_rate INTO company_rate
  FROM projects p
  WHERE p.id = COALESCE(NEW.project_id, OLD.project_id);

  -- Calculate required academician share total (100% - company_rate)
  required_academician_total := 100.00 - COALESCE(company_rate, 15.00);

  -- Calculate total academician shares for the project
  SELECT COALESCE(SUM(share_percentage), 0)
  INTO total_shares
  FROM project_representatives
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND (TG_OP = 'DELETE' OR id != COALESCE(NEW.id, OLD.id));

  -- Add new share if inserting or updating
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    total_shares := total_shares + NEW.share_percentage;
  END IF;

  -- Check if academician shares equal the required amount
  IF total_shares != required_academician_total THEN
    RAISE EXCEPTION 'Academician shares must equal %. Company: %, Required: %, Current: %',
      required_academician_total, company_rate, required_academician_total, total_shares;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;