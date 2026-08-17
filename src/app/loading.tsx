import { BrandMark } from "@/components/brand/BrandMark";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center gap-5" aria-label="Loading Shadecode Student">
        <BrandMark className="h-16 w-16 text-cyan-400" aria-hidden="true" />
        <div className="h-1 w-20 overflow-hidden rounded-full bg-cyan-400/15">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400" />
        </div>
      </div>
    </main>
  );
}
