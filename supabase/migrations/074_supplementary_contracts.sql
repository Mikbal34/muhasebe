-- Migration: 074_supplementary_contracts.sql
-- Description: Ek Sözleşme (Supplementary Contract) özelliği

-- 1. Ek Sözleşmeler Tablosu
CREATE TABLE IF NOT EXISTS supplementary_contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Ek sözleşme numarası (1, 2, 3, ...)
  amendment_number INTEGER NOT NULL DEFAULT 1,
  amendment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Tarih değişiklikleri
  previous_end_date DATE,
  new_end_date DATE,

  -- Bütçe değişiklikleri
  previous_budget DECIMAL(15,2),
  budget_increase DECIMAL(15,2) DEFAULT 0,
  new_budget DECIMAL(15,2),

  -- Açıklama
  description TEXT,

  -- Belge
  contract_document_path VARCHAR(500),

  -- Audit alanları
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES users(id),

  -- Her proje için amendment_number benzersiz olmalı
  CONSTRAINT unique_amendment_per_project UNIQUE (project_id, amendment_number)
);

-- 2. Projects tablosuna yeni alanlar ekle
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS has_supplementary_contract BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS supplementary_contract_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_budget DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS original_end_date DATE;

-- 3. Indexler
CREATE INDEX IF NOT EXISTS idx_supplementary_contracts_project ON supplementary_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_supplementary_contracts_date ON supplementary_contracts(amendment_date);

-- 4. Row Level Security
ALTER TABLE supplementary_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view supplementary contracts"
  ON supplementary_contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert supplementary contracts"
  ON supplementary_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can delete supplementary contracts"
  ON supplementary_contracts FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
  );

-- 5. Trigger: Ek sözleşme eklendiğinde proje değerlerini güncelle
CREATE OR REPLACE FUNCTION sync_project_with_supplementary_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- İlk ek sözleşmede orijinal değerleri kaydet
  IF NEW.amendment_number = 1 THEN
    UPDATE projects SET
      original_budget = COALESCE(original_budget, budget),
      original_end_date = COALESCE(original_end_date, end_date)
    WHERE id = NEW.project_id AND original_budget IS NULL;
  END IF;

  -- Proje değerlerini güncelle
  UPDATE projects SET
    has_supplementary_contract = TRUE,
    supplementary_contract_count = NEW.amendment_number,
    budget = NEW.new_budget,
    end_date = COALESCE(NEW.new_end_date, end_date),
    updated_at = NOW()
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_supplementary_contract_insert
  AFTER INSERT ON supplementary_contracts
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_with_supplementary_contract();

-- 6. Trigger: Son ek sözleşme silindiğinde proje değerlerini geri al
CREATE OR REPLACE FUNCTION revert_project_on_supplementary_contract_delete()
RETURNS TRIGGER AS $$
DECLARE
  prev_contract supplementary_contracts%ROWTYPE;
  contract_count INTEGER;
BEGIN
  -- Kalan ek sözleşme sayısını bul
  SELECT COUNT(*) INTO contract_count
  FROM supplementary_contracts
  WHERE project_id = OLD.project_id;

  IF contract_count = 0 THEN
    -- Tüm ek sözleşmeler silindi, orijinal değerlere dön
    UPDATE projects SET
      has_supplementary_contract = FALSE,
      supplementary_contract_count = 0,
      budget = COALESCE(original_budget, budget),
      end_date = COALESCE(original_end_date, end_date),
      updated_at = NOW()
    WHERE id = OLD.project_id;
  ELSE
    -- Bir önceki ek sözleşmenin değerlerini al
    SELECT * INTO prev_contract
    FROM supplementary_contracts
    WHERE project_id = OLD.project_id
    ORDER BY amendment_number DESC
    LIMIT 1;

    UPDATE projects SET
      supplementary_contract_count = contract_count,
      budget = prev_contract.new_budget,
      end_date = COALESCE(prev_contract.new_end_date, end_date),
      updated_at = NOW()
    WHERE id = OLD.project_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_supplementary_contract_delete
  AFTER DELETE ON supplementary_contracts
  FOR EACH ROW
  EXECUTE FUNCTION revert_project_on_supplementary_contract_delete();

-- 7. Yorum ekle
COMMENT ON TABLE supplementary_contracts IS 'Proje ek sözleşmeleri - tarih uzatma ve bütçe artırma kayıtları';
COMMENT ON COLUMN supplementary_contracts.amendment_number IS 'Ek sözleşme numarası (1., 2., 3. ek sözleşme)';
COMMENT ON COLUMN supplementary_contracts.budget_increase IS 'Bütçe artış miktarı (her zaman pozitif veya 0)';
