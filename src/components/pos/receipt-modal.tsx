"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Printer, X, FileText } from "lucide-react";
import InvoiceModal from "./invoice-modal";
import type { Sale } from "@/types";

interface Props {
  saleId: string;
  receiptNumber: string;
  branchId?: string;
  onClose: () => void;
}

export default function ReceiptModal({ saleId, receiptNumber, branchId, onClose }: Props) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const { settings } = useBusinessSettings(branchId);

  useEffect(() => {
    async function loadSale() {
      const { data } = await supabase
        .from("sales")
        .select(`
          *,
          customers(name, phone),
          profiles!cashier_id(full_name),
          sale_items(*, products(name, sku, unit)),
          payments(method, amount)
        `)
        .eq("id", saleId)
        .single();
      if (data) {
        const raw = data as Record<string, unknown>;
        setSale({ ...raw, items: raw.sale_items, customer: raw.customers } as unknown as Sale);
      }
    }
    loadSale();
  }, [saleId]);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=400,height=600");
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          padding: 16px; 
          background: white; 
          color: #000;
        }
        .text-center { text-align: center; }
        .font-bold, .bold { font-weight: bold; }
        .font-medium { font-weight: 500; }
        .text-base { font-size: 14px; }
        .text-xs { font-size: 10px; }
        .space-y-1 > * + * { margin-top: 4px; }
        .mb-1 { margin-bottom: 4px; }
        .pb-2 { padding-bottom: 8px; }
        .my-2 { margin: 8px 0; }
        .pl-2 { padding-left: 8px; }
        .mb-1 { margin-bottom: 4px; }
        
        .border-t { border-top: 1px solid #000; }
        .border-dashed { border-style: dashed; }
        .border-slate-300 { border-color: #cbd5e1; }
        
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        
        .text-green-600 { color: #16a34a; }
        .text-slate-800 { color: #1e293b; }
        .font-mono { font-family: 'Courier New', monospace; }
        
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-size: 14px; font-weight: bold; }
        
        @media print {
          body { padding: 12px; }
          * { page-break-inside: avoid; }
        }
      </style>
    `;
    win?.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          ${styles}
        </head>
        <body>${content}</body>
      </html>
    `);
    win?.document.close();
    setTimeout(() => {
      win?.print();
      win?.close();
    }, 250);
  }

  if (!sale) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <span className="font-semibold text-slate-800 dark:text-white text-sm">Receipt</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvoice(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Invoice
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <div ref={printRef} className="font-mono text-xs text-slate-800 space-y-1">
            {/* Header */}
            <div className="text-center space-y-0.5 pb-2">
              <p className="font-bold text-base">{settings?.company_name || "POS SYSTEM"}</p>
              {settings?.address && <p>{settings.address}</p>}
              {settings?.phone && <p>Tel: {settings.phone}</p>}
              {settings?.tax_pin && <p>PIN: {settings.tax_pin}</p>}
            </div>
            <div className="border-t border-dashed border-slate-300 my-2" />

            <div className="flex justify-between">
              <span>Receipt:</span><span className="font-bold">{sale.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span><span>{formatDate(sale.created_at)}</span>
            </div>
            {sale.customer && (
              <div className="flex justify-between">
                <span>Customer:</span><span>{(sale.customer as unknown as { name: string })?.name}</span>
              </div>
            )}
            {(sale as unknown as { profiles?: { full_name: string } }).profiles && (
              <div className="flex justify-between">
                <span>Cashier:</span><span>{(sale as unknown as { profiles: { full_name: string } }).profiles.full_name}</span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Items */}
            {(sale.items ?? []).map((item, i) => {
              const prod = ((item as unknown as Record<string, unknown>).products ?? item.product) as { name: string; sku: string } | undefined;
              return (
                <div key={i} className="mb-1">
                  <p className="font-medium">{prod?.name ?? "Item"}</p>
                  <div className="flex justify-between pl-2">
                    <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                    <span>{formatCurrency(item.total_price)}</span>
                  </div>
                  {item.discount_amount > 0 && (
                    <div className="flex justify-between pl-2 text-green-600">
                      <span>Discount</span><span>-{formatCurrency(item.discount_amount)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border-t border-dashed border-slate-300 my-2" />

            <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(sale.subtotal)}</span></div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount:</span><span>-{formatCurrency(sale.discount_amount)}</span></div>
            )}
            <div className="flex justify-between"><span>VAT (16%):</span><span>{formatCurrency(sale.tax_amount)}</span></div>
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL:</span><span>{formatCurrency(sale.total_amount)}</span>
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {(sale.payments ?? []).map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{p.method.toUpperCase()}:</span><span>{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {sale.change_amount > 0 && (
              <div className="flex justify-between font-bold">
                <span>CHANGE:</span><span>{formatCurrency(sale.change_amount)}</span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 my-2" />
            <div className="text-center space-y-0.5">
              <p className="font-bold">Thank you for shopping with us!</p>
              <p>Goods once sold are not returnable</p>
              <p>without receipt within 7 days</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showInvoice && (
      <InvoiceModal saleId={saleId} onClose={() => setShowInvoice(false)} />
    )}
  </>
  );
}
