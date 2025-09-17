-- Fix income distribution calculation for new percentage system
-- Company rate + academician shares = 100%

CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  distributable_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
  total_academician_percentage DECIMAL(5,2);
BEGIN
  -- Get project's commission rate
  SELECT company_rate INTO project_commission_rate
  FROM projects WHERE id = NEW.project_id;

  -- Use project's commission rate (fallback to 15% if null)
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

  -- Calculate total academician percentage (100% - company_rate)
  total_academician_percentage := 100.00 - project_commission_rate;

  -- IMPORTANT: Commission is calculated from NET amount (after VAT deduction)
  -- This is the amount that goes to the company
  commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);

  -- Insert commission record with actual rate used
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, project_commission_rate, commission_amount);

  -- Calculate distributable amount (net - commission)
  -- This is what gets distributed among academicians
  distributable_amount := NEW.net_amount - commission_amount;

  -- Distribute to project representatives (academicians)
  -- NEW LOGIC: Each academician gets their percentage of the TOTAL NET amount
  -- Not their percentage of the distributable amount
  FOR rep IN
    SELECT pr.user_id, pr.share_percentage
    FROM project_representatives pr
    WHERE pr.project_id = NEW.project_id
  LOOP
    -- Calculate individual distribution based on their percentage of NET amount
    -- rep.share_percentage is their percentage of the total (not of academician portion)
    distribution_amount := ROUND(NEW.net_amount * rep.share_percentage / 100, 2);

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

-- Example calculation with new logic:
-- Input: 10,000 TL net (after VAT), 20% company, 30%+50% academicians
-- Company: 10,000 × 20% = 2,000 TL
-- Academician 1: 10,000 × 30% = 3,000 TL
-- Academician 2: 10,000 × 50% = 5,000 TL
-- Total: 2,000 + 3,000 + 5,000 = 10,000 TL ✓