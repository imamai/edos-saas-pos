"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, generateReceiptNumber } from "@/lib/utils";
import { toast } from "sonner";
import type { CartItem, Customer, PaymentMethod } from "@/types";
import {
  DollarSign, Smartphone, CreditCard, Users, X,
  CheckCircle2, Loader2, AlertCircle, Plus
} from "lucide-react";
import MpesaPayment from "./mpesa-payment";

interface PaymentModalProps {
  total: number;
  customer: Customer | null;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  onClose: () => void;
  onSuccess: (saleId: string, receipt: string) => void;
}

type Step = "method" | "cash" | "card" | "mpesa" | "credit" | "split" | "processing" | "done";

export default function PaymentModal({
  total, customer, items, subtotal, discountAmount, taxAmount, onClose, onSuccess
}: PaymentModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("method");
  const [cashGiven, setCashGiven] = useState<number>(total);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: number }[]>([
    { method: "cash", amount: total },
  ]);
  const [processing, setProcessing] = useState(false);

  const change = Math.max(0, cashGiven - total);

  async function completeSale(method: PaymentMethod, pmts: { method: string; amount: number }[]) {
    setProcessing(true);
    setStep("processing");

    const receipt = generateReceiptNumber();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("branch_id").eq("id", user!.id).single();

    let branchId = profile?.branch_id as string | null ?? null;
    if (!branchId) {
      const { data: branch } = await supabase.from("branches").select("id").eq("is_main", true).single();
      branchId = branch?.id ?? null;
    }

    if (!branchId) {
      toast.error("No branch configured. Contact your administrator.");
      setStep("method");
      setProcessing(false);
      return;
    }

    const res = await fetch("/api/sales/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        saleData: {
          receipt_number: receipt,
          customer_id: customer?.id ?? null,
          status: "completed",
          subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: total,
          paid_amount: pmts.reduce((s, p) => s + p.amount, 0),
          change_amount: method === "cash" ? change : 0,
          payment_method: method,
        },
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_amount: i.discount_amount,
          tax_amount: i.tax_amount,
          total_price: i.total_price,
        })),
        payments: pmts,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error("Sale failed: " + (json.error ?? "Unknown error"));
      setStep("method");
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setStep("done");
    setTimeout(() => onSuccess(json.sale.id, receipt), 800);
  }

  if (step === "processing") {
    return (
      <ModalWrapper onClose={() => {}}>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Processing payment…</p>
        </div>
      </ModalWrapper>
    );
  }

  if (step === "done") {
    return (
      <ModalWrapper onClose={() => {}}>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
          <p className="text-xl font-bold text-slate-800 dark:text-white">Payment Successful!</p>
          <p className="text-slate-500">Generating receipt…</p>
        </div>
      </ModalWrapper>
    );
  }

  if (step === "mpesa") {
    return (
      <ModalWrapper onClose={() => setStep("method")}>
        <MpesaPayment
          amount={total}
          customer={customer}
          onSuccess={() => completeSale("mpesa", [{ method: "mpesa", amount: total }])}
          onCancel={() => setStep("method")}
        />
      </ModalWrapper>
    );
  }

  if (step === "cash") {
    return (
      <ModalWrapper onClose={() => setStep("method")}>
        <div className="p-6 space-y-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Cash Payment</h3>
          <div className="text-center">
            <p className="text-sm text-slate-500">Amount Due</p>
            <p className="text-4xl font-bold text-blue-600">{formatCurrency(total)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Cash Given
            </label>
            <input
              type="number"
              value={cashGiven}
              onChange={(e) => setCashGiven(Number(e.target.value))}
              className="w-full px-4 py-3 text-2xl font-bold text-center border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[total, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000, Math.ceil(total / 2000) * 2000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCashGiven(amt)}
                  className="py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 transition"
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          {cashGiven >= total && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
              <p className="text-sm text-green-600">Change</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(change)}</p>
            </div>
          )}

          {cashGiven < total && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">Cash given is less than amount due</p>
            </div>
          )}

          <button
            disabled={cashGiven < total}
            onClick={() => completeSale("cash", [{ method: "cash", amount: total }])}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-lg transition"
          >
            Confirm Cash Payment
          </button>
        </div>
      </ModalWrapper>
    );
  }

  if (step === "credit") {
    if (!customer) {
      return (
        <ModalWrapper onClose={() => setStep("method")}>
          <div className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Customer Required</h3>
            <p className="text-slate-500 text-sm">Please add a customer to the cart before using credit sale.</p>
            <button onClick={() => setStep("method")} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium">
              Go Back
            </button>
          </div>
        </ModalWrapper>
      );
    }

    const availableCredit = customer.credit_limit - customer.outstanding_balance;
    const canCredit = availableCredit >= total;

    return (
      <ModalWrapper onClose={() => setStep("method")}>
        <div className="p-6 space-y-5">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Credit Sale</h3>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-white">{customer.name}</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Credit Limit</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(customer.credit_limit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Outstanding</span>
              <span className="font-medium text-red-600">{formatCurrency(customer.outstanding_balance)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-600 pt-2">
              <span className="text-slate-500">Available</span>
              <span className={`font-bold ${canCredit ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(availableCredit)}
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-500">Amount to Credit</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(total)}</p>
          </div>

          {!canCredit && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">Insufficient credit limit</p>
            </div>
          )}

          <button
            disabled={!canCredit}
            onClick={() => completeSale("credit", [{ method: "credit", amount: total }])}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-lg transition"
          >
            Confirm Credit Sale
          </button>
        </div>
      </ModalWrapper>
    );
  }

  // Default: method selection
  return (
    <ModalWrapper onClose={onClose}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Select Payment Method</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-500">Total Amount Due</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{formatCurrency(total)}</p>
          {customer && (
            <p className="text-sm text-slate-500 mt-1">Customer: <span className="font-medium text-slate-700 dark:text-slate-300">{customer.name}</span></p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PayMethodBtn icon={DollarSign} label="Cash" color="green" onClick={() => setStep("cash")} />
          <PayMethodBtn icon={Smartphone} label="M-Pesa" color="green" onClick={() => setStep("mpesa")} />
          <PayMethodBtn icon={CreditCard} label="Card" color="blue" onClick={() => completeSale("card", [{ method: "card", amount: total }])} />
          <PayMethodBtn icon={Users} label="Credit" color="orange" onClick={() => setStep("credit")} />
        </div>
      </div>
    </ModalWrapper>
  );
}

function PayMethodBtn({
  icon: Icon, label, color, onClick,
}: { icon: React.ComponentType<{ className?: string }>; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    green: "border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700",
    blue: "border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-700",
    orange: "border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-700",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition ${colors[color] ?? colors.blue}`}
    >
      <Icon className="w-8 h-8" />
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function ModalWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
