"use client";

import { useEffect } from "react";
import { registerLocalWebCortexRuntime } from "@/lib/cortex/runtime/registerLocalWebRuntime";
import CortexDeviceSetup from "@/components/cortex/CortexDeviceSetup";
import CortexLearningContext from "@/components/cortex/CortexLearningContext";

export default function CortexRuntimeBootstrap() {
  useEffect(() => {
    registerLocalWebCortexRuntime();
  }, []);

  return (
    <>
      <CortexDeviceSetup />
      <CortexLearningContext />
    </>
  );
}
