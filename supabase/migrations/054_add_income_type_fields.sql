-- Migration: Add income type fields and commission tracking
-- Bu migration gelir kaydına 3 yeni alan ekler ve komisyon takip sistemini kurar

-- 1. Gelir tipi enum oluştur
DO $$ BEGIN
  CREATE TYPE income_type AS ENUM ('ozel', 'kamu');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. incomes tablosuna yeni alanlar ekle
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS is_fsmh_income BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS income_type income_type DEFAULT 'ozel' NOT NULL,
  ADD COLUMN IF NOT EXISTS is_tto_income BOOLEAN DEFAULT true NOT NULL;

-- 3. projects tablosuna komisyon takip alanları ekle
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS total_commission_due DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_commission_collected DECIMAL(15,2) DEFAULT 0;

-- 4. Mevcut projelerin komisyon alacağını hesapla (bütçe bazlı)
-- Formül: (budget - KDV) * company_rate / 100
UPDATE projects
SET total_commission_due = ROUND(
  (budget - (budget * COALESCE(vat_rate, 18) / (100 + COALESCE(vat_rate, 18)))) * COALESCE(company_rate, 15) / 100,
  2
)
WHERE total_commission_due = 0 OR total_commission_due IS NULL;

-- 5. Mevcut projeler için alınmış komisyonları hesapla
UPDATE projects p
SET total_commission_collected = COALESCE((
  SELECT SUM(c.amount)
  FROM commissions c
  WHERE c.project_id = p.id
), 0);

-- 6. İndeksler oluştur
CREATE INDEX IF NOT EXISTS idx_incomes_is_tto_income ON incomes(is_tto_income);
CREATE INDEX IF NOT EXISTS idx_incomes_income_type ON incomes(income_type);
CREATE INDEX IF NOT EXISTS idx_incomes_is_fsmh ON incomes(is_fsmh_income);

-- 7. Komisyon trigger'ını güncelle - TTO geliri kontrolü ve dinamik komisyon hesaplama
CREATE OR REPLACE FUNCTION process_income_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_project RECORD;
  v_remaining_budget DECIMAL(15,2);
  v_remaining_commission DECIMAL(15,2);
  v_commission_amount DECIMAL(15,2);
  v_normal_commission DECIMAL(15,2);
BEGIN
  -- TTO geliri değilse komisyon kesme
  IF NEW.is_tto_income = false THEN
    RETURN NEW;
  END IF;

  -- Proje bilgilerini al
  SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;

  -- Kalan komisyon alacağını hesapla
  v_remaining_commission := COALESCE(v_project.total_commission_due, 0) - COALESCE(v_project.total_commission_collected, 0);

  -- Eğer komisyon alacağı kalmadıysa çık
  IF v_remaining_commission <= 0 THEN
    RETURN NEW;
  END IF;

  -- Kalan bütçeyi hesapla (bu gelirden SONRA)
  v_remaining_budget := COALESCE(v_project.remaining_budget, v_project.budget) - NEW.gross_amount;

  -- Normal komisyon hesapla (bu gelirin komisyonu)
  v_normal_commission := ROUND(NEW.net_amount * COALESCE(v_project.company_rate, 15) / 100, 2);

  -- Komisyon miktarını belirle
  IF v_remaining_budget <= 0 THEN
    -- Son gelir veya bütçe bitiyor: Kalan tüm komisyonu al
    v_commission_amount := v_remaining_commission;
  ELSE
    -- Normal hesaplama
    v_commission_amount := v_normal_commission;
    -- Ama kalan alacaktan fazla olamaz
    IF v_commission_amount > v_remaining_commission THEN
      v_commission_amount := v_remaining_commission;
    END IF;
  END IF;

  -- Komisyon kaydı oluştur
  IF v_commission_amount > 0 THEN
    -- Önce mevcut komisyon kaydını kontrol et (duplicate önleme)
    IF NOT EXISTS (SELECT 1 FROM commissions WHERE income_id = NEW.id) THEN
      INSERT INTO commissions (income_id, project_id, rate, amount)
      VALUES (NEW.id, NEW.project_id, COALESCE(v_project.company_rate, 15), v_commission_amount);

      -- Projenin alınan komisyonunu güncelle
      UPDATE projects
      SET total_commission_collected = COALESCE(total_commission_collected, 0) + v_commission_amount
      WHERE id = NEW.project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger'ı yeniden oluştur (varsa önce sil)
DROP TRIGGER IF EXISTS process_income_commission_trigger ON incomes;
CREATE TRIGGER process_income_commission_trigger
  AFTER INSERT ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION process_income_commission();

-- 9. Proje oluşturulduğunda komisyon alacağını otomatik hesapla
CREATE OR REPLACE FUNCTION calculate_project_commission_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Yeni proje için komisyon alacağını hesapla
  NEW.total_commission_due := ROUND(
    (NEW.budget - (NEW.budget * COALESCE(NEW.vat_rate, 18) / (100 + COALESCE(NEW.vat_rate, 18)))) * COALESCE(NEW.company_rate, 15) / 100,
    2
  );
  NEW.total_commission_collected := 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_project_commission_trigger ON projects;
CREATE TRIGGER calculate_project_commission_trigger
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION calculate_project_commission_due();

-- 10. Proje bütçesi veya oranlar değiştiğinde komisyon alacağını güncelle
CREATE OR REPLACE FUNCTION update_project_commission_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Bütçe veya oranlar değiştiyse komisyon alacağını yeniden hesapla
  IF NEW.budget != OLD.budget OR NEW.vat_rate != OLD.vat_rate OR NEW.company_rate != OLD.company_rate THEN
    NEW.total_commission_due := ROUND(
      (NEW.budget - (NEW.budget * COALESCE(NEW.vat_rate, 18) / (100 + COALESCE(NEW.vat_rate, 18)))) * COALESCE(NEW.company_rate, 15) / 100,
      2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_project_commission_trigger ON projects;
CREATE TRIGGER update_project_commission_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_commission_due();
