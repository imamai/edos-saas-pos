import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDateOnly(date: string | Date): string {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(
    new Date(date)
  );
}

export function generateReceiptNumber(): string {
  const prefix = "RCP";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
}

export function generateOrderNumber(): string {
  const prefix = "ORD";
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}`;
}

export function generateInvoiceNumber(): string {
  const prefix = "INV";
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}`;
}

export function generateQuoteNumber(): string {
  const prefix = "QUO";
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}`;
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + "..." : str;
}

export function calculateVAT(amount: number, vatRate = 16): number {
  return (amount * vatRate) / 100;
}

export function calculateTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateSKU(category: string, productName: string): string {
  const cat = category.substring(0, 3).toUpperCase();
  const prod = productName.substring(0, 3).toUpperCase();
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${cat}-${prod}-${rand}`;
}
