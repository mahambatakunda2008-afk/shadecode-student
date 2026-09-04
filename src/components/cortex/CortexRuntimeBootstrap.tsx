"use client";

import { useEffect } from "react";
import { registerLocalWebCortexRuntime } from "@/lib/cortex/runtime/registerLocalWebRuntime";
import CortexDeviceSetup from "@/components/cortex/CortexDeviceSetup";

export default function CortexRuntimeBootstrap() {
  useEffect(() => {
    registerLocalWebCortexRuntime();
  }, []);

  return <CortexDeviceSetup />;
}
