"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Product, Category } from "@/types";
import {
  Search, Plus, Filter, AlertTriangle, Package,
  Edit2, Trash2, ArrowUpCircle, ArrowDownCircle,
  Download, Upload, BarChart2, X
} from "lucide-react";
import ProductFormModal from "./product-form-modal";
import StockAdjustModal from "./stock-adjust-modal";
import ExportMenu from "@/components/shared/export-menu";

export default function InventoryClient() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  useEffect(() => { loadData(); }, [search, categoryFilter, stockFilter]);

  async function loadData() {
    setLoading(true);
    const [catResult, prodResult] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("name"),
      buildProductQuery(),
    ]);
    setCategories(catResult.data as Category[] ?? []);
    setProducts(prodResult as Product[] ?? []);
    setLoading(false);
  }

  async function buildProductQuery() {
    let q = supabase.from("product_stock").select("*").eq("is_active", true);
    if (search.trim()) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    if (categoryFilter) q = q.eq("category_id", categoryFilter);
    if (stockFilter === "low") q = q.eq("is_low_stock", true);
    if (stockFilter === "out") q = q.eq("is_out_of_stock", true);
    const { data } = await q.order("name").limit(200);
    return data;
  }

  async function deleteProduct(id: string) {
    if (!confirm("Deactivate this product?")) return;
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Product deactivated"); loadData(); }
  }

  const lowStockCount = products.filter((p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= p.reorder_level).length;
  const outOfStockCount = products.filter((p) => (p.stock_quantity ?? 0) === 0).length;
  const totalValue = products.reduce((s, p) => s + (p.stock_quantity ?? 0) * p.buying_price, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            columns={[
              { header: "Name",        key: "name",           width: 28 },
              { header: "SKU",         key: "sku",            width: 16 },
              { header: "Category",    key: "category_name",  width: 18 },
              { header: "Buy Price",   key: "buying_price",   width: 14 },
              { header: "Sell Price",  key: "selling_price",  width: 14 },
              { header: "Stock",       key: "stock_quantity", width: 12 },
              { header: "Unit",        key: "unit",           width: 10 },
              { header: "Reorder At",  key: "reorder_level",  width: 12 },
            ]}
            rows={products as unknown as Record<string, unknown>[]}
            filename={`inventory-${new Date().toISOString().slice(0,10)}`}
            title="Inventory Report"
          />
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={products.length.toString()} color="blue" />
        <StatCard label="Low Stock" value={lowStockCount.toString()} color="amber" alert={lowStockCount > 0} />
        <StatCard label="Out of Stock" value={outOfStockCount.toString()} color="red" alert={outOfStockCount > 0} />
        <StatCard label="Stock Value" value={formatCurrency(totalValue)} color="green" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryFilter ?? ""}
          onChange={(e) => setCategoryFilter(e.target.value || null)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`px-3 py-2 text-xs font-medium capitalize transition ${
                stockFilter === f
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {f === "low" ? "Low Stock" : f === "out" ? "Out of Stock" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Buy Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sell Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No products found</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stock = product.stock_quantity ?? 0;
                  const isLow = stock > 0 && stock <= product.reorder_level;
                  const isOut = stock === 0;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{product.name}</p>
                            {product.barcode && <p className="text-xs text-slate-400">{product.barcode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{(product.category as { name: string } | undefined)?.name ?? (product as unknown as { category_name?: string }).category_name ?? ""}</td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(product.buying_price)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{formatCurrency(product.selling_price)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"}`}>
                          {stock} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          isOut ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                          : isLow ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        }`}>
                          {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setAdjustProduct(product)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                            title="Adjust Stock"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditProduct(product); setShowForm(true); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSaved={() => { setAdjustProduct(null); loadData(); }}
        />
      )}
    </div>
  );
}

function StatCard({
  label, value, color, alert = false,
}: { label: string; value: string; color: "blue" | "amber" | "red" | "green"; alert?: boolean }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${alert ? "text-red-600" : "text-slate-800 dark:text-white"}`}>{value}</p>
    </div>
  );
}
