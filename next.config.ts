import { withSentryConfig } from "@sentry/nextjs";

/**
 * Keep application boot deterministic. The PWA service worker is intentionally
 * disabled until its lifecycle is rebuilt and tested. Next.js must own all
 * HTML, RSC, navigation and API requests without a worker in between.
 */
const nextConfig = {
  turbopack: { root: process.cwd() },
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/supabase-js"],
  },
};

export default withSentryConfig(nextConfig, {
  org: "shadecode",
  project: "shadecode-student",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
