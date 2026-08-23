import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.mode === "navigate" && url.pathname !== "/",
        handler: "NetworkFirst",
        options: {
          cacheName: "shadecode-pages",
          networkTimeoutSeconds: 2,
          expiration: { maxEntries: 96, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.method === "GET" &&
          url.origin === self.location.origin &&
          url.searchParams.has("_rsc"),
        handler: "NetworkFirst",
        options: {
          cacheName: "shadecode-rsc",
          networkTimeoutSeconds: 1,
          expiration: { maxEntries: 240, maxAgeSeconds: 14 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: ({ request }: { request: Request }) =>
          request.method === "GET" &&
          (request.destination === "script" || request.destination === "style"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "shadecode-static",
          expiration: { maxEntries: 384, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^\/api\/.*/i,
        method: "GET",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "shadecode-api",
          expiration: { maxEntries: 128, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "shadecode-images",
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
