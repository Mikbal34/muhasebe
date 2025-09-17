-- Fix VAT calculation: gross_amount is NET, VAT is ADDED to it

CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- NEW LOGIC: gross_amount is actually NET amount
  -- VAT is calculated and ADDED to gross_amount

  -- Calculate VAT amount (VAT is ADDED to net amount)
  NEW.vat_amount := ROUND(NEW.gross_amount * NEW.vat_rate / 100, 2);

  -- Net amount is the same as gross_amount (since gross_amount is actually net)
  NEW.net_amount := NEW.gross_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Example:
-- User enters: 10,000 TL (this is NET)
-- VAT 10%: 10,000 × 10% = 1,000 TL
-- Net amount: 10,000 TL
-- Total to customer: 11,000 TL