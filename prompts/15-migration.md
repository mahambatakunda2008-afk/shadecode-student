# SHADECODE STUDENT - MIGRATION AND SYSTEM CHANGE PROTOCOL

## PURPOSE

Use this prompt for large-scale changes.

Examples:

- architecture changes
- replacing systems
- moving data structures
- framework upgrades
- major feature migrations
- removing legacy systems
- changing AI architecture

You must follow:

/prompts/00-master.md

---

# MIGRATION REQUEST

Migration name:

[INSERT MIGRATION]

Current system:

[WHAT EXISTS NOW]

Target system:

[WHAT SHOULD EXIST AFTER]

Reason:

[WHY THIS CHANGE IS REQUIRED]

---

# MIGRATION PRINCIPLE

Large changes must be controlled.

Never:

- replace everything at once
- delete old systems immediately
- migrate without backups
- assume compatibility

Prefer:

- gradual migration
- backwards compatibility
- checkpoints
- rollback plans

---

# PHASE 0: SYSTEM ANALYSIS

Before editing:

Understand:

Current architecture:

Dependencies:

Users affected:

Data affected:

Features affected:

Return:

## Migration Analysis

Current state:

Target state:

Differences:

Risks:

Complexity:

LOW / MEDIUM / HIGH

Do not modify yet.

---

# PHASE 1: MIGRATION STRATEGY

Create a plan.

Include:

## Step 1

Preparation:

## Step 2

New system creation:

## Step 3

Connection:

## Step 4

Testing:

## Step 5

Old system removal:

Explain:

Why each step is safe.

---

# COMPATIBILITY RULES

During migration:

Prefer:

Old system

-

New system

working together temporarily.

Avoid:

Breaking existing users.

If possible:

Use:

- adapters
- feature flags
- gradual rollout

---

# DATA MIGRATION RULES

For database changes:

Before migration:

Check:

- existing data
- backups
- schema differences
- user impact

Requirements:

- preserve user progress
- validate migrated data
- handle failures

Never:

- delete production data
- reset user information

---

# FEATURE MIGRATION RULES

When replacing features:

Preserve:

- user expectations
- existing workflows
- important data

Document:

What changed:

Why:

How users are affected:

---

# AI SYSTEM MIGRATION RULES

For Cortex changes:

Preserve:

- memory
- user history
- learning progress

Test:

Old behaviour:

New behaviour:

Ensure improvement, not just replacement.

---

# FRAMEWORK MIGRATION RULES

For upgrades:

Check:

- dependencies
- breaking changes
- configuration
- deployment

Upgrade gradually.

---

# ROLLBACK PLAN

Every migration requires:

If failure occurs:

How do we return?

Include:

- rollback steps
- affected files
- affected data
- recovery process

---

# IMPLEMENTATION RULES

During migration:

- work in phases
- commit checkpoints
- verify after every stage
- avoid unrelated changes

After each phase:

Report:

Completed:

Remaining:

Risks:

STOP.

Wait before continuing.

---

# VERIFICATION

Test:

Before migration:

Behaviour:

After migration:

Behaviour:

Check:

- existing users
- new users
- performance
- security
- data integrity

---

# COMPLETION REPORT

Provide:

## Migration Completed

Summary:

## Old System

Description:

## New System

Description:

## Files Changed

List:

## Data Changes

List:

## Rollback Available

YES / NO

## Final Status

READY

or

BLOCKED

STOP.
