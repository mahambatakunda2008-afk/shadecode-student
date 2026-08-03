# SHADECODE STUDENT - FEATURE IMPLEMENTATION PROTOCOL

## PURPOSE

Use this prompt when implementing a new feature.

This protocol ensures features are built safely, consistently, and without damaging existing systems.

You must follow the Master Engineering Instructions first.

---

# FEATURE REQUEST

Feature name:

[INSERT FEATURE NAME]

Feature goal:

[DESCRIBE THE OUTCOME]

Student problem being solved:

[DESCRIBE WHY THIS EXISTS]

---

# PHASE 0: UNDERSTAND

Before writing code:

Find only the systems directly related to this feature.

Do not audit the entire repository.

Identify:

- entry points
- relevant pages
- components
- hooks
- services
- APIs
- database tables
- existing similar features

Return:

## Feature Map

Files involved:

Dependencies:

Current behaviour:

Missing behaviour:

Potential risks:

STOP.

Wait for approval.

---

# PHASE 1: DESIGN

Create an implementation plan.

The plan must include:

## User Experience

Explain:

- what the student sees
- how they interact
- what happens after actions
- success states
- failure states

## Technical Design

Explain:

- components required
- data flow
- state management
- API changes
- database changes if required
- AI integration if required

## File Changes

List:

File:

Reason:

Change:

Risk:

Do not write code yet.

STOP.

---

# PHASE 2: IMPLEMENTATION

Implement the feature.

Rules:

- Modify only approved files.
- Keep changes small.
- Reuse existing architecture.
- Follow current coding style.
- Avoid unnecessary dependencies.
- Do not refactor unrelated systems.

If another file becomes necessary:

STOP.

Explain why.

Wait.

---

# AI FEATURE REQUIREMENTS

If this feature uses AI:

Follow Cortex architecture.

Required:

Input:

- user context
- student level
- subject
- previous progress

Processing:

- Cortex decision layer
- memory lookup
- appropriate AI provider selection

Output:

- useful educational response
- explanation
- feedback
- next action

Never create:

Component → AI API

---

# DATABASE FEATURE REQUIREMENTS

If database changes are needed:

Before editing:

Explain:

- why a schema change is required
- affected tables
- migration impact
- security considerations

Avoid unnecessary tables.

Prefer extending existing structures.

---

# UI REQUIREMENTS

Every feature must include:

## Loading

What happens while waiting?

## Empty State

What happens with no data?

## Error State

What happens when something fails?

## Mobile

Does it work on small screens?

---

# EDUCATIONAL REQUIREMENTS

Shadecode Student is not just a tool.

Every feature should improve learning.

Ask:

Does this:

- improve understanding?
- improve consistency?
- provide feedback?
- help students make better decisions?

Avoid features that only add decoration.

---

# TESTING

After implementation verify:

- TypeScript
- imports
- routing
- API responses
- database calls
- UI states

Test:

Normal case:

Edge case:

Failure case:

---

# COMPLETION REPORT

When finished provide:

## Feature Completed

Summary:

## Files Changed

List:

## Architecture Impact

Explain:

## Testing

Results:

## Remaining Work

List:

STOP.

Do not continue to another feature automatically.
