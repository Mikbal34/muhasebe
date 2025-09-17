-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  budget DECIMAL(15,2) NOT NULL CHECK (budget > 0),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL
);

-- Create function to generate project code
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  -- Get next sequential number for current year
  SELECT COALESCE(MAX(
    CASE
      WHEN code LIKE 'PRJ-' || current_year::text || '-%' THEN
        CAST(SUBSTRING(code FROM LENGTH('PRJ-' || current_year::text || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM projects;

  -- Generate code like PRJ-2025-001
  NEW.code := 'PRJ-' || current_year::text || '-' || LPAD(next_number::text, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating project codes
CREATE TRIGGER generate_project_code_trigger
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.code IS NULL OR NEW.code = '')
  EXECUTE FUNCTION generate_project_code();

-- Create trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_start_date ON projects(start_date);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;