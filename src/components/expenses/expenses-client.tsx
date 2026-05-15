"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { toast } from "sonner";
import type { Expense } from "@/types";
import { Search, Plus, Wallet, X, Loader2 } from "lucide-react";
import ExportMenu from "@/components/shared/export-menu";

export default function ExpensesClient() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { loadData(); }, [month]);

  async function loadData() {
    setLoading(true);
    const [catRes, expRes] = await Promise.all([
      supabase.from("expense_categories").select("*").order("name"),
      supabase
        .from("expenses")
        .select(`*, expense_categories(name), profiles!recorded_by(full_name)`)
        .gte("expense_date", `${month}-01`)
        .lte("expense_date", `${month}-31`)
        .order("expense_date", { ascending: false }),
    ]);
    setCategories(catRes.data ?? []);
    setExpenses(expRes.data as Expense[] ?? []);
    setLoading(false);
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Expenses</h1>
        <div className="flex items-center gap-2">
          <ExportMenu
            columns={[
              { header: "Date",           key: "expense_date",   width: 14 },
              { header: "Category",       key: "_category_name", width: 20 },
              { header: "Description",    key: "description",    width: 30 },
              { header: "Payment Method", key: "payment_method", width: 16 },
              { header: "Amount",         key: "amount",         width: 12 },
            ]}
            rows={expenses.map((e) => ({
              ...e,
              _category_name: (e.category as unknown as { name: string } | undefined)?.name ?? "—",
            } as unknown as Record<string, unknown>))}
            filename={`expenses-${month}`}
            title={`Expenses — ${month}`}
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Record Expense
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2">
          <p className="text-xs text-slate-500">Total Expenses</p>
          <p className="font-bold text-red-600">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Payment</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td></tr>
              ))
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No expenses this month</p>
              </td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDateOnly(e.expense_date)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">
                      {(e.category as { name: string } | undefined)?.name ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{e.description}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize text-sm">{e.payment_method}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ExpenseFormModal
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function ExpenseFormModal({
  categories, onClose, onSaved,
}: { categories: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    category_id: "",
    amount: "",
    description: "",
    payment_method: "cash",
    reference: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("branch_id").eq("id", user!.id).single();
    const { error } = await supabase.from("expenses").insert({
      ...form,
      amount: Number(form.amount),
      recorded_by: user!.id,
      branch_id: profile?.branch_id,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense recorded");
    onSaved();
  }

  const ic = "w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white">Record Expense</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category *</label>
            <select required value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className={ic}>
              <option value="">Select category...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount (KES) *</label>
            <input required type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={ic} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description *</label>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={ic} placeholder="What was this expense for?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Payment Method</label>
              <select value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))} className={ic}>
                {["cash","mpesa","card","bank"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} className={ic} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
