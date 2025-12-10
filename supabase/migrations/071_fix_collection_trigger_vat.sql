-- Migration 071: Tahsilat Trigger'inda Tevkifatli KDV Hesaplamasi
--
-- SORUN:
-- Migration 070'deki trigger vat_rate'den KDV hesapliyor:
--   v_vat_amount := v_new_collection * v_vat_rate / 100;
-- Bu tevkifati hesaba katmiyor!
--
-- ORNEK:
-- Brut: 20.000, KDV %20, Tevkifat %50
-- Yanlis: 20.000 x 20 / 100 = 4.000 TL
-- Dogru: vat_amount = 2.000 TL (DB'de zaten tevkifatli)
--
-- COZUM:
-- Gelir kaydindaki vat_amount alanini kullan (zaten tevkifat dusulmus)
-- Kismi tahsilat icin oransal hesapla

-- Eski trigger'i kaldir
DROP TRIGGER IF EXISTS on_income_collection ON public.incomes;

-- Duzeltilmis fonksiyon
CREATE OR REPLACE FUNCTION public.process_income_collection()
RETURNS TRIGGER AS $$
DECLARE
  v_new_collection DECIMAL(15,2);
  v_gross_amount DECIMAL(15,2);
  v_vat_amount_from_income DECIMAL(15,2);
  v_collection_ratio DECIMAL(15,8);
  v_vat_for_this_collection DECIMAL(15,2);
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

  -- Oransal hesaplama (butceye gore)
  v_budget_ratio DECIMAL(15,8);
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

  -- =====================================================
  -- GELIR KAYDINDAKI DEGERLERI AL (TEVKIFATLI)
  -- =====================================================
  SELECT gross_amount, vat_amount
  INTO v_gross_amount, v_vat_amount_from_income
  FROM public.incomes
  WHERE id = NEW.id;

  -- Kismi tahsilat orani (bu tahsilat / toplam brut)
  IF v_gross_amount > 0 THEN
    v_collection_ratio := v_new_collection / v_gross_amount;
  ELSE
    v_collection_ratio := 1;
  END IF;

  -- =====================================================
  -- TEVKIFATLI KDV HESAPLA
  -- vat_amount zaten tevkifat dusulmus (migration 066)
  -- Kismi tahsilat icin oransal hesapla
  -- =====================================================
  v_vat_for_this_collection := v_vat_amount_from_income * v_collection_ratio;

  -- Net tahsilat (tevkifatli KDV dusulmus)
  v_net_collection := v_new_collection - v_vat_for_this_collection;

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

  -- Komisyonu NET tutardan hesapla
  v_commission_amount := v_net_collection * (v_commission_rate / 100);

  -- =====================================================
  -- ORANSAL DAMGA VERGISI VE HAKEM HEYETI DUSUMU
  -- Oran = Bu tahsilat / Toplam butce
  -- =====================================================

  IF v_budget > 0 THEN
    v_budget_ratio := v_new_collection / v_budget;
  ELSE
    v_budget_ratio := 0;
  END IF;

  -- DAMGA VERGISI DUSUMU HESAPLA
  v_stamp_deduction_this_collection := 0;
  IF COALESCE(v_stamp_duty_amount, 0) > 0 THEN
    v_stamp_deduction_this_collection := ROUND(v_stamp_duty_amount * v_budget_ratio, 2);

    -- TTO oduyorsa
    IF v_stamp_duty_payer = 'company' THEN
      -- Toplam dusulen asmasin
      IF (v_stamp_duty_company_deducted + v_stamp_deduction_this_collection) > v_stamp_duty_amount THEN
        v_stamp_deduction_this_collection := v_stamp_duty_amount - v_stamp_duty_company_deducted;
      END IF;

      IF v_stamp_deduction_this_collection > 0 THEN
        -- Tracking alanini guncelle
        UPDATE public.projects
        SET stamp_duty_company_deducted = COALESCE(stamp_duty_company_deducted, 0) + v_stamp_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;

    -- Karsi taraf oduyorsa: Tracking alanina yaz
    ELSIF v_stamp_duty_payer = 'client' THEN
      IF (v_stamp_duty_client_deducted + v_stamp_deduction_this_collection) > v_stamp_duty_amount THEN
        v_stamp_deduction_this_collection := v_stamp_duty_amount - v_stamp_duty_client_deducted;
      END IF;

      IF v_stamp_deduction_this_collection > 0 THEN
        UPDATE public.projects
        SET stamp_duty_client_deducted = COALESCE(stamp_duty_client_deducted, 0) + v_stamp_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;
      -- Karsi taraf icin islem gecmisine ekleme
      v_stamp_deduction_this_collection := 0;
    END IF;
  END IF;

  -- HAKEM HEYETI DUSUMU HESAPLA
  v_referee_deduction_this_collection := 0;
  IF COALESCE(v_referee_payment, 0) > 0 THEN
    v_referee_deduction_this_collection := ROUND(v_referee_payment * v_budget_ratio, 2);

    -- TTO oduyorsa
    IF v_referee_payer = 'company' THEN
      IF (v_referee_company_deducted + v_referee_deduction_this_collection) > v_referee_payment THEN
        v_referee_deduction_this_collection := v_referee_payment - v_referee_company_deducted;
      END IF;

      IF v_referee_deduction_this_collection > 0 THEN
        UPDATE public.projects
        SET referee_company_deducted = COALESCE(referee_company_deducted, 0) + v_referee_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;

    -- Karsi taraf oduyorsa: Tracking alanina yaz
    ELSIF v_referee_payer = 'client' THEN
      IF (v_referee_client_deducted + v_referee_deduction_this_collection) > v_referee_payment THEN
        v_referee_deduction_this_collection := v_referee_payment - v_referee_client_deducted;
      END IF;

      IF v_referee_deduction_this_collection > 0 THEN
        UPDATE public.projects
        SET referee_client_deducted = COALESCE(referee_client_deducted, 0) + v_referee_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;
      -- Karsi taraf icin islem gecmisine ekleme
      v_referee_deduction_this_collection := 0;
    END IF;
  END IF;

  -- =====================================================
  -- TTO BAKIYESINE ISLEMLER EKLE
  -- =====================================================

  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  -- 1. Tam komisyonu ekle
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

  -- 2. Damga vergisi dusumunu ayri islem olarak kaydet (TTO oduyorsa)
  IF v_admin_id IS NOT NULL AND v_stamp_duty_payer = 'company' AND v_stamp_deduction_this_collection > 0 THEN
    PERFORM public.update_balance(
      'payment',
      v_stamp_deduction_this_collection,
      v_admin_id,
      NULL,
      'stamp_duty_deduction',
      NEW.id,
      'Damga vergisi dusumu: ' || COALESCE(v_project_name, 'Proje')
    );
  END IF;

  -- 3. Hakem heyeti dusumunu ayri islem olarak kaydet (TTO oduyorsa)
  IF v_admin_id IS NOT NULL AND v_referee_payer = 'company' AND v_referee_deduction_this_collection > 0 THEN
    PERFORM public.update_balance(
      'payment',
      v_referee_deduction_this_collection,
      v_admin_id,
      NULL,
      'referee_deduction',
      NEW.id,
      'Hakem heyeti dusumu: ' || COALESCE(v_project_name, 'Proje')
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
  RAISE NOTICE 'Migration 071 tamamlandi - KDV hesaplama duzeltildi';
END $$;
