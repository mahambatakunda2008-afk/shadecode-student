# Shadecode Student continuity and learner-data recovery runbook

**Created:** 2026-10-23  
**Status:** Operational plan; backup and restore capability has not yet been demonstrated by this document.

## Objectives

1. A learner can request a copy of account-associated data and understand what is included.
2. The maintainer can recover the application and essential data after a deployment, account or database failure.
3. If Shadecode Student is discontinued, learners receive clear notice and a realistic export window where feasible.

## What is not yet promised

- No universal retention period has been verified across databases, provider logs, backups and local device storage.
- A mailto link is a request channel, not an automated export or deletion mechanism.
- A database backup is not proven recoverable until a restore test succeeds.
- Repository availability alone does not guarantee the hosted app, credentials, domain or database will remain available.
- Do not promise a service-level objective, recovery time or recovery point until it has been measured.

## Immediate owner checklist

### Access and ownership
- [ ] Confirm at least two trusted recovery paths for the source repository and deployment account where the providers permit it.
- [ ] Document who owns the domain, Vercel project, Supabase project and AI-provider billing/configuration.
- [ ] Store recovery instructions in an access-controlled location. Never commit secrets or put service-role keys in this runbook.
- [ ] Verify billing/usage alerts and account recovery methods.

### Backup and restore
- [ ] Confirm which Supabase backup/export features are available on the actual plan and project.
- [ ] Identify which data can be exported, including user-owned records, curriculum metadata, storage objects, and required schema/migrations.
- [ ] Record backup frequency and retention only after verifying actual settings.
- [ ] Perform a restore into an isolated non-production environment before calling the backup strategy tested.
- [ ] Check restored authentication references, storage objects, RLS policies, RPC functions, indexes and migration history.
- [ ] Record restore date, duration, missing objects, validation checks and remediation.

### Learner export
- [ ] Inventory every user-owned table, storage bucket, local-only record type and external provider store.
- [ ] Define a versioned export format with metadata explaining fields and timestamps.
- [ ] Derive identity from the authenticated session on the server; never accept a client-supplied user ID as authority.
- [ ] Include only the requesting learner's rows. Exclude other users' data, server secrets, internal security data and shared content the learner does not own.
- [ ] Define safe download expiry, rate limits, audit events and export-size limits.
- [ ] Test cross-account isolation, empty accounts, large accounts, missing optional tables and partial failures.
- [ ] Provide a clear warning that local-only data on another device may not be present in a server export.

### Deletion requests
- [ ] Inventory account-associated data, foreign keys, storage objects, logs and third-party retention behavior before deleting.
- [ ] Verify the requester's identity without asking for a password by email.
- [ ] Define what can be deleted immediately, what requires manual provider action, and what remains temporarily in backups or legally required records.
- [ ] Use a tracked request ID and give the learner a clear acknowledgement and completion/limitation notice.
- [ ] Test deletion against a dedicated test account before handling live requests.
- [ ] Do not delete the authentication account first if doing so would remove the ability to identify and clean up related records.

### Service discontinuation
- [ ] Prepare a plain-language notice describing the planned end date, export route, export window, and data categories that cannot be included.
- [ ] Keep a read-only export path available during the announced window if technically and financially feasible.
- [ ] Explain how long exports remain available and when account-associated data will be removed, subject to actual provider backup and legal limitations.
- [ ] Preserve public source and migration history so another maintainer can understand the system.
- [ ] After the service ends, revoke unused credentials and integrations safely and document any data that remains with providers.

## Request handling template

For a privacy request received at shadecodetech@gmail.com:
1. Acknowledge receipt without repeating sensitive content.
2. Verify account ownership using a proportionate method.
3. Categorize as access/export, correction, deletion, or question.
4. Check the data inventory and any provider dependencies.
5. Complete only the actions that can be verified.
6. Tell the requester what was completed, what could not be completed, and any known backup/provider limitation.
7. Record completion without storing unnecessary copies of the learner's data.

## Release gate

Do not mark learner export or deletion “available” until authenticated end-to-end tests demonstrate ownership isolation, complete intended coverage, understandable output, and honest handling of partial failures. Do not claim business continuity is guaranteed until restore drills and account recovery have been tested.
