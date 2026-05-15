"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly, generateQuoteNumber } from "@/lib/utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { toast } from "sonner";
import type { Quotation, Product, Customer } from "@/types";
import {
  Plus, Search, FileText, Printer, CheckCircle, XCircle,
  ShoppingCart, Eye, Trash2, X, ChevronDown, Calendar
} from "lucide-react";
import ExportMenu from "@/components/shared/export-menu";

interface Props {
  initialQuotations: Quotation[];
  products: Product[];
  customers: Customer[];
  branchId: string;
  profileId: string;
}

type QuoteStatus = Quotation["status"];

const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft:     "bg-slate-100 text-slate-600",
  sent:      "bg-blue-100 text-blue-600",
  accepted:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  expired:   "bg-orange-100 text-orange-600",
  converted: "bg-purple-100 text-purple-700",
};

export default function QuotationsClient({ initialQuotations, products, customers, branchId, profileId }: Props) {
  const supabase = createClient();
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [viewQuote, setViewQuote] = useState<Quotation | null>(null);
  const [printQuote, setPrintQuote] = useState<Quotation | null>(null);

  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase();
    const cust = q.customer as unknown as { name: string } | null;
    return q.quote_number.toLowerCase().includes(s) || (cust?.name ?? "").toLowerCase().includes(s);
  });

  async function updateStatus(id: string, status: QuoteStatus) {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setQuotations((q) => q.map((x) => x.id === id ? { ...x, status } : x));
    toast.success("Status updated");
  }

  async function deleteQuote(id: string) {
    if (!confirm("Delete this quotation?")) return;
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setQuotations((q) => q.filter((x) => x.id !== id));
    toast.success("Deleted");
  }

  async function convertToSale(quote: Quotation) {
    if (!confirm("Convert this quotation to a sale? This will open the POS with these items.")) return;
    toast.info("Quotation conversion: add the items manually in POS.");
  }

  function onCreated(q: Quotation) {
    setQuotations((prev) => [q, ...prev]);
    setShowForm(false);
    toast.success(`Quotation ${q.quote_number} created`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quotations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage customer quotations</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            columns={[
              { header: "Quote #",      key: "quote_number",  width: 16 },
              { header: "Customer",     key: "_customer_name",width: 24 },
              { header: "Status",       key: "status",        width: 12 },
              { header: "Total",        key: "total_amount",  width: 14 },
              { header: "Valid Until",  key: "valid_until",   width: 14 },
              { header: "Created",      key: "created_at",    width: 18 },
            ]}
            rows={filtered.map((q) => ({
              ...q,
              _customer_name: (q.customer as unknown as { name: string } | null)?.name ?? "—",
            } as unknown as Record<string, unknown>))}
            filename={`quotations-${new Date().toISOString().slice(0,10)}`}
            title="Quotations"
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Quotation
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quote number or customer…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Quote #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Valid Until</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">No quotations found</td></tr>
            ) : (
              filtered.map((q) => {
                const cust = q.customer as unknown as { name: string } | null;
                return (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-white">{q.quote_number}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{cust?.name ?? <span className="italic text-slate-400">Walk-in</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateOnly(q.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{q.valid_until ? formatDateOnly(q.valid_until) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{formatCurrency(q.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[q.status]}`}>
                        {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { supabase.from("quotations").select("*, customers(name,phone,email,address,id_number), quotation_items(*, products(name,sku,unit))").eq("id", q.id).single().then(({ data }) => { if (data) setPrintQuote({ ...data as unknown as Quotation, items: (data as Record<string,unknown>).quotation_items as Quotation["items"] }); }); }} title="Print" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateStatus(q.id, "accepted")} title="Mark Accepted" className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateStatus(q.id, "rejected")} title="Mark Rejected" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition">
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteQuote(q.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition">
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

      {showForm && (
        <QuotationFormModal
          products={products}
          customers={customers}
          branchId={branchId}
          profileId={profileId}
          onClose={() => setShowForm(false)}
          onCreated={onCreated}
        />
      )}

      {printQuote && (
        <QuotationPrintModal quote={printQuote} onClose={() => setPrintQuote(null)} />
      )}
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

interface FormItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_price: number;
}

function QuotationFormModal({
  products, customers, branchId, profileId, onClose, onCreated,
}: {
  products: Product[];
  customers: Customer[];
  branchId: string;
  profileId: string;
  onClose: () => void;
  onCreated: (q: Quotation) => void;
}) {
  const supabase = createClient();
  const [customerId, setCustomerId] = useState<string>("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>([]);
  const [prodSearch, setProdSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredProds = products.filter((p) =>
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(prodSearch.toLowerCase())
  ).slice(0, 8);

  function addProduct(p: Product) {
    const exists = items.find((i) => i.product.id === p.id);
    if (exists) { toast.info("Already added — adjust quantity below"); return; }
    const tax = (p.selling_price * p.vat_rate) / 116;
    setItems((prev) => [...prev, {
      product: p,
      quantity: 1,
      unit_price: p.selling_price,
      discount_amount: 0,
      tax_amount: tax,
      total_price: p.selling_price,
    }]);
    setProdSearch("");
  }

  function updateItem(idx: number, qty: number, disc: number) {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const afterDisc = item.unit_price * qty - disc;
      const tax = (afterDisc * item.product.vat_rate) / 116;
      return { ...item, quantity: qty, discount_amount: disc, tax_amount: tax, total_price: afterDisc };
    }));
  }

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalDisc = items.reduce((s, i) => s + i.discount_amount, 0);
  const totalTax = items.reduce((s, i) => s + i.tax_amount, 0);
  const total = subtotal - totalDisc;

  async function save() {
    if (items.length === 0) { toast.error("Add at least one product"); return; }
    setSaving(true);
    const quoteNumber = generateQuoteNumber();

    const { data: quote, error } = await supabase.from("quotations").insert({
      quote_number: quoteNumber,
      customer_id: customerId || null,
      branch_id: branchId,
      created_by: profileId,
      valid_until: validUntil || null,
      notes: notes || null,
      subtotal,
      discount_amount: totalDisc,
      tax_amount: totalTax,
      total_amount: total,
      status: "draft",
    }).select().single();

    if (error || !quote) { toast.error(error?.message ?? "Failed"); setSaving(false); return; }

    await supabase.from("quotation_items").insert(
      items.map((i) => ({
        quotation_id: quote.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount_amount: i.discount_amount,
        tax_amount: i.tax_amount,
        total_price: i.total_price,
      }))
    );

    const customer = customers.find((c) => c.id === customerId) ?? null;
    onCreated({ ...quote as unknown as Quotation, customer: customer ?? undefined, items: items.map((i, idx) => ({ id: "", quotation_id: quote.id, product_id: i.product.id, product: i.product, quantity: i.quantity, unit_price: i.unit_price, discount_amount: i.discount_amount, tax_amount: i.tax_amount, total_price: i.total_price })) });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-white">New Quotation</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Customer + Valid Until */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Customer (optional)</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Product Search */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Add Products</label>
            <input
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
              placeholder="Search products by name or SKU…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {prodSearch && (
              <div className="mt-1 border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-lg">
                {filteredProds.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.sku}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{formatCurrency(p.selling_price)}</span>
                  </button>
                ))}
                {filteredProds.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No products found</p>}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(item.unit_price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-0.5">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, Number(e.target.value), item.discount_amount)}
                        className="w-16 px-2 py-1 text-sm text-center border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-0.5">Disc (KES)</label>
                      <input
                        type="number"
                        min={0}
                        value={item.discount_amount}
                        onChange={(e) => updateItem(i, item.quantity, Number(e.target.value))}
                        className="w-24 px-2 py-1 text-sm text-center border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(item.total_price)}</p>
                    </div>
                    <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="p-1 text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes / Terms</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery terms, validity notes…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {totalDisc > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(totalDisc)}</span></div>}
              <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>VAT (16%)</span><span>{formatCurrency(totalTax)}</span></div>
              <div className="flex justify-between font-bold text-blue-700 border-t border-blue-200 dark:border-blue-700 pt-2"><span>TOTAL</span><span>{formatCurrency(total)}</span></div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancel</button>
          <button onClick={save} disabled={saving || items.length === 0} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition">
            {saving ? "Saving…" : "Create Quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Print Modal ──────────────────────────────────────────────────────────────

function QuotationPrintModal({ quote, onClose }: { quote: Quotation; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useBusinessSettings(quote.branch_id);
  const customer = quote.customer as unknown as Record<string, string> | null;
  const items = quote.items ?? [];

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=1200");
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 13px; 
          color: #1e293b; 
          padding: 40px 20px;
          background: white;
          line-height: 1.5;
        }
        
        /* Layout utilities */
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .items-start { align-items: flex-start; }
        .w-full { width: 100%; }
        .w-64 { width: 16rem; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        /* Spacing */
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-10 { margin-top: 2.5rem; }
        .pt-2 { padding-top: 0.5rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .px-4 { padding: 0 1rem; }
        .py-2 { padding: 0.5rem 0; }
        .py-3 { padding: 0.75rem 0; }
        .p-3 { padding: 0.75rem; }
        .p-4 { padding: 1rem; }
        .p-8 { padding: 2rem; }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        
        /* Text styles */
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; }
        .text-base { font-size: 14px; }
        .text-2xl { font-size: 22px; }
        .text-3xl { font-size: 28px; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .font-extrabold { font-weight: 800; }
        .italic { font-style: italic; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .leading-relaxed { line-height: 1.625; }
        
        /* Colors - Text */
        .text-white { color: white; }
        .text-slate-400 { color: #cbd5e1; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-slate-700 { color: #3f3f46; }
        .text-slate-800 { color: #1e293b; }
        .text-blue-700 { color: #1e40af; }
        .text-green-600 { color: #16a34a; }
        .text-yellow-800 { color: #854d0e; }
        
        /* Colors - Background */
        .bg-white { background: white; }
        .bg-slate-50 { background: #f8fafc; }
        .bg-blue-700 { background: #1e40af; }
        .bg-yellow-50 { background: #fefce8; }
        
        /* Borders */
        .border { border: 1px solid #e2e8f0; }
        .border-t { border-top: 1px solid #e2e8f0; }
        .border-b { border-bottom: 1px solid #e2e8f0; }
        .border-slate-200 { border-color: #e2e8f0; }
        .border-slate-400 { border-color: #94a3b8; }
        .border-blue-700 { border-color: #1e40af; }
        .border-yellow-200 { border-color: #fde68a; }
        .rounded-xl { border-radius: 12px; }
        
        /* HR / Dividers */
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
        
        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        thead tr { background: #1e40af; color: white; }
        th { 
          padding: 10px 12px; 
          font-size: 12px; 
          font-weight: 600; 
          text-align: left; 
          background: #1e40af;
          color: white;
          border: 1px solid #1e40af;
        }
        th:last-child { text-align: right; }
        td { 
          padding: 10px 12px; 
          font-size: 13px; 
          border-bottom: 1px solid #f1f5f9;
        }
        td:last-child { text-align: right; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody tr:nth-child(odd) { background: white; }
        
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .notice { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400e; margin-top: 1.5rem; }
        .footer { margin-top: 2rem; font-size: 11px; color: #94a3b8; }
        
        @media print {
          body { padding: 20px; }
          * { page-break-inside: avoid; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      </style>
    `;
    win?.document.write(`
      <html>
        <head>
          <title>Quotation</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styles}
        </head>
        <body>${content}</body>
      </html>
    `);
    win?.document.close();
    setTimeout(() => {
      win?.print();
      win?.close();
    }, 250);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <span className="font-semibold text-slate-800 dark:text-white">Quotation Preview</span>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div ref={printRef} className="bg-white text-slate-800 p-8 max-w-2xl mx-auto text-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-2xl font-extrabold text-blue-700">{settings?.company_name || "POS SYSTEM"}</p>
                <p className="text-slate-500 mt-1 leading-relaxed text-xs">
                  {settings?.address && <>{settings.address}<br /></>}
                  {settings?.phone && <>Tel: {settings.phone}<br /></>}
                  {settings?.email && <>Email: {settings.email}<br /></>}
                  {settings?.tax_pin && <>PIN: {settings.tax_pin}</>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-700">QUOTATION</p>
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <p><span className="font-semibold text-slate-700">Quote #:</span> {quote.quote_number}</p>
                  <p><span className="font-semibold text-slate-700">Date:</span> {formatDateOnly(quote.created_at)}</p>
                  {quote.valid_until && <p><span className="font-semibold text-slate-700">Valid Until:</span> {formatDateOnly(quote.valid_until)}</p>}
                </div>
              </div>
            </div>

            <hr className="border-slate-200 mb-6" />

            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Prepared For</p>
              {customer ? (
                <div className="leading-relaxed">
                  <p className="font-semibold">{customer.name}</p>
                  {customer.phone && <p className="text-slate-500 text-xs">Tel: {customer.phone}</p>}
                  {customer.email && <p className="text-slate-500 text-xs">Email: {customer.email}</p>}
                </div>
              ) : (
                <p className="text-slate-500 italic">Walk-in Customer</p>
              )}
            </div>

            <table className="w-full text-sm mb-6 border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-center">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const prod = item.product as unknown as Record<string, string> | null;
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{prod?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{prod?.sku ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{item.quantity} {prod?.unit ?? ""}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
                {quote.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(quote.discount_amount)}</span></div>}
                <div className="flex justify-between text-slate-500"><span>VAT (16%)</span><span>{formatCurrency(quote.tax_amount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t border-blue-700 pt-2 mt-2 text-blue-700">
                  <span>TOTAL</span><span>{formatCurrency(quote.total_amount)}</span>
                </div>
              </div>
            </div>

            {quote.notes && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-sm text-slate-600">
                <p className="font-semibold mb-1">Notes</p>
                <p>{quote.notes}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
              This is a quotation only and not a tax invoice. Prices are subject to change. Please confirm the order to proceed.
            </div>

            <div className="flex justify-between mt-10">
              <div className="text-center">
                <div className="w-40 border-t border-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Authorized Signature</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-t border-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Customer Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
