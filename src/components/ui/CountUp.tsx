"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number counting up to `value` on mount/change. Falls back to
 * an instant jump when the user has requested reduced motion, or when
 * `value` is null (nothing to animate toward -- callers pass the "—"
 * placeholder text directly in that case).
 */
export function useCountUp(value: number | null, durationMs = 900): number | null {
  const [display, setDisplay] = useState<number | null>(value);
  const frameRef = useRef<number | undefined>(undefined);
  const prevValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplay(value);
      prevValueRef.current = value;
      return;
    }

    const from = prevValueRef.current ?? 0;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return display;
}
