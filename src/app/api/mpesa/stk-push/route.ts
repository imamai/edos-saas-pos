import { NextRequest, NextResponse } from "next/server";
import { initiateStkPush } from "@/lib/mpesa/daraja";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { phone, amount, saleRef } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json({ error: "Phone and amount are required" }, { status: 400 });
    }

    const result = await initiateStkPush({
      phone,
      amount,
      accountRef: saleRef ?? "EDOS POS",
      description: "Payment for goods",
    });

    if (result.ResponseCode !== "0") {
      return NextResponse.json({ error: result.ResponseDescription }, { status: 400 });
    }

    // Log transaction in DB
    const supabase = await createClient();
    await supabase.from("mpesa_transactions").insert({
      checkout_request_id: result.CheckoutRequestID,
      merchant_request_id: result.MerchantRequestID,
      amount,
      phone_number: phone,
      status: "pending",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("STK Push error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "STK Push failed" },
      { status: 500 }
    );
  }
}
