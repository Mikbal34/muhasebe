-- Migration: 076_create_planned_payments_table.sql
-- Description: Ödeme planı için ayrı tablo - artık incomes tablosunu kullanmayacağız

-- 1. Yeni planned_payments tablosu oluştur
CREATE TABLE IF NOT EXISTS public.planned_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  planned_amount DECIMAL(15,2) NOT NULL CHECK (planned_amount > 0),
  planned_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  UNIQUE(project_id, installment_number)
);

-- 2. Indexler
CREATE INDEX IF NOT EXISTS idx_planned_payments_project_id ON public.planned_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_planned_payments_planned_date ON public.planned_payments(planned_date);

-- 3. RLS (Row Level Security)
ALTER TABLE public.planned_payments ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "planned_payments_select_policy" ON public.planned_payments
  FOR SELECT TO authenticated USING (true);

-- Admin ve manager ekleyebilir
CREATE POLICY "planned_payments_insert_policy" ON public.planned_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Admin ve manager güncelleyebilir
CREATE POLICY "planned_payments_update_policy" ON public.planned_payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Admin ve manager silebilir
CREATE POLICY "planned_payments_delete_policy" ON public.planned_payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- 4. Yorumlar
COMMENT ON TABLE public.planned_payments IS 'Proje ödeme planı taksitleri - sadece planlama amaçlı, gerçek gelirlerden bağımsız';
COMMENT ON COLUMN public.planned_payments.planned_amount IS 'Planlanan brüt tutar';
COMMENT ON COLUMN public.planned_payments.planned_date IS 'Planlanan ödeme tarihi';
COMMENT ON COLUMN public.planned_payments.installment_number IS 'Taksit sıra numarası (1, 2, 3...)';
