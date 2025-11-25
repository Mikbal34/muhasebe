-- Migration: Add fields for Excel reports
-- Bu migration rapor oluşturma için gerekli alanları ekler

-- 1. Users tablosuna yeni alanlar
ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11);
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(50); -- Prof. Dr., Doç. Dr., vs.
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10); -- ERKEK, KADIN
ALTER TABLE users ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS university VARCHAR(100) DEFAULT 'Yıldız Teknik Üniversitesi';

-- 2. Personnel tablosuna yeni alanlar
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS title VARCHAR(50);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS faculty VARCHAR(100);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS university VARCHAR(100) DEFAULT 'Yıldız Teknik Üniversitesi';

-- 3. Projects tablosuna yeni alanlar
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS extension_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS detailed_name TEXT;

-- 4. Proje kodu formatı değişikliği - YTÜTTO01, YTÜTTO02, ...
-- Önce trigger'ı kaldır, sonra fonksiyonu güncelle, sonra trigger'ı tekrar oluştur
DROP TRIGGER IF EXISTS generate_project_code_trigger ON projects;
DROP FUNCTION IF EXISTS generate_project_code() CASCADE;

CREATE FUNCTION generate_project_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  next_num INT;
  new_code VARCHAR(20);
BEGIN
  -- Mevcut YTÜTTO kodlarının en yüksek numarasını bul
  SELECT COALESCE(MAX(
    CASE
      WHEN code ~ '^YTÜTTO[0-9]+$' THEN CAST(SUBSTRING(code FROM 7) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM projects;

  -- Eğer hiç YTÜTTO kodu yoksa, PRJ kodlarını da kontrol et
  IF next_num = 1 THEN
    SELECT COUNT(*) + 1 INTO next_num FROM projects;
  END IF;

  new_code := 'YTÜTTO' || LPAD(next_num::TEXT, 2, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger fonksiyonu oluştur (eğer yoksa)
CREATE OR REPLACE FUNCTION set_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_project_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı tekrar oluştur
CREATE TRIGGER generate_project_code_trigger
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_code();

-- 5. all_people view'ını güncelle (yeni alanları içerecek şekilde)
DROP VIEW IF EXISTS all_people;
CREATE VIEW all_people AS
SELECT
  id,
  full_name,
  email,
  phone,
  iban,
  tc_no,
  title,
  gender,
  start_date,
  faculty,
  department,
  university,
  'user' as person_type,
  is_active,
  created_at,
  updated_at,
  role::TEXT as user_role,
  NULL::TEXT as notes
FROM users
UNION ALL
SELECT
  id,
  full_name,
  email,
  phone,
  iban,
  tc_no,
  title,
  gender,
  start_date,
  faculty,
  department,
  university,
  'personnel' as person_type,
  is_active,
  created_at,
  updated_at,
  NULL::TEXT as user_role,
  notes
FROM personnel;

-- 6. İndeksler
CREATE INDEX IF NOT EXISTS idx_users_title ON users(title);
CREATE INDEX IF NOT EXISTS idx_users_faculty ON users(faculty);
CREATE INDEX IF NOT EXISTS idx_personnel_title ON personnel(title);
CREATE INDEX IF NOT EXISTS idx_personnel_faculty ON personnel(faculty);
CREATE INDEX IF NOT EXISTS idx_projects_contract_date ON projects(contract_date);
