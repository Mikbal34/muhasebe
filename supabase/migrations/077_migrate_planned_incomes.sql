-- Migration: 077_migrate_planned_incomes.sql
-- Description: Mevcut is_planned=true kayıtlarını yeni tabloya taşı ve eski kolonları temizle

-- 1. Mevcut is_planned=true kayıtlarını yeni tabloya taşı (sadece tahsil edilmemişler)
INSERT INTO public.planned_payments (
  project_id,
  installment_number,
  planned_amount,
  planned_date,
  description,
  created_at,
  created_by
)
SELECT
  project_id,
  COALESCE(installment_number, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY income_date)),
  gross_amount,
  income_date,
  description,
  created_at,
  created_by
FROM public.incomes
WHERE is_planned = true
  AND collected_amount = 0
ON CONFLICT (project_id, installment_number) DO NOTHING;

-- 2. Tahsil edilmemiş is_planned kayıtlarını sil
DELETE FROM public.incomes
WHERE is_planned = true
  AND collected_amount = 0;

-- 3. Tahsil edilmiş is_planned kayıtlarını normal gelir olarak işaretle
UPDATE public.incomes
SET is_planned = false
WHERE is_planned = true
  AND collected_amount > 0;

-- 4. Artık gerekli olmayan kolonları kaldır
ALTER TABLE public.incomes DROP COLUMN IF EXISTS is_planned;
ALTER TABLE public.incomes DROP COLUMN IF EXISTS installment_number;

-- 5. Eski indexleri kaldır (varsa)
DROP INDEX IF EXISTS idx_incomes_is_planned;
DROP INDEX IF EXISTS idx_incomes_installment_number;
DROP INDEX IF EXISTS idx_incomes_project_planned;
