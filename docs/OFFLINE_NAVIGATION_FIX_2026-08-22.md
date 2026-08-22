# Offline Navigation Fix — 2026-08-22

## Findings

The offline navigation freeze had two independent causes.

1. **Service-worker navigation gap**
   - Document navigations were cached, but Next App Router client navigation uses React Server Component (RSC) requests.
   - Those RSC requests were not covered by the previous runtime cache rules, so `router.push()` could wait on the network while offline.

2. **Authenticated app-layout gate**
   - `src/app/(app)/layout.tsx` performed `auth.getUser()`, an admin-role RPC and a profile query before rendering the application shell.
   - Those calls could block offline/slow navigation.
   - The effect also depended on the current pathname, so the complete auth/onboarding gate was re-run on client navigation.

3. **Landing-page cache/authentication mismatch**
   - `/` was treated as public by middleware, so an authenticated user could still enter the public marketing page.
   - The service worker used the same page cache for navigations, allowing a stale public shell to remain available after authentication.

## Shipped changes

- `/` is now network-only in the service-worker runtime navigation rule.
- Authenticated requests to `/` are redirected server-side to `/dashboard`.
- The authenticated sidebar brand link points to `/dashboard` rather than `/`.
- Next RSC GET requests containing `_rsc` are cached with a bounded NetworkFirst strategy.
- Static scripts/styles remain available for previously visited offline routes.
- Authenticated page/RSC/API caches are cleared on sign-out.
- The `(app)` layout now uses local `getSession()` for the initial auth gate.
- Offline users do not wait for Supabase role/profile checks before the app shell renders.
- Online role/profile checks run in parallel with a 4-second timeout.
- The auth gate no longer re-runs on every client pathname change.
- Server middleware remains the authoritative authentication/authorization boundary.

## Offline navigation contract

A route can be opened offline after its route code/data has been visited or prefetched while online. A route that has never reached the device cannot be guaranteed to render offline merely by changing navigation logic.

The intended flow is now:

`online visit/prefetch → RSC + route assets cached → offline navigation → local cached RSC/assets → app shell renders`

Writes remain a separate concern and continue through the durable offline mutation queue.

## Remaining offline-sync work

- Server-side mutation idempotency.
- Entity-specific conflict resolution.
- Permanent-failure UI and manual retry.
- Full browser verification across logout/login/account switching.
- Broader integration of local-first state into all stateful study features.
