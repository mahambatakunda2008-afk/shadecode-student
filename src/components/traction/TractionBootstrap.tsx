"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/traction/client";

export default function TractionBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    void trackEvent("session_started", { path: pathname });
  }, []);

  useEffect(() => {
    void trackEvent("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/dashboard") void trackEvent("activation_completed", { path: pathname });
  }, [pathname]);

  return null;
}
