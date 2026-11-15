import { describe, expect, it } from "vitest";
import { describeAcquisition } from "./acquisition";

const base = { referrer: "", search: "", userAgent: "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile", viewportWidth: 390, ownHost: "shadecodestudent.vercel.app" };

describe("describeAcquisition", () => {
  it("is direct with no referrer, and detects mobile", () => {
    expect(describeAcquisition(base)).toMatchObject({ channel: "direct", source: null, referrer_host: null, device: "mobile", likely_bot: false });
  });
  it("prefers explicit campaign tags over the referrer, and normalises them", () => {
    const c = describeAcquisition({ ...base, search: "?utm_source=WhatsApp&utm_medium=share&utm_campaign=Quiz Result!", referrer: "https://l.wl.co/x" });
    expect(c).toMatchObject({ channel: "campaign", source: "whatsapp", utm_medium: "share", utm_campaign: "quiz result" });
  });
  it("classifies referrers by hostname only (never the path)", () => {
    expect(describeAcquisition({ ...base, referrer: "https://www.google.com/search?q=secret" })).toMatchObject({ channel: "search", referrer_host: "google.com" });
    expect(describeAcquisition({ ...base, referrer: "https://l.facebook.com/l.php?u=abc" }).channel).toBe("social");
    expect(describeAcquisition({ ...base, referrer: "https://web.whatsapp.com/" }).channel).toBe("messaging");
    expect(describeAcquisition({ ...base, referrer: "https://some-blog.co.zw/post" })).toMatchObject({ channel: "referral", source: "some-blog.co.zw" });
    expect(JSON.stringify(describeAcquisition({ ...base, referrer: "https://www.google.com/search?q=secret" }))).not.toContain("secret");
  });
  it("marks our own pages as internal, not a source", () => {
    expect(describeAcquisition({ ...base, referrer: "https://shadecodestudent.vercel.app/auth/login" })).toMatchObject({ channel: "internal", referrer_host: null });
  });
  it("flags bots, previews and automation", () => {
    expect(describeAcquisition({ ...base, userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" }).likely_bot).toBe(true);
    expect(describeAcquisition({ ...base, userAgent: "WhatsApp/2.23 LinkPreview" }).likely_bot).toBe(true);
    expect(describeAcquisition({ ...base, webdriver: true }).likely_bot).toBe(true);
  });
  it("buckets device by viewport width", () => {
    expect(describeAcquisition({ ...base, viewportWidth: 800 }).device).toBe("tablet");
    expect(describeAcquisition({ ...base, viewportWidth: 1440 }).device).toBe("desktop");
  });
});
