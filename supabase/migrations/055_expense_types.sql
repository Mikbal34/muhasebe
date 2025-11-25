-- Migration: Add expense types (genel/proje) and TTO expense flag
-- Bu migration gider sistemine yeni tipler ve TTO gideri kontrolü ekler

-- 1. Gider tipi enum oluştur
DO $$ BEGIN
  CREATE TYPE expense_type AS ENUM ('genel', 'proje');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. expenses tablosuna yeni alanlar ekle
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_type expense_type DEFAULT 'proje' NOT NULL,
  ADD COLUMN IF NOT EXISTS is_tto_expense BOOLEAN DEFAULT true NOT NULL;

-- 3. project_id'yi nullable yap (genel giderler için)
ALTER TABLE expenses
  ALTER COLUMN project_id DROP NOT NULL;

-- 4. Foreign key constraint'i güncelle (nullable için)
-- Önce mevcut constraint'i kaldır (varsa)
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_project_id_fkey;

-- Yeni constraint ekle (nullable)
ALTER TABLE expenses
  ADD CONSTRAINT expenses_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- 5. Constraint: Genel giderde project_id NULL olmalı, Proje giderinde zorunlu
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expense_type_project_check;

ALTER TABLE expenses
  ADD CONSTRAINT expense_type_project_check
  CHECK (
    (expense_type = 'genel' AND project_id IS NULL) OR
    (expense_type = 'proje' AND project_id IS NOT NULL)
  );

-- 6. İndeksler
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_is_tto ON expenses(is_tto_expense);

-- 7. Mevcut trigger'ı güncelle: deduct_expense_from_admin_balance
CREATE OR REPLACE FUNCTION deduct_expense_from_admin_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_project RECORD;
  v_tto_amount DECIMAL(15,2);
BEGIN
  -- Admin kullanıcıyı bul
  SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Admin kullanıcı bulunamadı, bakiye düşülmedi';
    RETURN NEW;
  END IF;

  -- Gider tipine göre hesapla
  IF NEW.expense_type = 'genel' THEN
    -- Genel Gider: %100 TTO'dan düşer
    v_tto_amount := NEW.amount;

    PERFORM update_balance(
      'payment',
      v_tto_amount,
      v_admin_id,
      NULL,
      'expense',
      NEW.id,
      'Genel Gider: ' || COALESCE(NEW.description, '')
    );

  ELSIF NEW.expense_type = 'proje' THEN
    -- Proje Gideri: Proje bilgilerini al
    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;

    IF NEW.is_tto_expense THEN
      -- Ortak Gider: TTO payı = amount * company_rate / 100
      v_tto_amount := ROUND(NEW.amount * COALESCE(v_project.company_rate, 15) / 100, 2);

      -- TTO payını düş
      IF v_tto_amount > 0 THEN
        PERFORM update_balance(
          'payment',
          v_tto_amount,
          v_admin_id,
          NULL,
          'expense',
          NEW.id,
          'Proje Gideri TTO Payı (%' || COALESCE(v_project.company_rate, 15) || '): ' || COALESCE(NEW.description, '')
        );
      END IF;

      -- NOT: Dağıtılabilir pay manuel dağıtım için saklanır, otomatik düşülmez

    ELSE
      -- Karşı Gider: TTO ödemez, tamamı dağıtılabilir miktardan düşer
      -- NOT: Bu kısım manuel dağıtım için saklanır, otomatik düşülmez
      NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger zaten var, fonksiyon güncellendi
-- DROP TRIGGER IF EXISTS expense_deduction_trigger ON expenses;
-- CREATE TRIGGER expense_deduction_trigger
--   AFTER INSERT ON expenses
--   FOR EACH ROW
--   EXECUTE FUNCTION deduct_expense_from_admin_balance();

-- 9. Silme trigger'ını da güncelle (gider tiplerine göre)
CREATE OR REPLACE FUNCTION reverse_expense_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_project RECORD;
  v_tto_amount DECIMAL(15,2);
BEGIN
  -- Admin kullanıcıyı bul
  SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Admin kullanıcı bulunamadı, bakiye geri eklenmedi';
    RETURN OLD;
  END IF;

  -- Gider tipine göre geri ekle
  IF OLD.expense_type = 'genel' THEN
    -- Genel Gider: %100 geri ekle
    v_tto_amount := OLD.amount;

    PERFORM update_balance(
      'income',
      v_tto_amount,
      v_admin_id,
      NULL,
      'expense_reversal',
      OLD.id,
      'Genel Gider İptali: ' || COALESCE(OLD.description, '')
    );

  ELSIF OLD.expense_type = 'proje' THEN
    IF OLD.is_tto_expense THEN
      -- Ortak Gider iptali: TTO payını geri ekle
      SELECT * INTO v_project FROM projects WHERE id = OLD.project_id;
      v_tto_amount := ROUND(OLD.amount * COALESCE(v_project.company_rate, 15) / 100, 2);

      IF v_tto_amount > 0 THEN
        PERFORM update_balance(
          'income',
          v_tto_amount,
          v_admin_id,
          NULL,
          'expense_reversal',
          OLD.id,
          'Proje Gideri İptali (TTO Payı): ' || COALESCE(OLD.description, '')
        );
      END IF;
    END IF;
    -- Karşı gider iptali: TTO'ya geri ekleme yok (zaten düşülmemişti)
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
