"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, MonitorSmartphone, ShieldCheck, Smartphone, WifiOff } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";

export default function DownloadPage() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

  }, []);

  return (
    <main className="min-h-screen bg-[var(--brand-ink)] px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Back to Shadecode Student home"><BrandLockup compact /></Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.04]"><ArrowLeft size={16} /> Home</Link>
        </div>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:mt-16 sm:p-10">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Smartphone size={24} /></div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[.16em] text-cyan-200">Take your study space with you</p>
          <h1 className="mt-3 max-w-2xl font-[var(--font-display)] text-4xl font-semibold tracking-[-.04em] text-white sm:text-5xl">Shadecode Student, ready for your device.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Use the web app now, or install it on your device for a home-screen experience. We are validating the dedicated Android app before publishing a public APK, so you will not be sent to an expired build or an unofficial download.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.045] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><MonitorSmartphone size={18} /> Install the web app</div>
              <h2 className="mt-3 text-xl font-semibold text-white">Available now</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Add Shadecode to your home screen or desktop. It opens in its own app window where supported, without needing an app-store download.</p>
              {installed ? (
                <div className="mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-emerald-200"><CheckCircle2 size={17} /> Already installed on this device</div>
              ) : (
                <div className="mt-5 rounded-xl border border-white/10 px-4 py-3 text-sm leading-6 text-slate-300"><strong className="text-white">To install:</strong> use the browser’s install prompt if it appears, or open the browser menu and choose <em>Install app</em> or <em>Add to Home Screen</em>. On iPhone/iPad, use Safari’s Share menu.</div>
              )}
              <Link href="/auth/signup" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">Create a free account <ExternalLink size={14} /></Link>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Download size={18} /> Dedicated Android app</div>
              <h2 className="mt-3 text-xl font-semibold text-white">Release checks in progress</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">The native app is being checked for reliable installation, account isolation, offline paper access, timer recovery and a properly signed release. We will publish the APK here after those checks pass.</p>
              <div className="mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/20 bg-amber-200/[0.04] px-4 py-3 text-sm text-amber-100"><ShieldCheck size={17} /> No public APK until it is verified and signed.</div>
              <a href="https://github.com/mahambatakunda2008-afk/shadecode-student/releases" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">Release announcements <ExternalLink size={14} /></a>
            </article>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <WifiOff size={19} className="mt-0.5 shrink-0 text-cyan-200" />
            <p className="text-sm leading-6 text-slate-400"><span className="font-semibold text-slate-200">A useful note about offline study:</span> installing the web app does not automatically download every lesson or past paper. Downloadable content and offline behaviour depend on what has been cached or saved on your device.</p>
          </div>
        </section>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-slate-500">Shadecode Student · Study smarter. Live sharper.</p>
      </div>
    </main>
  );
}
