"use client";

import { useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileText, FileSpreadsheet, FileDown } from "lucide-react";
import { exportData, type ExportColumn, type ExportFormat } from "@/lib/export";

interface ExportMenuProps {
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  filename: string;
  title: string;
  disabled?: boolean;
}

const formats: { value: ExportFormat; label: string; icon: React.ElementType; color: string }[] = [
  { value: "csv",   label: "CSV",          icon: FileText,        color: "text-green-600" },
  { value: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet, color: "text-emerald-600" },
  { value: "pdf",   label: "PDF",           icon: FileDown,        color: "text-red-600" },
];

export default function ExportMenu({ columns, rows, filename, title, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handle(format: ExportFormat) {
    setOpen(false);
    exportData(format, columns, rows, filename, title);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || rows.length === 0}
        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-30 min-w-36 overflow-hidden">
          {formats.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => handle(value)}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
