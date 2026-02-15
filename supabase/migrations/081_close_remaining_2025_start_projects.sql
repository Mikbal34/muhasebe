-- Migration 081: 2024 Sonu ve Öncesi Tüm Projelerin Bütçesini Tamamlama
--
-- end_date <= 2024-12-31 olan TÜM projelerde (active veya completed fark etmez)
-- total_received = budget yapılacak. Böylece eski projeler "bütçesi tahsil edilmiş" görünecek.
--
-- GERİ ALMA:
-- UPDATE projects p
-- SET status = b.old_status, total_received = b.old_total_received
-- FROM _backup_project_closure_081 b
-- WHERE p.id = b.project_id;

-- 1. Yedek tablo oluştur
CREATE TABLE IF NOT EXISTS _backup_project_closure_081 (
  project_id UUID PRIMARY KEY,
  old_status VARCHAR(20),
  old_total_received DECIMAL(15,2),
  closed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hedef projeleri yedekle
-- end_date <= 2024-12-31 ve total_received != budget olan tüm projeler
-- (080'de zaten güncellenenler hariç)
INSERT INTO _backup_project_closure_081 (project_id, old_status, old_total_received)
SELECT id, status, total_received
FROM projects
WHERE end_date <= '2024-12-31'
  AND total_received != budget
  AND id NOT IN (SELECT project_id FROM _backup_project_closure_080);

-- 3. Projeleri güncelle: bütçe tamamen gelmiş göster + completed yap
UPDATE projects
SET status = 'completed',
    total_received = budget,
    updated_at = NOW()
WHERE id IN (SELECT project_id FROM _backup_project_closure_081);

-- 4. Doğrulama
DO $$
DECLARE
  fixed_count INTEGER;
  still_mismatched INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM _backup_project_closure_081;

  SELECT COUNT(*) INTO still_mismatched
  FROM projects
  WHERE end_date <= '2024-12-31'
    AND total_received != budget;

  RAISE NOTICE '========================================';
  RAISE NOTICE '  081: 2024 Sonu Öncesi Bütçe Tamamlama';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Düzeltilen proje sayısı: %', fixed_count;
  RAISE NOTICE '✓ Hala uyumsuz kalan: % (0 olmalı)', still_mismatched;
  RAISE NOTICE '========================================';
END $$;
