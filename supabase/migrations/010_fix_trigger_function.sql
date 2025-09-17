-- Fix the handle_new_user trigger function to include all required fields
-- and handle potential constraint issues

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with proper error handling and all fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with all required fields
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    phone,
    iban,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'academician'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'iban',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    role = COALESCE(NEW.raw_user_meta_data->>'role', 'academician'),
    phone = NEW.raw_user_meta_data->>'phone',
    iban = NEW.raw_user_meta_data->>'iban',
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (this will show in Supabase logs)
    RAISE LOG 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    -- Don't fail the auth user creation, just skip the profile creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Also make sure the trigger works for the balance initialization
-- First check if the balance trigger exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'initialize_user_balance_trigger'
    ) THEN
        CREATE TRIGGER initialize_user_balance_trigger
          AFTER INSERT ON users
          FOR EACH ROW
          EXECUTE FUNCTION initialize_user_balance();
    END IF;
END $$;