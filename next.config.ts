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
  typescript: {
    ignoreBuildErrors: true,
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
});

