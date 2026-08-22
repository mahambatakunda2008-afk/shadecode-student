import { redirect } from "next/navigation";

/**
 * Legacy compatibility route.
 *
 * Math Cortex was folded into Workmate so students have one shared Cortex
 * workspace instead of multiple competing entry points. Keep this route for
 * old bookmarks/deep links, but send them to the canonical surface.
 */
export default function MathCortexLegacyPage() {
  redirect("/workmate");
}
