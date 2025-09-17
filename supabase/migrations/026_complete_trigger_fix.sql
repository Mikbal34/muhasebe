-- COMPLETE FIX: Replace all income calculation triggers with correct logic
-- This will be the final, correct version

-- Drop all existing triggers first
DROP TRIGGER IF EXISTS calculate_income_amounts_trigger ON incomes;
DROP TRIGGER IF EXISTS process_income_distribution_trigger ON incomes;

-- 1. VAT CALCULATION TRIGGER (BEFORE INSERT/UPDATE)
CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
DECLARE
  project_vat_rate DECIMAL(5,2);
BEGIN
  -- Get project's VAT rate (THIS WAS THE BUG - old trigger used NEW.vat_rate)
  SELECT vat_rate INTO project_vat_rate
  FROM projects WHERE id = NEW.project_id;

  -- Use project's VAT rate, fallback to provided rate
  project_vat_rate := COALESCE(project_vat_rate, NEW.vat_rate, 18.00);

  -- Update the record with correct VAT rate
  NEW.vat_rate := project_vat_rate;

  -- Turkish VAT calculation: VAT is included in gross amount
  NEW.vat_amount := ROUND(NEW.gross_amount * project_vat_rate / (100 + project_vat_rate), 2);

  -- Net amount (after VAT)
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. COMMISSION AND DISTRIBUTION TRIGGER (AFTER INSERT)
CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
BEGIN
  -- Get project's commission rate (THIS WAS ALSO THE BUG - old trigger used fixed 15%)
  SELECT company_rate INTO project_commission_rate
  FROM projects WHERE id = NEW.project_id;

  -- Use project's commission rate
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

  -- Calculate commission from NET amount
  commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);

  -- Insert commission record
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, project_commission_rate, commission_amount);

  -- Distribute to academicians
  -- NEW LOGIC: Each academician gets their percentage directly from NET amount
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

-- Create the triggers
CREATE TRIGGER calculate_income_amounts_trigger
  BEFORE INSERT OR UPDATE ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_income_amounts();

CREATE TRIGGER process_income_distribution_trigger
  AFTER INSERT ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION process_income_distribution();

-- Example:
-- 10,000 TL gross, 20% VAT, 20% company, 30%+50% academicians
-- VAT: 10,000 × 20 ÷ 120 = 1,667 TL
-- Net: 8,333 TL
-- Company: 8,333 × 20% = 1,667 TL
-- Academician1: 8,333 × 30% = 2,500 TL
-- Academician2: 8,333 × 50% = 4,167 TL
-- Check: 1,667 + 1,667 + 2,500 + 4,167 = 10,001 TL (rounding)