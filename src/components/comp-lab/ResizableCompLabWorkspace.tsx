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
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: SizeKey; startX: number; startY: number; start: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PanelSizes> & { collapsed?: Partial<Record<SizeKey, boolean>> };
      setSizes({
        left: clamp(Number(parsed.left) || DEFAULTS.left, LIMITS.left),
        right: clamp(Number(parsed.right) || DEFAULTS.right, LIMITS.right),
        bottom: clamp(Number(parsed.bottom) || DEFAULTS.bottom, LIMITS.bottom),
      });
      if (parsed.collapsed) setCollapsed({ left: false, right: false, bottom: false, ...parsed.collapsed });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sizes, collapsed }));
    } catch {}
  }, [sizes, collapsed]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const grid = root.querySelector("div.grid") as HTMLElement | null;
    const main = grid?.querySelector(":scope > main") as HTMLElement | null;
    if (!grid || !main) return;

    const left = collapsed.left ? 0 : sizes.left;
    const right = collapsed.right ? 0 : sizes.right;
    const bottom = collapsed.bottom ? 0 : sizes.bottom;

    if (window.matchMedia("(min-width: 1024px)").matches) {
      grid.style.gridTemplateColumns = `${left}px minmax(0, 1fr) ${right}px`;
      main.style.display = "grid";
      main.style.gridTemplateRows = `40px minmax(0, 1fr) ${bottom}px`;
      main.style.minHeight = "0";

      const editor = main.children.item(1) as HTMLElement | null;
      const panels = main.children.item(2) as HTMLElement | null;
      if (editor) {
        editor.style.height = "auto";
        editor.style.minHeight = "0";
      }
      if (panels) {
        panels.style.minHeight = "0";
        panels.style.maxHeight = "none";
        panels.style.overflow = "hidden";
      }
    } else {
      grid.style.gridTemplateColumns = "minmax(0, 1fr)";
      main.style.display = "grid";
      main.style.gridTemplateRows = "40px minmax(0, 1fr) 190px";
    }
  }, [sizes, collapsed]);

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const delta = drag.key === "bottom"
        ? drag.startY - event.clientY
        : drag.key === "left"
          ? event.clientX - drag.startX
          : drag.startX - event.clientX;

      setSizes((current) => ({
        ...current,
        [drag.key]: clamp(drag.start + delta, LIMITS[drag.key]),
      }));
    };

    const up = () => {
      dragRef.current = null;
      setDragging(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging]);

  function begin(key: SizeKey, event: ReactPointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      key,
      startX: event.clientX,
      startY: event.clientY,
      start: sizes[key],
    };
    setCollapsed((current) => ({ ...current, [key]: false }));
    setDragging(key);
    document.body.style.cursor = key === "bottom" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
  }

  function adjust(key: SizeKey, delta: number) {
    setCollapsed((current) => ({ ...current, [key]: false }));
    setSizes((current) => ({ ...current, [key]: clamp(current[key] + delta, LIMITS[key]) }));
  }

  function toggle(key: SizeKey) {
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetSizes() {
    setSizes(DEFAULTS);
    setCollapsed({ left: false, right: false, bottom: false });
  }

  const left = collapsed.left ? 0 : sizes.left;
  const right = collapsed.right ? 0 : sizes.right;
  const bottom = collapsed.bottom ? 0 : sizes.bottom;

  const rootStyle = {
    "--comp-left": `${left}px`,
    "--comp-right": `${right}px`,
    "--comp-bottom": `${bottom}px`,
  } as CSSProperties;

  return (
    <div ref={rootRef} data-comp-lab-resizable className={`relative mx-auto w-full max-w-[1600px] min-w-0 ${dragging ? "select-none" : ""}`} style={rootStyle}>
      <CodeLabWorkspace />

      <style jsx global>{`
        [data-comp-lab-resizable] .comp-lab-resize-handle {
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
        <div
          className="comp-lab-resize-handle pointer-events-auto absolute bottom-0 top-0 w-4 -translate-x-1/2 cursor-col-resize rounded-sm bg-transparent hover:bg-[var(--primary)]/25"
          style={{ left: `var(--comp-left)` }}
          onPointerDown={(event) => begin("left", event)}
          onDoubleClick={() => toggle("left")}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize explorer"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") adjust("left", -16);
            if (event.key === "ArrowRight") adjust("left", 16);
            if (event.key === "Home") setSizes((s) => ({ ...s, left: LIMITS.left[0] }));
            if (event.key === "End") setSizes((s) => ({ ...s, left: LIMITS.left[1] }));
            if (event.key === "Enter" || event.key === " ") toggle("left");
          }}
        />

        <div
          className="comp-lab-resize-handle pointer-events-auto absolute bottom-0 top-0 w-4 translate-x-1/2 cursor-col-resize rounded-sm bg-transparent hover:bg-[var(--primary)]/25"
          style={{ right: `var(--comp-right)` }}
          onPointerDown={(event) => begin("right", event)}
          onDoubleClick={() => toggle("right")}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize learning companion"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") adjust("right", 16);
            if (event.key === "ArrowRight") adjust("right", -16);
            if (event.key === "Home") setSizes((s) => ({ ...s, right: LIMITS.right[0] }));
            if (event.key === "End") setSizes((s) => ({ ...s, right: LIMITS.right[1] }));
            if (event.key === "Enter" || event.key === " ") toggle("right");
          }}
        />

        <div
          className="comp-lab-resize-handle pointer-events-auto absolute left-0 right-0 h-4 translate-y-1/2 cursor-row-resize rounded-sm bg-transparent hover:bg-[var(--primary)]/25"
          style={{ bottom: `var(--comp-bottom)`, left: `var(--comp-left)`, right: `var(--comp-right)` }}
          onPointerDown={(event) => begin("bottom", event)}
          onDoubleClick={() => toggle("bottom")}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize bottom panel"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") adjust("bottom", 16);
            if (event.key === "ArrowDown") adjust("bottom", -16);
            if (event.key === "Home") setSizes((s) => ({ ...s, bottom: LIMITS.bottom[0] }));
            if (event.key === "End") setSizes((s) => ({ ...s, bottom: LIMITS.bottom[1] }));
            if (event.key === "Enter" || event.key === " ") toggle("bottom");
          }}
        />

        <button type="button" onClick={resetSizes} className="pointer-events-auto absolute right-3 top-3 rounded-md border border-white/10 bg-[#0d121b]/90 px-2 py-1 text-[9px] text-slate-500 shadow-lg hover:text-slate-200" title="Reset panel sizes">
          Reset layout
        </button>
      </div>
    </div>
  );
}
