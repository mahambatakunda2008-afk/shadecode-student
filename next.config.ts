import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  // Real fallback offline shell for uncached navigations, and the
  // page-shell/API/static-asset caching strategy actually shipped in
  // production. Replaces a hand-written public/sw.js that next-pwa's
  // build step was silently overwriting every build -- that file was
  // committed to git looking like real source, but next-pwa's default
  // Workbox generation always wins at build time, so none of its
  // custom low-bandwidth/network-first logic was ever actually
  // reaching a deployed user. Found 2026-08-15 while investigating a
  // low-end-device performance report; explains the recent run of
  // "fix(pwa): register service worker..." commits, which were
  // fighting the symptom (registration confusion) rather than this
  // root cause (two systems writing to the same public/sw.js).
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        // App page navigations: try the network first (fresh content),
        // fall back to whatever was last cached when offline or slow,
        // and to the /offline shell above when there's no cache either.
        urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "shadecode-pages",
          networkTimeoutSeconds: 6,
          expiration: { maxEntries: 48, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        // API GET routes: serve the last-known response instantly while
        // revalidating in the background -- keeps dashboard/tasks/etc.
        // usable and snappy on slow connections instead of blocking on
        // a round trip every time.
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
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "shadecode-static" },
      },
    ],
  },
})({
  turbopack: {
    root: process.cwd(),
  },
  // Optimize for modern browsers including Edge
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
});

export default withSentryConfig(nextConfig, {
  // Disable Sentry logger deprecation (removed in next version)
  // disableLogger: true, // removed per deprecation
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "shadecode",
  project: "shadecode-student",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // authToken is not set explicitly here -- the Sentry webpack plugin
  // reads SENTRY_AUTH_TOKEN from the environment automatically if
  // present. As of this audit, that env var is NOT set in Vercel, so
  // every production build logs "No auth token provided. Will not
  // create release... Will not upload source maps." Production JS
  // errors in Sentry currently show minified stack traces only.
  // To fix: generate a token at
  // https://shadecode.sentry.io/settings/auth-tokens/ (needs
  // project:releases scope) and add it as SENTRY_AUTH_TOKEN in
  // Vercel's environment variables. Not something this audit can do --
  // requires access to the actual Sentry account.
});

