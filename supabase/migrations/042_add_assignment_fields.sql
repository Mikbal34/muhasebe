-- Add assignment permission and document fields to projects table
-- This allows tracking whether academic staff have assignment permission
-- and storing the assignment document PDF path

BEGIN;

-- Add assignment permission field (boolean)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS has_assignment_permission BOOLEAN DEFAULT false NOT NULL;

-- Add assignment document path field (stores Supabase Storage path)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS assignment_document_path TEXT;

-- Add helpful comments
COMMENT ON COLUMN public.projects.has_assignment_permission IS 'Akademisyen görevlendirme izni var mı?';
COMMENT ON COLUMN public.projects.assignment_document_path IS 'Görevlendirme yazısı PDF yolu (Supabase Storage - contracts bucket)';

COMMIT;

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Assignment fields added to projects table successfully!';
  RAISE NOTICE 'Fields: has_assignment_permission (boolean), assignment_document_path (text)';
END $$;
