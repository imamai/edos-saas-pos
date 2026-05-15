-- Business Settings Table
-- Stores company branding and configuration per branch
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_logo_url TEXT,
  address VARCHAR(500),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  tax_pin VARCHAR(50),
  vat_rate NUMERIC(5, 2) DEFAULT 16.0,
  currency_code VARCHAR(3) DEFAULT 'KES',
  receipt_header_text TEXT,
  receipt_footer_text TEXT,
  invoice_header_text TEXT,
  quotation_header_text TEXT,
  custom_fields JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id)
);

-- Indexes
CREATE INDEX idx_business_settings_branch ON business_settings(branch_id);

-- Triggers for updated_at
CREATE TRIGGER update_business_settings_timestamp
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Insert default settings for existing branches
INSERT INTO business_settings (branch_id, company_name, address, phone, email, tax_pin, vat_rate)
SELECT id, 'Main Branch', 'Nairobi, Kenya', '+254 712 000 000', 'info@edospos.com', 'P051234567X', 16.0
FROM branches
WHERE NOT EXISTS (
  SELECT 1 FROM business_settings WHERE branch_id = branches.id
);

-- RLS Policies
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settings for their branch" ON business_settings
  FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM profiles WHERE id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update settings" ON business_settings
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can insert settings" ON business_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
