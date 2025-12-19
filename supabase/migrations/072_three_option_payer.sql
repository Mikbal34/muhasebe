-- Migration 072: Hakem Heyeti ve Damga Vergisi - 3 Seçenek
--
-- DEĞİŞİKLİK:
-- Eski: company (TTO) | client (Karşı taraf - bakiyelerden düşülüyor)
-- Yeni: company (TTO) | academic (Akademisyen - bakiyelerden düşülüyor) | client (Müşteri - kayıt amaçlı)
--
-- MANTIK:
-- company  → TTO bakiyesinden düşülür (aynı)
-- academic → Personel bakiyelerinden düşülür (eski client mantığı)
-- client   → Hiçbir şey yapılmaz, sadece proje detayında kayıt olarak görünür

-- =====================================================
-- 1. SÜTUNLARI YENİDEN ADLANDIR
-- =====================================================

ALTER TABLE public.projects
  RENAME COLUMN stamp_duty_client_deducted TO stamp_duty_academic_deducted;

ALTER TABLE public.projects
  RENAME COLUMN referee_client_deducted TO referee_academic_deducted;

-- =====================================================
-- 2. CHECK CONSTRAINT'LERİ GÜNCELLE
-- =====================================================

-- Mevcut constraint'leri kaldır (varsa)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_stamp_duty_payer_check;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_referee_payer_check;

-- Yeni constraint'leri ekle (3 seçenekli)
ALTER TABLE public.projects
  ADD CONSTRAINT projects_stamp_duty_payer_check
  CHECK (stamp_duty_payer IN ('company', 'academic', 'client'));

ALTER TABLE public.projects
  ADD CONSTRAINT projects_referee_payer_check
  CHECK (referee_payer IN ('company', 'academic', 'client'));

-- =====================================================
-- 3. TRIGGER'I GÜNCELLE
-- =====================================================

-- Eski trigger'i kaldır
DROP TRIGGER IF EXISTS on_income_collection ON public.incomes;

-- Güncellenmiş fonksiyon
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

  -- Damga vergisi değişkenleri
  v_stamp_duty_payer VARCHAR;
  v_stamp_duty_amount DECIMAL(15,2);
  v_stamp_duty_company_deducted DECIMAL(15,2);
  v_stamp_duty_academic_deducted DECIMAL(15,2);
  v_stamp_deduction_this_collection DECIMAL(15,2);

  -- Hakem heyeti değişkenleri
  v_referee_payer VARCHAR;
  v_referee_payment DECIMAL(15,2);
  v_referee_company_deducted DECIMAL(15,2);
  v_referee_academic_deducted DECIMAL(15,2);
  v_referee_deduction_this_collection DECIMAL(15,2);

  -- Oransal hesaplama (bütçeye göre)
  v_budget_ratio DECIMAL(15,8);
BEGIN
  -- Sadece collected_amount artışında çalış
  IF NEW.collected_amount IS NULL OR OLD.collected_amount IS NULL THEN
    v_new_collection := COALESCE(NEW.collected_amount, 0);
  ELSE
    v_new_collection := NEW.collected_amount - OLD.collected_amount;
  END IF;

  -- Eğer yeni tahsilat yoksa çık
  IF v_new_collection <= 0 THEN
    RETURN NEW;
  END IF;

  -- =====================================================
  -- GELİR KAYDINDAKİ DEĞERLERİ AL (TEVKİFATLI)
  -- =====================================================
  SELECT gross_amount, vat_amount
  INTO v_gross_amount, v_vat_amount_from_income
  FROM public.incomes
  WHERE id = NEW.id;

  -- Kısmi tahsilat oranı (bu tahsilat / toplam brüt)
  IF v_gross_amount > 0 THEN
    v_collection_ratio := v_new_collection / v_gross_amount;
  ELSE
    v_collection_ratio := 1;
  END IF;

  -- =====================================================
  -- TEVKİFATLI KDV HESAPLA
  -- =====================================================
  v_vat_for_this_collection := v_vat_amount_from_income * v_collection_ratio;

  -- Net tahsilat (tevkifatlı KDV düşülmüş)
  v_net_collection := v_new_collection - v_vat_for_this_collection;

  -- Proje bilgilerini al (damga ve hakem dahil)
  SELECT
    p.company_rate,
    p.name,
    p.budget,
    p.stamp_duty_payer,
    p.stamp_duty_amount,
    COALESCE(p.stamp_duty_company_deducted, 0),
    COALESCE(p.stamp_duty_academic_deducted, 0),
    p.referee_payer,
    p.referee_payment,
    COALESCE(p.referee_company_deducted, 0),
    COALESCE(p.referee_academic_deducted, 0)
  INTO
    v_commission_rate,
    v_project_name,
    v_budget,
    v_stamp_duty_payer,
    v_stamp_duty_amount,
    v_stamp_duty_company_deducted,
    v_stamp_duty_academic_deducted,
    v_referee_payer,
    v_referee_payment,
    v_referee_company_deducted,
    v_referee_academic_deducted
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  -- Komisyonu NET tutardan hesapla
  v_commission_amount := v_net_collection * (v_commission_rate / 100);

  -- =====================================================
  -- ORANSAL DAMGA VERGİSİ VE HAKEM HEYETİ DÜŞÜMÜ
  -- Oran = Bu tahsilat / Toplam bütçe
  -- =====================================================

  IF v_budget > 0 THEN
    v_budget_ratio := v_new_collection / v_budget;
  ELSE
    v_budget_ratio := 0;
  END IF;

  -- DAMGA VERGİSİ DÜŞÜMÜ HESAPLA
  v_stamp_deduction_this_collection := 0;
  IF COALESCE(v_stamp_duty_amount, 0) > 0 THEN
    v_stamp_deduction_this_collection := ROUND(v_stamp_duty_amount * v_budget_ratio, 2);

    -- TTO ödüyorsa
    IF v_stamp_duty_payer = 'company' THEN
      -- Toplam düşülen aşmasın
      IF (v_stamp_duty_company_deducted + v_stamp_deduction_this_collection) > v_stamp_duty_amount THEN
        v_stamp_deduction_this_collection := v_stamp_duty_amount - v_stamp_duty_company_deducted;
      END IF;

      IF v_stamp_deduction_this_collection > 0 THEN
        -- Tracking alanını güncelle
        UPDATE public.projects
        SET stamp_duty_company_deducted = COALESCE(stamp_duty_company_deducted, 0) + v_stamp_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;

    -- Akademisyen ödüyorsa: Tracking alanına yaz (eski client mantığı)
    ELSIF v_stamp_duty_payer = 'academic' THEN
      IF (v_stamp_duty_academic_deducted + v_stamp_deduction_this_collection) > v_stamp_duty_amount THEN
        v_stamp_deduction_this_collection := v_stamp_duty_amount - v_stamp_duty_academic_deducted;
      END IF;

      IF v_stamp_deduction_this_collection > 0 THEN
        UPDATE public.projects
        SET stamp_duty_academic_deducted = COALESCE(stamp_duty_academic_deducted, 0) + v_stamp_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;
      -- Akademisyen için işlem geçmişine ekleme yapılmaz (manuel dağıtımda düşülür)
      v_stamp_deduction_this_collection := 0;

    -- Karşı taraf (müşteri) ödüyorsa: HİÇBİR ŞEY YAPMA
    -- client seçeneği sadece kayıt amaçlı, bakiyelerden düşülmez
    ELSIF v_stamp_duty_payer = 'client' THEN
      v_stamp_deduction_this_collection := 0;
    END IF;
  END IF;

  -- HAKEM HEYETİ DÜŞÜMÜ HESAPLA
  v_referee_deduction_this_collection := 0;
  IF COALESCE(v_referee_payment, 0) > 0 THEN
    v_referee_deduction_this_collection := ROUND(v_referee_payment * v_budget_ratio, 2);

    -- TTO ödüyorsa
    IF v_referee_payer = 'company' THEN
      IF (v_referee_company_deducted + v_referee_deduction_this_collection) > v_referee_payment THEN
        v_referee_deduction_this_collection := v_referee_payment - v_referee_company_deducted;
      END IF;

      IF v_referee_deduction_this_collection > 0 THEN
        UPDATE public.projects
        SET referee_company_deducted = COALESCE(referee_company_deducted, 0) + v_referee_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;

    -- Akademisyen ödüyorsa: Tracking alanına yaz (eski client mantığı)
    ELSIF v_referee_payer = 'academic' THEN
      IF (v_referee_academic_deducted + v_referee_deduction_this_collection) > v_referee_payment THEN
        v_referee_deduction_this_collection := v_referee_payment - v_referee_academic_deducted;
      END IF;

      IF v_referee_deduction_this_collection > 0 THEN
        UPDATE public.projects
        SET referee_academic_deducted = COALESCE(referee_academic_deducted, 0) + v_referee_deduction_this_collection
        WHERE id = NEW.project_id;
      END IF;
      -- Akademisyen için işlem geçmişine ekleme yapılmaz (manuel dağıtımda düşülür)
      v_referee_deduction_this_collection := 0;

    -- Karşı taraf (müşteri) ödüyorsa: HİÇBİR ŞEY YAPMA
    ELSIF v_referee_payer = 'client' THEN
      v_referee_deduction_this_collection := 0;
    END IF;
  END IF;

  -- =====================================================
  -- TTO BAKİYESİNE İŞLEMLER EKLE
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

  -- 2. Damga vergisi düşümünü ayrı işlem olarak kaydet (TTO ödüyorsa)
  IF v_admin_id IS NOT NULL AND v_stamp_duty_payer = 'company' AND v_stamp_deduction_this_collection > 0 THEN
    PERFORM public.update_balance(
      'payment',
      v_stamp_deduction_this_collection,
      v_admin_id,
      NULL,
      'stamp_duty_deduction',
      NEW.id,
      'Damga vergisi düşümü: ' || COALESCE(v_project_name, 'Proje')
    );
  END IF;

  -- 3. Hakem heyeti düşümünü ayrı işlem olarak kaydet (TTO ödüyorsa)
  IF v_admin_id IS NOT NULL AND v_referee_payer = 'company' AND v_referee_deduction_this_collection > 0 THEN
    PERFORM public.update_balance(
      'payment',
      v_referee_deduction_this_collection,
      v_admin_id,
      NULL,
      'referee_deduction',
      NEW.id,
      'Hakem heyeti düşümü: ' || COALESCE(v_project_name, 'Proje')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni trigger oluştur
CREATE TRIGGER on_income_collection
  AFTER UPDATE OF collected_amount ON public.incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.process_income_collection();

-- =====================================================
-- 4. DISTRIBUTABLE AMOUNT FONKSİYONUNU GÜNCELLE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_project_distributable_amount(p_project_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_total_collected DECIMAL(15,2);
  v_collected_vat DECIMAL(15,2);
  v_collected_net DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_collected_commission DECIMAL(15,2);
  v_distributable DECIMAL(15,2);
  v_stamp_duty_academic_deducted DECIMAL(15,2);
  v_referee_academic_deducted DECIMAL(15,2);
BEGIN
  -- Toplam tahsil edilen
  SELECT COALESCE(SUM(collected_amount), 0)
  INTO v_total_collected
  FROM public.incomes
  WHERE project_id = p_project_id;

  -- Tahsil edilenden KDV hesapla (oransal)
  SELECT COALESCE(SUM(
    CASE
      WHEN gross_amount > 0 THEN (collected_amount::DECIMAL / gross_amount) * vat_amount
      ELSE 0
    END
  ), 0)
  INTO v_collected_vat
  FROM public.incomes
  WHERE project_id = p_project_id;

  -- Komisyon oranı ve tracking alanları
  SELECT
    company_rate,
    COALESCE(stamp_duty_academic_deducted, 0),
    COALESCE(referee_academic_deducted, 0)
  INTO
    v_commission_rate,
    v_stamp_duty_academic_deducted,
    v_referee_academic_deducted
  FROM public.projects
  WHERE id = p_project_id;

  v_collected_net := v_total_collected - v_collected_vat;
  v_collected_commission := v_collected_net * (v_commission_rate / 100);

  -- Dağıtılabilir = Net - Komisyon - Akademisyen Düşümleri
  v_distributable := v_collected_net - v_collected_commission - v_stamp_duty_academic_deducted - v_referee_academic_deducted;

  -- Negatife düşmesin
  IF v_distributable < 0 THEN
    v_distributable := 0;
  END IF;

  RETURN v_distributable;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 5. MEVCUT VERİLERİ GÜNCELLEMEYİ DÜŞÜN
-- Eski 'client' değerlerini 'academic' olarak güncelle
-- (İsteğe bağlı - mevcut mantık aynı olduğu için)
-- =====================================================

-- Mevcut client değerlerini academic yap
UPDATE public.projects SET referee_payer = 'academic' WHERE referee_payer = 'client';
UPDATE public.projects SET stamp_duty_payer = 'academic' WHERE stamp_duty_payer = 'client';

-- =====================================================
-- Doğrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 072 tamamlandı - Hakem/Damga 3 seçenek';
  RAISE NOTICE '- company: TTO bakiyesinden düşülür';
  RAISE NOTICE '- academic: Akademisyen bakiyelerinden düşülür';
  RAISE NOTICE '- client: Sadece kayıt amaçlı, düşüm yok';
END $$;
