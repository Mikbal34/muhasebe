-- Migration 062: Fix total_received calculation for planned incomes (payment plan)
--
-- PROBLEM: Ödeme planı oluşturulduğunda 10 taksit incomes tablosuna ekleniyor.
-- Trigger gross_amount toplamını alıyor ve total_received = bütçe oluyor.
-- Bu yüzden remaining_budget = 0 oluyor ve proje "tamamlanmış" gibi görünüyor.
--
-- ÇÖZÜM: total_received SADECE collected_amount toplamını göstermeli.
-- Planlı taksitler (is_planned = true) henüz tahsil edilmediği için
-- collected_amount = 0 olarak başlıyor.

-- =====================================================
-- 1. Trigger'ı güncelle: SADECE collected_amount kullan
-- =====================================================

CREATE OR REPLACE FUNCTION update_project_total_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE projects
    SET total_received = (
      SELECT COALESCE(SUM(collected_amount), 0)
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
      SELECT COALESCE(SUM(collected_amount), 0)
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
-- 2. Trigger'ı yeniden oluştur (emin olmak için)
-- =====================================================

DROP TRIGGER IF EXISTS update_project_total_received_trigger ON incomes;

CREATE TRIGGER update_project_total_received_trigger
  AFTER INSERT OR UPDATE OR DELETE ON incomes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_total_received();

-- =====================================================
-- 3. Mevcut TÜM projelerin total_received değerini düzelt
-- =====================================================

UPDATE projects p
SET total_received = (
  SELECT COALESCE(SUM(collected_amount), 0)
  FROM incomes
  WHERE project_id = p.id
);

-- =====================================================
-- 4. Doğrulama
-- =====================================================

DO $$
DECLARE
  project_count INTEGER;
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO project_count FROM projects;

  SELECT COUNT(*) INTO fixed_count
  FROM projects
  WHERE total_received = (
    SELECT COALESCE(SUM(collected_amount), 0)
    FROM incomes
    WHERE project_id = projects.id
  );

  RAISE NOTICE '✓ Trigger güncellendi: total_received artık SADECE collected_amount toplamını gösteriyor';
  RAISE NOTICE '✓ % proje güncellendi', project_count;
  RAISE NOTICE '✓ % proje doğru hesaplandı', fixed_count;
  RAISE NOTICE '';
  RAISE NOTICE 'AÇIKLAMA:';
  RAISE NOTICE '- Ödeme planı oluşturulduğunda taksitler is_planned=true ve collected_amount=0 olarak eklenir';
  RAISE NOTICE '- total_received = SUM(collected_amount) olduğu için başlangıçta 0 olur';
  RAISE NOTICE '- Tahsilat yapıldığında collected_amount güncellenir ve total_received artar';
  RAISE NOTICE '- remaining_budget = budget - total_received formülü doğru çalışır';
END $$;
