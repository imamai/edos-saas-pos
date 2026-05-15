"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateSKU } from "@/lib/utils";
import { toast } from "sonner";
import type { Product, Category } from "@/types";
import { X, Loader2 } from "lucide-react";

interface Props {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductFormModal({ product, categories, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? "",
    unit: product?.unit ?? "piece",
    buying_price: product?.buying_price ?? 0,
    selling_price: product?.selling_price ?? 0,
    vat_rate: product?.vat_rate ?? 16,
    reorder_level: product?.reorder_level ?? 5,
    has_serial: product?.has_serial ?? false,
    has_warranty: product?.has_warranty ?? false,
    warranty_months: product?.warranty_months ?? 12,
  });

  useEffect(() => {
    if (!product && form.category_id && form.name) {
      const catName = categories.find((c) => c.id === form.category_id)?.name ?? "GEN";
      setForm((f) => ({ ...f, sku: generateSKU(catName, form.name) }));
    }
  }, [form.category_id, form.name]);

  function update(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      buying_price: Number(form.buying_price),
      selling_price: Number(form.selling_price),
      vat_rate: Number(form.vat_rate),
      reorder_level: Number(form.reorder_level),
      warranty_months: form.has_warranty ? Number(form.warranty_months) : null,
    };

    let error;
    if (product) {
      ({ error } = await supabase.from("products").update(payload).eq("id", product.id));
    } else {
      const { data: newProd, error: insertErr } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();
      error = insertErr;

      if (!insertErr && newProd) {
        const { data: branch } = await supabase.from("branches").select("id").eq("is_main", true).single();
        if (branch) {
          await supabase.from("inventory").insert({ product_id: newProd.id, branch_id: branch.id, quantity: 0 });
        }
      }
    }

    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(product ? "Product updated" : "Product created");
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">
            {product ? "Edit Product" : "Add New Product"}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Product Name *">
              <input required value={form.name} onChange={(e) => update("name", e.target.value)}
                className={inputClass} placeholder="e.g. 100W Solar Panel" />
            </Field>

            <Field label="Category *">
              <select required value={form.category_id} onChange={(e) => update("category_id", e.target.value)}
                className={inputClass}>
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="SKU *">
              <input required value={form.sku} onChange={(e) => update("sku", e.target.value)}
                className={inputClass} placeholder="e.g. SOL-PNL-001" />
            </Field>

            <Field label="Barcode">
              <input value={form.barcode} onChange={(e) => update("barcode", e.target.value)}
                className={inputClass} placeholder="Scan or enter barcode" />
            </Field>

            <Field label="Unit">
              <select value={form.unit} onChange={(e) => update("unit", e.target.value)} className={inputClass}>
                {["piece","meter","roll","box","kg","liter","set"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>

            <Field label="Reorder Level">
              <input type="number" min={0} value={form.reorder_level}
                onChange={(e) => update("reorder_level", e.target.value)} className={inputClass} />
            </Field>

            <Field label="Buying Price (KES) *">
              <input required type="number" min={0} step={0.01} value={form.buying_price}
                onChange={(e) => update("buying_price", e.target.value)} className={inputClass} />
            </Field>

            <Field label="Selling Price (KES) *">
              <input required type="number" min={0} step={0.01} value={form.selling_price}
                onChange={(e) => update("selling_price", e.target.value)} className={inputClass} />
            </Field>

            <Field label="VAT Rate (%)">
              <input type="number" min={0} max={100} value={form.vat_rate}
                onChange={(e) => update("vat_rate", e.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
              rows={2} className={inputClass} placeholder="Optional product description" />
          </Field>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.has_serial}
                onChange={(e) => update("has_serial", e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Track Serial Numbers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.has_warranty}
                onChange={(e) => update("has_warranty", e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Has Warranty</span>
            </label>
          </div>

          {form.has_warranty && (
            <Field label="Warranty Period (months)">
              <input type="number" min={1} value={form.warranty_months}
                onChange={(e) => update("warranty_months", e.target.value)} className={inputClass} />
            </Field>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {product ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
