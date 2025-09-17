-- Fix VAT and commission rate calculations in database triggers
-- This migration ensures all calculations use project-specific rates

-- First, update the calculate_income_amounts function to use project's VAT rate
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

  -- Calculate VAT amount (VAT is included in gross amount)
  -- Formula: VAT = gross_amount * vat_rate / (100 + vat_rate)
  NEW.vat_amount := ROUND(NEW.gross_amount * project_vat_rate / (100 + project_vat_rate), 2);

  -- Calculate net amount (gross - VAT)
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the process_income_distribution function to use project's commission rate
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

  -- Calculate commission using project's commission rate
  commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);

  -- Insert commission record with actual rate used
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

-- Comment explaining the changes
-- This migration fixes two critical issues:
-- 1. VAT calculation now uses the project's VAT rate instead of relying on the API-provided rate
-- 2. Commission calculation now uses the project's commission rate instead of hardcoded 15%
-- 3. VAT calculation uses the correct Turkish VAT formula: VAT = gross * rate / (100 + rate)