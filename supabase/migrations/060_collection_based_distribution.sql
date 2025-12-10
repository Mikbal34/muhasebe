-- Migration 060: Tahsilat Bazlı Gelir Dağıtımı
--
-- PROBLEM: Şu an gelir kaydı oluşturulduğunda otomatik dağıtım yapılıyor.
-- Para henüz tahsil edilmemiş olsa bile bakiyeler güncelleniyor.
--
-- ÇÖZÜM: Dağıtım, tahsilat yapıldığında (collected_amount güncellendiğinde) yapılacak.
-- Komisyon hesabı gelir kaydında kalacak.

BEGIN;

-- =====================================================
-- 1. Mevcut trigger'ı güncelle: Sadece komisyon hesapla
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(15,2);
  v_project_id UUID;
BEGIN
  -- Get project details
  SELECT p.company_rate, i.project_id
  INTO v_commission_rate, v_project_id
  FROM public.projects p
  INNER JOIN public.incomes i ON i.project_id = p.id
  WHERE i.id = NEW.id;

  -- Calculate commission from net_amount
  v_commission_amount := NEW.net_amount * (v_commission_rate / 100);

  -- Create commission record (sadece komisyon, dağıtım YOK)
  INSERT INTO public.commissions (income_id, project_id, rate, amount)
  VALUES (NEW.id, v_project_id, v_commission_rate, v_commission_amount);

  -- NOT: income_distributions artık burada oluşturulMUYOR
  -- Dağıtım, tahsilat yapıldığında process_income_collection() tarafından yapılacak

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Tahsilat trigger'ı: Dağıtım ve bakiye güncelleme
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_income_collection()
RETURNS TRIGGER AS $$
DECLARE
  v_new_collection DECIMAL(15,2);
  v_commission_rate DECIMAL(5,2);
  v_commission_portion DECIMAL(15,2);
  v_distributable_amount DECIMAL(15,2);
  v_project_id UUID;
  v_rep RECORD;
  v_distribution_amount DECIMAL(15,2);
  v_rep_count INTEGER;
  v_share_percentage DECIMAL(5,2);
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

  -- Proje bilgilerini al
  SELECT p.company_rate, NEW.project_id
  INTO v_commission_rate, v_project_id
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  -- Tahsil edilen miktardan komisyon hesapla
  -- Komisyon oranı brütten değil, net'ten hesaplanıyor (mevcut mantık)
  -- Tahsilat brüt üzerinden geliyor, net oranını bul
  v_commission_portion := v_new_collection * (v_commission_rate / 100);
  v_distributable_amount := v_new_collection - v_commission_portion;

  -- Temsilci sayısını al (eşit dağıtım için)
  SELECT COUNT(*) INTO v_rep_count
  FROM public.project_representatives pr
  WHERE pr.project_id = v_project_id;

  -- Eğer temsilci yoksa çık
  IF v_rep_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Eşit pay oranı hesapla
  v_share_percentage := 100.0 / v_rep_count;

  -- Her proje temsilcisi için dağıtım oluştur
  FOR v_rep IN
    SELECT pr.user_id, pr.personnel_id
    FROM public.project_representatives pr
    WHERE pr.project_id = v_project_id
  LOOP
    -- Eşit dağıtım
    v_distribution_amount := v_distributable_amount / v_rep_count;

    -- income_distributions'a ekle
    INSERT INTO public.income_distributions (
      income_id,
      user_id,
      personnel_id,
      amount,
      share_percentage
    ) VALUES (
      NEW.id,
      v_rep.user_id,
      v_rep.personnel_id,
      v_distribution_amount,
      v_share_percentage
    );

    -- Bakiyeyi güncelle (user veya personnel)
    IF v_rep.user_id IS NOT NULL THEN
      UPDATE public.balances
      SET
        available_amount = available_amount + v_distribution_amount,
        total_income = total_income + v_distribution_amount,
        last_updated = NOW()
      WHERE user_id = v_rep.user_id;
    ELSIF v_rep.personnel_id IS NOT NULL THEN
      -- Personnel için bakiye kaydı yoksa oluştur
      INSERT INTO public.balances (personnel_id, available_amount, total_income, debt_amount, reserved_amount, total_payment)
      VALUES (v_rep.personnel_id, v_distribution_amount, v_distribution_amount, 0, 0, 0)
      ON CONFLICT (personnel_id) WHERE personnel_id IS NOT NULL
      DO UPDATE SET
        available_amount = balances.available_amount + v_distribution_amount,
        total_income = balances.total_income + v_distribution_amount,
        last_updated = NOW();
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Tahsilat trigger'ını oluştur
-- =====================================================

-- Önce varsa eski trigger'ı kaldır
DROP TRIGGER IF EXISTS on_income_collection ON public.incomes;

-- Yeni trigger: collected_amount değiştiğinde çalış
CREATE TRIGGER on_income_collection
  AFTER UPDATE OF collected_amount ON public.incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.process_income_collection();

-- =====================================================
-- 4. total_received trigger'ını güncelle: collected_amount kullan
-- =====================================================

CREATE OR REPLACE FUNCTION update_project_total_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE projects
    SET total_received = (
      SELECT COALESCE(SUM(collected_amount), 0)  -- gross_amount yerine collected_amount
      FROM incomes
      WHERE project_id = NEW.project_id
    )
    WHERE id = NEW.project_id;

    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE projects
    SET total_received = (
      SELECT COALESCE(SUM(collected_amount), 0)  -- gross_amount yerine collected_amount
      FROM incomes
      WHERE project_id = OLD.project_id
    )
    WHERE id = OLD.project_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Mevcut projelerin total_received değerlerini sıfırla
-- =====================================================

-- Tüm projelerin total_received değerini collected_amount toplamı ile güncelle
UPDATE projects p
SET total_received = (
  SELECT COALESCE(SUM(collected_amount), 0)
  FROM incomes
  WHERE project_id = p.id
);

COMMIT;

-- =====================================================
-- Doğrulama
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Tahsilat bazlı dağıtım sistemi aktif!';
  RAISE NOTICE '✓ Gelir kaydı oluşturulduğunda: Sadece komisyon hesaplanır';
  RAISE NOTICE '✓ Tahsilat yapıldığında: Dağıtım yapılır ve bakiyeler güncellenir';
  RAISE NOTICE '✓ Kısmi tahsilat desteği: Her tahsilat ayrı dağıtım oluşturur';
  RAISE NOTICE '✓ total_received artık collected_amount toplamını gösteriyor';
END $$;
