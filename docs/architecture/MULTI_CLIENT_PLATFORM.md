# Shadecode Student Multi-Client Platform

## Status
Planned architecture / product direction

## Core idea

Shadecode Student should evolve from a single student application into a shared learning platform with multiple clients. The product is **one learning system with different interfaces for different people**.

The WhatsApp client is a first-class access channel, especially for Zimbabwe and other low-connectivity environments where users may have WhatsApp bundles but limited general-purpose mobile data.

> **One learning system. Every person gets the interface they actually use.**

## Client ecosystem

### 1. Student

Primary experience remains the full Shadecode Student web/PWA application:
- Learn
- Code Lab
- Exam Sim
- Past Papers / Exam Hub
- Work Checker
- Focus
- Timetable
- Progress, XP and streaks
- Achievements
- Cortex
- Offline learning

WhatsApp provides a lightweight student client for:
- asking questions
- Cortex explanations
- practice questions
- daily challenges
- progress and streak checks
- today's study plan
- reminders
- past-paper questions
- sending work for checking
- continuing lightweight lesson interactions
- searching learning content

### 2. Teacher

Full web client:
- classes
- students
- assignments
- attendance
- results
- learning progress
- weak-topic analysis
- announcements
- lesson resources
- past papers
- AI-assisted lesson preparation

WhatsApp client:
- class summaries
- send assignments
- announcements
- reminders
- quick progress checks
- lightweight teacher commands and workflows

### 3. Parent

Parent experience should be primarily WhatsApp-first rather than requiring another complex app.

Potential capabilities:
- child learning summaries
- weekly learning reports
- attendance/progress signals where permitted
- strengths and weak areas
- study reminders
- important school/teacher messages
- notifications when attention is needed

Example weekly report:
- learning sessions completed
- learning time
- lessons completed
- practice questions attempted
- average performance
- strongest subject
- topic needing attention
- recommended focus for the following week

### 4. School

School portal/client:
- students
- teachers
- classes
- subjects
- attendance
- results
- assignments
- announcements
- parent communication
- academic analytics
- reports

Shadecode Student and Shadecode SCS should share appropriate platform infrastructure instead of becoming disconnected systems.

### 5. School Administrator

Administrative client:
- student enrollment
- teacher management
- classes
- subjects
- academic years
- exam boards
- curriculum configuration
- permissions
- reports
- communication
- usage analytics

The system must support different curricula and configurations per learner/school, including ZIMSEC O Level/A Level and Cambridge pathways, rather than assuming one universal syllabus.

### 6. Tutor / Private Teacher

Tutor/classroom client:
- create learning groups
- enroll students
- assign work
- monitor completion
- inspect scores
- identify weak topics
- communicate with students

Potential users include private tutors, extra-lesson teachers, coaching centres and university tutors.

### 7. University / Polytechnic

A future education-level client for:
- university students
- polytechnic students
- college students
- vocational learners

Potential capabilities:
- course-based learning
- assignments
- course materials
- practical work
- coding
- technical subjects
- exam preparation
- institutional communication

This is an important expansion path because the current Student product does not fully support tertiary education.

### 8. Content Creator / Curriculum Author

Potential platform role for creating and maintaining:
- curriculum-aligned lessons
- question banks
- courses
- revision packs
- learning resources

### 9. Education Organization

Potential client for NGOs, education programmes and other organizations managing cohorts of learners.

### 10. Science / Practical Client

Future interface around the virtual science laboratory and practical-learning experiences.

### 11. Developer / Code Lab Client

Code Lab can eventually support a more dedicated coding-learning workflow while still using the same identity, curriculum, progress and Cortex infrastructure.

### 12. Resource Provider

Potential role for organizations or approved partners contributing learning resources and curriculum-aligned content.

## Shared platform architecture

Do **not** build each client as a separate product with duplicated business logic.

Use one shared platform core:

```text
                         SHADECODE PLATFORM
                                  |
          +-----------------------+-----------------------+
          |                       |                       |
      EXPERIENCE              EXPERIENCE              EXPERIENCE
          |                       |                       |
       Student                 Teacher                  Parent
          |                       |                       |
       App/PWA                Web/PWA                WhatsApp
          |                       |                       |
          +-----------------------+-----------------------+
                                  |
                           SHADECODE CORE
                                  |
       +--------------------------+--------------------------+
       |            |             |            |              |
    Identity    Curriculum    Learning      Cortex         Events
    Roles       Assessments   Progress      Memory         Notifications
    Permissions Content       XP/Streaks    AI Router      Integrations
    Relations   Question Bank Analytics     Context        Audit
```

## Identity and authorization

Every interaction should resolve through:

**Identity -> Role -> Permissions -> Relationships -> Curriculum/Academic Context -> Cortex/Business Logic**

Examples:
- A student can see their own progress.
- A parent can see authorized child summaries, not another student's data.
- A teacher can see authorized class-level information.
- A school administrator can manage authorized school data.
- Cortex must respect the same permission boundaries as the rest of the platform.

## WhatsApp as a low-data access layer

WhatsApp should be treated as a platform channel, not as a separate AI product.

```text
WhatsApp message
      |
WhatsApp webhook/API
      |
Identify Shadecode user
      |
Role + permissions + relationships
      |
Cortex Router / platform services
      |
Memory + curriculum + learning context
      |
Learning / assessment / notification logic
      |
WhatsApp response
```

The WhatsApp client should use the official WhatsApp Business/Cloud API for production rather than fragile unofficial WhatsApp Web automation.

## Web/PWA and WhatsApp division of responsibility

WhatsApp is optimized for:
- text interaction
- quick questions
- answers
- reminders
- notifications
- lightweight progress
- lightweight assignments
- low-bandwidth workflows

The full app is optimized for:
- rich lessons
- diagrams
- exam canvases
- simulations
- complex analytics
- interactive tools
- full navigation
- offline-first rich learning

WhatsApp should lower the barrier to entering the Shadecode learning loop, while the app remains the full learning environment.

## Unified notifications

Build a shared notification engine rather than separate notification systems per client.

```text
Platform Event
      |
Notification Engine
      |
+-----+----------+---------+
|                |         |
WhatsApp        Push      Email
```

Potential events:
- assignment created
- assignment due
- learning inactivity
- weekly parent report
- teacher announcement
- school announcement
- study reminder
- progress milestone
- important academic alert

## Low-connectivity principle

The platform should be designed for constrained connectivity from the beginning, not retrofitted later.

Requirements to investigate and measure:
- low bandwidth payloads
- intermittent connectivity
- graceful reconnects
- caching
- offline PWA storage
- downloadable lessons/resources
- compressed images
- asynchronous operations
- efficient API responses
- minimal unnecessary JavaScript/data transfer
- WhatsApp bundle accessibility

The product should eventually measure actual bandwidth/data usage rather than relying on the phrase "low data" as an unverified claim.

## Student onboarding through WhatsApp

Potential first-run flow:

```text
Student sends: Hi
        |
Shadecode welcome
        |
Education level
        |
Exam board / curriculum
        |
Subjects
        |
Learning goals / preferences
        |
Create/link Shadecode identity
        |
Begin learning
```

The goal is to remove unnecessary friction. A student should be able to enter the learning loop without first downloading a large app or navigating a complicated registration process.

WhatsApp identity may provide the initial identity mechanism, but account linking, privacy, consent, phone-number handling and recovery must be designed carefully before production.

## Cross-client synchronization

A user's learning state must remain consistent across clients.

Example:

```text
Student asks Cortex on WhatsApp
          |
Cortex interaction recorded
          |
Learning/progress state updated
          |
Student later opens PWA
          |
Conversation/progress/context available where appropriate
```

Similarly:
- teacher assigns work in the dashboard -> student receives it through supported channels
- student completes work -> teacher sees completion
- student progress changes -> authorized parent summary can reflect it
- school announcement -> appropriate teacher/student/parent channels receive it

## Privacy and safety principles

Because the platform involves students, parents and schools:
- enforce role-based access control
- minimize data exposed through WhatsApp
- never expose private student data to unauthorized recipients
- require explicit parent/guardian and school consent flows where applicable
- audit important access and communication events
- separate internal AI context from user-visible permissions
- design data retention and deletion policies before production

## Suggested implementation sequence

### Phase 1: Foundation
- define shared roles and relationships
- map current Student architecture to the multi-client model
- create channel abstraction
- define event/notification contracts
- identify reusable backend services

### Phase 2: WhatsApp Student MVP
- official WhatsApp integration
- webhook handling
- user identity linking
- basic message routing
- Cortex Q&A
- curriculum-aware context
- basic progress queries

### Phase 3: WhatsApp learning workflows
- practice questions
- daily challenge
- reminders
- lesson continuation
- work submission/checking
- past-paper interactions

### Phase 4: Parent client
- verified parent-child relationships
- weekly summaries
- important alerts
- controlled progress views

### Phase 5: Teacher client
- teacher identity and roles
- classes
- assignments
- announcements
- progress summaries
- WhatsApp quick actions

### Phase 6: School / Admin
- school tenancy/model
- enrollment
- teacher management
- curriculum configuration
- reporting
- permissions

### Phase 7: Tertiary + extended ecosystem
- university/polytechnic pathways
- tutors
- content authors
- education organizations
- practical/science experiences
- resource providers

## Product principle

Shadecode should not become ten disconnected apps.

It should become a **shared learning-control platform** with multiple clients and role-specific experiences.

The central advantage is continuity:

**same learner -> same identity -> same curriculum -> same progress -> same Cortex -> different interface.**

## Immediate next step

Before implementing the WhatsApp client, audit the existing Shadecode Student repository and backend to identify:
1. existing identity/auth model
2. user/profile schema
3. Cortex routing entry points
4. event system
5. notification infrastructure
6. curriculum/education-level/exam-board model
7. progress/XP/streak data
8. API routes that can be reused
9. Supabase tables/RLS policies
10. safest integration point for an official WhatsApp webhook

Implementation should extend the existing architecture rather than create a parallel backend.
