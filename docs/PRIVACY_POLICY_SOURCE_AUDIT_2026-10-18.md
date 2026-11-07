# Privacy Policy Source Audit

**Audit date:** 2026-10-18  
**Scope:** Source-level review of `public/privacy.html` on `main`. This is not a legal opinion, a complete data-flow audit, or a production configuration review.

## Executive finding

A privacy page already exists at `public/privacy.html`, but its current wording is too brief and includes broad statements that need verification against the real application and third-party integrations before they can safely serve as the public source of truth.

**Do not assume a missing page is the problem. The immediate problem is whether the existing page accurately describes actual data handling.**

## Directly observed statements

The current page, effective May 4, 2026, says:

- No sensitive personal data is required.
- Optional name/email may be stored for login.
- Anonymous usage statistics may be collected.
- Personal information is not sold or shared with third parties, except for legal/rights-protection cases.
- Browser local storage/cookies may be used.
- The product does not knowingly collect personal information from children under 13.
- Users can request account-data deletion.
- Uninstalling the app stops all data collection.

These statements are recorded here as observations of source copy, not as verified descriptions of runtime behavior.

## Highest-risk wording to verify

### 1. “We do not ... share your personal information with third parties”

The repository contains AI-assisted workflows and integrations. Before retaining this blanket statement, map every path by which prompts, student responses, account identifiers, uploads, feedback or telemetry may reach external services. Determine the exact payload, provider, purpose, retention, contractual terms and relevant settings for each integration.

If service providers process data on the operator's behalf, the policy should accurately explain that processing instead of implying that no third-party processing occurs. Do not name providers or promise training/retention behavior until configuration and current terms have been checked.

### 2. “Anonymous usage statistics”

Verify the actual analytics/events implementation. Determine whether events include account IDs, stable identifiers, IP-derived data, device details, topic/lesson IDs or other data that can be linked to a person. Do not call information anonymous merely because message text is omitted. Use “pseudonymous” or another accurate description where appropriate and legally reviewed.

### 3. “We do not knowingly collect personal information from children under 13”

This statement does not establish a complete child-safety or consent program. Clarify the intended age range, registration gates, how age is handled, whether schools or parents manage accounts, and what happens if the operator learns that a child account exists. Obtain qualified advice on applicable obligations before making child-directed or school-wide claims.

### 4. “You can request deletion” and “uninstall ... stop[s] all data collection”

Verify that users have a functioning request route and that account, database, analytics, feedback, uploaded files, backups and provider-side records are covered to the extent promised. Uninstalling a PWA/app does not by itself establish that cloud-held records are deleted or that server-side processing has stopped for an existing account. Revise this language to distinguish local data, account use and stored cloud data.

### 5. Missing operational detail

The page should explain, based on verified facts:

- The operator and contact route.
- Categories of information and the feature that generates each category.
- Purposes and lawful/contractual basis where applicable.
- AI processing and external service providers.
- Storage location and security controls at a level safe to disclose.
- Retention periods and deletion limitations.
- Account, learning-history, feedback and uploaded-file handling.
- Cookies/local storage and service-worker/offline behavior.
- User access/correction/deletion routes.
- Minor/student and school-managed account boundaries.
- Effective date and how material changes are communicated.

## Required verification sequence

1. Inventory collection and persistence paths across registration, Supabase, API routes, uploads, feedback, analytics, logs and browser/device storage.
2. Trace AI requests from client to server and onward to each provider. Record fields sent, settings, data retention/training terms and failure/fallback paths.
3. Inspect Supabase RLS, admin/service-role access, storage policies and account deletion behavior.
4. Check deployment configuration without exposing or copying secrets.
5. Verify the current contact address and implement/confirm a working privacy request process.
6. Review minor/student and school use with qualified legal guidance.
7. Rewrite the policy in plain language to match verified facts; publish only after the product owner reviews it.
8. Record a dated review owner and revisit the policy whenever data flows or providers change.

## Acceptance criteria

- [ ] Each public claim is mapped to code, configuration, provider terms or an implemented process.
- [ ] No blanket “no third-party sharing” or “anonymous” claim remains unless supported.
- [ ] AI processing and provider behavior are accurately disclosed.
- [ ] Deletion claims match implemented behavior and documented limits.
- [ ] Child/minor language reflects actual product scope and has appropriate review.
- [ ] A working privacy contact/request process exists.
- [ ] The policy is readable on mobile and linked from relevant public and account surfaces.
- [ ] No secret, private identifier or unnecessary personal data is exposed in documentation.

## Non-claims

This audit does not conclude that Shadecode violates a law, that a specific provider trains on Shadecode data, or that any particular data flow is enabled in production. Those questions require direct implementation/configuration and contractual verification.
