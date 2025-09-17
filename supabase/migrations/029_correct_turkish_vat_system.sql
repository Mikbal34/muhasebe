-- Correct Turkish VAT system: VAT is INCLUDED in gross amount

CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Turkish VAT system: gross_amount includes VAT
  -- VAT is extracted from gross amount

  -- Calculate VAT amount (VAT is included in gross amount)
  NEW.vat_amount := ROUND(NEW.gross_amount * NEW.vat_rate / (100 + NEW.vat_rate), 2);

  -- Net amount (gross - VAT)
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Example:
-- User enters: 10,000 TL brüt (KDV dahil)
-- VAT 10%: 10,000 × 10 ÷ 110 = 909.09 TL
-- Net amount: 10,000 - 909.09 = 9,090.91 TL