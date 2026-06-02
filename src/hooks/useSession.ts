"use client";

import { useEffect } from "react";
import { startSession, endSession } from "@/lib/session";

export function useSession(autoStart = true) {
  useEffect(() => {
    if (autoStart) {
      startSession();
    }

    const handleUnload = () => {
      endSession();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      endSession();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [autoStart]);
}
