import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [
    { data: todaySales },
    { data: weekSales },
    { data: monthSales },
    { data: lowStock },
    { data: recentSales },
    { data: topProducts },
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("total_amount, payment_method")
      .gte("created_at", `${today}T00:00:00`)
      .eq("status", "completed"),
    supabase
      .from("sales")
      .select("total_amount, created_at")
      .gte("created_at", `${weekAgo}T00:00:00`)
      .eq("status", "completed"),
    supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", `${monthStart}T00:00:00`)
      .eq("status", "completed"),
    supabase
      .from("product_stock")
      .select("id, name, stock_quantity, reorder_level, category_name")
      .filter("stock_quantity", "lte", "reorder_level")
      .eq("is_active", true)
      .limit(10),
    supabase
      .from("sales")
      .select(`
        id, receipt_number, total_amount, payment_method, created_at,
        customers(name), profiles!cashier_id(full_name)
      `)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("sale_items")
      .select(`product_id, quantity, products(name, category_id, categories(name))`)
      .gte("created_at", `${monthStart}T00:00:00`)
      .limit(100),
  ]);

  const stats = {
    today_sales: todaySales?.length ?? 0,
    today_revenue: todaySales?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
    week_revenue: weekSales?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
    month_revenue: monthSales?.reduce((s, r) => s + r.total_amount, 0) ?? 0,
    low_stock_count: lowStock?.length ?? 0,
    cash_today: todaySales?.filter((s) => s.payment_method === "cash").reduce((s, r) => s + r.total_amount, 0) ?? 0,
    mpesa_today: todaySales?.filter((s) => s.payment_method === "mpesa").reduce((s, r) => s + r.total_amount, 0) ?? 0,
    credit_today: todaySales?.filter((s) => s.payment_method === "credit").reduce((s, r) => s + r.total_amount, 0) ?? 0,
  };

  // Build 7-day chart
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dStr = d.toISOString().split("T")[0];
    const dayRevenue = weekSales?.filter((s) => s.created_at.startsWith(dStr)).reduce((s, r) => s + r.total_amount, 0) ?? 0;
    return {
      date: d.toLocaleDateString("en-KE", { weekday: "short" }),
      revenue: dayRevenue,
    };
  });

  // Aggregate top products
  const productMap = new Map<string, { name: string; qty: number; category: string }>();
  topProducts?.forEach((item) => {
    const key = item.product_id;
    const prod = (item.products as unknown) as { name: string; categories: { name: string } | null } | null;
    if (!productMap.has(key)) {
      productMap.set(key, {
        name: prod?.name ?? "Unknown",
        qty: 0,
        category: prod?.categories?.name ?? "",
      });
    }
    const entry = productMap.get(key)!;
    entry.qty += Number(item.quantity);
  });
  const topProductList = [...productMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <DashboardClient
      stats={stats}
      chartData={chartData}
      lowStock={(lowStock ?? []) as Parameters<typeof DashboardClient>[0]["lowStock"]}
      recentSales={(recentSales ?? []) as unknown as Parameters<typeof DashboardClient>[0]["recentSales"]}
      topProducts={topProductList}
    />
  );
}
