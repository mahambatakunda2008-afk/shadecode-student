# SHADECODE STUDENT - BUG FIX PROTOCOL

## PURPOSE

Use this prompt when fixing existing problems.

The goal is:

Find the real cause.

Apply the smallest safe fix.

Do not hide symptoms.

Do not damage working systems.

You must follow:

/prompts/00-master.md

---

# BUG REPORT

Bug name:

[INSERT BUG NAME]

Description:

[WHAT IS HAPPENING]

Expected behaviour:

[WHAT SHOULD HAPPEN]

Actual behaviour:

[WHAT CURRENTLY HAPPENS]

---

# PHASE 0: INVESTIGATION

Do NOT edit code yet.

Investigate only the systems directly related to this bug.

Find:

- affected files
- related components
- API routes
- database queries
- state management
- recent changes
- possible causes

Return:

## Bug Investigation Report

Symptoms:

Possible causes:

Evidence:

Root cause:

Confidence:

HIGH / MEDIUM / LOW

If root cause is unclear:

STOP.

Ask for more information.

---

# PHASE 1: FIX PLAN

Before changing anything:

Create:

## Repair Plan

Files to modify:

Reason:

Expected change:

Risk level:

LOW / MEDIUM / HIGH

Explain:

Why this fixes the actual cause.

Why this will not break other systems.

STOP for HIGH risk changes.

---

# PHASE 2: IMPLEMENT FIX

Apply the fix.

Rules:

- Make the smallest possible change.
- Do not rewrite the feature.
- Do not refactor unrelated code.
- Do not remove functionality.
- Do not replace working systems.

If the fix requires a larger redesign:

STOP.

Explain why.

---

# DEBUGGING RULES

Never fix bugs by:

- deleting features
- disabling functionality
- hiding errors
- removing validation
- bypassing security
- hardcoding fake solutions

Prefer:

- correct logic
- proper error handling
- better validation
- improved state management

---

# AI BUG RULES

For AI-related bugs:

Check:

- prompt construction
- API failures
- timeout handling
- fallback systems
- context handling
- Cortex routing
- memory retrieval

Do not simply switch AI providers.

Find the actual failure.

---

# DATABASE BUG RULES

For database problems:

Check:

- query correctness
- authentication
- permissions
- RLS policies
- missing data
- incorrect relationships

Do not modify schema unless necessary.

---

# VERIFICATION

After fixing:

Check:

- Does the original bug disappear?
- Did anything else break?
- Are errors handled?
- Are edge cases covered?

Verify:

Normal scenario:

Failure scenario:

Edge scenario:

---

# COMPLETION REPORT

Provide:

## Bug Fixed

Summary:

## Root Cause

Explanation:

## Files Changed

List:

## Fix Applied

Details:

## Testing

Results:

## Remaining Risks

List:

STOP.

Do not continue with unrelated improvements.
