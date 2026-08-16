"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/traction/client";

const ACTIVATED_KEY = "shadecode_activation_recorded";

export default function TractionBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    void trackEvent("session_started", { path: pathname });
  }, []);

  useEffect(() => {
    void trackEvent("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/dashboard" || window.localStorage.getItem(ACTIVATED_KEY)) return;
    window.localStorage.setItem(ACTIVATED_KEY, "1");
    void trackEvent("activation_completed", { path: pathname });
  }, [pathname]);

  return null;
}
