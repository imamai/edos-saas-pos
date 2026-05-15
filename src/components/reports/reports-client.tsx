"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";
import ExportMenu from "@/components/shared/export-menu";

type Period = "today" | "week" | "month" | "custom";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

interface SaleSummary {
  date: string;
  revenue: number;
  transactions: number;
  cash: number;
  mpesa: number;
  credit: number;
  card: number;
}

export default function ReportsClient() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>("month");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [tab, setTab] = useState<"sales" | "products" | "payments" | "credit">("sales");
  const [salesData, setSalesData] = useState<SaleSummary[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; revenue: number; qty: number; category: string }[]>([]);
  const [paymentMix, setPaymentMix] = useState<{ name: string; value: number; count: number }[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<{ name: string; outstanding_balance: number; credit_limit: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    updateDates();
  }, [period]);

  useEffect(() => {
    loadReport();
  }, [startDate, endDate, tab]);

  function updateDates() {
    const now = new Date();
    if (period === "today") {
      const t = now.toISOString().split("T")[0];
      setStartDate(t); setEndDate(t);
    } else if (period === "week") {
      const w = new Date(now.getTime() - 6 * 86400000).toISOString().split("T")[0];
      setStartDate(w); setEndDate(now.toISOString().split("T")[0]);
    } else if (period === "month") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  }

  async function loadReport() {
    setLoading(true);
    const from = `${startDate}T00:00:00`;
    const to = `${endDate}T23:59:59`;

    if (tab === "sales") {
      const { data } = await supabase
        .from("sales")
        .select("total_amount, payment_method, created_at, discount_amount, tax_amount")
        .eq("status", "completed")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at");

      // Group by date
      const byDate = new Map<string, SaleSummary>();
      data?.forEach((s) => {
        const d = s.created_at.split("T")[0];
        if (!byDate.has(d)) {
          byDate.set(d, { date: d, revenue: 0, transactions: 0, cash: 0, mpesa: 0, credit: 0, card: 0 });
        }
        const entry = byDate.get(d)!;
        entry.revenue += s.total_amount;
        entry.transactions += 1;
        if (s.payment_method === "cash") entry.cash += s.total_amount;
        if (s.payment_method === "mpesa") entry.mpesa += s.total_amount;
        if (s.payment_method === "credit") entry.credit += s.total_amount;
        if (s.payment_method === "card") entry.card += s.total_amount;
      });
      setSalesData([...byDate.values()]);
    }

    if (tab === "products") {
      const { data } = await supabase
        .from("sale_items")
        .select(`quantity, total_price, products(name, categories(name))`)
        .gte("created_at", from)
        .lte("created_at", to);

      const map = new Map<string, { name: string; revenue: number; qty: number; category: string }>();
      data?.forEach((item: { quantity: number; total_price: number; products: unknown }) => {
        const prod = item.products as { name: string; categories: { name: string } | null } | null;
        const key = prod?.name ?? "Unknown";
        if (!map.has(key)) {
          map.set(key, { name: key, revenue: 0, qty: 0, category: prod?.categories?.name ?? "" });
        }
        const e = map.get(key)!;
        e.revenue += item.total_price;
        e.qty += Number(item.quantity);
      });
      setTopProducts([...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15));
    }

    if (tab === "payments") {
      const { data } = await supabase
        .from("sales")
        .select("payment_method, total_amount")
        .eq("status", "completed")
        .gte("created_at", from)
        .lte("created_at", to);

      const map = new Map<string, { name: string; value: number; count: number }>();
      data?.forEach((s) => {
        if (!map.has(s.payment_method)) {
          map.set(s.payment_method, { name: s.payment_method.toUpperCase(), value: 0, count: 0 });
        }
        const e = map.get(s.payment_method)!;
        e.value += s.total_amount;
        e.count += 1;
      });
      setPaymentMix([...map.values()]);
    }

    if (tab === "credit") {
      const { data } = await supabase
        .from("customers")
        .select("name, outstanding_balance, credit_limit")
        .gt("outstanding_balance", 0)
        .eq("is_active", true)
        .order("outstanding_balance", { ascending: false })
        .limit(50);
      setCreditCustomers(data ?? []);
    }

    setLoading(false);
  }

  const totalRevenue = salesData.reduce((s, d) => s + d.revenue, 0);
  const totalTransactions = salesData.reduce((s, d) => s + d.transactions, 0);
  const totalCredit = creditCustomers.reduce((s, c) => s + c.outstanding_balance, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Analytics</h1>
        <ExportMenu
          columns={
            tab === "sales" ? [
              { header: "Date",         key: "date",         width: 14 },
              { header: "Revenue",      key: "revenue",      width: 14 },
              { header: "Transactions", key: "transactions", width: 14 },
              { header: "Cash",         key: "cash",         width: 12 },
              { header: "M-Pesa",       key: "mpesa",        width: 12 },
              { header: "Credit",       key: "credit",       width: 12 },
              { header: "Card",         key: "card",         width: 12 },
            ] : tab === "products" ? [
              { header: "Product",  key: "name",     width: 28 },
              { header: "Category", key: "category", width: 18 },
              { header: "Qty Sold", key: "qty",      width: 12 },
              { header: "Revenue",  key: "revenue",  width: 14 },
            ] : tab === "payments" ? [
              { header: "Method",     key: "name",  width: 16 },
              { header: "Amount",     key: "value", width: 14 },
              { header: "Count",      key: "count", width: 10 },
            ] : [
              { header: "Customer",    key: "name",                width: 24 },
              { header: "Outstanding", key: "outstanding_balance", width: 14 },
              { header: "Credit Limit",key: "credit_limit",        width: 14 },
            ]
          }
          rows={
            (tab === "sales" ? salesData :
             tab === "products" ? topProducts :
             tab === "payments" ? paymentMix :
             creditCustomers) as unknown as Record<string, unknown>[]
          }
          filename={`report-${tab}-${startDate}-${endDate}`}
          title={`${tab.charAt(0).toUpperCase() + tab.slice(1)} Report (${startDate} to ${endDate})`}
        />
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
          {(["today", "week", "month", "custom"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-slate-400">—</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 w-fit">
        {(["sales", "products", "payments", "credit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t === "credit" ? "Credit Aging" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SummaryCard label="Total Revenue" value={formatCurrency(totalRevenue)} color="blue" />
            <SummaryCard label="Transactions" value={totalTransactions.toString()} color="green" />
            <SummaryCard label="Avg. Sale" value={totalTransactions > 0 ? formatCurrency(totalRevenue / totalTransactions) : formatCurrency(0)} color="purple" />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Daily Revenue</h3>
            {loading ? <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-KE", { month: "short", day: "numeric" })} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Detailed table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Txns</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cash</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">M-Pesa</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {salesData.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDateOnly(d.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-white">{formatCurrency(d.revenue)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{d.transactions}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(d.cash)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(d.mpesa)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(d.credit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">{formatCurrency(totalRevenue)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">{totalTransactions}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">{formatCurrency(salesData.reduce((s, d) => s + d.cash, 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-400">{formatCurrency(salesData.reduce((s, d) => s + d.mpesa, 0))}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">{formatCurrency(salesData.reduce((s, d) => s + d.credit, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === "products" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Top Products by Revenue</h3>
            {loading ? <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qty Sold</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.category}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{p.qty}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Payment Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={paymentMix} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {paymentMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Payment Summary</h3>
              <div className="space-y-3">
                {paymentMix.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(p.value)}</p>
                      <p className="text-xs text-slate-400">{p.count} transactions</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Tab */}
      {tab === "credit" && (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCredit)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Customers with Balance</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{creditCustomers.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Outstanding</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Credit Limit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {creditCustomers.map((c, i) => {
                  const util = c.credit_limit > 0 ? (c.outstanding_balance / c.credit_limit) * 100 : 100;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(c.outstanding_balance)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(c.credit_limit)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${util > 90 ? "bg-red-500" : util > 60 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(100, util)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${util > 90 ? "text-red-600" : "text-slate-600 dark:text-slate-400"}`}>
                            {util.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: "blue" | "green" | "purple" }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  };
  return (
    <div className={`rounded-2xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
