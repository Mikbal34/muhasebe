-- Migration 061: Tahsilat Bazlı Komisyon ve Dağıtım Düzeltmesi
--
-- SORUNLAR:
-- 1. Komisyon gelir kaydı oluşturulunca TTO bakiyesine HEMEN ekleniyor (para gelmeden!)
-- 2. Dağıtılabilir miktar tüm gelirlerden hesaplanıyor (tahsilat durumu yok sayılıyor)
--
-- ÇÖZÜM:
-- 1. commission_to_admin_balance_trigger kaldırılacak
-- 2. Tahsilat yapılınca TTO bakiyesine komisyon eklenecek
-- 3. Dağıtılabilir miktar sadece tahsil edilenlerden hesaplanacak

BEGIN;

-- =====================================================
-- 1. Komisyon Trigger'ını Devre Dışı Bırak
-- =====================================================

-- Bu trigger gelir kaydı oluşturulunca komisyonu TTO bakiyesine ekliyordu
DROP TRIGGER IF EXISTS commission_to_admin_balance_trigger ON public.commissions;

-- =====================================================
-- 2. Tahsilat Trigger'ını Güncelle
-- =====================================================

-- Eski trigger'ı kaldır
DROP TRIGGER IF EXISTS on_income_collection ON public.incomes;

-- Yeni fonksiyon: Tahsilat yapıldığında komisyonu TTO'ya ekle
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

  -- Gelir kaydından KDV oranını al
  SELECT vat_rate INTO v_vat_rate
  FROM public.incomes
  WHERE id = NEW.id;

  -- Proje bilgilerini al
  SELECT p.company_rate, p.name
  INTO v_commission_rate, v_project_name
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  -- Tahsil edilen miktardan KDV'yi hesapla (mevcut sistemle uyumlu)
  -- Formül: KDV = Tutar × KDV / 100
  v_vat_amount := v_new_collection * v_vat_rate / 100;

  -- Net tahsilat
  v_net_collection := v_new_collection - v_vat_amount;

  -- Komisyonu NET tutardan hesapla
  v_commission_amount := v_net_collection * (v_commission_rate / 100);

  -- Admin kullanıcıyı bul (TTO)
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  -- TTO bakiyesine komisyonu ekle
  IF v_admin_id IS NOT NULL THEN
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

-- Yeni trigger oluştur
CREATE TRIGGER on_income_collection
  AFTER UPDATE OF collected_amount ON public.incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.process_income_collection();

-- =====================================================
-- 3. Dağıtılabilir Miktar Hesaplamasını Güncelle
-- =====================================================

-- Eski fonksiyonu değiştir: Artık sadece tahsil edilenlerden hesaplasın
CREATE OR REPLACE FUNCTION public.get_project_distributable_amount(p_project_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_total_collected DECIMAL(15,2);
  v_collected_vat DECIMAL(15,2);
  v_collected_commission DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_distributable DECIMAL(15,2);
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

  RETURN COALESCE(v_distributable, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TTO Bakiyesini Temizle (Yanlış Eklenen Komisyonları Çıkar)
-- =====================================================

-- Admin kullanıcının bakiyesindeki komisyon gelirlerini sıfırla
-- (Henüz tahsil edilmemiş komisyonlar çıkarılacak)
DO $$
DECLARE
  v_admin_id UUID;
  v_wrong_commission DECIMAL(15,2);
  v_correct_commission DECIMAL(15,2);
  v_adjustment DECIMAL(15,2);
BEGIN
  -- Admin kullanıcıyı bul
  SELECT id INTO v_admin_id
  FROM public.users
  WHERE role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Admin kullanıcı bulunamadı';
    RETURN;
  END IF;

  -- Toplam komisyon kaydı (yanlış eklenen)
  SELECT COALESCE(SUM(c.amount), 0)
  INTO v_wrong_commission
  FROM public.commissions c;

  -- Sadece tahsil edilenlerden hesaplanan komisyon (doğru değer)
  SELECT COALESCE(SUM(
    (i.collected_amount - (i.collected_amount * i.vat_rate / 100)) * (p.company_rate / 100)
  ), 0)
  INTO v_correct_commission
  FROM public.incomes i
  JOIN public.projects p ON i.project_id = p.id
  WHERE i.collected_amount > 0;

  -- Fark (çıkarılması gereken)
  v_adjustment := v_wrong_commission - v_correct_commission;

  IF v_adjustment > 0 THEN
    -- Bakiyeden düş
    UPDATE public.balances
    SET
      available_amount = GREATEST(0, available_amount - v_adjustment),
      last_updated = NOW()
    WHERE user_id = v_admin_id;

    -- İşlem kaydı oluştur
    INSERT INTO public.balance_transactions (
      balance_id,
      type,
      amount,
      balance_before,
      balance_after,
      reference_type,
      description,
      created_at
    )
    SELECT
      b.id,
      'adjustment',
      -v_adjustment,
      b.available_amount + v_adjustment,
      b.available_amount,
      'commission_correction',
      'Tahsilat bazlı sisteme geçiş düzeltmesi - henüz tahsil edilmemiş komisyonlar çıkarıldı',
      NOW()
    FROM public.balances b
    WHERE b.user_id = v_admin_id;

    RAISE NOTICE 'TTO bakiyesinden %.2f TL düşüldü (yanlış eklenen komisyonlar)', v_adjustment;
  ELSE
    RAISE NOTICE 'Düzeltme gerekmedi';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- Doğrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 061 tamamlandı!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE '1. commission_to_admin_balance_trigger kaldırıldı';
  RAISE NOTICE '2. process_income_collection güncellendi (tahsilatta komisyon TTO''ya gider)';
  RAISE NOTICE '3. get_project_distributable_amount güncellendi (tahsilat bazlı)';
  RAISE NOTICE '4. TTO bakiyesi düzeltildi';
  RAISE NOTICE '';
  RAISE NOTICE 'YENİ SİSTEM:';
  RAISE NOTICE '- Gelir kaydı oluşturulunca: Sadece komisyon hesaplanır, bakiye DEĞİŞMEZ';
  RAISE NOTICE '- Tahsilat yapılınca: Komisyon TTO bakiyesine eklenir';
  RAISE NOTICE '- Dağıtılabilir miktar: Sadece tahsil edilenlerden hesaplanır';
  RAISE NOTICE '=====================================================';
END $$;
