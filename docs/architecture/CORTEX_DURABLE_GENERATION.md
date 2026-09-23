# Cortex Durable Generation

Cortex generation identity now has a server-side recovery record in `cortex_generation_jobs`.

The browser remains the execution surface where possible. The durable record exists so a refresh, tab close, provider failure, or device handoff does not destroy the generation identity.

## Contract

`browser job -> durable job -> local/cloud execution -> partial/result -> recovery`

The durability endpoint is deliberately small:
- POST once when a generation starts.
- GET only when recovery is needed.
- PATCH for terminal state or meaningful checkpoints.
- Never use it as a tight polling loop.

The endpoint does not perform model inference. It stores state only.

## Privacy and security

Rows are owned by `auth.uid()` through RLS. The service role is used only server-side to validate the bearer token and perform the database write. Anonymous clients cannot read or mutate generation state.

## Cost rule

Durability must not recreate the Vercel problem. Generation work stays out of this endpoint, and the client must not poll it continuously. If the endpoint is unavailable, local generation continues and the browser keeps its existing job state.

## Next migration

The next execution step is to make the lesson engine consume this durable identity for resumable section generation, then add a real browser inference runtime behind capability detection.