-- Migration 070: Tahsilat Trigger'ina Oransal Damga Vergisi ve Hakem Heyeti Dusumu
--
-- SORUN:
-- Damga vergisi ve hakem heyeti proje olusturulurken giriliyor ama
-- her tahsilatta oransal olarak dusulmuyor.
--
-- COZUM:
-- process_income_collection() trigger'ina oransal dusum mantigi ekle.
-- Her tahsilatta:
--   Dusulen = (Tahsilat / Toplam Brut) x Toplam Damga/Hakem
--
-- TTO oduyorsa -> Komisyondan dus
-- Karsi taraf oduyorsa -> Dagitilabilirden dus (tracking alanina yaz)

-- Eski trigger'i kaldir
DROP TRIGGER IF EXISTS on_income_collection ON public.incomes;

-- Yeni fonksiyon: Damga vergisi ve hakem heyeti dusumu eklendi
CREATE OR REPLACE FUNCTION public.process_income_collection()
RETURNS TRIGGER AS $$
DECLARE
  v_new_collection DECIMAL(15,2);
  v_vat_rate DECIMAL(5,2);
  v_vat_amount DECIMAL(15,2);
  v_net_collection DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(15,2);
  v_admin_id UUID;
  v_project_name TEXT;
  v_budget DECIMAL(15,2);

  -- Damga vergisi degiskenleri
  v_stamp_duty_payer VARCHAR;
  v_stamp_duty_amount DECIMAL(15,2);
  v_stamp_duty_company_deducted DECIMAL(15,2);
  v_stamp_duty_client_deducted DECIMAL(15,2);
  v_stamp_deduction_this_collection DECIMAL(15,2);

  -- Hakem heyeti degiskenleri
  v_referee_payer VARCHAR;
  v_referee_payment DECIMAL(15,2);
  v_referee_company_deducted DECIMAL(15,2);
  v_referee_client_deducted DECIMAL(15,2);
  v_referee_deduction_this_collection DECIMAL(15,2);

  -- Oransal hesaplama
  v_collection_ratio DECIMAL(15,8);
BEGIN
  -- Sadece collected_amount artisinda calis
  IF NEW.collected_amount IS NULL OR OLD.collected_amount IS NULL THEN
    v_new_collection := COALESCE(NEW.collected_amount, 0);
  ELSE
    v_new_collection := NEW.collected_amount - OLD.collected_amount;
  END IF;

  -- Eger yeni tahsilat yoksa cik
  IF v_new_collection <= 0 THEN
    RETURN NEW;
  END IF;

  -- Gelir kaydinden KDV oranini al
  SELECT vat_rate INTO v_vat_rate
  FROM public.incomes
  WHERE id = NEW.id;

  -- Proje bilgilerini al (damga ve hakem dahil)
  SELECT
    p.company_rate,
    p.name,
    p.budget,
    p.stamp_duty_payer,
    p.stamp_duty_amount,
    COALESCE(p.stamp_duty_company_deducted, 0),
    COALESCE(p.stamp_duty_client_deducted, 0),
    p.referee_payer,
    p.referee_payment,
    COALESCE(p.referee_company_deducted, 0),
    COALESCE(p.referee_client_deducted, 0)
  INTO
    v_commission_rate,
    v_project_name,
    v_budget,
    v_stamp_duty_payer,
    v_stamp_duty_amount,
    v_stamp_duty_company_deducted,
    v_stamp_duty_client_deducted,
    v_referee_payer,
    v_referee_payment,
    v_referee_company_deducted,
    v_referee_client_deducted
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  -- Tahsil edilen miktardan KDV'yi hesapla
  v_vat_amount := v_new_collection * v_vat_rate / 100;

  -- Net tahsilat
  v_net_collection := v_new_collection - v_vat_amount;

  -- Komisyonu NET tutardan hesapla
  v_commission_amount := v_net_collection * (v_commission_rate / 100);

  -- =====================================================
  -- ORANSAL DAMGA VERGISI VE HAKEM HEYETI DUSUMU
  -- Oran = Bu tahsilat / Toplam butce
  -- =====================================================

  IF v_budget > 0 THEN
    v_collection_ratio := v_new_collection / v_budget;
  ELSE
    v_collection_ratio := 0;
  END IF;

  -- DAMGA VERGISI DUSUMU
  IF COALESCE(v_stamp_duty_amount, 0) > 0 THEN
    v_stamp_deduction_this_collection := ROUND(v_stamp_duty_amount * v_collection_ratio, 2);

    -- TTO oduyorsa: Komisyondan dus
    IF v_stamp_duty_payer = 'company' THEN
      -- Toplam dusulen asmasin
      IF (v_stamp_duty_company_deducted + v_stamp_deduction_this_collection) > v_stamp_duty_amount THEN
        v_stamp_deduction_this_collection := v_stamp_duty_amount - v_stamp_duty_company_deducted;
      END IF;

      IF v_stamp_deduction_this_collection > 0 THEN
        -- Komisyondan dus
        v_commission_amount := v_commission_amount - v_stamp_deduction_this_collection;

        -- Tracking alanini guncelle
        UPDATE public.projects
        SET stamp_duty_company_deducted = COALESCE(stamp_duty_company_deducted, 0) + v_stamp_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;

    -- Karsi taraf oduyorsa: Tracking alanina yaz (dagitilabilirden dusulecek)
    ELSIF v_stamp_duty_payer = 'client' THEN
      -- Toplam dusulen asmasin
      IF (v_stamp_duty_client_deducted + v_stamp_deduction_this_collection) > v_stamp_duty_amount THEN
        v_stamp_deduction_this_collection := v_stamp_duty_amount - v_stamp_duty_client_deducted;
      END IF;

      IF v_stamp_deduction_this_collection > 0 THEN
        -- Tracking alanini guncelle
        UPDATE public.projects
        SET stamp_duty_client_deducted = COALESCE(stamp_duty_client_deducted, 0) + v_stamp_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;
    END IF;
  END IF;

  -- HAKEM HEYETI DUSUMU
  IF COALESCE(v_referee_payment, 0) > 0 THEN
    v_referee_deduction_this_collection := ROUND(v_referee_payment * v_collection_ratio, 2);

    -- TTO oduyorsa: Komisyondan dus
    IF v_referee_payer = 'company' THEN
      -- Toplam dusulen asmasin
      IF (v_referee_company_deducted + v_referee_deduction_this_collection) > v_referee_payment THEN
        v_referee_deduction_this_collection := v_referee_payment - v_referee_company_deducted;
      END IF;

      IF v_referee_deduction_this_collection > 0 THEN
        -- Komisyondan dus
        v_commission_amount := v_commission_amount - v_referee_deduction_this_collection;

        -- Tracking alanini guncelle
        UPDATE public.projects
        SET referee_company_deducted = COALESCE(referee_company_deducted, 0) + v_referee_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;

    -- Karsi taraf oduyorsa: Tracking alanina yaz (dagitilabilirden dusulecek)
    ELSIF v_referee_payer = 'client' THEN
      -- Toplam dusulen asmasin
      IF (v_referee_client_deducted + v_referee_deduction_this_collection) > v_referee_payment THEN
        v_referee_deduction_this_collection := v_referee_payment - v_referee_client_deducted;
      END IF;

      IF v_referee_deduction_this_collection > 0 THEN
        -- Tracking alanini guncelle
        UPDATE public.projects
        SET referee_client_deducted = COALESCE(referee_client_deducted, 0) + v_referee_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;
    END IF;
  END IF;

  -- =====================================================
  -- TTO BAKIYESINE KOMISYON EKLE
  -- =====================================================

  -- Admin kullaniciyi bul (TTO)
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  -- TTO bakiyesine komisyonu ekle (damga/hakem dusulmus hali)
  IF v_admin_id IS NOT NULL AND v_commission_amount > 0 THEN
    PERFORM public.update_balance(
      'income',
      v_commission_amount,
      v_admin_id,
      NULL,
      'commission_collection',
      NEW.id,
      'Tahsil edilen komisyon: ' || COALESCE(v_project_name, 'Proje')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni trigger olustur
CREATE TRIGGER on_income_collection
  AFTER UPDATE OF collected_amount ON public.incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.process_income_collection();

-- =====================================================
-- Dogrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 070 tamamlandi!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'process_income_collection trigger guncellendi';
  RAISE NOTICE '';
  RAISE NOTICE 'YENI OZELLIKLER:';
  RAISE NOTICE '- Her tahsilatta oransal damga vergisi dusumu';
  RAISE NOTICE '- Her tahsilatta oransal hakem heyeti dusumu';
  RAISE NOTICE '- TTO oduyorsa: Komisyondan dusulur';
  RAISE NOTICE '- Karsi taraf oduyorsa: Tracking alanina yazilir';
  RAISE NOTICE '';
  RAISE NOTICE 'TRACKING ALANLARI:';
  RAISE NOTICE '- stamp_duty_company_deducted: TTO odemeli damga toplamı';
  RAISE NOTICE '- stamp_duty_client_deducted: Karsi taraf odemeli damga toplami';
  RAISE NOTICE '- referee_company_deducted: TTO odemeli hakem toplami';
  RAISE NOTICE '- referee_client_deducted: Karsi taraf odemeli hakem toplami';
  RAISE NOTICE '=====================================================';
END $$;
