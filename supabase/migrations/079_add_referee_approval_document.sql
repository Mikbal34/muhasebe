-- Migration: 079_add_referee_approval_document.sql
-- Description: Hakem onay belgesi için referee_approval_document_path alanı ekleme

-- Projects tablosuna yeni alan ekle
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS referee_approval_document_path VARCHAR(500);

-- Yorum ekle
COMMENT ON COLUMN projects.referee_approval_document_path IS 'Hakem onay belgesi dosya yolu';

-- Index ekle (isteğe bağlı - belge aramaları için)
CREATE INDEX IF NOT EXISTS idx_projects_referee_approval_doc ON projects(referee_approval_document_path) WHERE referee_approval_document_path IS NOT NULL;
