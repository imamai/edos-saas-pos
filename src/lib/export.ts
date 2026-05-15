import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn = { header: string; key: string; width?: number };
export type ExportFormat = "csv" | "excel" | "pdf";

// ---------- CSV ----------
function toCSV(columns: ExportColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => `"${c.header}"`).join(",");
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [header, ...body].join("\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  filename: string
) {
  const csv = toCSV(columns, rows);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

// ---------- Excel ----------
export function exportExcel(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1"
) {
  const wsData = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => row[c.key] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));

  // Bold header row
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) cell.s = { font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ---------- PDF ----------
export function exportPDF(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  filename: string,
  title: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${filename}.pdf`);
}

// ---------- Unified entry ----------
export function exportData(
  format: ExportFormat,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  filename: string,
  title: string
) {
  if (format === "csv") exportCSV(columns, rows, filename);
  else if (format === "excel") exportExcel(columns, rows, filename);
  else exportPDF(columns, rows, filename, title);
}
