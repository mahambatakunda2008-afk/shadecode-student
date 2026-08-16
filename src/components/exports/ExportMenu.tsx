"use client";

import { useState } from "react";
import { downloadExport, type ExportFormat } from "@/lib/exports";
import { trackEvent } from "@/lib/traction/client";

export default function ExportMenu({
  filename,
  data,
  label = "Export",
  exportType = "generic",
  sourceType,
  sourceId,
}: {
  filename: string;
  data: unknown;
  label?: string;
  exportType?: string;
  sourceType?: string;
  sourceId?: string;
}) {
  const [open, setOpen] = useState(false);

  function exportAs(format: ExportFormat) {
    downloadExport(filename, data, format, { exportType, sourceType, sourceId });
    void trackEvent("output_exported", { format, filename, exportType, sourceType, sourceId });
    setOpen(false);
  }

  function printAsPdf() {
    window.print();
    void fetch("/api/exports/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ format: "pdf", exportType, sourceType, sourceId, metadata: { filename } }),
    }).catch(() => undefined);
    void trackEvent("output_exported", { format: "pdf", filename, exportType, sourceType, sourceId });
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10">
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 min-w-36 rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-xl">
          <button type="button" onClick={printAsPdf} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">Print / PDF</button>
          {(["txt", "csv", "json"] as const).map((format) => (
            <button key={format} type="button" onClick={() => exportAs(format)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">
              Download {format.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
