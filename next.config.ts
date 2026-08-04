import { withSentryConfig } from "@sentry/nextjs";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
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

