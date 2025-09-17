-- Fix distribution calculation: All percentages based on net amount
-- Company commission + academician shares = 100% of net amount

CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
BEGIN
  -- Get project's commission rate
  SELECT company_rate INTO project_commission_rate
  FROM projects WHERE id = NEW.project_id;

  -- Use project's commission rate
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

  -- Calculate commission from NET amount (company gets its percentage)
  commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);

  -- Insert commission record
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, project_commission_rate, commission_amount);

  -- Distribute to academicians
  -- CORRECT LOGIC: Each academician gets their percentage directly from NET amount
  FOR rep IN
    SELECT pr.user_id, pr.share_percentage
    FROM project_representatives pr
    WHERE pr.project_id = NEW.project_id
  LOOP
    -- Each academician gets their percentage of NET amount
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

-- Example with correct calculation:
-- Net amount: 8,000 TL
-- Company rate: 10% → 8,000 × 10% = 800 TL
-- Academician A: 40% → 8,000 × 40% = 3,200 TL
-- Academician B: 50% → 8,000 × 50% = 4,000 TL
-- Total: 800 + 3,200 + 4,000 = 8,000 TL ✓