"use client";

/**
 * Intentionally inert while the PWA layer is being rebuilt.
 *
 * A stale service worker can survive deployments and intercept the very HTML,
 * RSC and asset requests needed to boot Next.js. Registration must therefore
 * not be part of application startup until the worker lifecycle is verified.
 */
export default function ServiceWorkerRegistration() {
  return null;
}
