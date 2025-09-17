-- Fix commission rate calculation to use project's company_rate
CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  distributable_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
BEGIN
  -- Get project's commission rate
  SELECT company_rate INTO project_commission_rate
  FROM projects
  WHERE id = NEW.project_id;

  -- Use project commission rate (default to 15% if not set)
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

  -- Calculate commission using project's rate
  commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);

  -- Insert commission record with actual rate
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, project_commission_rate, commission_amount);

  -- Calculate distributable amount (net - commission)
  distributable_amount := NEW.net_amount - commission_amount;

  -- Distribute to project representatives
  FOR rep IN
    SELECT pr.user_id, pr.share_percentage
    FROM project_representatives pr
    WHERE pr.project_id = NEW.project_id
  LOOP
    -- Calculate individual distribution
    distribution_amount := ROUND(distributable_amount * rep.share_percentage / 100, 2);

    -- Insert distribution record
    INSERT INTO income_distributions (
      income_id, user_id, share_percentage, amount
    ) VALUES (
      NEW.id, rep.user_id, rep.share_percentage, distribution_amount
    );

    -- Update user balance
    PERFORM update_balance(
      rep.user_id,
      'income',
      distribution_amount,
      'income_distribution',
      NEW.id,
      'Income distribution from project ' || (SELECT name FROM projects WHERE id = NEW.project_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;