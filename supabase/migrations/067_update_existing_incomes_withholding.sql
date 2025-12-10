-- Migration 067: Mevcut Gelirleri Tevkifat ile Guncelle
-- Bu migration mevcut tum gelirleri yeniden hesaplar

-- Tevkifatli projelerdeki gelirleri yeniden hesapla
DO $$
DECLARE
  r RECORD;
  v_full_vat DECIMAL(15,2);
  v_withholding_amount DECIMAL(15,2);
  v_paid_vat DECIMAL(15,2);
  v_net DECIMAL(15,2);
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Tevkifatli gelirler guncelleniyor...';

  FOR r IN
    SELECT i.id, i.gross_amount, i.vat_rate, p.withholding_tax_rate, p.name as project_name
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

    -- Net tutar
    v_net := r.gross_amount - v_paid_vat;

    -- Guncelle
    UPDATE public.incomes
    SET
      withholding_tax_amount = v_withholding_amount,
      vat_amount = v_paid_vat,
      net_amount = v_net
    WHERE id = r.id;

    v_count := v_count + 1;

    RAISE NOTICE 'Guncellendi: % - Brut: %, Tam KDV: %, Tevkifat: %, Odenen KDV: %, Net: %',
      r.project_name, r.gross_amount, v_full_vat, v_withholding_amount, v_paid_vat, v_net;
  END LOOP;

  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Toplam % gelir kaydı güncellendi', v_count;
  RAISE NOTICE '=====================================================';
END $$;

-- Dogrulama: Tevkifatli gelirlerin degerlerini goster
SELECT
  p.name as proje,
  i.gross_amount as brut,
  i.vat_rate as kdv_orani,
  p.withholding_tax_rate as tevkifat_orani,
  i.withholding_tax_amount as tevkifat_tutari,
  i.vat_amount as odenen_kdv,
  i.net_amount as net
FROM public.incomes i
JOIN public.projects p ON p.id = i.project_id
WHERE p.has_withholding_tax = true
ORDER BY i.created_at DESC
LIMIT 10;
