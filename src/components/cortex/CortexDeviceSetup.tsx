"use client";

import { useEffect, useState } from "react";
import { Download, HardDrive, Loader2, WifiOff, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { getCortexDeviceProfile } from "@/lib/cortex/runtime/capabilities";
import {
  isLocalCortexPrepared,
  LOCAL_CORTEX_RUNTIME_EVENT,
  localWebCortexRuntime,
} from "@/lib/cortex/runtime/localWebRuntime";

const DISMISS_KEY = "shadecode:cortex:local-setup-dismissed:v1";

export default function CortexDeviceSetup() {
  const pathname = usePathname();
  const [prepared, setPrepared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [online, setOnline] = useState(true);
  const [suitable, setSuitable] = useState(true);

  useEffect(() => {
    setPrepared(isLocalCortexPrepared());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setOnline(navigator.onLine);
    setSuitable(getCortexDeviceProfile().suitableForLocalInference);

    const sync = () => {
      setPrepared(isLocalCortexPrepared());
      setOnline(navigator.onLine);
    };
    const onRuntime = () => sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener(LOCAL_CORTEX_RUNTIME_EVENT, onRuntime);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener(LOCAL_CORTEX_RUNTIME_EVENT, onRuntime);
    };
  }, []);

  if (pathname !== "/learn" || prepared || dismissed) return null;

  async function prepare() {
    if (!online || !suitable || busy) return;
    setBusy(true);
    setError(null);
    setProgress(1);
    try {
      await localWebCortexRuntime.warm(setProgress);
      setPrepared(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cortex could not prepare on this device.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <aside className="fixed bottom-5 left-4 right-4 z-[9999] mx-auto max-w-xl rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-2xl md:left-auto md:right-5" role="dialog" aria-label="Prepare Cortex on this device">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--primary-glow)] text-[var(--primary)]">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold">Prepare Cortex for this device</p>
              <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
                Download the local Qwen 2.5 0.5B teaching model once. After it is cached, Cortex can generate lessons without sending the request to the cloud.
              </p>
            </div>
            {!busy && <button type="button" onClick={dismiss} className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface)]" aria-label="Dismiss"><X className="h-4 w-4" /></button>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1"><HardDrive className="h-3.5 w-3.5" /> ~800 MB once</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1">WebGPU / WASM</span>
            {!online && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1"><WifiOff className="h-3.5 w-3.5" /> Connect first</span>}
          </div>

          {!suitable && <p className="mt-3 text-sm leading-5 text-[var(--muted-foreground)]">This device does not currently look suitable for local inference. Shadecode will keep the cloud path available when you are online.</p>}
          {error && <p className="mt-3 text-sm leading-5 text-[var(--muted-foreground)]" role="alert">{error}</p>}

          {busy && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-semibold"><span>Preparing the model</span><span className="tabular-nums">{progress}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => void prepare()} disabled={!online || !suitable || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy ? "Preparing Cortex…" : "Prepare Cortex"}
            </button>
            {!busy && <span className="text-xs text-[var(--muted-foreground)]">You can keep studying while it prepares.</span>}
          </div>
        </div>
      </div>
    </aside>
  );
}
