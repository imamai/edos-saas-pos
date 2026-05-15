"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cart";
import { formatCurrency, generateReceiptNumber } from "@/lib/utils";
import { toast } from "sonner";
import type { Product, Customer } from "@/types";
import {
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus,
  User, Tag, ChevronRight, Printer, ReceiptText, X,
  Pause, Play, CreditCard, Smartphone, DollarSign,
  Package, AlertCircle, Check
} from "lucide-react";
import PaymentModal from "./payment-modal";
import CustomerSearchModal from "./customer-search-modal";
import HeldSalesModal from "./held-sales-modal";
import ReceiptModal from "./receipt-modal";

export default function POSClient() {
  const supabase = createClient();
  const cart = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ id: string; receipt: string } | null>(null);
  const [cartDiscount, setCartDiscount] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCategory]);

  async function loadCategories() {
    const { data } = await supabase.from("categories").select("id, name").eq("is_active", true).order("name");
    setCategories(data ?? []);
  }

  async function loadProducts() {
    setLoading(true);
    let query = supabase
      .from("product_stock")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (selectedCategory) query = query.eq("category_id", selectedCategory);
    if (searchQuery.trim()) {
      query = query.or(
        `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.eq.${searchQuery}`
      );
    }

    const { data } = await query.limit(60);
    setProducts(data as Product[] ?? []);
    setLoading(false);
  }

  function handleBarcodeInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.trim()) {
      const product = products.find(
        (p) => p.barcode === searchQuery || p.sku === searchQuery
      );
      if (product) {
        cart.addItem(product);
        setSearchQuery("");
        toast.success(`${product.name} added to cart`);
      }
    }
  }

  async function holdSale() {
    if (cart.items.length === 0) return;
    const { error } = await supabase.from("held_sales").insert({
      cart_data: {
        items: cart.items,
        customer: cart.customer,
        discountType: cart.discountType,
        discountValue: cart.discountValue,
        notes: cart.notes,
      },
    });
    if (!error) {
      cart.clearCart();
      toast.success("Sale held — resume from held sales");
    }
  }

  const subtotal = cart.subtotal();
  const totalDiscount = cart.totalDiscount();
  const totalTax = cart.totalTax();
  const total = cart.totalAmount();
  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-4rem-2rem)] gap-4">
      {/* ── Left Panel: Product Browser ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeInput}
                placeholder="Search by name, SKU, or scan barcode..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                !selectedCategory
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  cat.id === selectedCategory
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Package className="w-12 h-12 mb-3" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => {
                    cart.addItem(product);
                    toast.success(`${product.name} added`, { duration: 1500 });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Cart ── */}
      <div className="w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex-shrink-0">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-800 dark:text-white">
              Cart {itemCount > 0 && <span className="text-blue-600">({itemCount})</span>}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHeld(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Held Sales"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={holdSale}
              disabled={cart.items.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition disabled:opacity-40"
              title="Hold Sale"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={cart.clearCart}
              disabled={cart.items.length === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40"
              title="Clear Cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer */}
        <button
          onClick={() => setShowCustomer(true)}
          className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-left"
        >
          <User className="w-4 h-4 text-slate-400" />
          <span className={`text-sm flex-1 ${cart.customer ? "text-slate-800 dark:text-white font-medium" : "text-slate-400"}`}>
            {cart.customer?.name ?? "Add Customer (optional)"}
          </span>
          {cart.customer && (
            <button
              onClick={(e) => { e.stopPropagation(); cart.setCustomer(null); }}
              className="text-slate-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm text-center">Cart is empty. Tap a product to add it.</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onQtyChange={(q) => cart.updateQuantity(item.product.id, q)}
                  onRemove={() => cart.removeItem(item.product.id)}
                  onDiscount={(d) => cart.updateItemDiscount(item.product.id, d)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cart Totals */}
        {cart.items.length > 0 && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {/* Cart Discount */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCartDiscount(!cartDiscount)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <Tag className="w-3 h-3" />
                  {cartDiscount ? "Remove Discount" : "Add Discount"}
                </button>
              </div>
              {cartDiscount && (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={cart.discountType}
                    onChange={(e) => cart.setDiscount(e.target.value as "percent" | "fixed", cart.discountValue)}
                    className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <option value="fixed">KES</option>
                    <option value="percent">%</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={cart.discountValue}
                    onChange={(e) => cart.setDiscount(cart.discountType, Number(e.target.value))}
                    placeholder="0"
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>VAT (16%)</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-slate-800 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-700">
                <span>Total</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Charge Button */}
            <div className="p-3 pt-0">
              <button
                onClick={() => setShowPayment(true)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-lg transition shadow-md"
              >
                Charge {formatCurrency(total)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showPayment && (
        <PaymentModal
          total={total}
          customer={cart.customer}
          items={cart.items}
          subtotal={subtotal}
          discountAmount={totalDiscount}
          taxAmount={totalTax}
          onClose={() => setShowPayment(false)}
          onSuccess={(saleId, receipt) => {
            cart.clearCart();
            setShowPayment(false);
            setCompletedSale({ id: saleId, receipt });
          }}
        />
      )}

      {showCustomer && (
        <CustomerSearchModal
          onSelect={(c) => { cart.setCustomer(c); setShowCustomer(false); }}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {showHeld && (
        <HeldSalesModal onClose={() => setShowHeld(false)} />
      )}

      {completedSale && (
        <ReceiptModal
          saleId={completedSale.id}
          receiptNumber={completedSale.receipt}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const inStock = (product.stock_quantity ?? 0) > 0;

  return (
    <button
      onClick={onAdd}
      disabled={!inStock}
      className={`
        relative p-3 rounded-xl border text-left transition-all active:scale-95
        ${inStock
          ? "bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:shadow-md cursor-pointer"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed"
        }
      `}
    >
      {!inStock && (
        <span className="absolute top-2 right-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
          Out
        </span>
      )}
      <div className="w-full h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg mb-2 flex items-center justify-center">
        <Package className="w-8 h-8 text-blue-400" />
      </div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
        {product.name}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{product.sku}</p>
      <p className="text-sm font-bold text-blue-600 mt-1">
        {formatCurrency(product.selling_price)}
      </p>
      <p className="text-xs text-slate-400">
        Stock: {product.stock_quantity ?? 0} {product.unit}
      </p>
    </button>
  );
}

// ── Cart Item Row ─────────────────────────────────────────────────────────────

function CartItemRow({
  item, onQtyChange, onRemove, onDiscount,
}: {
  item: import("@/types").CartItem;
  onQtyChange: (q: number) => void;
  onRemove: () => void;
  onDiscount: (d: number) => void;
}) {
  const [editDiscount, setEditDiscount] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.product.name}</p>
          <p className="text-xs text-slate-400">{formatCurrency(item.unit_price)} each</p>
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2">
        {/* Qty Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQtyChange(item.quantity - 1)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onQtyChange(Number(e.target.value))}
            className="w-12 text-center text-sm font-semibold bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg py-1 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => onQtyChange(item.quantity + 1)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(item.total_price)}</p>
          {item.discount_amount > 0 && (
            <p className="text-xs text-green-600">-{formatCurrency(item.discount_amount)}</p>
          )}
        </div>
      </div>

      {/* Item discount toggle */}
      <button
        onClick={() => setEditDiscount(!editDiscount)}
        className="text-xs text-blue-500 hover:underline mt-1"
      >
        {editDiscount ? "Hide discount" : "Item discount"}
      </button>
      {editDiscount && (
        <input
          type="number"
          min={0}
          placeholder="Discount amount (KES)"
          value={item.discount_amount || ""}
          onChange={(e) => onDiscount(Number(e.target.value))}
          className="mt-1 w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
