-- Fix: Use user's provided VAT rate, not project default

CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Use the VAT rate provided by the user (NEW.vat_rate)
  -- Don't override with project default!

  -- Turkish VAT calculation: VAT is included in gross amount
  NEW.vat_amount := ROUND(NEW.gross_amount * NEW.vat_rate / (100 + NEW.vat_rate), 2);

  -- Net amount (after VAT)
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;