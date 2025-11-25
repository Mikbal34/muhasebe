-- Fix handle_new_user trigger to use correct role enum values
-- The role enum now only accepts 'admin' and 'manager', not 'academician'

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'manager')
        THEN (NEW.raw_user_meta_data->>'role')::user_role
        ELSE 'manager'::user_role
      END,
      'manager'::user_role
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', EXCLUDED.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
