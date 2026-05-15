-- ============================================================
-- EDOS Solar & Electrical POS — Complete Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Branches ────────────────────────────────────────────────────────────────

CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  is_main     BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (name, address, is_main) VALUES ('Main Branch', 'Nairobi, Kenya', true);

-- ─── Profiles (extends auth.users) ───────────────────────────────────────────

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'cashier'
                CHECK (role IN ('admin','manager','cashier','storekeeper')),
  branch_id   UUID REFERENCES branches(id),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Categories ──────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES categories(id),
  color       TEXT DEFAULT '#3B82F6',
  icon        TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, description, color, icon) VALUES
  ('Solar Products',      'Solar panels, batteries, inverters, charge controllers', '#F59E0B', 'sun'),
  ('Batteries',           'Lead acid, lithium, gel batteries',                       '#EF4444', 'battery'),
  ('Inverters',           'Pure sine wave, modified sine wave inverters',             '#8B5CF6', 'zap'),
  ('Charge Controllers',  'PWM and MPPT charge controllers',                         '#10B981', 'settings'),
  ('Cables & Wiring',     'Solar cables, electrical cables, conduits',                '#6B7280', 'cable'),
  ('Lighting',            'LED bulbs, fluorescent, solar lights',                    '#FBBF24', 'lightbulb'),
  ('Switches & Sockets',  'MCBs, switches, sockets, distribution boards',           '#3B82F6', 'toggle-left'),
  ('Circuit Breakers',    'MCBs, RCCBs, isolators',                                  '#EF4444', 'shield'),
  ('Tools',               'Electrical tools, testers, installation tools',           '#78716C', 'wrench'),
  ('Accessories',         'Connectors, fuses, terminals, trunking',                  '#6366F1', 'package');

-- ─── Products ────────────────────────────────────────────────────────────────

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             TEXT NOT NULL UNIQUE,
  barcode         TEXT UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES categories(id),
  unit            TEXT NOT NULL DEFAULT 'piece'
                    CHECK (unit IN ('piece','meter','roll','box','kg','liter','set')),
  buying_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
  vat_rate        DECIMAL(5,2) DEFAULT 16,
  reorder_level   INTEGER DEFAULT 5,
  is_active       BOOLEAN DEFAULT true,
  has_serial      BOOLEAN DEFAULT false,
  has_warranty    BOOLEAN DEFAULT false,
  warranty_months INTEGER,
  image_url       TEXT,
  supplier_id     UUID,  -- FK added after suppliers table
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- ─── Inventory ───────────────────────────────────────────────────────────────

CREATE TABLE inventory (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id           UUID NOT NULL REFERENCES branches(id),
  quantity            DECIMAL(12,3) DEFAULT 0,
  reserved_quantity   DECIMAL(12,3) DEFAULT 0,
  last_updated        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);

CREATE TABLE stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  type            TEXT NOT NULL CHECK (type IN ('purchase','sale','return','adjustment','transfer','damage')),
  quantity        DECIMAL(12,3) NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_branch ON stock_movements(branch_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

-- ─── Customers ───────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  id_number           TEXT,
  credit_limit        DECIMAL(12,2) DEFAULT 0,
  outstanding_balance DECIMAL(12,2) DEFAULT 0,
  loyalty_points      INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ─── Suppliers ───────────────────────────────────────────────────────────────

CREATE TABLE suppliers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  contact_person      TEXT,
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  tax_pin             TEXT,
  payment_terms       TEXT,
  outstanding_balance DECIMAL(12,2) DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ADD CONSTRAINT fk_products_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- ─── Purchase Orders ─────────────────────────────────────────────────────────

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number       TEXT NOT NULL UNIQUE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id),
  branch_id       UUID NOT NULL REFERENCES branches(id),
  status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft','ordered','received','partial','cancelled')),
  subtotal        DECIMAL(12,2) DEFAULT 0,
  tax_amount      DECIMAL(12,2) DEFAULT 0,
  total_amount    DECIMAL(12,2) DEFAULT 0,
  paid_amount     DECIMAL(12,2) DEFAULT 0,
  notes           TEXT,
  expected_date   DATE,
  received_date   DATE,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id         UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  ordered_qty   DECIMAL(12,3) NOT NULL,
  received_qty  DECIMAL(12,3) DEFAULT 0,
  unit_price    DECIMAL(12,2) NOT NULL,
  total_price   DECIMAL(12,2) NOT NULL
);

-- ─── Sales ───────────────────────────────────────────────────────────────────

CREATE TABLE sales (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number    TEXT NOT NULL UNIQUE,
  customer_id       UUID REFERENCES customers(id),
  branch_id         UUID NOT NULL REFERENCES branches(id),
  cashier_id        UUID REFERENCES profiles(id),
  status            TEXT DEFAULT 'completed'
                      CHECK (status IN ('completed','held','refunded','partial_refund')),
  subtotal          DECIMAL(12,2) DEFAULT 0,
  discount_amount   DECIMAL(12,2) DEFAULT 0,
  tax_amount        DECIMAL(12,2) DEFAULT 0,
  total_amount      DECIMAL(12,2) DEFAULT 0,
  paid_amount       DECIMAL(12,2) DEFAULT 0,
  change_amount     DECIMAL(12,2) DEFAULT 0,
  payment_method    TEXT DEFAULT 'cash'
                      CHECK (payment_method IN ('cash','card','mpesa','credit','split')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_receipt ON sales(receipt_number);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);

CREATE TABLE sale_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id           UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity          DECIMAL(12,3) NOT NULL,
  unit_price        DECIMAL(12,2) NOT NULL,
  discount_amount   DECIMAL(12,2) DEFAULT 0,
  tax_amount        DECIMAL(12,2) DEFAULT 0,
  total_price       DECIMAL(12,2) NOT NULL,
  serial_number     TEXT,
  warranty_expires  DATE
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- ─── Payments ────────────────────────────────────────────────────────────────

CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id                 UUID NOT NULL REFERENCES sales(id),
  method                  TEXT NOT NULL CHECK (method IN ('cash','card','mpesa','credit')),
  amount                  DECIMAL(12,2) NOT NULL,
  reference               TEXT,
  mpesa_transaction_id    UUID,
  status                  TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_sale ON payments(sale_id);

-- ─── M-Pesa Transactions ─────────────────────────────────────────────────────

CREATE TABLE mpesa_transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkout_request_id   TEXT NOT NULL UNIQUE,
  merchant_request_id   TEXT NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  phone_number          TEXT NOT NULL,
  sale_id               UUID REFERENCES sales(id),
  status                TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending','completed','failed','cancelled')),
  result_code           TEXT,
  result_desc           TEXT,
  mpesa_receipt         TEXT,
  transaction_date      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ADD CONSTRAINT fk_payments_mpesa
  FOREIGN KEY (mpesa_transaction_id) REFERENCES mpesa_transactions(id);

-- ─── Held Sales (suspended checkouts) ───────────────────────────────────────

CREATE TABLE held_sales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT,
  cashier_id  UUID REFERENCES profiles(id),
  branch_id   UUID REFERENCES branches(id),
  cart_data   JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Expenses ────────────────────────────────────────────────────────────────

CREATE TABLE expense_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO expense_categories (name) VALUES
  ('Rent'),('Salaries'),('Utilities'),('Transport'),
  ('Marketing'),('Maintenance'),('Other');

CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID REFERENCES expense_categories(id),
  branch_id       UUID REFERENCES branches(id),
  amount          DECIMAL(12,2) NOT NULL,
  description     TEXT NOT NULL,
  payment_method  TEXT DEFAULT 'cash',
  reference       TEXT,
  recorded_by     UUID REFERENCES profiles(id),
  expense_date    DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_branch ON expenses(branch_id);

-- ─── Warranty Records ────────────────────────────────────────────────────────

CREATE TABLE warranty_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  sale_id         UUID NOT NULL REFERENCES sales(id),
  serial_number   TEXT,
  warranty_start  DATE NOT NULL,
  warranty_end    DATE NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);

-- ─── End-of-Day Closures ─────────────────────────────────────────────────────

CREATE TABLE eod_closures (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  cashier_id          UUID REFERENCES profiles(id),
  closure_date        DATE NOT NULL,
  total_sales         DECIMAL(12,2) DEFAULT 0,
  total_transactions  INTEGER DEFAULT 0,
  cash_sales          DECIMAL(12,2) DEFAULT 0,
  card_sales          DECIMAL(12,2) DEFAULT 0,
  mpesa_sales         DECIMAL(12,2) DEFAULT 0,
  credit_sales        DECIMAL(12,2) DEFAULT 0,
  total_refunds       DECIMAL(12,2) DEFAULT 0,
  cash_in_drawer      DECIMAL(12,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Helper Views ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW product_stock AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.barcode,
  p.category_id,
  c.name AS category_name,
  p.unit,
  p.buying_price,
  p.selling_price,
  p.vat_rate,
  p.reorder_level,
  p.is_active,
  p.has_serial,
  p.has_warranty,
  p.warranty_months,
  p.image_url,
  COALESCE(i.quantity, 0) AS stock_quantity,
  COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
  COALESCE(i.quantity, 0) - COALESCE(i.reserved_quantity, 0) AS available_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory i ON p.id = i.product_id;

CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  DATE(s.created_at) AS sale_date,
  s.branch_id,
  COUNT(*) AS total_transactions,
  SUM(s.total_amount) AS total_revenue,
  SUM(CASE WHEN s.payment_method = 'cash' THEN s.total_amount ELSE 0 END) AS cash_revenue,
  SUM(CASE WHEN s.payment_method = 'card' THEN s.total_amount ELSE 0 END) AS card_revenue,
  SUM(CASE WHEN s.payment_method = 'mpesa' THEN s.total_amount ELSE 0 END) AS mpesa_revenue,
  SUM(CASE WHEN s.payment_method = 'credit' THEN s.total_amount ELSE 0 END) AS credit_revenue,
  SUM(s.discount_amount) AS total_discounts,
  SUM(s.tax_amount) AS total_tax
FROM sales s
WHERE s.status = 'completed'
GROUP BY DATE(s.created_at), s.branch_id;

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins & managers full access; cashiers/storekeepers read-only on products
CREATE POLICY "Staff can view products" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Managers and admins can modify products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager') AND is_active = true)
  );

CREATE POLICY "Staff can view inventory" ON inventory
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can manage inventory" ON inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','storekeeper') AND is_active = true)
  );

CREATE POLICY "Staff can view sales" ON sales
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can create sales" ON sales
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Managers can modify sales" ON sales
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager') AND is_active = true)
  );

CREATE POLICY "Staff can view customers" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can manage customers" ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Staff can view suppliers" ON suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Managers can manage suppliers" ON suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager') AND is_active = true)
  );

CREATE POLICY "Managers can view expenses" ON expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager') AND is_active = true)
  );

CREATE POLICY "Staff can create expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = true)
  );

-- ─── Sample Data ─────────────────────────────────────────────────────────────

INSERT INTO suppliers (name, contact_person, phone, email, payment_terms) VALUES
  ('Solar Kenya Ltd', 'John Kamau', '+254712345678', 'info@solarkenya.co.ke', 'Net 30'),
  ('Electrical Supplies Co', 'Mary Wanjiku', '+254723456789', 'supplies@esupply.co.ke', 'Net 14'),
  ('PowerTech Distributors', 'Peter Odhiambo', '+254734567890', 'orders@powertech.co.ke', 'Net 30');

INSERT INTO customers (name, phone, email, credit_limit) VALUES
  ('Walk-in Customer', NULL, NULL, 0),
  ('James Mwangi', '+254700111222', 'james@email.com', 50000),
  ('Sarah Otieno', '+254700222333', 'sarah@email.com', 30000),
  ('Robert Njoroge', '+254700333444', NULL, 100000),
  ('Tech Installations Ltd', '+254720555666', 'accounts@techinstall.co.ke', 500000);

INSERT INTO products (sku, barcode, name, description, category_id, unit, buying_price, selling_price, vat_rate, reorder_level, has_warranty, warranty_months, supplier_id)
SELECT
  'SOL-PNL-100W', '6001234560001', '100W Solar Panel', 'Monocrystalline 100W 12V Solar Panel',
  (SELECT id FROM categories WHERE name='Solar Products'),
  'piece', 8500, 12000, 16, 5, true, 60,
  (SELECT id FROM suppliers WHERE name='Solar Kenya Ltd')
UNION ALL
SELECT
  'SOL-PNL-200W', '6001234560002', '200W Solar Panel', 'Monocrystalline 200W 24V Solar Panel',
  (SELECT id FROM categories WHERE name='Solar Products'),
  'piece', 15000, 22000, 16, 3, true, 60,
  (SELECT id FROM suppliers WHERE name='Solar Kenya Ltd')
UNION ALL
SELECT
  'BAT-AGM-100AH', '6001234560003', '100Ah AGM Battery', 'Deep Cycle AGM Battery 12V 100Ah',
  (SELECT id FROM categories WHERE name='Batteries'),
  'piece', 12000, 18000, 16, 5, true, 24,
  (SELECT id FROM suppliers WHERE name='Solar Kenya Ltd')
UNION ALL
SELECT
  'INV-1000W-PSW', '6001234560004', '1000W Pure Sine Inverter', '12V to 240V 1000W Pure Sine Wave Inverter',
  (SELECT id FROM categories WHERE name='Inverters'),
  'piece', 8000, 12500, 16, 3, true, 12,
  (SELECT id FROM suppliers WHERE name='PowerTech Distributors')
UNION ALL
SELECT
  'INV-2000W-PSW', '6001234560005', '2000W Pure Sine Inverter', '24V to 240V 2000W Pure Sine Wave Inverter',
  (SELECT id FROM categories WHERE name='Inverters'),
  'piece', 15000, 22000, 16, 2, true, 12,
  (SELECT id FROM suppliers WHERE name='PowerTech Distributors')
UNION ALL
SELECT
  'CC-MPPT-40A', '6001234560006', '40A MPPT Charge Controller', '40A 12/24V MPPT Solar Charge Controller',
  (SELECT id FROM categories WHERE name='Charge Controllers'),
  'piece', 3500, 5500, 16, 5, true, 12,
  (SELECT id FROM suppliers WHERE name='Solar Kenya Ltd')
UNION ALL
SELECT
  'CAB-SOL-4MM', '6001234560007', '4mm Solar Cable (Red)', 'TUV Certified 4mm DC Solar Cable - Red',
  (SELECT id FROM categories WHERE name='Cables & Wiring'),
  'meter', 85, 150, 16, 50, false, NULL,
  (SELECT id FROM suppliers WHERE name='Electrical Supplies Co')
UNION ALL
SELECT
  'CAB-SOL-4MM-B', '6001234560008', '4mm Solar Cable (Black)', 'TUV Certified 4mm DC Solar Cable - Black',
  (SELECT id FROM categories WHERE name='Cables & Wiring'),
  'meter', 85, 150, 16, 50, false, NULL,
  (SELECT id FROM suppliers WHERE name='Electrical Supplies Co')
UNION ALL
SELECT
  'LED-BULB-9W', '6001234560009', '9W LED Bulb E27', 'Energy Saving 9W E27 LED Bulb 6500K',
  (SELECT id FROM categories WHERE name='Lighting'),
  'piece', 120, 250, 16, 20, false, NULL,
  (SELECT id FROM suppliers WHERE name='Electrical Supplies Co')
UNION ALL
SELECT
  'MCB-1P-32A', '6001234560010', '1 Pole 32A MCB', 'Single Pole 32A Miniature Circuit Breaker',
  (SELECT id FROM categories WHERE name='Circuit Breakers'),
  'piece', 350, 650, 16, 10, false, NULL,
  (SELECT id FROM suppliers WHERE name='Electrical Supplies Co')
UNION ALL
SELECT
  'DB-12WAY', '6001234560011', '12-Way Distribution Board', '12 Way Single Phase Distribution Board',
  (SELECT id FROM categories WHERE name='Switches & Sockets'),
  'piece', 1800, 3200, 16, 5, false, NULL,
  (SELECT id FROM suppliers WHERE name='Electrical Supplies Co')
UNION ALL
SELECT
  'SOL-STR-KIT', '6001234560012', 'Solar Street Light 40W', '40W All-in-One Solar Street Light',
  (SELECT id FROM categories WHERE name='Lighting'),
  'piece', 12000, 18000, 16, 3, true, 24,
  (SELECT id FROM suppliers WHERE name='Solar Kenya Ltd');

-- Initialize inventory for all products in main branch
INSERT INTO inventory (product_id, branch_id, quantity)
SELECT p.id, b.id, 20
FROM products p
CROSS JOIN branches b
WHERE b.is_main = true;
