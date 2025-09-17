-- Create notifications table for persistent notifications
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) CHECK (type IN ('success', 'error', 'warning', 'info')) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  auto_hide BOOLEAN DEFAULT true NOT NULL,
  duration INTEGER DEFAULT 5000,
  action_label VARCHAR(100),
  action_url VARCHAR(255),
  reference_type VARCHAR(50), -- 'payment', 'project', 'income', etc.
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

-- Create function to automatically create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(20),
  p_title VARCHAR(255),
  p_message TEXT,
  p_auto_hide BOOLEAN DEFAULT true,
  p_duration INTEGER DEFAULT 5000,
  p_action_label VARCHAR(100) DEFAULT NULL,
  p_action_url VARCHAR(255) DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, auto_hide, duration,
    action_label, action_url, reference_type, reference_id
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_auto_hide, p_duration,
    p_action_label, p_action_url, p_reference_type, p_reference_id
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to notify about payment status changes
CREATE OR REPLACE FUNCTION notify_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  status_text VARCHAR(50);
  notification_type VARCHAR(20);
  user_name VARCHAR(255);
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get user name
  SELECT full_name INTO user_name FROM users WHERE id = NEW.user_id;

  -- Determine status text and notification type
  CASE NEW.status
    WHEN 'approved' THEN
      status_text := 'onaylandı';
      notification_type := 'success';
    WHEN 'completed' THEN
      status_text := 'tamamlandı';
      notification_type := 'success';
    WHEN 'rejected' THEN
      status_text := 'reddedildi';
      notification_type := 'error';
    WHEN 'processing' THEN
      status_text := 'işleme alındı';
      notification_type := 'info';
    ELSE
      status_text := NEW.status;
      notification_type := 'info';
  END CASE;

  -- Create notification for the user
  PERFORM create_notification(
    NEW.user_id,
    notification_type,
    'Ödeme Durumu Güncellendi',
    NEW.instruction_number || ' kodlu ₺' || NEW.total_amount::text || ' tutarındaki ödeme talimatınız ' || status_text || '.',
    false, -- Don't auto hide important notifications
    0,
    'Detayları Gör',
    '/dashboard/payments',
    'payment',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status changes
CREATE TRIGGER notify_payment_status_change_trigger
  AFTER UPDATE ON payment_instructions
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_status_change();

-- Create function to notify when new income is added to user's projects
CREATE OR REPLACE FUNCTION notify_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  project_name VARCHAR(255);
BEGIN
  -- Get project name
  SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;

  -- Notify all project representatives about new income
  FOR rep IN
    SELECT pr.user_id, pr.share_percentage, u.full_name
    FROM project_representatives pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.project_id = NEW.project_id
  LOOP
    PERFORM create_notification(
      rep.user_id,
      'success',
      'Yeni Gelir Dağıtımı',
      project_name || ' projesi için ₺' || NEW.gross_amount::text || ' tutarında yeni gelir kaydedildi. Size ₺' || ROUND((NEW.net_amount * 0.85 * rep.share_percentage / 100), 2)::text || ' dağıtım yapılacak.',
      true,
      8000,
      'Bakiyemi Gör',
      '/dashboard/balances',
      'income',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for income distribution notifications
CREATE TRIGGER notify_income_distribution_trigger
  AFTER INSERT ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION notify_income_distribution();