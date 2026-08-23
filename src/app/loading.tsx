import { BrandMark } from "@/components/brand/BrandMark";

/**
 * Minimal route fallback only. This must never look like an indefinite
 * application boot screen. Next.js may show it while a route segment streams,
 * but the authenticated app shell is responsible for its own non-blocking UI.
 */
export default function Loading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]"
      aria-label="Opening Shadecode Student"
    >
      <BrandMark className="h-14 w-14 text-cyan-400" aria-hidden="true" />
    </main>
  );
}
