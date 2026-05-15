// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = "admin" | "manager" | "cashier" | "storekeeper";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  branch_id?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Branch ──────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export type UnitType = "piece" | "meter" | "roll" | "box" | "kg" | "liter" | "set";

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: string;
  category?: Category;
  unit: UnitType;
  buying_price: number;
  selling_price: number;
  vat_rate: number;
  reorder_level: number;
  is_active: boolean;
  has_serial: boolean;
  has_warranty: boolean;
  warranty_months?: number;
  image_url?: string;
  supplier_id?: string;
  created_at: string;
  updated_at: string;
  // joined
  stock_quantity?: number;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  product_id: string;
  product?: Product;
  branch_id: string;
  quantity: number;
  reserved_quantity: number;
  last_updated: string;
}

export type StockMovementType =
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "transfer"
  | "damage";

export interface StockMovement {
  id: string;
  product_id: string;
  product?: Product;
  branch_id: string;
  type: StockMovementType;
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  id_number?: string;
  credit_limit: number;
  outstanding_balance: number;
  loyalty_points: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_pin?: string;
  payment_terms?: string;
  outstanding_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Purchase Order ──────────────────────────────────────────────────────────

export type POStatus = "draft" | "ordered" | "received" | "partial" | "cancelled";

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier?: Supplier;
  branch_id: string;
  status: POStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  notes?: string;
  expected_date?: string;
  received_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  product?: Product;
  ordered_qty: number;
  received_qty: number;
  unit_price: number;
  total_price: number;
}

// ─── Sale / POS ──────────────────────────────────────────────────────────────

export type SaleStatus = "completed" | "held" | "refunded" | "partial_refund";
export type PaymentMethod =
  | "cash"
  | "card"
  | "mpesa"
  | "credit"
  | "split";

export interface Sale {
  id: string;
  receipt_number: string;
  customer_id?: string;
  customer?: Customer;
  branch_id: string;
  cashier_id: string;
  cashier?: Profile;
  status: SaleStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
  serial_number?: string;
  warranty_expires?: string;
}

// ─── Quotations ──────────────────────────────────────────────────────────────

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id?: string;
  customer?: Customer;
  branch_id: string;
  created_by?: string;
  status: QuotationStatus;
  valid_until?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  converted_sale_id?: string;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
}

// ─── Cart (POS State) ─────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
  serial_number?: string;
}

export interface Cart {
  id: string; // for holds
  items: CartItem[];
  customer?: Customer;
  discount_type: "percent" | "fixed";
  discount_value: number;
  notes?: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  mpesa_transaction_id?: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

// ─── M-Pesa ──────────────────────────────────────────────────────────────────

export interface MpesaTransaction {
  id: string;
  checkout_request_id: string;
  merchant_request_id: string;
  amount: number;
  phone_number: string;
  sale_id?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  result_code?: string;
  result_desc?: string;
  mpesa_receipt?: string;
  transaction_date?: string;
  created_at: string;
  updated_at: string;
}

// ─── Expense ─────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  category_id: string;
  category?: ExpenseCategory;
  branch_id: string;
  amount: number;
  description: string;
  payment_method: string;
  reference?: string;
  recorded_by: string;
  expense_date: string;
  created_at: string;
}

// ─── Warranty ────────────────────────────────────────────────────────────────

export interface WarrantyRecord {
  id: string;
  product_id: string;
  product?: Product;
  customer_id: string;
  customer?: Customer;
  sale_id: string;
  serial_number?: string;
  warranty_start: string;
  warranty_end: string;
  notes?: string;
  created_at: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  user_id: string;
  user?: Profile;
  action: string;
  table_name: string;
  record_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// ─── Dashboard Analytics ─────────────────────────────────────────────────────

export interface DashboardStats {
  today_sales: number;
  today_transactions: number;
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  low_stock_count: number;
  outstanding_credit: number;
  pending_pos: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  transactions: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  revenue: number;
}

// ─── Business Settings ───────────────────────────────────────────────────────

export interface BusinessSettings {
  id: string;
  branch_id: string;
  company_name: string;
  company_logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_pin?: string;
  vat_rate: number;
  currency_code: string;
  receipt_header_text?: string;
  receipt_footer_text?: string;
  invoice_header_text?: string;
  quotation_header_text?: string;
  custom_fields?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
