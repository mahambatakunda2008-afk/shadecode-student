# SHADECODE STUDENT - OFFLINE-FIRST DEVELOPMENT PROTOCOL

## PURPOSE

Use this prompt for any offline, PWA, caching, synchronization, or low-connectivity work.

Examples:

- offline mode
- PWA improvements
- caching
- local storage
- IndexedDB
- sync systems
- offline lessons
- offline tasks
- network recovery

You must follow:

/prompts/00-master.md

---

# OFFLINE REQUEST

Task:

[INSERT OFFLINE TASK]

Goal:

[WHAT SHOULD WORK WITHOUT INTERNET]

Student scenario:

[DESCRIBE THE REAL WORLD SITUATION]

---

# OFFLINE PRINCIPLE

Offline is not an error state.

Offline is another operating mode.

The application should:

- remain useful
- preserve progress
- recover automatically
- sync when possible

Never create an offline experience that feels like a broken website.

---

# PHASE 0: UNDERSTAND CURRENT SYSTEM

Before changes:

Inspect:

- PWA configuration
- service worker
- caching strategy
- local storage
- IndexedDB
- network detection
- API handling
- synchronization logic

Return:

## Offline System Analysis

Current capability:

Existing storage:

Missing features:

Risks:

Do not modify yet.

---

# PHASE 1: OFFLINE DESIGN

Create the offline strategy.

Include:

## Available Offline

What can students use without internet?

Examples:

- saved lessons
- notes
- tasks
- progress
- practice questions
- downloaded resources

## Data Strategy

Explain:

Local storage:

Server storage:

Sync rules:

## Conflict Handling

What happens when:

- two changes happen offline?
- sync fails?
- data is outdated?

STOP before implementation.

---

# CACHING RULES

Cache useful content.

Prioritize:

- student data
- lessons
- UI assets
- learning resources

Avoid:

- caching sensitive information unnecessarily
- storing huge unused data

---

# STORAGE RULES

Choose the right storage.

Use:

Local storage:

- small preferences

IndexedDB:

- larger offline data

Server:

- permanent records

Do not store everything everywhere.

---

# SYNC RULES

Synchronization should:

- happen automatically
- handle failures
- avoid duplicates
- preserve user progress

Required:

- sync status
- retry handling
- conflict strategy

Never silently lose data.

---

# NETWORK HANDLING

Handle:

Online:

- normal operation
- sync pending changes

Offline:

- local operation
- queue changes

Returning online:

- synchronize safely
- update UI

---

# AI OFFLINE RULES

AI features require special handling.

When AI is unavailable:

Provide alternatives:

- cached explanations
- saved lessons
- local logic
- previous responses

Never leave:

"AI unavailable"

as the only option.

---

# PERFORMANCE RULES

Offline features must consider:

- storage size
- device limitations
- battery
- low-end phones

Avoid:

- huge downloads
- unnecessary background work

---

# IMPLEMENTATION RULES

When coding:

- modify only required files
- preserve existing behaviour
- avoid rewriting PWA systems

If offline architecture needs major changes:

STOP.

Explain first.

---

# TESTING

Test:

## Online

Normal behaviour:

## Offline

No connection:

## Recovery

Internet returns:

## Failure

Sync error:

## Device

Mobile device:

Verify:

- no lost data
- correct sync
- clear status

---

# COMPLETION REPORT

Provide:

## Offline Feature Completed

Summary:

## Offline Capabilities Added

List:

## Storage Changes

Explain:

## Sync Behaviour

Explain:

## Testing

Results:

STOP.

Do not continue automatically.
