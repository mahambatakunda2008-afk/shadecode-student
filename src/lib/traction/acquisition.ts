/**
 * src/lib/traction/acquisition.ts
 *
 * Privacy-safe description of how a visit started: the referrer HOSTNAME only
 * (never the full URL), UTM tags capped in length, a coarse device class and a
 * bot flag. Used so growth numbers can be split by channel and so bot or
 * preview traffic does not look like real students bouncing.
 */

export type Channel = "direct" | "search" | "social" | "messaging" | "referral" | "internal" | "campaign";
export type Device = "mobile" | "tablet" | "desktop";

export interface AcquisitionInput {
  referrer: string;
  search: string;
  userAgent: string;
  viewportWidth: number;
  webdriver?: boolean;
  ownHost: string;
}
export interface AcquisitionContext {
  channel: Channel;
  source: string | null;
  referrer_host: string | null;
  utm_medium?: string;
  utm_campaign?: string;
  device: Device;
  likely_bot: boolean;
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia)\./i;
const SOCIAL = /(^|\.)(facebook|instagram|twitter|t\.co|x\.com|tiktok|youtube|youtu\.be|linkedin|reddit|pinterest)\b/i;
const MESSAGING = /(^|\.)(whatsapp|wa\.me|l\.wl\.co|telegram|t\.me|messenger)\b/i;
const BOT = /bot|crawl|spider|headless|preview|facebookexternalhit|lighthouse|pagespeed|slurp|curl|wget|python|httpclient|monitor/i;

const clip = (v: string | null | undefined, max = 40): string | undefined => {
  const t = (v ?? "").trim().toLowerCase().replace(/[^a-z0-9_\-. ]/g, "").slice(0, max);
  return t || undefined;
};

function hostOf(referrer: string): string | null {
  try {
    return referrer ? new URL(referrer).hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

export function describeAcquisition(input: AcquisitionInput): AcquisitionContext {
  const params = new URLSearchParams(input.search.startsWith("?") ? input.search.slice(1) : input.search);
  const utmSource = clip(params.get("utm_source"));
  const host = hostOf(input.referrer);
  const own = input.ownHost.replace(/^www\./, "").toLowerCase();

  let channel: Channel;
  let source: string | null;
  if (utmSource) {
    channel = "campaign";
    source = utmSource;
  } else if (!host) {
    channel = "direct";
    source = null;
  } else if (host === own) {
    channel = "internal";
    source = null;
  } else if (MESSAGING.test(host)) {
    channel = "messaging";
    source = host;
  } else if (SEARCH.test(host)) {
    channel = "search";
    source = host;
  } else if (SOCIAL.test(host)) {
    channel = "social";
    source = host;
  } else {
    channel = "referral";
    source = host;
  }

  const w = input.viewportWidth;
  return {
    channel,
    source,
    referrer_host: host && host !== own ? host : null,
    utm_medium: clip(params.get("utm_medium")),
    utm_campaign: clip(params.get("utm_campaign")),
    device: w > 0 && w < 640 ? "mobile" : w > 0 && w < 1024 ? "tablet" : "desktop",
    likely_bot: Boolean(input.webdriver) || BOT.test(input.userAgent),
  };
}

/** Browser wrapper. Safe to call during render-free effects only. */
export function currentAcquisition(): AcquisitionContext {
  return describeAcquisition({
    referrer: document.referrer,
    search: window.location.search,
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
    webdriver: (navigator as Navigator & { webdriver?: boolean }).webdriver,
    ownHost: window.location.hostname,
  });
}
