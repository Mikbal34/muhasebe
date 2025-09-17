-- Migration to ensure all users have balance records
-- This fixes the "No balance found" error for academicians trying to create payment requests

-- Insert balance records for any users that don't have one
INSERT INTO balances (user_id, available_amount, debt_amount, reserved_amount)
SELECT
  u.id,
  0.00,
  0.00,
  0.00
FROM users u
LEFT JOIN balances b ON u.id = b.user_id
WHERE b.user_id IS NULL;

-- Add a comment to document this fix
COMMENT ON TABLE balances IS 'User financial balances with debt tracking. All users must have a balance record.';