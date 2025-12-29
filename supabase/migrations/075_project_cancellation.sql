-- Migration: 075_project_cancellation.sql
-- Description: Proje iptal özelliği için ek alanlar

-- 1. Projects tablosuna iptal bilgileri ekle
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Index ekle
CREATE INDEX IF NOT EXISTS idx_projects_cancelled_at ON projects(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- 3. Yorum ekle
COMMENT ON COLUMN projects.cancelled_at IS 'Projenin iptal edildiği tarih/saat';
COMMENT ON COLUMN projects.cancelled_by IS 'Projeyi iptal eden kullanıcı';
COMMENT ON COLUMN projects.cancellation_reason IS 'İptal sebebi (opsiyonel)';
