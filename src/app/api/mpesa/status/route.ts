import { NextRequest, NextResponse } from "next/server";
import { queryStkStatus } from "@/lib/mpesa/daraja";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { checkoutRequestId } = await req.json();
    if (!checkoutRequestId) {
      return NextResponse.json({ error: "checkoutRequestId required" }, { status: 400 });
    }

    const supabase = await createClient();

    // First check our own DB record
    const { data: txn } = await supabase
      .from("mpesa_transactions")
      .select("*")
      .eq("checkout_request_id", checkoutRequestId)
      .single();

    if (txn?.status === "completed") {
      return NextResponse.json({ status: "completed", receipt: txn.mpesa_receipt });
    }
    if (txn?.status === "failed") {
      return NextResponse.json({ status: "failed", message: txn.result_desc });
    }

    // Query Safaricom
    const result = await queryStkStatus(checkoutRequestId);

    let status: "pending" | "completed" | "failed" | "cancelled" = "pending";
    let message = "";

    if (result.ResultCode === "0") {
      status = "completed";
      // Update DB
      await supabase
        .from("mpesa_transactions")
        .update({ status: "completed", result_code: "0", result_desc: result.ResultDesc })
        .eq("checkout_request_id", checkoutRequestId);
    } else if (result.ResultCode) {
      status = result.ResultCode === "1032" ? "cancelled" : "failed";
      message = result.ResultDesc;
      await supabase
        .from("mpesa_transactions")
        .update({ status, result_code: result.ResultCode, result_desc: result.ResultDesc })
        .eq("checkout_request_id", checkoutRequestId);
    }

    return NextResponse.json({ status, message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
