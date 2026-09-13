"use client";

import { useEffect, useRef, useState } from "react";
import CodeLabWorkspace from "@/components/code-lab/CodeLabWorkspace";

type SizeKey = "left" | "right" | "bottom";

const DEFAULTS = { left: 270, right: 310, bottom: 190 };
const LIMITS = {
  left: [210, 420],
  right: [240, 460],
  bottom: [120, 420],
} as const;

function clamp(value: number, [min, max]: readonly [number, number]) {
  return Math.max(min, Math.min(max, value));
}

export default function ResizableCompLabWorkspace() {
  const [sizes, setSizes] = useState(DEFAULTS);
  const [dragging, setDragging] = useState<SizeKey | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: SizeKey; startX: number; startY: number; start: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shadecode:comp-lab:panel-sizes");
      if (raw) setSizes({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("shadecode:comp-lab:panel-sizes", JSON.stringify(sizes)); } catch {}
  }, [sizes]);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      const host = hostRef.current;
      if (!drag || !host) return;
      const rect = host.getBoundingClientRect();
      const delta = drag.key === "bottom"
        ? drag.startY - event.clientY
        : drag.key === "left"
          ? event.clientX - drag.startX
          : drag.startX - event.clientX;
      const next = clamp(drag.start + delta, LIMITS[drag.key]);
      setSizes(current => ({ ...current, [drag.key]: next }));
      void rect;
    };
    const up = () => { dragRef.current = null; setDragging(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  function begin(key: SizeKey, event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      key,
      startX: event.clientX,
      startY: event.clientY,
      start: sizes[key],
    };
    setDragging(key);
  }

  function resetSizes() { setSizes(DEFAULTS); }

  return (
    <div
      ref={hostRef}
      data-comp-lab-resizable
      className={`relative ${dragging ? "select-none" : ""}`}
      style={{
        "--comp-left": `${sizes.left}px`,
        "--comp-right": `${sizes.right}px`,
        "--comp-bottom": `${sizes.bottom}px`,
      } as React.CSSProperties}
    >
      <CodeLabWorkspace />

      <style jsx global>{`
        [data-comp-lab-resizable] > div > div.grid {
          grid-template-columns: var(--comp-left) minmax(0, 1fr) var(--comp-right) !important;
        }
        [data-comp-lab-resizable] > div > div.grid > section {
          grid-template-rows: 40px minmax(0, 1fr) var(--comp-bottom) !important;
        }
        @media (max-width: 1023px) {
          [data-comp-lab-resizable] > div > div.grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          [data-comp-lab-resizable] .comp-lab-resize-handle {
            display: none;
          }
        }
      `}</style>

      <div
        role="separator"
        aria-label="Resize explorer"
        aria-orientation="vertical"
        className="comp-lab-resize-handle absolute bottom-0 left-[var(--comp-left)] top-14 z-30 w-2 -translate-x-1/2 cursor-col-resize rounded-full transition hover:bg-[var(--primary)]/30"
        onPointerDown={event => begin("left", event)}
        onDoubleClick={resetSizes}
      />
      <div
        role="separator"
        aria-label="Resize utility panel"
        aria-orientation="vertical"
        className="comp-lab-resize-handle absolute bottom-0 right-[var(--comp-right)] top-14 z-30 w-2 translate-x-1/2 cursor-col-resize rounded-full transition hover:bg-[var(--primary)]/30"
        onPointerDown={event => begin("right", event)}
        onDoubleClick={resetSizes}
      />
      <div
        role="separator"
        aria-label="Resize terminal panel"
        aria-orientation="horizontal"
        className="comp-lab-resize-handle absolute bottom-[var(--comp-bottom)] left-[var(--comp-left)] right-[var(--comp-right)] z-30 h-2 translate-y-1/2 cursor-row-resize rounded-full transition hover:bg-[var(--primary)]/30"
        onPointerDown={event => begin("bottom", event)}
        onDoubleClick={resetSizes}
      />
      {dragging && <div className="pointer-events-none absolute inset-0 z-20 bg-white/[0.01]" />}
      <button
        type="button"
        onClick={resetSizes}
        className="absolute right-2 top-16 z-40 rounded-md border border-white/10 bg-[#0d121b]/90 px-2 py-1 text-[10px] text-slate-500 opacity-0 transition hover:text-slate-200 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
        title="Reset panel sizes"
      >
        Reset layout
      </button>
    </div>
  );
}
