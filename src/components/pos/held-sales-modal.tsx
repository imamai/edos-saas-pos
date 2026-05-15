"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cart";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { X, Play, Trash2, Pause } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function HeldSalesModal({ onClose }: Props) {
  const supabase = createClient();
  const cart = useCartStore();
  const [holds, setHolds] = useState<{ id: string; name: string | null; created_at: string; cart_data: Record<string, unknown> }[]>([]);

  useEffect(() => {
    loadHolds();
  }, []);

  async function loadHolds() {
    const { data } = await supabase
      .from("held_sales")
      .select("*")
      .order("created_at", { ascending: false });
    setHolds(data ?? []);
  }

  async function resumeHold(hold: typeof holds[0]) {
    const { items, customer, discountType, discountValue, notes } = hold.cart_data as {
      items: import("@/types").CartItem[];
      customer: import("@/types").Customer | null;
      discountType: "percent" | "fixed";
      discountValue: number;
      notes: string;
    };

    cart.clearCart();
    items.forEach((item) => {
      cart.addItem(item.product, item.quantity);
      if (item.discount_amount > 0) cart.updateItemDiscount(item.product.id, item.discount_amount);
    });
    if (customer) cart.setCustomer(customer);
    cart.setDiscount(discountType, discountValue);
    cart.setNotes(notes);

    await supabase.from("held_sales").delete().eq("id", hold.id);
    toast.success("Sale resumed");
    onClose();
  }

  async function deleteHold(id: string) {
    await supabase.from("held_sales").delete().eq("id", id);
    setHolds((prev) => prev.filter((h) => h.id !== id));
    toast.info("Held sale deleted");
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Pause className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">Held Sales</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {holds.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-slate-400">
              <Pause className="w-10 h-10 opacity-40" />
              <p className="text-sm">No held sales</p>
            </div>
          ) : (
            holds.map((hold) => {
              const data = hold.cart_data as { items: { product: { name: string }; quantity: number; total_price: number }[]; customer?: { name: string } };
              const total = data.items.reduce((s: number, i) => s + i.total_price, 0);
              return (
                <div key={hold.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white text-sm">
                      {data.customer?.name ?? "Walk-in"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {data.items.length} items · {formatCurrency(total)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(hold.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resumeHold(hold)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                    >
                      <Play className="w-3 h-3" />
                      Resume
                    </button>
                    <button
                      onClick={() => deleteHold(hold.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
