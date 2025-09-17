-- Simple VAT calculation: brütGelir × kdvOranı ÷ 100

CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple VAT calculation: gross_amount × vat_rate ÷ 100
  NEW.vat_amount := ROUND(NEW.gross_amount * NEW.vat_rate / 100, 2);

  -- Net amount (gross - VAT)
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Example:
-- Brüt gelir: 10,000 TL
-- KDV 20%: 10,000 × 20 ÷ 100 = 2,000 TL
-- Net gelir: 10,000 - 2,000 = 8,000 TL