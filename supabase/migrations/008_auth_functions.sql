-- Function to initialize user balance when user is created
CREATE OR REPLACE FUNCTION initialize_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial balance record for new user
  INSERT INTO balances (user_id, available_amount, debt_amount, reserved_amount)
  VALUES (NEW.id, 0.00, 0.00, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize balance for new users
CREATE TRIGGER initialize_user_balance_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_balance();

-- Function to sync user data from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'academician')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to get user role for RLS policies
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;

  RETURN COALESCE(user_role, 'academician');
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Function to check if user is finance officer or admin
CREATE OR REPLACE FUNCTION is_finance_or_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id AND role IN ('admin', 'finance_officer')
  );
END;
$$;

-- Function to check if user can access project
CREATE OR REPLACE FUNCTION can_access_project(user_id UUID, project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Admin and finance officers can access all projects
  IF is_finance_or_admin(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a representative of the project
  RETURN EXISTS (
    SELECT 1 FROM project_representatives pr
    WHERE pr.project_id = can_access_project.project_id
    AND pr.user_id = can_access_project.user_id
  );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;