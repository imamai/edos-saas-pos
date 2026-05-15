import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback" });
    }

    const { CheckoutRequestID, MerchantRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback;
    const supabase = await createClient();

    let receiptNumber: string | undefined;
    let transactionDate: string | undefined;
    let phoneNumber: string | undefined;
    let amount: number | undefined;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case "MpesaReceiptNumber": receiptNumber = item.Value; break;
          case "TransactionDate": transactionDate = String(item.Value); break;
          case "PhoneNumber": phoneNumber = String(item.Value); break;
          case "Amount": amount = Number(item.Value); break;
        }
      }
    }

    await supabase
      .from("mpesa_transactions")
      .update({
        status: ResultCode === 0 ? "completed" : "failed",
        result_code: String(ResultCode),
        result_desc: ResultDesc,
        mpesa_receipt: receiptNumber,
        transaction_date: transactionDate
          ? new Date(
              transactionDate.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6")
            ).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("checkout_request_id", CheckoutRequestID);

    console.log(`M-Pesa callback: ${CheckoutRequestID} → ${ResultCode === 0 ? "SUCCESS" : "FAILED"} (${ResultDesc})`);

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Error" });
  }
}
