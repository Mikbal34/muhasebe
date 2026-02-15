-- Migration 080: 2025 ve Öncesi Projeleri Kapatma
--
-- AMAÇ: 2025 ve öncesine ait test/geçiş amaçlı projeleri kapatmak.
-- Bütçeleri "tahsil edilmiş" gösterilip status='completed' yapılacak.
--
-- NOT: incomes tablosundaki triggerlar karmaşık (komisyon hesaplama, gelir dağıtımı,
-- bakiye güncelleme, damga vergisi kesintisi). Sahte tahsilat kaydı oluşturmak
-- muhasebe verilerini bozar. Bu yüzden doğrudan projects tablosu güncelleniyor.
--
-- GERİ ALMA:
-- UPDATE projects p
-- SET status = b.old_status, total_received = b.old_total_received
-- FROM _backup_project_closure_080 b
-- WHERE p.id = b.project_id;

-- 1. Yedek tablo oluştur (geri alma için)
CREATE TABLE IF NOT EXISTS _backup_project_closure_080 (
  project_id UUID PRIMARY KEY,
  old_status VARCHAR(20),
  old_total_received DECIMAL(15,2),
  closed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hedef projeleri yedekle
INSERT INTO _backup_project_closure_080 (project_id, old_status, old_total_received)
SELECT id, status, total_received
FROM projects
WHERE status = 'active'
  AND EXTRACT(YEAR FROM COALESCE(end_date, start_date)) <= 2025;

-- 3. Projeleri kapat
-- status = 'completed' → proje kapalı
-- total_received = budget → remaining_budget (generated column: budget - total_received) otomatik 0 olur
UPDATE projects
SET status = 'completed',
    total_received = budget,
    updated_at = NOW()
WHERE id IN (SELECT project_id FROM _backup_project_closure_080);

-- 4. Doğrulama
DO $$
DECLARE
  closed_count INTEGER;
  remaining_active INTEGER;
BEGIN
  SELECT COUNT(*) INTO closed_count
  FROM _backup_project_closure_080;

  SELECT COUNT(*) INTO remaining_active
  FROM projects
  WHERE status = 'active'
    AND EXTRACT(YEAR FROM COALESCE(end_date, start_date)) <= 2025;

  RAISE NOTICE '========================================';
  RAISE NOTICE '  080: 2025 ve Öncesi Proje Kapatma';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Kapatılan proje sayısı: %', closed_count;
  RAISE NOTICE '✓ Kalan aktif 2025 öncesi proje: % (0 olmalı)', remaining_active;
  RAISE NOTICE '';
  RAISE NOTICE 'Geri almak için:';
  RAISE NOTICE '  UPDATE projects p';
  RAISE NOTICE '  SET status = b.old_status, total_received = b.old_total_received';
  RAISE NOTICE '  FROM _backup_project_closure_080 b';
  RAISE NOTICE '  WHERE p.id = b.project_id;';
  RAISE NOTICE '========================================';

  IF remaining_active > 0 THEN
    RAISE WARNING '⚠ Hala % aktif 2025 öncesi proje var!', remaining_active;
  END IF;
END $$;
