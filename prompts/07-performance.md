# SHADECODE STUDENT - PERFORMANCE OPTIMIZATION PROTOCOL

## PURPOSE

Use this prompt when improving application speed, efficiency, and scalability.

Examples:

- slow pages
- laggy UI
- large bundles
- slow API responses
- expensive database queries
- excessive AI usage
- memory problems
- unnecessary rendering

You must follow:

/prompts/00-master.md

---

# PERFORMANCE REQUEST

Target:

[INSERT SYSTEM]

Problem:

[DESCRIBE PERFORMANCE ISSUE]

Expected improvement:

[WHAT SHOULD BECOME FASTER]

---

# PERFORMANCE PRINCIPLE

Optimize based on evidence.

Do not optimize imaginary problems.

Priorities:

1. User experience
2. Reliability
3. Maintainability
4. Resource efficiency

Never sacrifice correctness for speed.

---

# PHASE 0: INVESTIGATION

Before changing code:

Analyze:

- rendering behaviour
- network requests
- API calls
- database queries
- bundle size
- component complexity
- memory usage

Return:

## Performance Report

Current behaviour:

Bottleneck:

Evidence:

Impact:

Confidence:

Do not modify yet.

---

# PHASE 1: OPTIMIZATION PLAN

Create a plan.

Include:

## Problem

What is slow?

## Cause

Why is it slow?

## Solution

What changes are needed?

## Risk

LOW / MEDIUM / HIGH

## Expected Improvement

Explain:

STOP before high-risk changes.

---

# FRONTEND PERFORMANCE RULES

Check:

- unnecessary React renders
- large components
- unnecessary state updates
- repeated calculations
- duplicate fetching

Prefer:

- memoization only when useful
- smaller components
- efficient state management
- lazy loading where appropriate

Avoid:

- adding optimization everywhere
- premature complexity

---

# NEXT.JS RULES

Consider:

- Server Components
- Client Components
- data fetching patterns
- caching
- loading states

Avoid making everything client-side.

---

# API PERFORMANCE RULES

Check:

- duplicate requests
- slow processing
- missing validation
- unnecessary AI calls

Prefer:

- caching
- batching
- efficient responses

---

# DATABASE PERFORMANCE RULES

Check:

- expensive queries
- missing indexes
- unnecessary data fetching
- repeated queries

Prefer:

- selecting required data only
- pagination
- optimized queries

---

# AI PERFORMANCE RULES

AI costs and speed matter.

Reduce:

- unnecessary calls
- oversized prompts
- duplicate context

Prefer:

- Cortex memory
- cached responses
- local processing
- appropriate model selection

---

# MOBILE PERFORMANCE

Consider:

- slower devices
- limited bandwidth
- battery usage
- unreliable connections

Shadecode Student must work well on affordable devices.

---

# IMPLEMENTATION RULES

When optimizing:

- make measured improvements
- keep changes focused
- avoid unrelated refactors

If optimization requires architecture changes:

STOP.

Explain first.

---

# VERIFICATION

Measure:

Before:

Performance issue:

After:

Improvement:

Check:

- build success
- functionality preserved
- no new errors

Test:

Fast device:

Slow device:

Slow network:

---

# COMPLETION REPORT

Provide:

## Optimization Completed

Summary:

## Bottleneck Removed

Explain:

## Files Changed

List:

## Performance Impact

Explain:

## Testing

Results:

STOP.

Do not continue automatically.
