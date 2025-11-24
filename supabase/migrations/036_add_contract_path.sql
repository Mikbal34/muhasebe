-- Add contract_path column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_path TEXT;

-- Create a storage bucket for contracts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the contracts bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'contracts' );

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read contracts"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'contracts' );

-- Allow authenticated users to update their own files (optional but good for re-uploads)
CREATE POLICY "Authenticated users can update contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'contracts' );

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete contracts"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'contracts' );
