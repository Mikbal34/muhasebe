-- Correct calculation logic for Turkish VAT and commission system
-- This completely replaces the previous calculation logic

-- Drop existing triggers first
DROP TRIGGER IF EXISTS calculate_income_amounts_trigger ON incomes;
DROP TRIGGER IF EXISTS process_income_distribution_trigger ON incomes;

-- Updated function for VAT calculation (Turkish VAT is INCLUDED in gross amount)
CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
DECLARE
  project_vat_rate DECIMAL(5,2);
BEGIN
  -- Get project's VAT rate
  SELECT vat_rate INTO project_vat_rate
  FROM projects WHERE id = NEW.project_id;

  -- Use project's VAT rate (fallback to NEW.vat_rate if project rate is null)
  project_vat_rate := COALESCE(project_vat_rate, NEW.vat_rate, 18.00);

  -- Update the record with the correct VAT rate
  NEW.vat_rate := project_vat_rate;

  -- TURKISH VAT CALCULATION: VAT is INCLUDED in gross amount
  -- Formula: VAT = gross_amount × vat_rate ÷ (100 + vat_rate)
  NEW.vat_amount := ROUND(NEW.gross_amount * project_vat_rate / (100 + project_vat_rate), 2);

  -- Calculate net amount (gross - VAT) - this is the amount BEFORE commission
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated function for commission and distribution calculation
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
  FROM projects WHERE id = NEW.project_id;

  -- Use project's commission rate (fallback to 15% if null)
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

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

-- Recreate triggers
CREATE TRIGGER calculate_income_amounts_trigger
  BEFORE INSERT OR UPDATE ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_income_amounts();

CREATE TRIGGER process_income_distribution_trigger
  AFTER INSERT ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION process_income_distribution();

-- Example calculation comment:
-- Input: 50,000 TL gross, 20% VAT, 10% commission
-- Step 1: VAT = 50,000 × 20 ÷ (100 + 20) = 50,000 × 20 ÷ 120 = 8,333.33 TL
-- Step 2: Net = 50,000 - 8,333.33 = 41,666.67 TL
-- Step 3: Commission = 41,666.67 × 10 ÷ 100 = 4,166.67 TL (to company)
-- Step 4: Distributable = 41,666.67 - 4,166.67 = 37,500 TL (to academicians)