"use client";

import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp, ShoppingCart, AlertTriangle, DollarSign,
  Smartphone, CreditCard, Users, ArrowUpRight, Package
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import Link from "next/link";

interface DashboardClientProps {
  stats: {
    today_sales: number;
    today_revenue: number;
    week_revenue: number;
    month_revenue: number;
    low_stock_count: number;
    cash_today: number;
    mpesa_today: number;
    credit_today: number;
  };
  chartData: { date: string; revenue: number }[];
  lowStock: { id: string; name: string; stock_quantity: number; reorder_level: number; category_name: string }[];
  recentSales: {
    id: string;
    receipt_number: string;
    total_amount: number;
    payment_method: string;
    created_at: string;
    customers: { name: string } | null;
    profiles: { full_name: string } | null;
  }[];
  topProducts: { id: string; name: string; qty: number; category: string }[];
}

const PAYMENT_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export default function DashboardClient({ stats, chartData, lowStock, recentSales, topProducts }: DashboardClientProps) {
  const paymentData = [
    { name: "Cash", value: stats.cash_today },
    { name: "M-Pesa", value: stats.mpesa_today },
    { name: "Credit", value: stats.credit_today },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Overview of your business today</p>
        </div>
        <Link
          href="/pos"

          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-md"
        >
          <ShoppingCart className="w-4 h-4" />
          Open POS
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(stats.today_revenue)}
          sub={`${stats.today_sales} transactions`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          label="This Week"
          value={formatCurrency(stats.week_revenue)}
          sub="Last 7 days"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(stats.month_revenue)}
          sub="Month to date"
          icon={ArrowUpRight}
          color="purple"
        />
        <StatCard
          label="Low Stock"
          value={stats.low_stock_count.toString()}
          sub="Items need reorder"
          icon={AlertTriangle}
          color={stats.low_stock_count > 0 ? "red" : "green"}
          href="/inventory"
        />
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Cash" value={formatCurrency(stats.cash_today)} icon={DollarSign} color="green" />
        <MiniStat label="M-Pesa" value={formatCurrency(stats.mpesa_today)} icon={Smartphone} color="blue" />
        <MiniStat label="Credit" value={formatCurrency(stats.credit_today)} icon={CreditCard} color="orange" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Mix */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Payment Mix Today</h3>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No sales today yet</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Sales</h3>
            <Link href="/reports" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentSales.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No sales yet today</p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{sale.receipt_number}</p>
                    <p className="text-xs text-slate-500">
                      {sale.customers?.name ?? "Walk-in"} &middot;{" "}
                      {new Date(sale.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(sale.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sale.payment_method === "mpesa" ? "bg-green-100 text-green-700" :
                      sale.payment_method === "cash" ? "bg-blue-100 text-blue-700" :
                      sale.payment_method === "credit" ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {sale.payment_method.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock + Top Products */}
        <div className="space-y-4">
          {/* Low Stock Alert */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Low Stock
              </h3>
              <Link href="/inventory" className="text-xs text-blue-600 hover:underline">Manage</Link>
            </div>
            <div className="p-2 space-y-1">
              {lowStock.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">All stock levels OK</p>
              ) : (
                lowStock.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{item.name}</p>
                      <p className="text-xs text-slate-400">{item.category_name}</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                      {item.stock_quantity}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                Top Products (Month)
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">No sales this month</p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.category}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{p.qty} sold</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color, href,
}: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "red" | "orange";
  href?: string;
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600",
  };

  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition block">
        {inner}
      </Link>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
      {inner}
    </div>
  );
}

function MiniStat({
  label, value, icon: Icon, color,
}: {
  label: string; value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "orange";
}) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    orange: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
