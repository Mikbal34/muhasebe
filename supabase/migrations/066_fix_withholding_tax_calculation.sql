-- Migration 066: Tevkifat Hesaplamasini Duzelt
--
-- SORUN:
-- KDV hesaplamasinda tevkifat dikkate alinmiyor.
-- Ornek: 10.000 TL brut, %20 KDV, %50 tevkifat
-- Mevcut: KDV = 2.000 TL, Net = 8.000 TL
-- Olmasi gereken: Odenen KDV = 1.000 TL, Net = 9.000 TL
--
-- COZUM:
-- Trigger'i guncelle - tevkifat oranini KDV'den dus

-- =====================================================
-- Trigger Fonksiyonunu Guncelle
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_income_amounts()
RETURNS TRIGGER AS $$
DECLARE
  v_full_vat DECIMAL(15,2);
  v_has_withholding BOOLEAN;
  v_withholding_rate DECIMAL(5,2);
BEGIN
  -- Tam KDV hesapla: brut x kdv_orani / 100
  v_full_vat := ROUND(NEW.gross_amount * NEW.vat_rate / 100, 2);

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
    -- Ornek: 2.000 TL KDV x %50 tevkifat = 1.000 TL tevkifat
    NEW.withholding_tax_amount := ROUND(v_full_vat * v_withholding_rate / 100, 2);

    -- Odenen KDV = Tam KDV - Tevkifat
    -- Ornek: 2.000 - 1.000 = 1.000 TL (biz bu kadari oduyoruz)
    NEW.vat_amount := v_full_vat - NEW.withholding_tax_amount;
  ELSE
    NEW.vat_amount := v_full_vat;
    NEW.withholding_tax_amount := 0;
  END IF;

  -- Net = Brut - Odenen KDV
  -- Ornek: 10.000 - 1.000 = 9.000 TL
  NEW.net_amount := NEW.gross_amount - NEW.vat_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Mevcut Gelirleri Guncelle (Opsiyonel)
-- =====================================================

-- Tevkifatli projelerdeki gelirleri yeniden hesapla
DO $$
DECLARE
  r RECORD;
  v_full_vat DECIMAL(15,2);
  v_withholding_rate DECIMAL(5,2);
  v_withholding_amount DECIMAL(15,2);
  v_paid_vat DECIMAL(15,2);
BEGIN
  FOR r IN
    SELECT i.id, i.gross_amount, i.vat_rate, p.withholding_tax_rate
    FROM public.incomes i
    JOIN public.projects p ON p.id = i.project_id
    WHERE p.has_withholding_tax = true
      AND p.withholding_tax_rate > 0
  LOOP
    -- Tam KDV
    v_full_vat := ROUND(r.gross_amount * r.vat_rate / 100, 2);

    -- Tevkifat tutari
    v_withholding_amount := ROUND(v_full_vat * r.withholding_tax_rate / 100, 2);

    -- Odenen KDV
    v_paid_vat := v_full_vat - v_withholding_amount;

    -- Guncelle
    UPDATE public.incomes
    SET
      withholding_tax_amount = v_withholding_amount,
      vat_amount = v_paid_vat,
      net_amount = r.gross_amount - v_paid_vat
    WHERE id = r.id;
  END LOOP;

  RAISE NOTICE 'Tevkifatli gelirler guncellendi';
END $$;

-- =====================================================
-- Dogrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 066 tamamlandi!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Tevkifat hesaplamasi artik KDV den dusulecek';
  RAISE NOTICE '';
  RAISE NOTICE 'ORNEK: 10.000 TL brut, 20 KDV, 50 tevkifat';
  RAISE NOTICE '- Tam KDV: 10.000 x 0.20 = 2.000 TL';
  RAISE NOTICE '- Tevkifat: 2.000 x 0.50 = 1.000 TL';
  RAISE NOTICE '- Odenen KDV: 2.000 - 1.000 = 1.000 TL';
  RAISE NOTICE '- Net: 10.000 - 1.000 = 9.000 TL';
  RAISE NOTICE '=====================================================';
END $$;
