"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "shadecode:android-release-notice:dismissed:v1";

export default function AppInstallNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname === "/download") return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "true") return;
    } catch {}
    setVisible(true);
  }, [pathname]);

  if (!visible) return null;

  return (
    <aside aria-label="Shadecode app installation options" className="mx-3 mb-3 mt-3 flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.045] p-3 sm:mx-5 sm:mt-4 sm:p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><Download size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">Use Shadecode on your device</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Install the web app now. We’ll publish the dedicated Android download here after release checks pass.</p>
        <Link href="/download" className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200">Installation options</Link>
      </div>
      <button type="button" aria-label="Dismiss installation notice" onClick={() => {
        setVisible(false);
        try { window.localStorage.setItem(DISMISS_KEY, "true"); } catch {}
      }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--muted-foreground)] transition hover:bg-white/10 hover:text-[var(--foreground)]"><X size={16} /></button>
    </aside>
  );
}
