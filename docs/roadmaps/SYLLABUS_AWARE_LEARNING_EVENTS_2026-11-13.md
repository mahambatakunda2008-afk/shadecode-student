# Syllabus-aware canonical learning events

Date: 2026-11-13

## What changed

Canonical learning events now carry a server-resolved syllabus identity. The browser cannot choose the syllabus partition: the authenticated event ingress resolves the learner's configured curriculum from the profile, matching the exact subject code or configured subject name. Server-side emitters use the same resolver. Native exam submission resolves the syllabus with its bearer-authenticated client and binds that identity into the stable submission payload hash and durable completion outbox. Marked question results are grouped by each question’s topic and sent as per-topic percentages, so the durable outbox can actually update syllabus-scoped mastery rather than carrying an empty topic list.

The canonical event ID includes the syllabus only when a verified syllabus is available. This is deliberately backward-compatible: unscoped legacy event IDs retain their original hash, so pending offline events replay without becoming duplicate canonical events. Same source-event IDs in two different verified syllabuses receive distinct canonical IDs.

The canonical projector now accepts `p_syllabus_id` and stores/updates mastery only in that exact partition. Subject and topic labels are normalized to stable keys across canonical events and exam outbox projections, preventing case and punctuation variants from splitting one topic into duplicate mastery rows. `topic_mastery` uniqueness changed from `(user_id, subject, topic)` to `(user_id, subject, topic, coalesce(syllabus_id, ''))`. Historical rows remain NULL-syllabus rows. No historical row was assigned to a syllabus by guesswork.

The event API persists using the learner's authenticated client, then calls the service-role-only projection RPC using the server-only admin client. The service-role client is checked for missing configuration before use. Server emitters follow the same two-client pattern.

## Database migration

- Migration: `20261113135648_syllabus_aware_learning_projection`
- File: `supabase/migrations/20261113135648_syllabus_aware_learning_projection.sql`
- Applied to connected Shadecode Student project `zczdtffwzkctkxwmvalb`.
- Database migration history confirms version `20261113135648`.
- Exam projection migration `20261113135853_syllabus_aware_exam_topic_projection` is also applied and recorded.
- Exam projection migration: `20261113135853_syllabus_aware_exam_topic_projection`, also applied to the connected project.
- Both mastery and exam-projection ledgers now include syllabus identity in their idempotency/uniqueness partitions.
- Existing legacy topic and outbox rows remain in the NULL-syllabus partition.

The RPC remains `SECURITY INVOKER`, with execution granted only to `service_role`. Live privilege checks confirmed:
- service_role: execute
- authenticated: denied
- anon: denied

## Tests and verification

- Updated `supabase/tests/atomic_canonical_learning_projection.test.sql` to the new RPC signature and syllabus partition.
- Executed the canonical event projection regression transaction against the connected database. It confirmed:
  - first event projects;
  - replay of the same event is rejected;
  - second event in syllabus A updates the same A row;
  - same subject/topic in syllabus B creates a separate row;
  - A and B retain independent attempts and mastery values.
- Test ran inside BEGIN/ROLLBACK; no test rows were retained.
- Verified the new unique expression index in the live database.
- Supabase Security Advisor reported no new warnings for this migration. The existing unrelated findings remain: two RLS-enabled tables without policies, existing SECURITY DEFINER function grants, and leaked-password protection disabled.
- Executed the exam outbox projection regression transaction against the connected database. It confirmed duplicate replay is rejected and same subject/topic values in two syllabuses produce two independent mastery rows.
- Verified both projector RPCs are executable only by `service_role`; `authenticated` and `anon` are denied.
- Added Vitest coverage for syllabus-bearing event normalization, distinct event IDs, and normalized subject/topic keys.
- TypeScript, Vitest, lint, and end-to-end authenticated browser/native event replay have not yet been confirmed passing.

## Remaining boundaries

- Historical NULL-syllabus evidence is intentionally not backfilled into a current syllabus.
- If a learner has multiple curriculum subjects, an event must identify the subject using its configured subject code or name. Ambiguous or unmatched subjects remain unscoped and are excluded from verified-syllabus context.
- The current event projection records the verified syllabus ID. It does not yet attach a verified curriculum topic/objective key; that requires matching the event's topic to the syllabus knowledge catalog rather than trusting a client-supplied key.
- The durable exam-completion outbox now carries the verified syllabus ID from native exam submission into the exam-topic projection RPC. Native marked question results are grouped by their topic and sent as per-topic percentages. Existing outbox rows without a syllabus ID remain in the NULL-syllabus lane.

## Direct commits to main

- `83569caa3e7e1aaface18fd7c8dc90ce20f482b5` add syllabus identity to canonical event contract.
- `2b8f4922d44fbd3fe1c38fcf19fcca6f41e05182` pass syllabus to atomic projector.
- `4536325f1d9d6361006b9e8ebbbfb7660f2ce910` resolve exact configured subject names.
- `be1067d022196aaed08dc686930be0436d120cbc` attach verified syllabus at authenticated ingress.
- `bcfa0873a2de493f8c696facafdd48941813db54` scope server-side event emitters.
- `629e1f28aa6caf598dee9a52b6532876b6f28a46` include syllabus in event identity.
- `d0d46008bc2180858ed53dd5f7658f31df8c0dfb` preserve legacy event IDs.
- `a3e271be736f6380d230e3cd33afea02cfa4852c` add event identity tests.
- `8ad322e42b4bb18710c36819d9901b8d70eb9c80` add migration file.
- `b02b5fdedea1c47c148db4fbdd4ead2119b2e38b` test independent syllabus mastery rows.
- `eb34e7e6bd19009c9a10db0ab2243e3e75b02fdc` use service-role projector.
- `d8abcba020098bdcb7f0328faa61ea683d8e7850` project server-emitted events.
- `f8b12cc7d4f552a0546272683fecaf68dc680824` normalize subject names.
- `8b253378493fc710bdc54bcd107898f41a3b94d0` align migration file with database version.
- `745b1bb6ecae27f82c69ec1300a6561f0e52fa4e` remove superseded migration filename.
- `6f2a007b26742c6224db045ad5a835184b614129` use the service-role projector at authenticated ingress.
- `5e46d406232f5845ca671957128618e941045fee` project server-emitted events with the service-role client.
- `1ad2d0c61e751a47f35ed6122380b38071fe156f` add syllabus-aware exam topic projection migration.
- `0ce3827460eaf61b34bd91a2d453b4c2995398d1` pass syllabus identity through the durable exam outbox.
- `ee5799be801e64bdd6dea347469719416fe83ffc` bind native exam retries to the verified syllabus.
- `9d9a76bfe19d81d9664d7378ee6018a4b5ec970c` test independent exam topic projection rows by syllabus.
- `c1788462eab0f889ef8660762a4af4825a56f975` resolve native exam curriculum identity with the bearer token.
- `dd85777dcffca62e6b91504c6dfa1d3cd95feccb` aggregate native exam marking into syllabus-scoped topic scores.
- `7e41219dbe136363dd0cebffba61b21681eefb5d` normalize exam outbox projection keys.
- `321b82b6f399e2ccd4c348493a1f3fc459157348` normalize canonical mastery keys.
- `e87d06897b5dfa1bf4ef2d1e89f6849386c8f692` normalize event subject/topic identity.
- `a9602fa0c9bf7970ffcbd9401d90a46fe4a5c4c1` test canonical subject/topic normalization.
