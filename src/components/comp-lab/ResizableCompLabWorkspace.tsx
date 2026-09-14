"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import CodeLabWorkspace from "@/components/code-lab/CodeLabWorkspace";

type SizeKey = "left" | "right" | "bottom";
type PanelSizes = Record<SizeKey, number>;

const DEFAULTS: PanelSizes = { left: 270, right: 310, bottom: 190 };
const LIMITS = { left: [210, 420], right: [240, 460], bottom: [120, 420] } as const;
const STORAGE_KEY = "shadecode:comp-lab:panel-sizes";

function clamp(value: number, [min, max]: readonly [number, number]) {
  return Math.max(min, Math.min(max, value));
}

export default function ResizableCompLabWorkspace() {
  const [sizes, setSizes] = useState<PanelSizes>(DEFAULTS);
  const [collapsed, setCollapsed] = useState<Record<SizeKey, boolean>>({ left: false, right: false, bottom: false });
  const [dragging, setDragging] = useState<SizeKey | null>(null);
  const dragRef = useRef<{ key: SizeKey; startX: number; startY: number; start: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PanelSizes> & { collapsed?: Partial<Record<SizeKey, boolean>> };
      setSizes({ left: clamp(Number(parsed.left) || DEFAULTS.left, LIMITS.left), right: clamp(Number(parsed.right) || DEFAULTS.right, LIMITS.right), bottom: clamp(Number(parsed.bottom) || DEFAULTS.bottom, LIMITS.bottom) });
      if (parsed.collapsed) setCollapsed({ left: false, right: false, bottom: false, ...parsed.collapsed });
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sizes, collapsed })); } catch {}
  }, [sizes, collapsed]);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = drag.key === "bottom" ? drag.startY - event.clientY : drag.key === "left" ? event.clientX - drag.startX : drag.startX - event.clientX;
      setSizes((current) => ({ ...current, [drag.key]: clamp(drag.start + delta, LIMITS[drag.key]) }));
    };
    const up = () => { dragRef.current = null; setDragging(null); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [dragging]);

  function begin(key: SizeKey, event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(key);
    dragRef.current = { key, startX: event.clientX, startY: event.clientY, start: sizes[key] };
  }

  function adjust(key: SizeKey, delta: number) {
    setCollapsed((current) => ({ ...current, [key]: false }));
    setSizes((current) => ({ ...current, [key]: clamp(current[key] + delta, LIMITS[key]) }));
  }

  function toggle(key: SizeKey) { setCollapsed((current) => ({ ...current, [key]: !current[key] })); }
  function resetSizes() { setSizes(DEFAULTS); setCollapsed({ left: false, right: false, bottom: false }); }

  const left = collapsed.left ? 0 : sizes.left;
  const right = collapsed.right ? 0 : sizes.right;
  const bottom = collapsed.bottom ? 0 : sizes.bottom;

  return (
    <div data-comp-lab-resizable className={`relative min-w-0 ${dragging ? "select-none" : ""}`} style={{ "--comp-left": `${left}px`, "--comp-right": `${right}px`, "--comp-bottom": `${bottom}px` } as CSSProperties}>
      <CodeLabWorkspace />
      <style jsx global>{`
        [data-comp-lab-resizable] > main > div[class*="lg:grid-cols-"] { grid-template-columns: var(--comp-left) minmax(0, 1fr) var(--comp-right) !important; }
        [data-comp-lab-resizable] > main > div[class*="lg:grid-cols-"] > section { grid-template-rows: 42px minmax(0, 1fr) var(--comp-bottom) !important; }
        [data-comp-lab-resizable] .comp-lab-resize-handle { touch-action: none; user-select: none; }
        @media (max-width: 1023px) {
          [data-comp-lab-resizable] > main > div[class*="lg:grid-cols-"] { grid-template-columns: minmax(0, 1fr) !important; }
          [data-comp-lab-resizable] .comp-lab-resize-handle { display: none; }
        }
      `}</style>

      <div role="separator" tabIndex={0} aria-label="Resize explorer panel" aria-orientation="vertical" aria-valuenow={sizes.left} aria-valuemin={LIMITS.left[0]} aria-valuemax={LIMITS.left[1]} className="comp-lab-resize-handle absolute bottom-0 left-[var(--comp-left)] top-14 z-30 w-3 -translate-x-1/2 cursor-col-resize rounded-full focus:outline-none" onPointerDown={(event) => begin("left", event)} onDoubleClick={() => toggle("left")} onKeyDown={(event) => { if (event.key === "ArrowLeft") adjust("left", -20); if (event.key === "ArrowRight") adjust("left", 20); if (event.key === "Enter" || event.key === " ") toggle("left"); if (event.key === "Home") setSizes((current) => ({ ...current, left: LIMITS.left[0] })); if (event.key === "End") setSizes((current) => ({ ...current, left: LIMITS.left[1] })); }} />
      <div role="separator" tabIndex={0} aria-label="Resize utility panel" aria-orientation="vertical" aria-valuenow={sizes.right} aria-valuemin={LIMITS.right[0]} aria-valuemax={LIMITS.right[1]} className="comp-lab-resize-handle absolute bottom-0 right-[var(--comp-right)] top-14 z-30 w-3 translate-x-1/2 cursor-col-resize rounded-full focus:outline-none" onPointerDown={(event) => begin("right", event)} onDoubleClick={() => toggle("right")} onKeyDown={(event) => { if (event.key === "ArrowLeft") adjust("right", 20); if (event.key === "ArrowRight") adjust("right", -20); if (event.key === "Enter" || event.key === " ") toggle("right"); if (event.key === "Home") setSizes((current) => ({ ...current, right: LIMITS.right[0] })); if (event.key === "End") setSizes((current) => ({ ...current, right: LIMITS.right[1] })); }} />
      <div role="separator" tabIndex={0} aria-label="Resize bottom panel" aria-orientation="horizontal" aria-valuenow={sizes.bottom} aria-valuemin={LIMITS.bottom[0]} aria-valuemax={LIMITS.bottom[1]} className="comp-lab-resize-handle absolute bottom-[var(--comp-bottom)] left-[var(--comp-left)] right-[var(--comp-right)] z-30 h-3 translate-y-1/2 cursor-row-resize rounded-full focus:outline-none" onPointerDown={(event) => begin("bottom", event)} onDoubleClick={() => toggle("bottom")} onKeyDown={(event) => { if (event.key === "ArrowUp") adjust("bottom", 20); if (event.key === "ArrowDown") adjust("bottom", -20); if (event.key === "Enter" || event.key === " ") toggle("bottom"); if (event.key === "Home") setSizes((current) => ({ ...current, bottom: LIMITS.bottom[0] })); if (event.key === "End") setSizes((current) => ({ ...current, bottom: LIMITS.bottom[1] })); }} />

      <div className="absolute right-2 top-16 z-40 flex items-center gap-1 rounded-lg border border-white/10 bg-[#0d121b]/95 p-1 shadow-xl opacity-0 transition hover:opacity-100 focus-within:opacity-100">
        <button type="button" onClick={() => toggle("left")} className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200">Explorer</button>
        <button type="button" onClick={() => toggle("right")} className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200">Assistant</button>
        <button type="button" onClick={() => toggle("bottom")} className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5 hover:text-slate-200">Panel</button>
        <button type="button" onClick={resetSizes} className="rounded px-2 py-1 text-[10px] text-slate-500 hover:bg-white/5 hover:text-slate-200">Reset</button>
      </div>
    </div>
  );
}
