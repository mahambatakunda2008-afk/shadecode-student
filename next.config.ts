import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "@ducanh2912/next-pwa";

/**
 * PWA must never own the authenticated application's document/RSC boot path.
 * Next.js is responsible for navigation and server components; the service
 * worker is only an offline asset layer.
 */
const nextConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: false,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.method === "GET" &&
          url.origin === self.location.origin &&
          (request.destination === "script" || request.destination === "style" || request.destination === "font"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "shadecode-static-v3",
          expiration: { maxEntries: 384, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.method === "GET" &&
          url.origin === self.location.origin &&
          /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "shadecode-images-v3",
          expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
})({
  turbopack: { root: process.cwd() },
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
});

export default withSentryConfig(nextConfig, {
  org: "shadecode",
  project: "shadecode-student",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
