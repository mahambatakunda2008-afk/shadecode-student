# Zero-Network Release Bundle

Shadecode Student's packaged Android/desktop release must be capable of opening and providing core learning functionality without an initial network connection.

## Bundle contents

- application shell and routes required for the core learner experience;
- local database schema and bootstrap data;
- curriculum/content packs selected for the release;
- deterministic learning engines and cached reference material;
- offline AI runtime and an appropriate model tier when licensing, device size and memory budgets allow;
- migrations required to move the local database forward safely.

## First launch

The packaged build must not call Supabase, an authentication server, an AI API, analytics, or a remote configuration endpoint as a prerequisite for rendering the local learner experience. Remote services may initialize opportunistically after the first usable screen is available.

## Account model

A local learner profile can exist before cloud sign-in. If the learner later signs in, the sync layer links local work to the authenticated cloud identity using an explicit migration/linking flow. Local work must never be discarded merely because sign-in or synchronization fails.

## PWA reality

A browser cannot ship its own JavaScript/application bytes to a device that has never visited it. Therefore a first-time PWA install necessarily requires access to the site. Once installed and bootstrapped, the PWA should remain usable offline. The zero-network guarantee is therefore a release requirement for packaged APK/desktop distributions, not a claim that an unvisited website can magically install itself offline.
