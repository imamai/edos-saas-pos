"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Product } from "@/types";
import { X, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";

interface Props {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}

export default function StockAdjustModal({ product, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [type, setType] = useState<"in" | "out" | "adjust">("in");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("branch_id").eq("id", user!.id).single();
    const branchId = profile?.branch_id ?? (await getMainBranch());

    const { data: inventory } = await supabase
      .from("inventory")
      .select("*")
      .eq("product_id", product.id)
      .eq("branch_id", branchId)
      .single();

    const currentQty = inventory?.quantity ?? 0;
    let newQty: number;

    if (type === "adjust") {
      newQty = quantity;
    } else if (type === "in") {
      newQty = currentQty + quantity;
    } else {
      newQty = Math.max(0, currentQty - quantity);
    }

    const { error: invError } = await supabase
      .from("inventory")
      .upsert(
        { product_id: product.id, branch_id: branchId, quantity: newQty, last_updated: new Date().toISOString() },
        { onConflict: "product_id,branch_id" }
      );

    if (!invError) {
      await supabase.from("stock_movements").insert({
        product_id: product.id,
        branch_id: branchId,
        type: type === "in" ? "purchase" : type === "out" ? "damage" : "adjustment",
        quantity: type === "adjust" ? newQty - currentQty : (type === "in" ? quantity : -quantity),
        notes,
        created_by: user!.id,
      });
    }

    setLoading(false);
    if (invError) { toast.error(invError.message); return; }
    toast.success("Stock updated successfully");
    onSaved();
  }

  async function getMainBranch() {
    const { data } = await supabase.from("branches").select("id").eq("is_main", true).single();
    return data?.id ?? "";
  }

  const currentStock = product.stock_quantity ?? 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white">Adjust Stock</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Info */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-slate-800 dark:text-white">{product.name}</p>
            <p className="text-sm text-slate-500">{product.sku}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">Current Stock:</span>
              <span className="font-bold text-lg text-blue-600">{currentStock} {product.unit}</span>
            </div>
          </div>

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "in", label: "Stock In", icon: ArrowUpCircle, color: "green" },
              { v: "out", label: "Stock Out", icon: ArrowDownCircle, color: "red" },
              { v: "adjust", label: "Set Qty", icon: null, color: "blue" },
            ] as const).map(({ v, label, icon: Icon, color }) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition ${
                  type === v
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-400`
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                {Icon && <Icon className="w-5 h-5" />}
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {type === "adjust" ? "New Quantity" : "Quantity"} ({product.unit})
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {type !== "adjust" && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">New stock will be</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {type === "in" ? currentStock + quantity : Math.max(0, currentStock - quantity)} {product.unit}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stock received from supplier"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
