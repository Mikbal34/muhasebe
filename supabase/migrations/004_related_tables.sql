-- Create project_representatives table
CREATE TABLE project_representatives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  share_percentage DECIMAL(5,2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
  is_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Create balances table
CREATE TABLE balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  available_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (available_amount >= 0),
  debt_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (debt_amount >= 0),
  reserved_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (reserved_amount >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create incomes table
CREATE TABLE incomes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  gross_amount DECIMAL(15,2) NOT NULL CHECK (gross_amount > 0),
  vat_rate DECIMAL(5,2) DEFAULT 18.00 NOT NULL CHECK (vat_rate >= 0),
  vat_amount DECIMAL(15,2) NOT NULL,
  net_amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  income_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL
);

-- Create commissions table
CREATE TABLE commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  income_id UUID REFERENCES incomes(id) ON DELETE CASCADE UNIQUE NOT NULL,
  rate DECIMAL(5,2) DEFAULT 15.00 NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create income_distributions table
CREATE TABLE income_distributions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  income_id UUID REFERENCES incomes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  share_percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create balance_transactions table for audit trail
CREATE TABLE balance_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  balance_id UUID REFERENCES balances(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) CHECK (type IN ('income', 'payment', 'debt', 'adjustment')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payment_instructions table
CREATE TABLE payment_instructions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  instruction_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
  bank_export_file TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL
);

-- Create payment_instruction_items table
CREATE TABLE payment_instruction_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  instruction_id UUID REFERENCES payment_instructions(id) ON DELETE CASCADE NOT NULL,
  income_distribution_id UUID REFERENCES income_distributions(id),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT
);

-- Create reports table
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type VARCHAR(20) CHECK (type IN ('project', 'academician', 'company', 'payments')) NOT NULL,
  parameters JSONB NOT NULL,
  generated_by UUID REFERENCES users(id) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create report_exports table
CREATE TABLE report_exports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
  format VARCHAR(10) CHECK (format IN ('excel', 'pdf')) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);