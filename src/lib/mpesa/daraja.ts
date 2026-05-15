// Safaricom Daraja API Integration

const DARAJA_BASE = process.env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const resp = await fetch(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!resp.ok) throw new Error(`M-Pesa auth failed: ${resp.statusText}`);
  const data = await resp.json();
  return data.access_token;
}

function generatePassword(timestamp: string): string {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);
}

export interface STKPushParams {
  phone: string;
  amount: number;
  accountRef?: string;
  description?: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function initiateStkPush(params: STKPushParams): Promise<STKPushResponse> {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const callbackUrl = process.env.MPESA_CALLBACK_URL
    ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/callback`;

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(params.amount),
    PartyA: params.phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: params.phone,
    CallBackURL: callbackUrl,
    AccountReference: params.accountRef ?? "EDOS POS",
    TransactionDesc: params.description ?? "Payment for goods",
  };

  const resp = await fetch(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`STK Push failed: ${err}`);
  }

  return resp.json();
}

export interface STKQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export async function queryStkStatus(checkoutRequestId: string): Promise<STKQueryResponse> {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const resp = await fetch(`${DARAJA_BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({})) as Record<string, string>;
    // Daraja returns non-2xx while transaction is still being processed — treat as pending
    if (errBody.errorCode) {
      return {
        ResponseCode: "0",
        ResponseDescription: "Accepted",
        MerchantRequestID: "",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: "",
        ResultDesc: errBody.errorMessage ?? "Transaction in progress",
      };
    }
    throw new Error(`STK Query failed: ${resp.statusText}`);
  }

  return resp.json();
}
