-- Migration 082: 2024 Sonu Öncesi Projelere Kapanış Gelir Kaydı Ekleme
--
-- 081 ile projelerin total_received = budget yapıldı ama incomes tablosuna kayıt eklenmedi.
-- Dashboard gelir metrikleri incomes tablosundan okunduğu için boş görünüyordu.
-- Bu migration triggerları devre dışı bırakarak kapanış gelir kayıtları ekler.
--
-- GERİ ALMA:
-- DELETE FROM incomes WHERE description = '[Sistem] Kapanış kaydı - Migration 082';

-- 1. Triggerları devre dışı bırak (komisyon, dağıtım, bildirim vb. tetiklenmesin)
ALTER TABLE incomes DISABLE TRIGGER USER;

-- 2. Kapanış gelir kayıtlarını ekle
-- Her proje için: budget - mevcut gelir toplamı kadar tek bir kapanış kaydı
INSERT INTO incomes (
  project_id,
  gross_amount,
  vat_rate,
  vat_amount,
  net_amount,
  description,
  income_date,
  created_by,
  collected_amount,
  collection_date,
  is_fsmh_income,
  income_type,
  is_tto_income
)
SELECT
  p.id AS project_id,
  -- Bütçe ile mevcut gelir farkı
  p.budget - COALESCE(existing.total_income, 0) AS gross_amount,
  -- KDV oranı projeden al
  p.vat_rate,
  -- KDV tutarı: gross * vat_rate / (100 + vat_rate)
  ROUND((p.budget - COALESCE(existing.total_income, 0)) * p.vat_rate / (100 + p.vat_rate), 2) AS vat_amount,
  -- Net tutar: gross - vat
  ROUND((p.budget - COALESCE(existing.total_income, 0)) - ((p.budget - COALESCE(existing.total_income, 0)) * p.vat_rate / (100 + p.vat_rate)), 2) AS net_amount,
  '[Sistem] Kapanış kaydı - Migration 082' AS description,
  -- Gelir tarihi olarak projenin bitiş tarihini kullan
  p.end_date AS income_date,
  -- Admin kullanıcı (TTO)
  'cec57aa0-8e06-4991-b8bf-d839e63bc1ac'::UUID AS created_by,
  -- Tahsil edilmiş olarak işaretle
  p.budget - COALESCE(existing.total_income, 0) AS collected_amount,
  p.end_date AS collection_date,
  false AS is_fsmh_income,
  'ozel' AS income_type,
  true AS is_tto_income
FROM projects p
LEFT JOIN (
  SELECT project_id, SUM(gross_amount) AS total_income
  FROM incomes
  GROUP BY project_id
) existing ON existing.project_id = p.id
WHERE p.end_date <= '2024-12-31'
  AND (p.budget - COALESCE(existing.total_income, 0)) > 0;

-- 3. Triggerları geri aç
ALTER TABLE incomes ENABLE TRIGGER USER;

-- 4. Doğrulama
DO $$
DECLARE
  inserted_count INTEGER;
  total_amount DECIMAL(15,2);
BEGIN
  SELECT COUNT(*), COALESCE(SUM(gross_amount), 0)
  INTO inserted_count, total_amount
  FROM incomes
  WHERE description = '[Sistem] Kapanış kaydı - Migration 082';

  RAISE NOTICE '========================================';
  RAISE NOTICE '  082: Kapanış Gelir Kayıtları';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Eklenen gelir kaydı: %', inserted_count;
  RAISE NOTICE '✓ Toplam tutar: % TL', total_amount;
  RAISE NOTICE '';
  RAISE NOTICE 'Geri almak için:';
  RAISE NOTICE '  DELETE FROM incomes';
  RAISE NOTICE '  WHERE description = ''[Sistem] Kapanış kaydı - Migration 082'';';
  RAISE NOTICE '========================================';
END $$;
