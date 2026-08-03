# SHADECODE STUDENT - DATABASE DEVELOPMENT PROTOCOL

## PURPOSE

Use this prompt for any database-related work.

Examples:

- Supabase tables
- migrations
- schema changes
- queries
- database functions
- Row Level Security
- performance improvements
- data models

You must follow:

/prompts/00-master.md

---

# DATABASE REQUEST

Task:

[INSERT DATABASE TASK]

Reason:

[WHY IS THIS REQUIRED]

Affected feature:

[FEATURE NAME]

---

# DATABASE PRINCIPLE

The database is a critical system.

Priorities:

1. Protect existing data.
2. Preserve compatibility.
3. Maintain security.
4. Keep queries efficient.
5. Avoid unnecessary complexity.

Never make destructive changes without approval.

---

# PHASE 0: UNDERSTAND CURRENT DATABASE

Before editing:

Inspect:

- existing tables
- columns
- relationships
- foreign keys
- indexes
- RLS policies
- existing queries
- API usage

Return:

## Database Analysis

Tables involved:

Relationships:

Current behaviour:

Dependencies:

Risks:

Do not modify yet.

---

# PHASE 1: DATABASE DESIGN

Create a plan.

Include:

## Schema Changes

Table:

Columns:

Data types:

Purpose:

## Relationships

Explain:

Foreign keys:

References:

Dependencies:

## Security

Explain:

Who can read?

Who can write?

Who can update?

## Migration Risk

LOW / MEDIUM / HIGH

STOP before high-risk changes.

---

# SCHEMA RULES

Before creating new tables ask:

Can existing tables support this?

Prefer:

- extending existing structures
- clear relationships
- normalized data

Avoid:

- duplicate tables
- duplicate student information
- unnecessary columns

---

# DATA RULES

Student data is valuable.

Protect:

- progress
- XP
- achievements
- lessons
- tasks
- exam history
- AI memory

Never:

- delete data casually
- overwrite user progress
- reset records during testing

---

# SUPABASE RULES

Check:

- authentication
- permissions
- RLS policies
- service role usage
- client/server separation

Never expose:

- private keys
- service credentials

---

# QUERY RULES

Queries should be:

- efficient
- clear
- predictable

Avoid:

- unnecessary repeated queries
- fetching huge datasets
- missing filters

Consider:

- pagination
- indexes
- caching

---

# MIGRATION RULES

Before migrations:

Explain:

- what changes
- why needed
- possible failure points

A migration must be:

- reversible where possible
- tested
- safe for existing users

---

# IMPLEMENTATION RULES

When changing database:

Modify only required files.

Do not:

- rewrite unrelated queries
- change APIs unnecessarily
- redesign schema without approval

---

# TESTING

Verify:

Database:

- migration succeeds
- queries work
- permissions work

Application:

- data loads
- data saves
- existing features still work

Test:

New user:

Existing user:

Missing data:

Permission failure:

---

# COMPLETION REPORT

Provide:

## Database Change Completed

Summary:

## Schema Changes

List:

## Files Changed

List:

## Security Impact

Explain:

## Testing

Results:

## Migration Notes

Explain:

STOP.

Do not continue automatically.
