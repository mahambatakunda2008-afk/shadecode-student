# SHADECODE STUDENT - TESTING AND VALIDATION PROTOCOL

## PURPOSE

Use this prompt for:

- testing features
- validating fixes
- checking releases
- investigating failures
- improving reliability

You must follow:

/prompts/00-master.md

---

# TEST REQUEST

Target:

[INSERT FEATURE OR SYSTEM]

Reason:

[WHY IS TESTING REQUIRED]

Expected behaviour:

[DESCRIBE WHAT SHOULD HAPPEN]

---

# TESTING PRINCIPLE

Never assume code works because it compiles.

A successful build does not guarantee:

- correct behaviour
- good user experience
- reliable data handling
- safe AI responses

Test like a real student would use the product.

---

# PHASE 0: UNDERSTAND

Before testing:

Identify:

- feature purpose
- user flow
- dependencies
- expected behaviour
- possible failure points

Return:

## Testing Scope

Feature:

User actions:

Expected results:

Risk areas:

Do not modify code yet.

---

# PHASE 1: TEST PLAN

Create test scenarios.

Include:

## Normal Flow

Example:

Student opens feature.

Student performs normal action.

Expected result.

## Edge Cases

Examples:

- empty data
- missing information
- unusual input
- large input

## Failure Cases

Examples:

- API failure
- database failure
- network failure
- invalid input

## User Experience Cases

Check:

- loading
- errors
- feedback
- navigation

---

# AI TESTING RULES

For AI features test:

Correct input:

Does it respond correctly?

Poor input:

Does it handle mistakes?

Missing context:

Does it ask useful questions?

AI provider failure:

Does fallback work?

Educational quality:

Does it teach instead of only answer?

---

# DATABASE TESTING RULES

Check:

- data creation
- data retrieval
- data updates
- permissions
- missing records

Test:

New user:

Existing user:

Invalid access:

---

# UI TESTING RULES

Check:

Desktop:

- layout
- interaction
- readability

Mobile:

- responsiveness
- touch targets
- scrolling

Slow connection:

- loading states
- errors

---

# REGRESSION TESTING

Before declaring success:

Check existing related features.

Ask:

Could this change break:

- authentication?
- dashboard?
- Cortex?
- tasks?
- XP?
- analytics?
- database?

---

# BUG REPORT FORMAT

If something fails:

Report:

## Issue

Description:

## Steps To Reproduce

1.

2.

3.

## Expected

:

## Actual

:

## Suspected Cause

:

Do not randomly fix without understanding.

---

# FIX VALIDATION

After fixing:

Repeat the failed test.

Confirm:

- issue is resolved
- no regression introduced

---

# COMPLETION REPORT

Provide:

## Testing Completed

Feature:

## Tests Performed

List:

## Results

Passed:

Failed:

Blocked:

## Remaining Issues

List:

STOP.

Do not continue automatically.
