/**
 * Full-bleed layout for installed iOS PWAs.
 *
 * The app already uses `env(safe-area-inset-*)` (bottom nav, offline pills, auth shells), but iOS only reports
 * non-zero insets when the viewport has `viewport-fit=cover`. We enable that only for an installed iOS PWA
 * (`navigator.standalone === true`), so browsers, Android and desktop keep their current layout.
 * Every CSS rule that depends on it is scoped under `html.ios-standalone`, so if iOS ignores the runtime viewport
 * change the insets stay 0 and those rules become no-ops.
 */
export const IOS_STANDALONE_CLASS = "ios-standalone";

type ViewportMeta = { getAttribute(name: string): string | null; setAttribute(name: string, value: string): void };
type SafeAreaDocument = {
  documentElement: { classList: { add(token: string): void } };
  querySelector(selector: string): ViewportMeta | null;
};

export function isIosStandalone(nav: { standalone?: boolean } | undefined): boolean {
  return nav?.standalone === true;
}

/** Returns true when the full-bleed mode was enabled. Safe to call repeatedly. */
export function applyIosStandaloneSafeArea(doc: SafeAreaDocument, nav: { standalone?: boolean } | undefined): boolean {
  if (!isIosStandalone(nav)) return false;
  doc.documentElement.classList.add(IOS_STANDALONE_CLASS);
  const meta = doc.querySelector('meta[name="viewport"]');
  if (meta) {
    const content = meta.getAttribute("content") ?? "";
    if (!/viewport-fit\s*=/.test(content)) meta.setAttribute("content", `${content}${content ? ", " : ""}viewport-fit=cover`);
  }
  return true;
}
