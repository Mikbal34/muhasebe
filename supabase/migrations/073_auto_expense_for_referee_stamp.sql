-- Migration: Auto expense creation for referee payment and stamp duty
-- Bu migration hakem heyeti ve damga vergisi tutarlarının otomatik olarak
-- gider tablosuna eklenmesini sağlar (sadece görüntüleme amaçlı, bakiye düşümü yapılmaz)

-- 1. expense_source alanı ekle
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_source VARCHAR(30) DEFAULT 'manual';

-- 2. Check constraint ekle
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expense_source_check;

ALTER TABLE expenses
  ADD CONSTRAINT expense_source_check
  CHECK (expense_source IN ('manual', 'referee_payment', 'stamp_duty'));

-- 3. Unique partial index: Aynı projede aynı source birden fazla olamaz
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_project_source_unique
ON expenses(project_id, expense_source)
WHERE expense_source IN ('referee_payment', 'stamp_duty');

-- 4. İndeks ekle (sorgu performansı için)
CREATE INDEX IF NOT EXISTS idx_expenses_source ON expenses(expense_source);

-- 5. Mevcut trigger'ı güncelle: expense_source = 'manual' olmayanlar için bakiye düşümü yapma
CREATE OR REPLACE FUNCTION deduct_expense_from_admin_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_project RECORD;
  v_tto_amount DECIMAL(15,2);
BEGIN
  -- Otomatik oluşturulan giderler için bakiye düşümü yapma
  -- Bunlar sadece görüntüleme amaçlı, gerçek düşüm tahsilat trigger'ında yapılıyor
  IF NEW.expense_source IN ('referee_payment', 'stamp_duty') THEN
    RETURN NEW;
  END IF;

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

-- 6. Silme trigger'ını da güncelle
CREATE OR REPLACE FUNCTION reverse_expense_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_project RECORD;
  v_tto_amount DECIMAL(15,2);
BEGIN
  -- Otomatik oluşturulan giderler için geri ekleme yapma
  IF OLD.expense_source IN ('referee_payment', 'stamp_duty') THEN
    RETURN OLD;
  END IF;

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
