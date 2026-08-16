const SESSION_KEY = "shadecode_session_id";
const ANON_KEY = "shadecode_anonymous_id";

function stableId(key: string) {
  if (typeof window === "undefined") return undefined;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
}

export async function trackEvent(
  name: string,
  properties: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/traction/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name,
        path: window.location.pathname,
        sessionId: stableId(SESSION_KEY),
        anonymousId: stableId(ANON_KEY),
        properties,
      }),
    });
  } catch {
    // Analytics must never break the learning experience.
  }
}

export function trackPageView() {
  return trackEvent("page_view");
}
