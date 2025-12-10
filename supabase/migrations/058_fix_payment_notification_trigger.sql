-- Fix payment notification trigger to handle personnel payments (where user_id is NULL)

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

  -- Skip notification for personnel payments (they don't have login accounts)
  IF NEW.user_id IS NULL THEN
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
