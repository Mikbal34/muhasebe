-- Function to check total shares equal 100%
CREATE OR REPLACE FUNCTION check_total_shares()
RETURNS TRIGGER AS $$
DECLARE
  total_shares DECIMAL(5,2);
BEGIN
  -- Calculate total shares for the project
  SELECT COALESCE(SUM(share_percentage), 0)
  INTO total_shares
  FROM project_representatives
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND (TG_OP = 'DELETE' OR id != COALESCE(NEW.id, OLD.id));

  -- Add new share if inserting or updating
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    total_shares := total_shares + NEW.share_percentage;
  END IF;

  -- Check if total equals 100%
  IF total_shares != 100.00 THEN
    RAISE EXCEPTION 'Total share percentages must equal 100%%. Current total: %', total_shares;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate share percentages (deferred)
CREATE CONSTRAINT TRIGGER check_project_shares
  AFTER INSERT OR UPDATE OR DELETE ON project_representatives
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION check_total_shares();

-- Function to calculate VAT and net amounts
CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate VAT amount (VAT is included in gross amount)
  NEW.vat_amount := ROUND(NEW.gross_amount * NEW.vat_rate / (100 + NEW.vat_rate), 2);

  -- Calculate net amount (gross - VAT)
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculations
CREATE TRIGGER calculate_income_amounts_trigger
  BEFORE INSERT OR UPDATE ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_income_amounts();

-- Function to update balance with transaction logging
CREATE OR REPLACE FUNCTION update_balance(
  p_user_id UUID,
  p_type VARCHAR(20),
  p_amount DECIMAL(15,2),
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
  -- Get or create balance record
  INSERT INTO balances (user_id, available_amount, debt_amount, reserved_amount)
  VALUES (p_user_id, 0.00, 0.00, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current balance
  SELECT id, available_amount INTO v_balance_id, v_balance_before
  FROM balances WHERE user_id = p_user_id;

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
      -- Direct adjustment to available
      UPDATE balances SET
        available_amount = available_amount + p_amount,
        last_updated = NOW()
      WHERE id = v_balance_id;
  END CASE;

  -- Get new balance
  SELECT available_amount INTO v_balance_after
  FROM balances WHERE id = v_balance_id;

  -- Log transaction
  INSERT INTO balance_transactions (
    balance_id, type, amount, balance_before, balance_after,
    reference_type, reference_id, description
  ) VALUES (
    v_balance_id, p_type, p_amount, v_balance_before, v_balance_after,
    p_reference_type, p_reference_id, p_description
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process income and create distributions
CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  distributable_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
BEGIN
  -- Calculate commission (15% of net amount)
  commission_amount := ROUND(NEW.net_amount * 0.15, 2);

  -- Insert commission record
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, 15.00, commission_amount);

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

-- Create trigger for automatic income distribution
CREATE TRIGGER process_income_distribution_trigger
  AFTER INSERT ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION process_income_distribution();

-- Function to generate payment instruction number
CREATE OR REPLACE FUNCTION generate_payment_instruction_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  -- Get next sequential number for current year
  SELECT COALESCE(MAX(
    CASE
      WHEN instruction_number LIKE 'PAY-' || current_year::text || '-%' THEN
        CAST(SUBSTRING(instruction_number FROM LENGTH('PAY-' || current_year::text || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM payment_instructions;

  -- Generate number like PAY-2025-001
  NEW.instruction_number := 'PAY-' || current_year::text || '-' || LPAD(next_number::text, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating instruction numbers
CREATE TRIGGER generate_payment_instruction_number_trigger
  BEFORE INSERT ON payment_instructions
  FOR EACH ROW
  WHEN (NEW.instruction_number IS NULL OR NEW.instruction_number = '')
  EXECUTE FUNCTION generate_payment_instruction_number();

-- Function to validate payment amount against balance
CREATE OR REPLACE FUNCTION check_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  available_balance DECIMAL(15,2);
  user_debt DECIMAL(15,2);
BEGIN
  -- Get user's balance info
  SELECT
    COALESCE(available_amount, 0),
    COALESCE(debt_amount, 0)
  INTO available_balance, user_debt
  FROM balances
  WHERE user_id = NEW.user_id;

  -- Check if user has debt
  IF user_debt > 0 THEN
    RAISE EXCEPTION 'User has outstanding debt. Payment blocked until debt is cleared. Debt amount: %', user_debt;
  END IF;

  -- Check if sufficient balance
  IF NEW.total_amount > available_balance THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', available_balance, NEW.total_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance validation
CREATE TRIGGER check_payment_amount_trigger
  BEFORE INSERT ON payment_instructions
  FOR EACH ROW
  EXECUTE FUNCTION check_payment_amount();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_entity_type VARCHAR(50),
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, entity_type, entity_id, old_values, new_values
  ) VALUES (
    p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql;