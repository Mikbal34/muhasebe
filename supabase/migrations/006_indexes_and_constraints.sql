-- Create all indexes for performance

-- Project representatives indexes
CREATE INDEX idx_project_reps_project ON project_representatives(project_id);
CREATE INDEX idx_project_reps_user ON project_representatives(user_id);
CREATE INDEX idx_project_reps_lead ON project_representatives(is_lead) WHERE is_lead = true;

-- Income indexes
CREATE INDEX idx_incomes_project ON incomes(project_id);
CREATE INDEX idx_incomes_date ON incomes(income_date);
CREATE INDEX idx_incomes_created_by ON incomes(created_by);
CREATE INDEX idx_income_project_date ON incomes(project_id, income_date);

-- Balance indexes
CREATE INDEX idx_balances_user ON balances(user_id);
CREATE INDEX idx_balance_trans_balance ON balance_transactions(balance_id);
CREATE INDEX idx_balance_trans_type ON balance_transactions(type);
CREATE INDEX idx_balance_trans_reference ON balance_transactions(reference_type, reference_id);

-- Payment instruction indexes
CREATE INDEX idx_payment_inst_user ON payment_instructions(user_id);
CREATE INDEX idx_payment_inst_status ON payment_instructions(status);
CREATE INDEX idx_payment_inst_number ON payment_instructions(instruction_number);
CREATE INDEX idx_payment_inst_created_by ON payment_instructions(created_by);
CREATE INDEX idx_payment_items_instruction ON payment_instruction_items(instruction_id);

-- Commission and distribution indexes
CREATE INDEX idx_commissions_income ON commissions(income_id);
CREATE INDEX idx_income_dist_income ON income_distributions(income_id);
CREATE INDEX idx_income_dist_user ON income_distributions(user_id);

-- Report indexes
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);
CREATE INDEX idx_report_exports_report ON report_exports(report_id);

-- Audit log indexes
CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Add table constraints

-- Incomes constraints
ALTER TABLE incomes
ADD CONSTRAINT check_vat_calculation
CHECK (ABS(vat_amount - ROUND(gross_amount * vat_rate / (100 + vat_rate), 2)) < 0.01);

ALTER TABLE incomes
ADD CONSTRAINT check_net_calculation
CHECK (ABS(net_amount - (gross_amount - vat_amount)) < 0.01);

-- Add table comments for documentation
COMMENT ON TABLE users IS 'Extended user profiles with role-based access';
COMMENT ON TABLE projects IS 'Academic projects with auto-generated codes';
COMMENT ON TABLE project_representatives IS 'Project team members with revenue shares';
COMMENT ON TABLE incomes IS 'Project revenue entries with automatic VAT calculations';
COMMENT ON TABLE balances IS 'User financial balances with debt tracking';
COMMENT ON TABLE payment_instructions IS 'Payment orders with bank integration';
COMMENT ON TABLE commissions IS 'Company commission records (15% of net income)';
COMMENT ON TABLE income_distributions IS 'Revenue distribution to project members';
COMMENT ON TABLE audit_logs IS 'System audit trail for all financial transactions';