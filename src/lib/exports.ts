export type ExportFormat = "json" | "csv" | "txt";

function csvCell(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadExport(
  filename: string,
  data: unknown,
  format: ExportFormat,
) {
  if (typeof window === "undefined") return;

  let body = "";
  let mime = "text/plain;charset=utf-8";
  let extension = format;

  if (format === "json") {
    body = JSON.stringify(data, null, 2);
    mime = "application/json;charset=utf-8";
  } else if (format === "csv") {
    const rows = Array.isArray(data) ? data : [data];
    const keys = Array.from(new Set(rows.flatMap((row) => row && typeof row === "object" ? Object.keys(row as Record<string, unknown>) : [])));
    body = [keys.map(csvCell).join(","), ...rows.map((row) => keys.map((key) => csvCell((row as Record<string, unknown>)?.[key])).join(","))].join("\n");
    mime = "text/csv;charset=utf-8";
  } else {
    body = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  }

  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.${extension}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
