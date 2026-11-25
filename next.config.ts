import { withSentryConfig } from "@sentry/nextjs";

/**
 * Keep application boot deterministic. The PWA service worker is intentionally
 * disabled until its lifecycle is rebuilt and tested. Next.js must own all
 * HTML, RSC, navigation and API requests without a worker in between.
 */
const nextConfig = {
  turbopack: { root: process.cwd() },
  // PDF.js 6's Node build loads optional canvas polyfills during module
  // evaluation. Keep both packages external so Node resolves the native
  // optional dependency from node_modules instead of bundling PDF.js into a
  // server chunk where its Node-only canvas lookup can fail (DOMMatrix).
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "shadecode",
  project: "shadecode-student",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
