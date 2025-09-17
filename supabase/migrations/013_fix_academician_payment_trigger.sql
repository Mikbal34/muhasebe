-- Fix payment amount trigger for academician requests
-- The trigger should not block academician payment requests since we handle
-- balance validation and reservation at the API level

-- Update the trigger function to skip validation for academician requests
CREATE OR REPLACE FUNCTION check_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  available_balance DECIMAL(15,2);
  user_debt DECIMAL(15,2);
  user_role VARCHAR(20);
BEGIN
  -- Get user's role and balance info
  SELECT
    u.role,
    COALESCE(b.available_amount, 0),
    COALESCE(b.debt_amount, 0)
  INTO user_role, available_balance, user_debt
  FROM users u
  LEFT JOIN balances b ON u.id = b.user_id
  WHERE u.id = NEW.user_id;

  -- Skip validation for academician requests (they handle their own validation)
  -- Only validate for admin/finance_officer created payment instructions
  IF user_role = 'academician' AND NEW.created_by = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if user has debt (for non-academician requests)
  IF user_debt > 0 THEN
    RAISE EXCEPTION 'User has outstanding debt. Payment blocked until debt is cleared. Debt amount: %', user_debt;
  END IF;

  -- Check if sufficient balance (for non-academician requests)
  IF NEW.total_amount > available_balance THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', available_balance, NEW.total_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;