-- Migration 064: Oransal Damga Vergisi ve Hakem Heyeti Düşümü
--
-- DEĞİŞİKLİK:
-- 1. Şirket ödüyorsa: TTO payından ORANSAL düşüm (her tahsilatta)
-- 2. Karşı taraf ödüyorsa: Dağıtılabilir miktardan ORANSAL düşüm (her tahsilatta)
--
-- FORMÜL: Her tahsilat için düşülecek = (Bu tahsilat / Toplam bütçe) × Toplam tutar

-- 1. Yeni tracking alanları ekle
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS stamp_duty_company_deducted DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stamp_duty_client_deducted DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referee_company_deducted DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referee_client_deducted DECIMAL(15,2) DEFAULT 0;

-- 2. Trigger fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION process_income_distribution()
RETURNS TRIGGER AS $$
DECLARE
  rep RECORD;
  commission_amount DECIMAL(15,2);
  base_commission_amount DECIMAL(15,2);
  distributable_amount DECIMAL(15,2);
  distribution_amount DECIMAL(15,2);
  project_commission_rate DECIMAL(5,2);

  -- Damga vergisi değişkenleri
  v_stamp_duty_payer VARCHAR;
  v_stamp_duty_amount DECIMAL(15,2);
  v_stamp_duty_company_deducted DECIMAL(15,2);
  v_stamp_duty_client_deducted DECIMAL(15,2);

  -- Hakem heyeti değişkenleri
  v_referee_payer VARCHAR;
  v_referee_payment DECIMAL(15,2);
  v_referee_company_deducted DECIMAL(15,2);
  v_referee_client_deducted DECIMAL(15,2);

  -- Bütçe ve oran değişkenleri
  v_budget DECIMAL(15,2);
  v_deduction_ratio DECIMAL(15,8);
  v_deduction_this_income DECIMAL(15,2);
BEGIN
  -- Proje bilgilerini al
  SELECT
    company_rate,
    budget,
    stamp_duty_payer,
    stamp_duty_amount,
    COALESCE(stamp_duty_company_deducted, 0),
    COALESCE(stamp_duty_client_deducted, 0),
    referee_payer,
    referee_payment,
    COALESCE(referee_company_deducted, 0),
    COALESCE(referee_client_deducted, 0)
  INTO
    project_commission_rate,
    v_budget,
    v_stamp_duty_payer,
    v_stamp_duty_amount,
    v_stamp_duty_company_deducted,
    v_stamp_duty_client_deducted,
    v_referee_payer,
    v_referee_payment,
    v_referee_company_deducted,
    v_referee_client_deducted
  FROM projects WHERE id = NEW.project_id;

  -- Komisyon oranı (varsayılan %15)
  project_commission_rate := COALESCE(project_commission_rate, 15.00);

  -- Temel komisyon hesapla (NET tutardan)
  base_commission_amount := ROUND(NEW.net_amount * project_commission_rate / 100, 2);
  commission_amount := base_commission_amount;

  -- Bu gelirin bütçeye oranı
  v_deduction_ratio := NEW.gross_amount / v_budget;

  -- =====================================================
  -- DAMGA VERGİSİ DÜŞÜMÜ
  -- =====================================================

  -- ŞİRKET ödüyorsa: TTO payından ORANSAL düş
  IF v_stamp_duty_payer = 'company' AND v_stamp_duty_amount > 0 THEN
    v_deduction_this_income := ROUND(v_stamp_duty_amount * v_deduction_ratio, 2);

    -- Toplam düşülen aşmaması için kontrol
    IF (v_stamp_duty_company_deducted + v_deduction_this_income) > v_stamp_duty_amount THEN
      v_deduction_this_income := v_stamp_duty_amount - v_stamp_duty_company_deducted;
    END IF;

    -- TTO payından düş
    IF v_deduction_this_income > 0 THEN
      commission_amount := commission_amount - v_deduction_this_income;

      UPDATE projects
      SET stamp_duty_company_deducted = COALESCE(stamp_duty_company_deducted, 0) + v_deduction_this_income
      WHERE id = NEW.project_id;
    END IF;
  END IF;

  -- Dağıtılabilir miktar hesapla (NET - temel komisyon)
  distributable_amount := NEW.net_amount - base_commission_amount;

  -- KARŞI TARAF ödüyorsa: Dağıtılabilir miktardan ORANSAL düş
  IF v_stamp_duty_payer = 'client' AND v_stamp_duty_amount > 0 THEN
    v_deduction_this_income := ROUND(v_stamp_duty_amount * v_deduction_ratio, 2);

    -- Toplam düşülen aşmaması için kontrol
    IF (v_stamp_duty_client_deducted + v_deduction_this_income) > v_stamp_duty_amount THEN
      v_deduction_this_income := v_stamp_duty_amount - v_stamp_duty_client_deducted;
    END IF;

    -- Dağıtılabilir miktardan düş
    IF v_deduction_this_income > 0 THEN
      distributable_amount := distributable_amount - v_deduction_this_income;

      UPDATE projects
      SET stamp_duty_client_deducted = COALESCE(stamp_duty_client_deducted, 0) + v_deduction_this_income
      WHERE id = NEW.project_id;
    END IF;
  END IF;

  -- =====================================================
  -- HAKEM HEYETİ ÖDEMESİ DÜŞÜMÜ
  -- =====================================================

  -- ŞİRKET ödüyorsa: TTO payından ORANSAL düş
  IF v_referee_payer = 'company' AND v_referee_payment > 0 THEN
    v_deduction_this_income := ROUND(v_referee_payment * v_deduction_ratio, 2);

    -- Toplam düşülen aşmaması için kontrol
    IF (v_referee_company_deducted + v_deduction_this_income) > v_referee_payment THEN
      v_deduction_this_income := v_referee_payment - v_referee_company_deducted;
    END IF;

    -- TTO payından düş
    IF v_deduction_this_income > 0 THEN
      commission_amount := commission_amount - v_deduction_this_income;

      UPDATE projects
      SET referee_company_deducted = COALESCE(referee_company_deducted, 0) + v_deduction_this_income
      WHERE id = NEW.project_id;
    END IF;
  END IF;

  -- KARŞI TARAF ödüyorsa: Dağıtılabilir miktardan ORANSAL düş
  IF v_referee_payer = 'client' AND v_referee_payment > 0 THEN
    v_deduction_this_income := ROUND(v_referee_payment * v_deduction_ratio, 2);

    -- Toplam düşülen aşmaması için kontrol
    IF (v_referee_client_deducted + v_deduction_this_income) > v_referee_payment THEN
      v_deduction_this_income := v_referee_payment - v_referee_client_deducted;
    END IF;

    -- Dağıtılabilir miktardan düş
    IF v_deduction_this_income > 0 THEN
      distributable_amount := distributable_amount - v_deduction_this_income;

      UPDATE projects
      SET referee_client_deducted = COALESCE(referee_client_deducted, 0) + v_deduction_this_income
      WHERE id = NEW.project_id;
    END IF;
  END IF;

  -- =====================================================
  -- KOMİSYON VE DAĞITIM KAYITLARI
  -- =====================================================

  -- Komisyon kaydı
  INSERT INTO commissions (income_id, rate, amount)
  VALUES (NEW.id, project_commission_rate, commission_amount);

  -- Temsilcilere dağıt
  FOR rep IN
    SELECT pr.user_id, pr.share_percentage
    FROM project_representatives pr
    WHERE pr.project_id = NEW.project_id
  LOOP
    distribution_amount := ROUND(distributable_amount * rep.share_percentage / 100, 2);

    INSERT INTO income_distributions (
      income_id, user_id, share_percentage, amount
    ) VALUES (
      NEW.id, rep.user_id, rep.share_percentage, distribution_amount
    );

    PERFORM update_balance(
      rep.user_id,
      'income',
      distribution_amount,
      'income_distribution',
      NEW.id,
      'Income distribution from project ' || (SELECT name FROM projects WHERE id = NEW.project_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Doğrulama
DO $$
BEGIN
  RAISE NOTICE '✓ Yeni tracking alanları eklendi:';
  RAISE NOTICE '  - stamp_duty_company_deducted';
  RAISE NOTICE '  - stamp_duty_client_deducted';
  RAISE NOTICE '  - referee_company_deducted';
  RAISE NOTICE '  - referee_client_deducted';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Trigger fonksiyonu güncellendi: Oransal düşüm aktif';
  RAISE NOTICE '';
  RAISE NOTICE 'MANTIK:';
  RAISE NOTICE '- Şirket ödüyorsa: TTO payından her tahsilatta oransal düşüm';
  RAISE NOTICE '- Karşı taraf ödüyorsa: Dağıtılabilir miktardan her tahsilatta oransal düşüm';
  RAISE NOTICE '- Formül: (Bu tahsilat / Bütçe) × Toplam tutar';
END $$;
