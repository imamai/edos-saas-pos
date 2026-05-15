"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { Printer, X } from "lucide-react";

interface Props {
  saleId: string;
  branchId?: string;
  onClose: () => void;
}

export default function InvoiceModal({ saleId, branchId, onClose }: Props) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Record<string, unknown> | null>(null);
  const { settings } = useBusinessSettings(branchId);

  useEffect(() => {
    supabase
      .from("sales")
      .select(`*, customers(name, phone, email, address, id_number), profiles!cashier_id(full_name), sale_items(*, products(name, sku, unit)), payments(method, amount)`)
      .eq("id", saleId)
      .single()
      .then(({ data }) => {
        if (data) setSale(data as Record<string, unknown>);
      });
  }, [saleId]);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=1200");
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 13px; 
          color: #1e293b; 
          padding: 40px 20px;
          background: white;
          line-height: 1.5;
        }
        
        /* Layout utilities */
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .items-start { align-items: flex-start; }
        .w-full { width: 100%; }
        .w-64 { width: 16rem; }
        .w-40 { width: 10rem; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        /* Spacing */
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-8 { margin-top: 2rem; }
        .pt-2 { padding-top: 0.5rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .px-4 { padding: 0 1rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .py-2 { padding: 0.5rem 0; }
        .py-4 { padding: 1rem 0; }
        .p-4 { padding: 1rem; }
        .p-8 { padding: 2rem; }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        
        /* Text styles */
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; }
        .text-base { font-size: 14px; }
        .text-2xl { font-size: 22px; }
        .text-3xl { font-size: 28px; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .font-extrabold { font-weight: 800; }
        .italic { font-style: italic; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        .leading-relaxed { line-height: 1.625; }
        
        /* Colors - Text */
        .text-white { color: white; }
        .text-slate-400 { color: #cbd5e1; }
        .text-slate-500 { color: #64748b; }
        .text-slate-600 { color: #475569; }
        .text-slate-800 { color: #1e293b; }
        .text-slate-50 { color: #f8fafc; }
        .text-blue-700 { color: #1e40af; }
        .text-green-600 { color: #16a34a; }
        .text-orange-700 { color: #b45309; }
        
        /* Colors - Background */
        .bg-white { background: white; }
        .bg-slate-50 { background: #f8fafc; }
        .bg-blue-700 { background: #1e40af; }
        .bg-blue-50 { background: #f0f9ff; }
        .bg-green-100 { background: #dcfce7; }
        .bg-green-700 { background: #15803d; }
        .bg-orange-100 { background: #fed7aa; }
        
        /* Borders */
        .border { border: 1px solid #e2e8f0; }
        .border-t { border-top: 1px solid #e2e8f0; }
        .border-b { border-bottom: 1px solid #e2e8f0; }
        .border-slate-200 { border-color: #e2e8f0; }
        .border-slate-400 { border-color: #94a3b8; }
        .border-blue-100 { border-color: #bae6fd; }
        .border-blue-700 { border-color: #1e40af; }
        .rounded-full { border-radius: 9999px; }
        .rounded-xl { border-radius: 12px; }
        
        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        thead tr { background: #1e40af; color: white; }
        th { 
          padding: 10px 12px; 
          font-size: 12px; 
          font-weight: 600; 
          text-align: left; 
          background: #1e40af;
          color: white;
          border: 1px solid #1e40af;
        }
        th:last-child { text-align: right; }
        td { 
          padding: 10px 12px; 
          font-size: 13px; 
          border-bottom: 1px solid #f1f5f9;
        }
        td:last-child { text-align: right; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody tr:nth-child(odd) { background: white; }
        
        /* Dividers & Lines */
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
        
        /* Inline badge */
        .inline-block { display: inline-block; }
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        
        @media print {
          body { padding: 20px; }
          * { page-break-inside: avoid; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      </style>
    `;
    win?.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
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

  const customer = sale.customers as Record<string, string> | null;
  const cashier = (sale as Record<string, unknown>).profiles as Record<string, string> | null;
  const items = (sale.sale_items as Record<string, unknown>[]) ?? [];
  const payments = (sale.payments as { method: string; amount: number }[]) ?? [];
  const isPaid = sale.status === "completed";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <span className="font-semibold text-slate-800 dark:text-white">Tax Invoice</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="overflow-y-auto flex-1 p-6">
          <div ref={printRef} className="bg-white text-slate-800 p-8 max-w-2xl mx-auto text-sm">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-2xl font-extrabold text-blue-700">{settings?.company_name || "POS SYSTEM"}</p>
                <p className="text-slate-500 mt-1 leading-relaxed text-xs">
                  {settings?.address && <>{settings.address}<br /></>}
                  {settings?.phone && <>Tel: {settings.phone}<br /></>}
                  {settings?.email && <>Email: {settings.email}<br /></>}
                  {settings?.tax_pin && <>PIN: {settings.tax_pin}</>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-700">TAX INVOICE</p>
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <p><span className="font-semibold text-slate-700">Invoice #:</span> {String(sale.receipt_number)}</p>
                  <p><span className="font-semibold text-slate-700">Date:</span> {formatDateOnly(String(sale.created_at))}</p>
                  <p><span className="font-semibold text-slate-700">Cashier:</span> {cashier?.full_name ?? "—"}</p>
                </div>
              </div>
            </div>

            <hr className="border-slate-200 mb-6" />

            {/* Bill To */}
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
              {customer ? (
                <div className="text-sm leading-relaxed">
                  <p className="font-semibold text-slate-800">{customer.name}</p>
                  {customer.phone && <p className="text-slate-500">Tel: {customer.phone}</p>}
                  {customer.email && <p className="text-slate-500">Email: {customer.email}</p>}
                  {customer.id_number && <p className="text-slate-500">ID/PIN: {customer.id_number}</p>}
                </div>
              ) : (
                <p className="text-slate-500 italic">Walk-in Customer</p>
              )}
            </div>

            {/* Items Table */}
            <table className="w-full text-sm mb-6 border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="px-3 py-2 text-left font-semibold">SKU</th>
                  <th className="px-3 py-2 text-center font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const prod = item.products as Record<string, string> | null;
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{prod?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{prod?.sku ?? "—"}</td>
                      <td className="px-3 py-2 text-center">{Number(item.quantity)} {prod?.unit ?? ""}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unit_price))}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.total_price))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatCurrency(Number(sale.subtotal))}</span>
                </div>
                {Number(sale.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(Number(sale.discount_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>VAT (16%)</span>
                  <span>{formatCurrency(Number(sale.tax_amount))}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-blue-700 pt-2 mt-2 text-blue-700">
                  <span>TOTAL</span>
                  <span>{formatCurrency(Number(sale.total_amount))}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Payment Details</p>
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">{p.method}</span>
                  <span className="font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {Number(sale.change_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600 mt-1">
                  <span>Change Given</span>
                  <span>{formatCurrency(Number(sale.change_amount))}</span>
                </div>
              )}
              <div className="mt-2">
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${isPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {isPaid ? "PAID" : "PENDING"}
                </span>
              </div>
            </div>

            {/* Signature */}
            <div className="flex justify-between mt-8 mb-4">
              <div className="text-center">
                <div className="w-40 border-t border-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Authorized Signature</p>
              </div>
              <div className="text-center">
                <div className="w-40 border-t border-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Customer Signature</p>
              </div>
            </div>

            {/* Footer */}
            <hr className="border-slate-200 mb-3" />
            <div className="text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-500">Terms & Conditions</p>
              <p>• Goods once sold are not returnable without this invoice within 7 days.</p>
              <p>• Warranty claims must be accompanied by this invoice.</p>
              <p>• This is a computer-generated document and does not require a physical signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
