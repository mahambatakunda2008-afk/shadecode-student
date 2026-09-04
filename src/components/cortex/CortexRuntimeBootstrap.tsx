"use client";

import { useEffect } from "react";
import { registerLocalWebCortexRuntime } from "@/lib/cortex/runtime/registerLocalWebRuntime";

export default function CortexRuntimeBootstrap() {
  useEffect(() => {
    registerLocalWebCortexRuntime();
  }, []);

  return null;
}
