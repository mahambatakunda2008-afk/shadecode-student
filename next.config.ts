import { withSentryConfig } from "@sentry/nextjs";

/**
 * Keep application boot deterministic. Offline support uses the hand-maintained
 * worker in public/sw.js, registered by ServiceWorkerRegistration. We deliberately
 * avoid a PWA wrapper here so Next.js routing and API behaviour remain explicit.
 */
const nextConfig = {
  turbopack: { root: process.cwd() },
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
