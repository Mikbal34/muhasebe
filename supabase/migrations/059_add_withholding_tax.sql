-- Add withholding tax (tevkifat) support to projects and incomes
-- Tevkifat: KDV tevkifatı - alıcının KDV'nin bir kısmını satıcıya ödemeyip vergi dairesine yatırması

-- Add withholding tax fields to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS has_withholding_tax BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS withholding_tax_rate DECIMAL(5,2) DEFAULT 0
  CHECK (withholding_tax_rate >= 0 AND withholding_tax_rate <= 100);

-- Add withholding tax amount to incomes
ALTER TABLE public.incomes
ADD COLUMN IF NOT EXISTS withholding_tax_amount DECIMAL(15,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN projects.has_withholding_tax IS 'Tevkifat uygulanıyor mu?';
COMMENT ON COLUMN projects.withholding_tax_rate IS 'Tevkifat oranı (%)';
COMMENT ON COLUMN incomes.withholding_tax_amount IS 'Hesaplanan tevkifat tutarı (KDV × Tevkifat Oranı)';
