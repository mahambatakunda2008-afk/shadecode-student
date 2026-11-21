# Shadecode Student privacy and deletion data inventory

**Audit date:** 4 November 2026  
**Status:** Initial source-code inventory, not a complete legal or production-environment audit.

This document records data flows confirmed from the repository and identifies what still needs verification before completing Google Play Data safety and account-deletion declarations.

## Confirmed from source

| Area | Data / processing observed | Source evidence |
|---|---|---|
| Account authentication | Supabase Auth email/password sign-in and refresh tokens; account ID and email are held in the native session store. | `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `android/app/src/main/java/com/shadecode/student/NativeApi.kt`, `NativeStore.kt` |
| Profile | Display name, username, education stage, selected subjects and onboarding state. | Web Settings reads `profiles.username`; native API reads/writes `profiles` fields. |
| Learning records | Lessons, subjects, progress, timetable, tasks, exam/paper attempts, focus and other learner records are stored or synchronized against the signed-in account. | `NativeApi.kt`, `NativeSyncWorker.kt`, web API routes and Supabase migrations. |
| Android local storage | DataStore stores access/refresh tokens, user ID, email, cached profile, account-scoped tasks/timetable and pending operations. Room stores subjects, lessons, lesson progress and a pending sync queue. | `NativeStore.kt`, `NativeRoom.kt`, `NativeSyncWorker.kt` |
| Web offline storage | IndexedDB stores local records and queued mutations. | `src/lib/offline/indexedDb.ts` |
| AI requests | Server-side AI routing can send prompts and contextual information to configured providers. The provider chain includes Vercel AI Gateway, Groq, OpenRouter, Cloudflare and Google Gemini when configured/available. | `src/lib/ai.ts`, `src/lib/cortex/runtime/execution.ts` |
| AI usage telemetry | AI usage is tracked through a dedicated tracker; inspect the table schema and payload before finalizing declarations. | `src/lib/ai.ts` imports `src/lib/ai/tracker` |
| Error monitoring | Sentry is initialized on client, server and edge. Client config currently enables session replay sampling (10% normal sessions; 100% of sessions with errors). Structured logs can include account IDs, subjects, request context and error details. | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/lib/observability.ts` |
| WhatsApp integration | Optional account linking and message processing uses external WhatsApp identifiers, message IDs, phone-number IDs, message text and delivery receipts. Messages are sent through Meta's Graph API. | `src/app/api/webhooks/whatsapp/route.ts`, `src/app/api/account/whatsapp/link-code/route.ts`, `src/lib/channels/whatsapp/delivery.ts` |
| Hosting and database | Supabase is used for authentication/database access; Vercel hosts the web application/server routes and AI Gateway integration. | `src/lib/supabase/server.ts`, `src/lib/ai.ts`, deployment workflow/configuration. |

## Important privacy observations

1. The previous privacy policy's statement that personal information is not shared with third parties was too broad. Service providers process information to provide hosting, authentication, database, AI, diagnostics and optional messaging features.
2. Sentry session replay sampling is enabled in the client configuration. Verify masking, replay payloads, production DSN, retention and whether replay is necessary before Play release. Consider disabling replay until reviewed.
3. AI prompts may contain learner-provided questions and relevant learning context. Keep provider routing server-side and disclose that this information may be sent to the provider handling the request.
4. Android sign-out clears the active session, but local cached learning data and account-scoped queues may remain on the device. Server-side account deletion must be designed separately from local sign-out.
5. A complete account deletion implementation must cover Supabase Auth, every user-owned table, storage objects, linked channel identities/receipts, local device caches and provider-side deletion requests where applicable.

## Not yet fully verified

- Complete Supabase table/foreign-key/RLS inventory and all account-owned rows.
- Storage bucket names, object ownership and deletion coverage.
- Full web browser storage inventory beyond the IndexedDB module inspected.
- All analytics, event, survey, feedback, email and admin observability payloads.
- Exact production provider configuration and whether each AI provider is currently active.
- Sentry production replay settings, data masking and retention.
- Vercel/Supabase/AI/Meta provider retention periods and applicable data processing terms.
- Whether any additional third-party SDKs collect diagnostics or device identifiers.
- Local model downloads, exam-paper files and offline content cleanup behavior on account deletion.

## Account deletion implementation requirements

The public request route is `/delete-account.html`. Web Settings and native Android Profile link to it. It currently submits a request to `shadecodetech@gmail.com`; it does **not** execute automated deletion.

Before declaring account deletion fully supported:
- Build a server-side, authenticated deletion workflow with ownership verification and re-authentication/confirmation.
- Enumerate and delete/anonymize all account-owned rows and storage objects transactionally or through an idempotent, resumable job.
- Delete the Supabase Auth identity only after dependent data cleanup is safely handled.
- Remove local account-scoped DataStore, Room, IndexedDB, service-worker and offline-paper data where appropriate.
- Request deletion from processors where applicable and record completion without retaining unnecessary personal data.
- Test cross-account isolation, partial failure, retry, and complete deletion.
- Define any narrowly necessary retention exceptions and disclose them clearly.

## Play Console follow-up

Do not complete the Data safety or account-deletion declarations from assumptions. Reconcile them against:
- production environment variables and enabled providers;
- the complete Supabase schema and storage inventory;
- Android dependency/SDK inventory;
- Sentry and Vercel project settings;
- actual account-deletion test evidence.

The public deletion request page is an entry point, not proof that deletion is being fulfilled. Keep Play production release blocked until the end-to-end workflow is verified.
