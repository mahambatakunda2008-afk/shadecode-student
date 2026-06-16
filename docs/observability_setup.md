# Observability Setup Guide

This document explains how to set up, configure, and maintain Sentry, Vercel Analytics, and Vercel Speed Insights for Shadecode Student.

---

## 1. Sentry Integration Setup

We use `@sentry/nextjs` to track exceptions across client components, server layout wrappers, Edge/middleware runtimes, API routes, and background services.

### Environment Variables

To report to Sentry, configure the following variables.

In your local `.env.local` or Vercel Environment Variables:

```bash
# Required for runtime error reporting
NEXT_PUBLIC_SENTRY_DSN="https://your-public-key@o0.ingest.sentry.io/your-project-id"

# Required for build-time source map uploads (CI/CD and Vercel build step)
SENTRY_ORG="shadecode"
SENTRY_PROJECT="shadecode-student"
SENTRY_AUTH_TOKEN="sntryu_your_auth_token_here"
```

> [!NOTE]
> Local development will gracefully fallback if `NEXT_PUBLIC_SENTRY_DSN` is empty, avoiding cluttering Sentry with local debug exceptions.

### Local Testing

1. Create a `.env.local` file in the root if it doesn't exist.
2. Add a valid Sentry DSN.
3. Start the dev server: `npm run dev`.
4. Navigate to a page and trigger a crash or load an API to verify Sentry dashboard reports.

### Build Verification & Sourcemaps

Sentry automatically uploads sourcemaps during the production build step (`next build`) to ensure stack traces are readable (unminified with original line numbers).

In `next.config.ts`, Sentry is wrapped as follows:
```typescript
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  widenClientFileUpload: true,
  hideSourceMaps: true, // Prevent users from seeing source maps in devtools
  disableLogger: true,
});
```

---

## 2. Vercel Analytics

Vercel Analytics tracks page views, audience demographics, and custom events on the client side without cookies.

### Setup

1. **Vercel Dashboard Setup**:
   - Go to your project page in Vercel.
   - Click the **Analytics** tab.
   - Click **Enable**.
2. **Code Integration**:
   - The `<Analytics />` component is already integrated into the root layout (`src/app/layout.tsx`).
   - It will automatically initialize in production.

---

## 3. Vercel Speed Insights

Vercel Speed Insights measures Real User Monitoring (RUM) metrics, focusing on Core Web Vitals (LCP, FID, CLS, INP, TTFB).

### Setup

1. **Vercel Dashboard Setup**:
   - Go to your project page in Vercel.
   - Click the **Speed Insights** tab.
   - Click **Enable**.
2. **Code Integration**:
   - The `<SpeedInsights />` component is already integrated into the root layout (`src/app/layout.tsx`).
   - Performance metrics will begin streaming to your Vercel Speed Insights dashboard immediately upon deployment.
