"use client";

import { useEffect } from "react";
import { applyIosStandaloneSafeArea } from "@/lib/pwa/iosSafeArea";

/** Enables full-bleed safe-area handling for installed iOS PWAs only. Renders nothing. */
export function IosStandaloneSafeArea() {
  useEffect(() => {
    applyIosStandaloneSafeArea(document, navigator as Navigator & { standalone?: boolean });
  }, []);
  return null;
}
