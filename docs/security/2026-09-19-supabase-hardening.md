# Supabase security hardening, 2026-09-19

## Applied

Production project: `shadecode-student` (`zczdtffwzkctkxwmvalb`).

The production database had 11 RLS-enabled infrastructure tables with no explicit policies. These are now protected with explicit deny policies for `anon` and `authenticated`:

- curriculum ingestion/document/verification tables
- exam logs
- archived insights
- objective-skill mappings
- WhatsApp/platform channel identities, link codes and message receipts

Six SECURITY DEFINER functions that previously used `public, pg_temp` now use the tighter `public` search path. Their bodies already schema-qualify referenced relations.

## Remaining advisor findings

Seven SECURITY DEFINER RPCs are still executable by `authenticated`:

- get_traction_metrics
- get_user_permissions
- has_permission
- has_role
- increment_xp
- review_exam_question_topic_proposal
- upsert_revision_item

These are **not** blindly revoked because some have legitimate authenticated application paths. The next hardening step is route-by-route usage verification, then moving privileged calls behind trusted server routes or tightening EXECUTE grants.

Supabase also reports leaked-password protection as disabled. That setting requires the Auth configuration surface rather than ordinary SQL migration, so it remains a deployment configuration task.

## Verification

After applying the SQL, the 11 internal tables have an explicit `deny_public_data_api` policy for `anon, authenticated`, with `USING (false)` and `WITH CHECK (false)`.

The remaining advisor warnings are therefore known, bounded items rather than hidden regressions.
