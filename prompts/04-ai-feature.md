# SHADECODE STUDENT - AI FEATURE DEVELOPMENT PROTOCOL

## PURPOSE

Use this prompt when creating, modifying, or improving any AI-powered feature.

Examples:

- Cortex improvements
- AI Tutor
- AI Learn
- Work Checker
- Exam generation
- Personalised recommendations
- Study planning
- Feedback systems
- AI analytics

You must follow:

/prompts/00-master.md

---

# AI FEATURE REQUEST

Feature name:

[INSERT FEATURE]

Purpose:

[WHAT SHOULD THIS AI SYSTEM DO]

Student problem:

[WHAT LEARNING PROBLEM DOES IT SOLVE]

---

# CORE PRINCIPLE

Shadecode Student does not use AI as a simple chatbot.

AI must act as an intelligent learning system.

Every AI feature should answer:

1. Who is the student?
2. What do they know?
3. What are they struggling with?
4. What should happen next?

The goal is:

Better learning.

Not just better answers.

---

# CORTEX ARCHITECTURE RULE

All AI intelligence must flow through Cortex.

Correct architecture:

Student
↓
Feature
↓
Cortex
↓
Memory + Reasoning + Routing
↓
AI Provider / Local Intelligence
↓
Response

Never:

Component
↓
Direct Gemini/OpenAI call

---

# PHASE 0: UNDERSTAND EXISTING AI SYSTEM

Before changing anything:

Find:

- Cortex files
- AI services
- prompts
- memory systems
- provider integrations
- API routes
- database storage

Return:

## AI System Map

Current flow:

Files involved:

Existing capabilities:

Missing capabilities:

Potential risks:

Do not code yet.

---

# PHASE 1: AI DESIGN

Create the AI behaviour specification.

Include:

## Input

What information does AI receive?

Examples:

- student level
- subject
- question
- previous mistakes
- learning history
- goals

## Reasoning

How does Cortex decide what to do?

## Output

What should the student receive?

Examples:

- explanation
- hint
- correction
- practice
- recommendation

---

# EDUCATION RULES

AI responses must encourage learning.

Default behaviour:

Teach.

Do not simply answer.

Prefer:

- explanations
- hints
- examples
- guided questions
- practice

Avoid:

- encouraging copying
- giving unexplained solutions
- replacing student thinking

---

# PERSONALISATION RULES

AI should consider:

Student profile:

- level
- subjects
- goals

Learning history:

- previous attempts
- mistakes
- weak topics

Current context:

- exam dates
- progress
- workload

Two students asking the same question may need different responses.

---

# AI PROVIDER RULES

External AI providers are unreliable.

Every AI call requires:

- timeout handling
- error handling
- fallback
- retry strategy where appropriate

Possible flow:

Local intelligence
↓
Fast model
↓
Advanced model

Do not depend on one provider.

---

# COST CONTROL

AI usage must be efficient.

Avoid:

- unnecessary AI calls
- sending huge context
- repeating stored information

Prefer:

- memory retrieval
- caching
- smaller models
- local processing

---

# MEMORY RULES

Before adding memory:

Define:

What is stored?

Why is it useful?

How is it retrieved?

How long does it live?

Do not store useless information.

Memory should improve:

- recommendations
- explanations
- study plans
- feedback

---

# SAFETY AND QUALITY

AI output must be checked for:

- incorrect information
- hallucinations
- unclear explanations
- unsuitable difficulty

Educational accuracy matters more than speed.

---

# IMPLEMENTATION RULES

When coding:

- modify minimum files
- reuse Cortex systems
- avoid duplicate AI logic
- preserve existing features

If architecture changes are needed:

STOP.

Explain first.

---

# TESTING

Test:

Normal question:

Difficult question:

Wrong student answer:

Missing information:

AI provider failure:

Offline scenario (if applicable):

---

# COMPLETION REPORT

Provide:

## AI Feature Completed

Summary:

## Architecture

How it connects to Cortex:

## Files Changed

List:

## AI Behaviour

Explain:

## Testing

Results:

## Future Improvements

List:

STOP.

Do not continue automatically.
