-- Migration 078: KDV Formulu Duzeltmesi - Turk KDV Sistemi
--
-- SORUN:
-- Turk KDV sisteminde brut tutar KDV dahildir.
-- Yanlis formul: KDV = brut x oran / 100
-- Dogru formul: KDV = brut x oran / (100 + oran)
--
-- ORNEK: 120.000 TL brut, %20 KDV
-- YANLIS: KDV = 120.000 x 20 / 100 = 24.000 TL
-- DOGRU:  KDV = 120.000 x 20 / 120 = 20.000 TL
--
-- Bu migration trigger'i duzeltir ve mevcut verileri gunceller.

-- =====================================================
-- 1. Trigger Fonksiyonunu Guncelle
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_full_vat DECIMAL(15,2);
  v_has_withholding BOOLEAN;
  v_withholding_rate DECIMAL(5,2);
BEGIN
  -- Tam KDV hesapla: brut x kdv_orani / (100 + kdv_orani)
  -- Turk KDV sistemi: brut tutar KDV dahildir
  v_full_vat := ROUND(NEW.gross_amount * NEW.vat_rate / (100 + NEW.vat_rate), 2);

  -- Proje tevkifat bilgilerini al
  SELECT
    COALESCE(has_withholding_tax, false),
    COALESCE(withholding_tax_rate, 0)
  INTO v_has_withholding, v_withholding_rate
  FROM public.projects
  WHERE id = NEW.project_id;

  -- Tevkifat varsa, odenen KDV'yi hesapla
  IF v_has_withholding AND v_withholding_rate > 0 THEN
    -- Tevkifat tutari (karsi tarafin kesip devlete odedigi)
    -- Ornek: 20.000 TL KDV x %50 tevkifat = 10.000 TL tevkifat
    NEW.withholding_tax_amount := ROUND(v_full_vat * v_withholding_rate / 100, 2);

    -- Odenen KDV = Tam KDV - Tevkifat
    -- Ornek: 20.000 - 10.000 = 10.000 TL (biz bu kadari oduyoruz)
    NEW.vat_amount := v_full_vat - NEW.withholding_tax_amount;
  ELSE
    NEW.vat_amount := v_full_vat;
    NEW.withholding_tax_amount := 0;
  END IF;

  -- Net = Brut - Odenen KDV
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Mevcut Gelirleri Duzelt
-- =====================================================

-- Tum gelirlerin KDV ve net tutarlarini yeniden hesapla
DO $$
DECLARE
  r RECORD;
  v_full_vat DECIMAL(15,2);
  v_withholding_rate DECIMAL(5,2);
  v_has_withholding BOOLEAN;
  v_withholding_amount DECIMAL(15,2);
  v_paid_vat DECIMAL(15,2);
  v_updated_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT
      i.id,
      i.gross_amount,
      i.vat_rate,
      i.vat_amount AS old_vat,
      i.net_amount AS old_net,
      COALESCE(p.has_withholding_tax, false) AS has_withholding,
      COALESCE(p.withholding_tax_rate, 0) AS withholding_rate
    FROM public.incomes i
    JOIN public.projects p ON p.id = i.project_id
  LOOP
    -- Dogru formul ile tam KDV hesapla
    v_full_vat := ROUND(r.gross_amount * r.vat_rate / (100 + r.vat_rate), 2);

    -- Tevkifat varsa hesapla
    IF r.has_withholding AND r.withholding_rate > 0 THEN
      v_withholding_amount := ROUND(v_full_vat * r.withholding_rate / 100, 2);
      v_paid_vat := v_full_vat - v_withholding_amount;
    ELSE
      v_withholding_amount := 0;
      v_paid_vat := v_full_vat;
    END IF;

    -- Guncelle
    UPDATE public.incomes
    SET
      withholding_tax_amount = v_withholding_amount,
      vat_amount = v_paid_vat,
      net_amount = r.gross_amount - v_paid_vat
    WHERE id = r.id;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RAISE NOTICE '% adet gelir kaydinin KDV tutarlari guncellendi', v_updated_count;
END $$;

-- =====================================================
-- 3. Dogrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 078 tamamlandi!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'KDV formulu Turk sistemine gore duzeltildi:';
  RAISE NOTICE 'KDV = Brut x Oran / (100 + Oran)';
  RAISE NOTICE '';
  RAISE NOTICE 'ORNEK: 120.000 TL brut, 20%% KDV';
  RAISE NOTICE '- KDV: 120.000 x 20 / 120 = 20.000 TL';
  RAISE NOTICE '- Net: 120.000 - 20.000 = 100.000 TL';
  RAISE NOTICE '=====================================================';
END $$;
