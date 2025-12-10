-- Migration 063: Fix Project Completion Trigger
--
-- PROBLEM: check_project_budget_completion() fonksiyonu SUM(gross_amount) kullanıyordu.
-- Ödeme planı oluşturulduğunda taksitler incomes tablosuna ekleniyor ve
-- toplam gross_amount = budget olduğu için proje hemen "completed" oluyordu.
--
-- ÇÖZÜM: Trigger SUM(collected_amount) kullanmalı. Böylece proje sadece
-- gerçek tahsilat tamamlandığında "completed" olacak.

-- 1. Trigger fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION check_project_budget_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_collected DECIMAL(10, 2);
  project_budget DECIMAL(10, 2);
  project_status VARCHAR(20);
BEGIN
  -- Get project budget and status
  SELECT budget, status INTO project_budget, project_status
  FROM projects
  WHERE id = NEW.project_id;

  -- Only check active projects
  IF project_status != 'active' THEN
    RETURN NEW;
  END IF;

  -- DÜZELTME: gross_amount yerine collected_amount kullan!
  -- Böylece proje sadece gerçek tahsilat tamamlandığında "completed" olacak
  SELECT COALESCE(SUM(collected_amount), 0) INTO total_collected
  FROM incomes
  WHERE project_id = NEW.project_id;

  -- If total COLLECTED reaches or exceeds budget, mark project as completed
  IF total_collected >= project_budget THEN
    UPDATE projects
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = NEW.project_id;

    -- Create notification for project completion
    PERFORM create_notification(
      p.created_by,
      'success',
      'Proje Tamamlandı',
      p.name || ' projesi bütçe hedefine ulaştığı için tamamlandı olarak işaretlendi.',
      false,
      0,
      'Projeyi Görüntüle',
      '/dashboard/projects',
      'project',
      NEW.project_id
    )
    FROM projects p
    WHERE p.id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Yanlışlıkla 'completed' olmuş projeleri düzelt
-- Henüz tahsilatı tamamlanmamış ama 'completed' olmuş projeleri 'active' yap
UPDATE projects p
SET status = 'active'
WHERE status = 'completed'
AND (
  SELECT COALESCE(SUM(collected_amount), 0)
  FROM incomes
  WHERE project_id = p.id
) < budget;

-- 3. Doğrulama
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM projects
  WHERE status = 'active';

  RAISE NOTICE '✓ Trigger fonksiyonu düzeltildi: Artık collected_amount kullanıyor';
  RAISE NOTICE '✓ Yanlışlıkla completed olmuş projeler active yapıldı';
  RAISE NOTICE '✓ Aktif proje sayısı: %', fixed_count;
  RAISE NOTICE '';
  RAISE NOTICE 'AÇIKLAMA:';
  RAISE NOTICE '- Ödeme planı oluşturulduğunda taksitler collected_amount=0 ile eklenir';
  RAISE NOTICE '- Proje sadece gerçek tahsilat tamamlandığında (SUM(collected_amount) >= budget) completed olur';
  RAISE NOTICE '- Planlı taksitler projenin tamamlanmasını etkilemez';
END $$;
