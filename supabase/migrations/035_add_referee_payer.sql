-- Add referee_payer column to projects table
ALTER TABLE public.projects
ADD COLUMN referee_payer varchar CHECK (referee_payer IN ('company', 'client')) DEFAULT 'company';

COMMENT ON COLUMN public.projects.referee_payer IS 'Who pays for the referee/arbitration fees (company or client)';
