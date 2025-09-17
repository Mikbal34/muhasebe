-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_instruction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS policies for projects
CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Finance officers can view all projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Academicians can view their own projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_representatives pr
      WHERE pr.project_id = id AND pr.user_id = auth.uid()
    )
  );

-- RLS policies for project_representatives
CREATE POLICY "Admins can manage all project representatives" ON project_representatives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Finance officers can view all representatives" ON project_representatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Users can view their own representations" ON project_representatives
  FOR SELECT USING (user_id = auth.uid());

-- RLS policies for incomes
CREATE POLICY "Admins and finance officers can manage incomes" ON incomes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Academicians can view their project incomes" ON incomes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_representatives pr
      WHERE pr.project_id = incomes.project_id AND pr.user_id = auth.uid()
    )
  );

-- RLS policies for balances
CREATE POLICY "Users can view own balance" ON balances
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and finance officers can view all balances" ON balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Admins and finance officers can update balances" ON balances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

-- RLS policies for balance_transactions
CREATE POLICY "Users can view own transactions" ON balance_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM balances b
      WHERE b.id = balance_transactions.balance_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and finance officers can view all transactions" ON balance_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

-- RLS policies for payment_instructions
CREATE POLICY "Users can view own payment instructions" ON payment_instructions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and finance officers can view all payment instructions" ON payment_instructions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Finance officers can create payment instructions" ON payment_instructions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Finance officers can update payment instructions" ON payment_instructions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

-- RLS policies for payment_instruction_items
CREATE POLICY "Users can view own payment items" ON payment_instruction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payment_instructions pi
      WHERE pi.id = payment_instruction_items.instruction_id
      AND pi.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and finance officers can view all payment items" ON payment_instruction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

CREATE POLICY "Finance officers can manage payment items" ON payment_instruction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

-- RLS policies for commissions
CREATE POLICY "Admins and finance officers can view commissions" ON commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

-- RLS policies for income_distributions
CREATE POLICY "Users can view own distributions" ON income_distributions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and finance officers can view all distributions" ON income_distributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'finance_officer')
    )
  );

-- RLS policies for reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (generated_by = auth.uid());

CREATE POLICY "Admins can view all reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (generated_by = auth.uid());

-- RLS policies for report_exports
CREATE POLICY "Users can view own report exports" ON report_exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = report_exports.report_id AND r.generated_by = auth.uid()
    )
  );

CREATE POLICY "Admins can view all report exports" ON report_exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- RLS policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );