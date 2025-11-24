-- Add new columns to projects table
ALTER TABLE public.projects
ADD COLUMN referee_payment numeric NOT NULL DEFAULT 0 CHECK (referee_payment >= 0),
ADD COLUMN stamp_duty_payer varchar CHECK (stamp_duty_payer IN ('company', 'client')),
ADD COLUMN stamp_duty_amount numeric NOT NULL DEFAULT 0 CHECK (stamp_duty_amount >= 0),
ADD COLUMN stamp_duty_deducted boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.projects.referee_payment IS 'Hakem heyeti ödemesi';
COMMENT ON COLUMN public.projects.stamp_duty_payer IS 'Damga vergisini kimin ödeyeceği (company: biz, client: karşı taraf)';
COMMENT ON COLUMN public.projects.stamp_duty_amount IS 'Damga vergisi miktarı (eğer biz ödüyorsak)';
COMMENT ON COLUMN public.projects.stamp_duty_deducted IS 'Damga vergisi şirket gelirinden düşüldü mü?';
