import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authenticated
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { saleData, items, payments, branchId } = await req.json();

    const supabase = serviceClient();

    // 1. Create sale
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({ ...saleData, cashier_id: user.id, branch_id: branchId })
      .select()
      .single();

    if (saleErr || !sale) {
      return NextResponse.json({ error: saleErr?.message ?? "Failed to create sale" }, { status: 400 });
    }

    // 2. Insert sale items
    if (items.length > 0) {
      const { error: itemsErr } = await supabase
        .from("sale_items")
        .insert(items.map((i: Record<string, unknown>) => ({ ...i, sale_id: sale.id })));

      if (itemsErr) {
        await supabase.from("sales").delete().eq("id", sale.id);
        return NextResponse.json({ error: itemsErr.message }, { status: 400 });
      }
    }

    // 3. Insert payments
    if (payments.length > 0) {
      const { error: payErr } = await supabase
        .from("payments")
        .insert(payments.map((p: Record<string, unknown>) => ({ ...p, sale_id: sale.id, status: "completed" })));

      if (payErr) {
        return NextResponse.json({ error: payErr.message }, { status: 400 });
      }
    }

    // 4. Decrement inventory
    for (const item of items as { product_id: string; quantity: number }[]) {
      await supabase.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_branch_id: branchId,
        p_quantity: item.quantity,
      });
    }

    return NextResponse.json({ sale });
  } catch (err) {
    console.error("Complete sale error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
