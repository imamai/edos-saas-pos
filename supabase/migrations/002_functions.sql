-- ── Stock Decrement Function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id UUID,
  p_branch_id  UUID,
  p_quantity   DECIMAL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_current DECIMAL;
BEGIN
  SELECT quantity INTO v_current
  FROM inventory
  WHERE product_id = p_product_id AND branch_id = p_branch_id
  FOR UPDATE;

  IF v_current IS NULL THEN
    INSERT INTO inventory (product_id, branch_id, quantity)
    VALUES (p_product_id, p_branch_id, -p_quantity);
  ELSE
    UPDATE inventory
    SET quantity = GREATEST(0, v_current - p_quantity),
        last_updated = NOW()
    WHERE product_id = p_product_id AND branch_id = p_branch_id;
  END IF;

  -- Log movement
  INSERT INTO stock_movements (product_id, branch_id, type, quantity)
  VALUES (p_product_id, p_branch_id, 'sale', -p_quantity);
END;
$$;

-- ── Auto-update timestamps ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Customer Outstanding Balance update ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- When a credit sale is made
  IF NEW.payment_method = 'credit' AND NEW.status = 'completed' THEN
    UPDATE customers
    SET outstanding_balance = outstanding_balance + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_sale_created
  AFTER INSERT ON sales
  FOR EACH ROW
  WHEN (NEW.payment_method = 'credit' AND NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION update_customer_balance();

-- ── Low stock notification view ───────────────────────────────────────────────

CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.reorder_level,
  COALESCE(i.quantity, 0) AS current_stock,
  c.name AS category_name,
  s.name AS supplier_name,
  s.phone AS supplier_phone
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.is_active = true
  AND COALESCE(i.quantity, 0) <= p.reorder_level
ORDER BY COALESCE(i.quantity, 0) ASC;

-- ── Sales summary function ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_sales_summary(
  p_start_date DATE,
  p_end_date   DATE,
  p_branch_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  sale_date        DATE,
  total_revenue    DECIMAL,
  total_txns       INTEGER,
  cash_revenue     DECIMAL,
  mpesa_revenue    DECIMAL,
  credit_revenue   DECIMAL,
  card_revenue     DECIMAL,
  total_discounts  DECIMAL,
  total_tax        DECIMAL
) LANGUAGE sql AS $$
  SELECT
    DATE(created_at) AS sale_date,
    SUM(total_amount),
    COUNT(*)::INTEGER,
    SUM(CASE WHEN payment_method = 'cash'   THEN total_amount ELSE 0 END),
    SUM(CASE WHEN payment_method = 'mpesa'  THEN total_amount ELSE 0 END),
    SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END),
    SUM(CASE WHEN payment_method = 'card'   THEN total_amount ELSE 0 END),
    SUM(discount_amount),
    SUM(tax_amount)
  FROM sales
  WHERE status = 'completed'
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
  GROUP BY DATE(created_at)
  ORDER BY sale_date;
$$;
