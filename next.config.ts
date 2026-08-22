import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  // Keep the marketing landing page network-only. It is public content and
  // must never become the offline/authenticated app shell. Authenticated
  // students should land on /dashboard instead.
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        // Never cache `/`. A cached public landing page can otherwise win a
        // navigation after login, especially on clients with an old SW.
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.mode === "navigate" && url.pathname !== "/",
        handler: "NetworkFirst",
        options: {
          cacheName: "shadecode-pages",
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        // Next App Router client navigation is driven by RSC requests rather
        // than document navigations. Cache those responses after they have
        // been prefetched/visited so an authenticated learner can move among
        // already-used pages while offline instead of the router waiting for
        // a network response that can never arrive.
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.method === "GET" &&
          url.origin === self.location.origin &&
          url.searchParams.has("_rsc"),
        handler: "NetworkFirst",
        options: {
          cacheName: "shadecode-rsc",
          networkTimeoutSeconds: 2,
          expiration: { maxEntries: 160, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        // Next's static route chunks and client bundles must remain available
        // offline for cached app routes to hydrate and navigate normally.
        urlPattern: ({ request }: { request: Request }) =>
          request.method === "GET" &&
          (request.destination === "script" || request.destination === "style"),
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "shadecode-static",
          expiration: { maxEntries: 256, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        // API GET routes: serve the last-known response instantly while
        // revalidating in the background. Mutations are intentionally never
        // cached by the service worker.
        urlPattern: /^\/api\/.*/i,
        method: "GET",
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "shadecode-api",
          expiration: { maxEntries: 96, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "shadecode-images",
          expiration: { maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
})({
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
});

export default withSentryConfig(nextConfig, {
  org: "shadecode",
  project: "shadecode-student",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
