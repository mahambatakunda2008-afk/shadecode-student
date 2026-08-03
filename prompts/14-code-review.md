# SHADECODE STUDENT - CODE REVIEW PROTOCOL

## PURPOSE

Use this prompt before:

- merging changes
- releasing features
- accepting AI-generated code
- approving major modifications
- reviewing architecture decisions

You must follow:

/prompts/00-master.md

---

# REVIEW REQUEST

Feature/System:

[INSERT TARGET]

Changes being reviewed:

[DESCRIBE CHANGES]

Purpose:

[WHY WERE THESE CHANGES MADE]

---

# REVIEW PRINCIPLE

The goal is not to criticize code.

The goal is to ensure:

- correctness
- maintainability
- security
- performance
- scalability
- consistency

Review like a senior engineer responsible for thousands of users.

---

# PHASE 0: UNDERSTAND CHANGES

Inspect:

- changed files
- related systems
- dependencies
- existing patterns

Return:

## Change Summary

What changed:

Why:

Affected systems:

Risk level:

LOW / MEDIUM / HIGH

---

# CODE QUALITY REVIEW

Check:

## Structure

- Is responsibility clear?
- Are files organised?
- Are components too large?

## Maintainability

- Is the code understandable?
- Is duplication avoided?
- Are names clear?

## TypeScript

Check:

- correct types
- unnecessary any usage
- unsafe assumptions

---

# FUNCTIONAL REVIEW

Check:

Does the feature:

- solve the intended problem?
- behave correctly?
- handle edge cases?

Look for:

- broken logic
- missing states
- unexpected behaviour

---

# ERROR HANDLING REVIEW

Check:

What happens when:

- API fails?
- database fails?
- user input is invalid?
- internet disappears?

Ensure:

The application fails gracefully.

---

# AI REVIEW

For AI-related changes check:

Architecture:

Feature
↓
Cortex
↓
AI provider

Check:

- correct context usage
- prompt quality
- cost efficiency
- fallback behaviour
- hallucination risks

---

# DATABASE REVIEW

Check:

- queries
- security
- data consistency
- migrations
- performance

Verify:

Existing users are not affected.

---

# UI REVIEW

Check:

- loading states
- empty states
- error states
- mobile layout
- accessibility

Ask:

Would a student understand this immediately?

---

# SECURITY REVIEW

Check:

- exposed secrets
- permissions
- validation
- unsafe inputs
- data leaks

---

# PERFORMANCE REVIEW

Check:

- unnecessary renders
- excessive requests
- large dependencies
- slow queries
- unnecessary AI usage

---

# SCALABILITY REVIEW

Imagine:

10 users

↓

1,000 users

↓

100,000 users

Would this design survive?

Identify:

- bottlenecks
- future risks
- improvements

---

# REVIEW RESULT

Provide:

## Overall Status

APPROVED

APPROVED WITH CHANGES

BLOCKED

## Findings

Critical:

-

High:

-

Medium:

-

Low:

-

## Recommended Actions

List:

## Final Recommendation

Explain:

STOP.

Do not modify code unless explicitly instructed.
