# SHADECODE STUDENT - REFACTORING PROTOCOL

## PURPOSE

Use this prompt when improving existing code quality.

Refactoring means:

Improve the internal structure.

Keep the external behaviour identical.

The user should not notice anything changed except improvements.

You must follow:

/prompts/00-master.md

---

# REFACTOR REQUEST

Target:

[INSERT SYSTEM / FILE / MODULE]

Reason:

[WHY IS THIS BEING REFACTORED]

Desired improvement:

Examples:

- reduce duplication
- improve readability
- improve performance
- improve maintainability
- simplify architecture
- improve reliability

---

# PHASE 0: ANALYSIS

Before editing:

Understand the current implementation.

Identify:

- purpose of the code
- dependencies
- consumers
- side effects
- existing behaviour

Return:

## Refactor Analysis

Current design:

Problems:

Risk areas:

Expected improvement:

Do not modify code yet.

---

# PHASE 1: REFACTOR PLAN

Create a safe plan.

Include:

Files affected:

Changes:

Benefits:

Risks:

Rules:

Prefer:

- extracting reusable logic
- improving naming
- reducing duplication
- simplifying complexity
- improving type safety

Avoid:

- unnecessary rewrites
- architecture changes
- moving everything around
- changing APIs without reason

STOP before high-risk changes.

---

# PHASE 2: IMPLEMENTATION

Apply the refactor.

Rules:

The system must behave exactly the same.

Do not add new features.

Do not change business logic unless required.

Do not change user experience.

Do not modify unrelated files.

Maintain:

- existing APIs
- existing data structures
- existing routes
- existing component behaviour

---

# COMPONENT REFACTOR RULES

For React components:

Prefer:

- smaller components
- clear responsibilities
- reusable UI
- clean props

Avoid:

- giant components
- unnecessary state
- duplicated logic

---

# TYPESCRIPT RULES

Improve:

- type safety
- interfaces
- error handling

Avoid:

- adding "any"
- suppressing errors
- hiding TypeScript warnings

Never solve:

Type error → disable checking.

---

# PERFORMANCE RULES

Only optimize when there is evidence.

Check:

- unnecessary renders
- repeated calculations
- duplicate fetching
- inefficient queries

Do not add complexity for imaginary problems.

---

# AI / CORTEX REFACTOR RULES

For AI systems:

Never change behaviour accidentally.

Preserve:

- memory flow
- routing
- provider fallback
- context handling

Any AI architecture changes require explanation.

---

# DATABASE REFACTOR RULES

For database-related refactoring:

Do not change schema casually.

Check:

- existing queries
- relationships
- permissions
- migrations

Avoid breaking existing data.

---

# VERIFICATION

After refactoring:

Confirm:

- application builds
- imports work
- functionality remains unchanged
- no new warnings introduced

Compare:

Before:

Behaviour:

After:

Behaviour:

---

# COMPLETION REPORT

Provide:

## Refactor Completed

Summary:

## Files Changed

List:

## Improvements

List:

## Behaviour Changes

Must be:

None

unless explicitly approved.

## Testing

Results:

STOP.

Do not continue with additional cleanup automatically.
