-- Update process_income_distribution to handle stamp duty deduction
CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  base_commission_amount DECIMAL(15,2);
  distributable_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);
  v_stamp_duty_payer VARCHAR;
  v_stamp_duty_amount DECIMAL(15,2);
  v_stamp_duty_deducted BOOLEAN;
BEGIN
  -- Get project's commission rate and stamp duty info
  SELECT 
    company_rate, 
    stamp_duty_payer, 
    stamp_duty_amount, 
    COALESCE(stamp_duty_deducted, false)
  INTO 
    project_commission_rate, 
    v_stamp_duty_payer, 
    v_stamp_duty_amount, 
    v_stamp_duty_deducted
  FROM projects WHERE id = NEW.project_id;

  -- Use project's commission rate (fallback to 15% if null)
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

  -- IMPORTANT: Commission is calculated from NET amount (after VAT deduction)
  -- This is the amount that goes to the company
  base_commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);
  
  -- Set initial commission amount
  commission_amount := base_commission_amount;

  -- Check if stamp duty needs to be deducted from company income
  -- Only if payer is 'company', amount > 0, and not yet deducted
  IF v_stamp_duty_payer = 'company' AND v_stamp_duty_amount > 0 AND NOT v_stamp_duty_deducted THEN
    -- Deduct stamp duty from commission
    commission_amount := commission_amount - v_stamp_duty_amount;
    
    -- Mark stamp duty as deducted for this project
    UPDATE projects 
    SET stamp_duty_deducted = true 
    WHERE id = NEW.project_id;
  END IF;

  -- Insert commission record with actual rate used
  -- Note: If stamp duty was deducted, the effective amount is lower, but we keep the rate for reference
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, project_commission_rate, commission_amount);

  -- Calculate distributable amount (net - BASE commission)
  -- This ensures academicians get their share based on the gross/net, unaffected by company's stamp duty payment
  distributable_amount := NEW.net_amount - base_commission_amount;

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
