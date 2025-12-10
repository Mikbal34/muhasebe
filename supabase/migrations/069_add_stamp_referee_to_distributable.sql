-- Migration 069: Damga Vergisi ve Hakem Heyeti Dusumunu Dagitilabilir Miktara Ekle
--
-- SORUN:
-- get_project_distributable_amount() fonksiyonu damga vergisi ve hakem heyeti
-- dusumlerini hesaba katmiyordu. Sadece expenses tablosundaki giderler dusuluyordu.
--
-- COZUM:
-- stamp_duty_client_deducted ve referee_client_deducted degerlerini
-- dagitilabilir miktardan dus

CREATE OR REPLACE FUNCTION public.get_project_distributable_amount(p_project_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_total_collected DECIMAL(15,2);
  v_collected_vat DECIMAL(15,2);
  v_collected_commission DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_distributable DECIMAL(15,2);
  v_client_expenses DECIMAL(15,2);
  v_shared_expenses DECIMAL(15,2);
  v_shared_expenses_rep_portion DECIMAL(15,2);
  -- Damga vergisi ve hakem heyeti
  v_stamp_duty_client DECIMAL(15,2);
  v_referee_client DECIMAL(15,2);
BEGIN
  -- Proje komisyon oranini ve damga/hakem dusumlerini al
  SELECT
    company_rate,
    COALESCE(stamp_duty_client_deducted, 0),
    COALESCE(referee_client_deducted, 0)
  INTO
    v_commission_rate,
    v_stamp_duty_client,
    v_referee_client
  FROM public.projects
  WHERE id = p_project_id;

  -- Toplam tahsil edilen tutari al
  SELECT COALESCE(SUM(collected_amount), 0)
  INTO v_total_collected
  FROM public.incomes
  WHERE project_id = p_project_id;

  -- =====================================================
  -- KDV HESAPLAMA - ORANTILI ve TEVKIFATLI
  -- vat_amount artik tevkifat dusulmus halde (migration 066)
  -- Kismi tahsilat icin orantili hesaplama yap
  -- =====================================================
  SELECT COALESCE(SUM(
    CASE
      WHEN gross_amount > 0 THEN vat_amount * (collected_amount / gross_amount)
      ELSE 0
    END
  ), 0)
  INTO v_collected_vat
  FROM public.incomes
  WHERE project_id = p_project_id
    AND collected_amount > 0;

  -- Tahsil edilen net tutar
  v_distributable := v_total_collected - v_collected_vat;

  -- Komisyon hesapla ve dus
  v_collected_commission := v_distributable * (v_commission_rate / 100);
  v_distributable := v_distributable - v_collected_commission;

  -- =====================================================
  -- GIDERLERI DUSUR
  -- =====================================================

  -- Karsi taraf giderleri (direkt dagitilabilirden)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_client_expenses
  FROM public.expenses
  WHERE project_id = p_project_id
    AND is_tto_expense = false
    AND (expense_share_type = 'client' OR expense_share_type IS NULL);

  v_distributable := v_distributable - v_client_expenses;

  -- Ortak giderlerin temsilci payi
  SELECT COALESCE(SUM(amount), 0)
  INTO v_shared_expenses
  FROM public.expenses
  WHERE project_id = p_project_id
    AND is_tto_expense = false
    AND expense_share_type = 'shared';

  v_shared_expenses_rep_portion := v_shared_expenses * (100 - v_commission_rate) / 100;
  v_distributable := v_distributable - v_shared_expenses_rep_portion;

  -- =====================================================
  -- DAMGA VERGISI VE HAKEM HEYETI DUSUMU
  -- Karsi taraf (client) oduyorsa dagitilabilirden dusulur
  -- =====================================================
  v_distributable := v_distributable - v_stamp_duty_client - v_referee_client;

  RETURN GREATEST(COALESCE(v_distributable, 0), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Dogrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 069 tamamlandi!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'get_project_distributable_amount fonksiyonu guncellendi';
  RAISE NOTICE '';
  RAISE NOTICE 'EKLENEN:';
  RAISE NOTICE '- stamp_duty_client_deducted (karsi taraf damga vergisi)';
  RAISE NOTICE '- referee_client_deducted (karsi taraf hakem heyeti)';
  RAISE NOTICE '';
  RAISE NOTICE 'Bu degerler artik dagitilabilir miktardan dusulecek';
  RAISE NOTICE '=====================================================';
END $$;
