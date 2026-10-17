"use client";

import RouteError from "@/components/ui/RouteError";

/** In-shell boundary: a crash in one page keeps the sidebar and navigation usable. */
export default function AppRouteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} boundary="app-route-error-boundary" />;
}
