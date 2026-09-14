# Shadecode Student Communication & SMS Architecture

## Purpose

Shadecode Student should communicate important learning and account events across multiple channels without coupling product logic to a specific delivery provider.

The principle is:

> Cortex decides what should happen. Channels decide how the user receives it.

Initial channels:
- In-app
- Push
- WhatsApp
- SMS

Email can be added later without changing the event model.

## Why SMS

SMS is not a replacement for the Shadecode app. It is a low-bandwidth reachability and fallback channel for situations where a user has limited connectivity, does not have the app open, or needs a high-value alert.

The inspiration is the practical SMS referral workflow used in rural healthcare: simple technology can close an important information gap when internet-dependent applications are not appropriate.

## Product rules

1. App remains the primary rich learning experience.
2. SMS is initially for high-value events, not full lessons or complex workflows.
3. Do not hard-wire application code to an SMS vendor.
4. Communication preferences and opt-out must be first-class.
5. Delivery must be observable: queued, sent, delivered where supported, failed, retried.
6. SMS must never be required for core offline learning.
7. Keep messages short and useful; avoid notification spam.
8. Do not put sensitive academic or personal data into SMS unnecessarily.
9. Phone numbers must be verified before enabling outbound SMS for an account.
10. Provider credentials must remain server-side and must never reach the client.

## Event-driven model

Product events can include:

- `learning_session_completed`
- `lesson_completed`
- `task_overdue`
- `exam_approaching`
- `streak_at_risk`
- `achievement_unlocked`
- `important_learning_alert`
- account/security events

A notification policy determines whether an event should produce a communication, which user should receive it, and which channels are eligible.

Conceptual flow:

```text
Product event
    -> Cortex / notification policy
    -> communication outbox
    -> channel router
       -> in-app
       -> push
       -> WhatsApp
       -> SMS
    -> provider adapter
    -> delivery status
```

## SMS adapter boundary

Use an internal provider-neutral interface such as:

```text
SmsProvider
  send(message)
  getStatus(messageId)
```

Provider-specific credentials, HTTP APIs, sender IDs, formatting and error handling belong behind the adapter.

This lets Shadecode change providers without changing learning logic.

## Initial SMS pilot

Start with only:

- `exam_approaching`
- `study_session_reminder`
- `important_learning_alert`

Possible later additions:

- parent weekly learning summary
- missed-study notification
- major academic milestone
- school/teacher alerts

Do NOT initially build:

- full lessons over SMS
- exam simulation over SMS
- Code Lab over SMS
- rich learning UI over SMS

Two-way SMS micro-learning can be researched later if it solves a demonstrated connectivity/access problem.

## Preferences

Users should eventually control:

- enabled channels
- SMS enabled/disabled
- event categories
- quiet hours
- reasonable daily limits
- opt-out

Parent and school communication must use explicit relationship and consent rules rather than assuming that possession of a student's phone number grants access to student data.

## Reliability

The communication layer should support:

- idempotency keys
- retry with bounded backoff
- provider failure isolation
- delivery status
- dead-letter/failure state
- rate limits
- audit logging

A provider outage must not block learning, authentication, or normal app usage.

## Cost strategy

The architecture itself costs nothing beyond development and existing infrastructure. Actual SMS delivery is normally a paid telecom/service operation, so Shadecode should NOT enable mass SMS by default.

Cost controls:

- opt-in
- high-value events only
- daily/user limits
- deduplication
- batching where appropriate
- server-side feature flag
- provider abstraction
- development mode with a fake/logging provider
- usage metrics before a real rollout

For early development, implement and test the complete communication pipeline with a no-cost fake provider. Connect a real SMS provider only after selecting one with suitable Zimbabwe coverage, pricing, sender-ID rules and two-way support.

## Future architecture

```text
                       SHADECODE
                           |
                         CORTEX
                           |
                 Notification / Events
                           |
                  Communication Outbox
                           |
          +----------------+----------------+
          |                |                |
        IN-APP           PUSH           WHATSAPP
                                           |
                                          SMS
                                           |
                                   Provider Adapter
                                           |
                                  Telecom/SMS Network
```

The long-term goal is channel-independent learning infrastructure: the student's learning state remains central while the delivery channel adapts to connectivity and user context.

## Success metrics

Before scaling SMS, measure:

- SMS opt-in rate
- messages per active user
- delivery rate
- failure rate
- reminder-to-session conversion
- exam reminder usefulness
- unsubscribe rate
- cost per active SMS user
- cost per useful action

The goal is not to maximize messages. The goal is to close important information gaps at acceptable cost.
