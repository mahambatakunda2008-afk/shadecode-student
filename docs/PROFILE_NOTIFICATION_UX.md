# Profile and notification UX

## Profile

Profile is the learner control centre, not a cosmetic account page.

Sections:
- identity and avatar;
- academic context;
- enrolled subjects;
- learning goals and preferences;
- mastery / XP / achievements;
- notifications;
- offline content and account controls.

Academic context changes require explicit confirmation. Historical lessons, exams and analytics retain the context in which they were created.

## Notification centre

The global shell should expose a bell with an unread badge. Opening it shows grouped recent notifications, read/unread state, timestamps and safe deep links. Invalid or external notification links are never followed.

Notification preferences live in Settings/Profile and support global enable/disable plus per-category controls.

## UX resilience

Notification fetch failure must not block the application shell. Empty, offline, loading and error states must each be explicit. A stale cached notification list may be shown with an offline indicator.
