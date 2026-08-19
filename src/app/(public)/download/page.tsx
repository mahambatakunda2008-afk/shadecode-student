import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download Shadecode Student",
  description:
    "Install Shadecode Student on Android, Windows, iPhone, iPad, or any modern browser.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Download Shadecode Student",
    description:
      "One learning platform. Install it wherever you study: Android, Windows, iPhone, iPad, or the web.",
    url: "/download",
    images: ["/og-image.png"],
  },
};

const WEB_URL = "https://shadecodestudent.vercel.app/";
const ANDROID_RELEASES_URL =
  "https://github.com/mahambatakunda2008-afk/shadecode-student/releases/latest";

type PlatformCardProps = {
  icon: string;
  title: string;
  status: string;
  description: string;
  action: string;
  href: string;
  external?: boolean;
  secondary?: string;
};

function PlatformCard({
  icon,
  title,
  status,
  description,
  action,
  href,
  external = false,
  secondary,
}: PlatformCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.06]">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-2xl ring-1 ring-cyan-300/15">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-xs text-cyan-200/70">{status}</p>
        </div>
      </div>
      <p className="min-h-12 text-sm leading-6 text-white/65">{description}</p>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
      >
        {action} →
      </a>
      {secondary ? (
        <p className="mt-3 text-center text-xs leading-5 text-white/40">{secondary}</p>
      ) : null}
    </article>
  );
}

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#0B0D12] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto max-w-3xl text-center">
          <Link href="/" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
            ← Back to Shadecode Student
          </Link>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/5 px-3 py-1.5 text-xs font-medium text-cyan-200">
            🌍 Study anywhere
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Shadecode Student, wherever you study.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Use the same account and learning system across the web and installed app experiences.
            Start instantly, then install when you want Shadecode Student on your device.
          </p>
        </header>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Download options">
          <PlatformCard
            icon="🌐"
            title="Web"
            status="Available now"
            description="Works immediately in Chrome, Edge, Safari, Firefox, and other modern browsers. Nothing to install."
            action="Open Shadecode Student"
            href={WEB_URL}
            external
          />
          <PlatformCard
            icon="📱"
            title="Android APK"
            status="Release pipeline ready"
            description="The official Android build is produced by the Shadecode release pipeline. Direct APK distribution becomes available as soon as the first signed production release is published."
            action="Open official releases"
            href={ANDROID_RELEASES_URL}
            external
            secondary="Only install APKs published by Shadecode."
          />
          <PlatformCard
            icon="▶️"
            title="Google Play"
            status="Publishing next"
            description="The Android project produces the AAB required for Google Play. Store publication still requires the production signing key and Play Console publisher account."
            action="Check Android releases"
            href={ANDROID_RELEASES_URL}
            external
            secondary="The Play listing will be linked here once published."
          />
          <PlatformCard
            icon="🪟"
            title="Windows"
            status="PWA available now"
            description="Install Shadecode Student as a desktop PWA from a supported browser today. Microsoft Store distribution is a separate publishing channel."
            action="Open Windows-ready web app"
            href={WEB_URL}
            external
            secondary="Edge/Chrome → Install Shadecode Student"
          />
          <PlatformCard
            icon="🍎"
            title="iPhone & iPad"
            status="PWA available now"
            description="Open Shadecode Student in Safari for an app-like installed experience without waiting for App Store publication."
            action="Open on iPhone / iPad"
            href={WEB_URL}
            external
            secondary="Safari → Share → Add to Home Screen"
          />
          <PlatformCard
            icon="💻"
            title="Desktop PWA"
            status="Available now"
            description="On supported desktop browsers, install Shadecode Student from the browser's install control for a standalone app window."
            action="Open desktop app"
            href={WEB_URL}
            external
            secondary="Use the install icon in the address bar."
          />
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">One account. One learning experience.</h2>
          <div className="mt-5 grid gap-4 text-sm text-white/60 sm:grid-cols-3">
            <div><p className="font-medium text-white">Install once</p><p className="mt-1 leading-6">Your device gets a dedicated app experience while the web remains the universal fallback.</p></div>
            <div><p className="font-medium text-white">Keep your progress</p><p className="mt-1 leading-6">Sign in with the same Shadecode Student account on supported devices.</p></div>
            <div><p className="font-medium text-white">Low-data first</p><p className="mt-1 leading-6">The PWA and service-worker layer are designed to keep useful parts of the experience available on weak connections.</p></div>
          </div>
        </section>

        <footer className="mt-10 text-center text-xs text-white/35">
          Shadecode Student · <a href="/privacy.html" className="hover:text-white/60">Privacy</a>
        </footer>
      </div>
    </main>
  );
}
