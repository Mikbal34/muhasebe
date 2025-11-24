-- Add personnel support to update_balance function

BEGIN;

-- Drop old function
DROP FUNCTION IF EXISTS update_balance(UUID, VARCHAR, DECIMAL, VARCHAR, UUID, TEXT);

-- Create new function with personnel support
CREATE OR REPLACE FUNCTION update_balance(
  p_type VARCHAR(20),
  p_amount DECIMAL(15,2),
  p_user_id UUID DEFAULT NULL,
  p_personnel_id UUID DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_balance_id UUID;
  v_balance_before DECIMAL(15,2);
  v_balance_after DECIMAL(15,2);
  v_transaction_id UUID;
BEGIN
  -- Ensure either user_id or personnel_id is provided
  IF p_user_id IS NULL AND p_personnel_id IS NULL THEN
    RAISE EXCEPTION 'Either user_id or personnel_id must be provided';
  END IF;

  -- Ensure both are not provided
  IF p_user_id IS NOT NULL AND p_personnel_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot provide both user_id and personnel_id';
  END IF;

  -- Get or create balance record
  IF p_user_id IS NOT NULL THEN
    -- Try to insert, ignore if already exists
    INSERT INTO balances (user_id, available_amount, debt_amount, reserved_amount)
    VALUES (p_user_id, 0.00, 0.00, 0.00)
    ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO NOTHING;

    -- Get current balance
    SELECT id, available_amount INTO v_balance_id, v_balance_before
    FROM balances WHERE user_id = p_user_id;
  ELSE
    -- Try to insert, ignore if already exists
    INSERT INTO balances (personnel_id, available_amount, debt_amount, reserved_amount)
    VALUES (p_personnel_id, 0.00, 0.00, 0.00)
    ON CONFLICT (personnel_id) WHERE personnel_id IS NOT NULL DO NOTHING;

    -- Get current balance
    SELECT id, available_amount INTO v_balance_id, v_balance_before
    FROM balances WHERE personnel_id = p_personnel_id;
  END IF;

  -- Update balance based on transaction type
  CASE p_type
    WHEN 'income' THEN
      -- First apply to debt, then to available
      IF (SELECT debt_amount FROM balances WHERE id = v_balance_id) > 0 THEN
        -- Apply to debt first
        UPDATE balances SET
          debt_amount = GREATEST(0, debt_amount - p_amount),
          available_amount = available_amount + GREATEST(0, p_amount - debt_amount),
          last_updated = NOW()
        WHERE id = v_balance_id;
      ELSE
        -- Add to available
        UPDATE balances SET
          available_amount = available_amount + p_amount,
          last_updated = NOW()
        WHERE id = v_balance_id;
      END IF;

    WHEN 'payment' THEN
      -- Deduct from available
      UPDATE balances SET
        available_amount = available_amount - p_amount,
        last_updated = NOW()
      WHERE id = v_balance_id;

    WHEN 'debt' THEN
      -- Add to debt
      UPDATE balances SET
        debt_amount = debt_amount + p_amount,
        last_updated = NOW()
      WHERE id = v_balance_id;

    WHEN 'adjustment' THEN
      -- Can be positive or negative
      UPDATE balances SET
        available_amount = available_amount + p_amount,
        last_updated = NOW()
      WHERE id = v_balance_id;

    ELSE
      RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END CASE;

  -- Get updated balance
  SELECT available_amount INTO v_balance_after
  FROM balances WHERE id = v_balance_id;

  -- Create transaction record
  INSERT INTO balance_transactions (
    balance_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description
  ) VALUES (
    v_balance_id,
    p_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_reference_type,
    p_reference_id,
    p_description
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
