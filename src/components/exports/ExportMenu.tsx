"use client";

import { useState } from "react";
import { downloadExport, type ExportFormat } from "@/lib/exports";
import { trackEvent } from "@/lib/traction/client";

export default function ExportMenu({
  filename,
  data,
  label = "Export",
}: {
  filename: string;
  data: unknown;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  function exportAs(format: ExportFormat) {
    downloadExport(filename, data, format);
    void trackEvent("output_exported", { format, filename });
    setOpen(false);
  }

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10">
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 min-w-36 rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-xl">
          {(["pdf", "txt", "csv", "json"] as const).map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => format === "pdf" ? window.print() : exportAs(format)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
            >
              {format === "pdf" ? "Print / PDF" : `Download ${format.toUpperCase()}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
