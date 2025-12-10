-- Migration 065: Proje Giderlerinde Paylaşım Tipi
--
-- SORUN:
-- Proje giderleri oluşturulduğunda TTO gideri vs karşı taraf gideri ayrımı var.
-- Ancak "ortak gider" kavramı yok - herkesten oransal düşülecek giderler.
--
-- ÇÖZÜM:
-- 1. expense_share_type alanı ekle ('shared' veya 'client')
-- 2. Dağıtılabilir miktar hesabına giderleri dahil et
--
-- GİDER TİPLERİ:
-- - TTO gideri (is_tto_expense = true) → TTO bakiyesinden düşülür (mevcut)
-- - Proje gideri (is_tto_expense = false):
--   * shared (ortak) → Herkesten oransal düşülür (TTO + Temsilciler)
--   * client (karşı taraf) → Dağıtılabilir miktardan direkt düşülür

BEGIN;

-- =====================================================
-- 1. Yeni Alan Ekle
-- =====================================================

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS expense_share_type VARCHAR(20)
  DEFAULT 'client'
  CHECK (expense_share_type IN ('shared', 'client'));

COMMENT ON COLUMN public.expenses.expense_share_type IS 'Gider paylaşım tipi: shared = ortak gider (herkesten oransal), client = karşı taraf gideri (dağıtılabilirden)';

-- =====================================================
-- 2. Dağıtılabilir Miktar Fonksiyonunu Güncelle
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_project_distributable_amount(p_project_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_total_collected DECIMAL(15,2);
  v_collected_vat DECIMAL(15,2);
  v_collected_commission DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_distributable DECIMAL(15,2);
  -- Gider değişkenleri
  v_client_expenses DECIMAL(15,2);
  v_shared_expenses DECIMAL(15,2);
  v_shared_expenses_rep_portion DECIMAL(15,2);
BEGIN
  -- Proje komisyon oranını al
  SELECT company_rate INTO v_commission_rate
  FROM public.projects
  WHERE id = p_project_id;

  -- Toplam tahsil edilen tutarı al
  SELECT COALESCE(SUM(collected_amount), 0)
  INTO v_total_collected
  FROM public.incomes
  WHERE project_id = p_project_id;

  -- Tahsil edilenden KDV hesapla (her gelirin kendi KDV oranıyla)
  SELECT COALESCE(SUM(
    collected_amount * vat_rate / 100
  ), 0)
  INTO v_collected_vat
  FROM public.incomes
  WHERE project_id = p_project_id
    AND collected_amount > 0;

  -- Tahsil edilen net tutardan komisyon hesapla
  v_collected_commission := (v_total_collected - v_collected_vat) * (v_commission_rate / 100);

  -- Dağıtılabilir = Tahsil Edilen - KDV - Komisyon
  v_distributable := v_total_collected - v_collected_vat - v_collected_commission;

  -- =====================================================
  -- GİDERLERİ DÜŞÜR
  -- =====================================================

  -- Karşı taraf giderleri (dağıtılabilirden direkt düşülür)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_client_expenses
  FROM public.expenses
  WHERE project_id = p_project_id
    AND is_tto_expense = false
    AND (expense_share_type = 'client' OR expense_share_type IS NULL);

  v_distributable := v_distributable - v_client_expenses;

  -- Ortak giderler (temsilci payı dağıtılabilirden düşülür)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_shared_expenses
  FROM public.expenses
  WHERE project_id = p_project_id
    AND is_tto_expense = false
    AND expense_share_type = 'shared';

  -- Ortak giderin temsilci payı = Toplam × (100 - company_rate) / 100
  v_shared_expenses_rep_portion := v_shared_expenses * (100 - v_commission_rate) / 100;
  v_distributable := v_distributable - v_shared_expenses_rep_portion;

  RETURN GREATEST(COALESCE(v_distributable, 0), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Ortak Gider TTO Payı İçin Trigger
-- =====================================================

-- Ortak gider oluşturulduğunda TTO payını TTO bakiyesinden düş
CREATE OR REPLACE FUNCTION public.deduct_shared_expense_from_tto()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_company_rate DECIMAL(5,2);
  v_tto_portion DECIMAL(15,2);
  v_project_name TEXT;
BEGIN
  -- Sadece ortak giderler için çalış
  IF NEW.expense_share_type != 'shared' OR NEW.is_tto_expense = true THEN
    RETURN NEW;
  END IF;

  -- Proje bilgilerini al
  SELECT p.company_rate, p.name
  INTO v_company_rate, v_project_name
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  -- TTO payını hesapla
  v_tto_portion := NEW.amount * v_company_rate / 100;

  -- Admin kullanıcıyı bul
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  -- TTO bakiyesinden düş
  IF v_admin_id IS NOT NULL AND v_tto_portion > 0 THEN
    PERFORM public.update_balance(
      'payment',
      v_tto_portion,
      v_admin_id,
      NULL,
      'shared_expense',
      NEW.id,
      'Ortak gider TTO payı (%' || v_company_rate || '): ' || COALESCE(v_project_name, 'Proje') || ' - ' || NEW.description
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS on_shared_expense_created ON public.expenses;

CREATE TRIGGER on_shared_expense_created
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_shared_expense_from_tto();

COMMIT;

-- =====================================================
-- Doğrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 065 tamamlandi!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '1. expense_share_type alani eklendi';
  RAISE NOTICE '2. get_project_distributable_amount guncellendi';
  RAISE NOTICE '3. Ortak gider TTO trigger olusturuldu';
  RAISE NOTICE '';
  RAISE NOTICE 'GIDER PAYLASIM TIPLERI:';
  RAISE NOTICE '- shared: Ortak gider (TTO + Temsilciler oransal)';
  RAISE NOTICE '- client: Karsi taraf gideri (dagitilabilirden dusulur)';
  RAISE NOTICE '';
  RAISE NOTICE 'ORNEK: 1000 TL ortak gider, company_rate = 20';
  RAISE NOTICE '- TTO payi: 1000 x 0.20 = 200 TL (TTO bakiyesinden duser)';
  RAISE NOTICE '- Temsilci payi: 1000 x 0.80 = 800 TL (dagitilabilirden duser)';
  RAISE NOTICE '=====================================================';
END $$;
