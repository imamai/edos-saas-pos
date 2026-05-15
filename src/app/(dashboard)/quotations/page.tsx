import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QuotationsClient from "@/components/quotations/quotations-client";

export default async function QuotationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("branch_id, role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "cashier"].includes(profile.role)) redirect("/dashboard");

  const branchId = profile.branch_id ?? (await supabase.from("branches").select("id").eq("is_main", true).single()).data?.id ?? "";

  const [{ data: quotations }, { data: products }, { data: customers }] = await Promise.all([
    supabase.from("quotations").select("*, customers(name, phone)").order("created_at", { ascending: false }).limit(100),
    supabase.from("product_stock").select("*").eq("is_active", true).order("name"),
    supabase.from("customers").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <QuotationsClient
      initialQuotations={(quotations ?? []) as never}
      products={(products ?? []) as never}
      customers={(customers ?? []) as never}
      branchId={branchId}
      profileId={user.id}
    />
  );
}
