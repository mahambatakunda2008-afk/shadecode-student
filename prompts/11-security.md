# SHADECODE STUDENT - SECURITY DEVELOPMENT PROTOCOL

## PURPOSE

Use this prompt for:

- security reviews
- authentication changes
- permissions
- API protection
- data protection
- vulnerability fixes
- privacy improvements

You must follow:

/prompts/00-master.md

---

# SECURITY REQUEST

Target:

[INSERT SYSTEM]

Reason:

[WHY SECURITY WORK IS REQUIRED]

Risk:

[DESCRIBE POSSIBLE IMPACT]

---

# SECURITY PRINCIPLE

Security means:

Protect users.

Protect data.

Protect the platform.

Never sacrifice security for convenience.

Priority:

1. User privacy
2. Data protection
3. Authentication safety
4. System reliability

---

# PHASE 0: SECURITY ANALYSIS

Before changing anything:

Inspect:

- authentication flow
- authorization logic
- API routes
- database access
- environment variables
- external integrations
- user data handling

Return:

## Security Report

System analysed:

Potential vulnerabilities:

Severity:

LOW / MEDIUM / HIGH / CRITICAL

Evidence:

Do not fix yet.

---

# AUTHENTICATION RULES

Check:

- registration
- login
- sessions
- password handling
- account recovery
- authentication state

Ensure:

Users can only access their own data.

Never:

- bypass authentication
- trust client-side checks alone
- expose sensitive information

---

# AUTHORIZATION RULES

Authentication:

"Who are you?"

Authorization:

"What are you allowed to do?"

Check:

- user permissions
- ownership checks
- role access

Example:

Student A must never access Student B's progress.

---

# DATABASE SECURITY RULES

For Supabase:

Check:

- Row Level Security
- policies
- table permissions
- exposed data

Never:

- disable security policies to make something work
- expose private tables
- use unsafe queries

---

# API SECURITY RULES

Every API endpoint should consider:

Input validation:

- type checking
- missing fields
- invalid data

Protection:

- authentication
- authorization
- rate limiting where needed

Never trust:

- user input
- client requests
- external responses

---

# AI SECURITY RULES

For AI systems:

Protect:

- API keys
- private prompts
- student information

Never send unnecessary private data to AI providers.

Consider:

- prompt injection
- malicious input
- unsafe outputs

---

# ENVIRONMENT RULES

Never expose:

- API keys
- database credentials
- service tokens

Check:

- environment variables
- client/server separation
- deployment settings

---

# DATA PRIVACY RULES

Student information should be minimized.

Before storing data ask:

What is collected?

Why?

How long?

Who can access?

Avoid storing unnecessary personal information.

---

# SECURITY IMPLEMENTATION RULES

When fixing security:

- make targeted changes
- preserve functionality
- explain impact

Do not:

- create fake security
- hide problems
- remove features to avoid fixing issues

---

# TESTING

Test:

Authentication:

- valid user
- invalid user

Authorization:

- allowed access
- forbidden access

API:

- valid input
- invalid input

Database:

- correct permissions
- blocked unauthorized access

---

# COMPLETION REPORT

Provide:

## Security Improvement Completed

Summary:

## Issues Found

List:

## Fixes Applied

List:

## Security Impact

Explain:

## Remaining Risks

List:

STOP.

Do not continue automatically.
