-- Create personnel table for non-system users (project participants who don't login)
-- Unlike users table, this has NO dependency on auth.users

BEGIN;

-- Create personnel table
CREATE TABLE IF NOT EXISTS public.personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  iban VARCHAR(34),
  tc_no VARCHAR(11), -- Turkish ID number for payment processing
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT, -- Any additional notes about the personnel
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE public.personnel IS 'Personnel who participate in projects but do not have system access';
COMMENT ON COLUMN public.personnel.full_name IS 'Full name of the personnel';
COMMENT ON COLUMN public.personnel.email IS 'Email address for communication and payments';
COMMENT ON COLUMN public.personnel.phone IS 'Phone number';
COMMENT ON COLUMN public.personnel.iban IS 'IBAN for receiving payments (required for income distribution)';
COMMENT ON COLUMN public.personnel.tc_no IS 'Turkish ID number (TC Kimlik No) for payment processing';
COMMENT ON COLUMN public.personnel.is_active IS 'Whether the personnel is active';
COMMENT ON COLUMN public.personnel.notes IS 'Additional notes about the personnel';

-- Create updated_at trigger
CREATE TRIGGER update_personnel_updated_at
  BEFORE UPDATE ON public.personnel
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_personnel_email ON public.personnel(email);
CREATE INDEX idx_personnel_is_active ON public.personnel(is_active);
CREATE INDEX idx_personnel_full_name ON public.personnel(full_name);

-- Enable RLS
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personnel table
-- Admins and managers can view all personnel
CREATE POLICY "Admins and managers can view all personnel"
  ON public.personnel
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Admins and managers can insert personnel
CREATE POLICY "Admins and managers can insert personnel"
  ON public.personnel
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Admins and managers can update personnel
CREATE POLICY "Admins and managers can update personnel"
  ON public.personnel
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Only admins can delete personnel
CREATE POLICY "Only admins can delete personnel"
  ON public.personnel
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to auto-create balance record for new personnel
CREATE OR REPLACE FUNCTION public.handle_new_personnel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create balance record for personnel
  INSERT INTO public.balances (
    user_id,
    personnel_id,
    available_amount,
    debt_amount,
    total_income,
    total_payment
  )
  VALUES (
    NULL, -- user_id is null for personnel
    NEW.id,
    0,
    0,
    0,
    0
  );

  RETURN NEW;
END;
$$;

-- Trigger to auto-create balance for new personnel
CREATE TRIGGER on_personnel_created
  AFTER INSERT ON public.personnel
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_personnel();

COMMIT;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE 'Personnel table created successfully!';
  RAISE NOTICE 'Personnel have NO auth.users dependency - they cannot login';
  RAISE NOTICE 'Balance records will be auto-created for personnel';
END $$;
