# Shadecode Student — Presenter Knowledge Handbook

**Event:** Speech and Prize Giving Day, 27 November 2026  
**Audience:** The person presenting Shadecode Student  
**Purpose:** Build real product understanding before rehearsal. This is a learning guide, not a script to memorise.

## 1. The one-sentence explanation

**Shadecode Student is a personal learning system that connects lessons, practice, assessment, revision and study organisation so that a learner's work can help guide what they should do next.**

If the presenter remembers only one idea, remember this: Shadecode is not just a place to open notes or ask an AI questions. Its direction is to connect learning activity to useful evidence and better next steps.

## 2. The problem it addresses

A learner may:
- read a lesson in one place;
- practise questions somewhere else;
- lose track of mistakes;
- revise without knowing which gaps matter most;
- struggle to continue when connectivity is unreliable.

The product is designed to bring these activities into one connected student experience. The educational question is not only, "Can the app answer this question?" It is, "Can the learner understand, practise, retain progress and decide what to do next?"

## 3. What the name means

- **Shadecode** is the company/product ecosystem being developed.
- **Shadecode Student** is the current student-facing product, focused on secondary learners and study workflows.
- **Cortex** is the learning-intelligence foundation: it helps connect learning evidence, learner context, curriculum and possible next actions.
- **Cortex OS** is the broader architectural direction for a shared learning-intelligence foundation. Do not describe it as a separately released computer operating system.
- **Discovery** and **Campus** are planned specialized experiences for primary and tertiary learners. They are part of the wider direction, not products to claim as fully launched today.

The current repository is one application. The longer-term architecture aims to let different education experiences share identity, curriculum, learning evidence, mastery, memory and intelligence without forcing every learner into the same interface.

## 4. How the learning loop works

The product's guiding loop is:

**Observe → Understand → Predict → Act → Evaluate → Learn**

In plain language:

1. **Observe:** Notice what the learner actually does, such as completing a lesson or attempting a question.
2. **Understand:** Interpret the evidence in its subject and topic context.
3. **Predict:** Identify a likely learning need or useful next step.
4. **Act:** Offer an appropriate action, such as revisiting a concept or practising a related skill.
5. **Evaluate:** Check what happened after the learner took that action.
6. **Learn:** Use the new evidence to improve future guidance.

This is a design and engineering principle. Do not claim that every module already completes this entire loop for every learner.

## 5. What is in the current product

The repository and product include these areas, with different levels of maturity:

- **Learn:** Curriculum-aware, AI-assisted lesson and learning workflows.
- **Exam Simulation:** Timed assessment and exam-practice workflows.
- **Exam Hub:** Past-paper and question-bank workflows.
- **Cortex:** Learning signals, weak-area foundations and recommendations.
- **Study organisation:** Tasks, timetables, focus sessions and analytics.
- **Project Studio:** Structured project planning and evidence capture.
- **Cortex Verify:** Tools for capturing and reviewing written work.
- **Gamification:** XP, levels, achievements, streaks, challenges and leaderboards.
- **PWA and local-first foundations:** Work to preserve supported learning activity and make selected workflows more resilient to unreliable connectivity.

**Important:** A feature appearing in the navigation or source code does not prove every part is complete. The presenter must demonstrate only the exact workflows that have passed rehearsal. The current candidate is Exam Simulation → A-Level Physics → Waves → 5 questions, using the deterministic local question engine and offline marking. This is a candidate, not an approved live demo, until it passes the actual-device tests.

## 6. How the technology works, without jargon

Shadecode Student is built as a web application using Next.js and TypeScript. Supabase provides database and authentication services. Vercel hosts the production web application. GitHub Actions runs automated checks and build workflows.

AI is used as an assistive capability for supported learning tasks. The product architecture routes model requests through a backend rather than allowing the interface to call AI providers directly.

A crucial design rule is that an AI model must not be the authority for everything:
- saved work must be persisted by the application and database;
- scoring and deterministic rules should not depend on a model making something up;
- learner progress should be based on recorded evidence;
- when a cloud provider is unavailable, the app should use a supported fallback or clearly explain that the action cannot currently be completed.

The system is being developed with local-first and offline resilience in mind. This does **not** mean every feature or AI capability works without internet. State the exact offline workflow tested, or do not make an offline claim.

## 7. Curriculum and who it is for

The current product has a strong focus on Cambridge and ZIMSEC learners. The wider platform direction includes primary, secondary, university, college, polytechnic and TVET learning.

Never say "it supports every subject, every syllabus" unless the exact board, qualification, level, subject and content have been checked. A subject being selectable is not proof that its complete curriculum content is available.

A safe answer is: "Cambridge and ZIMSEC learners are an important focus. We are expanding coverage, and we prefer to show the exact subjects and syllabus areas that have been verified rather than promise universal coverage."

## 8. What makes the idea different

The intended distinction is the connection between:
- curriculum context;
- lessons and practice;
- learner-specific evidence;
- mistakes and areas needing attention;
- study planning and next actions;
- durable progress and increasingly resilient access.

A general chatbot can answer a prompt. A connected learning system aims to understand the learner's study context over time and help the learner make a useful next move. This is the ambition and architecture direction; measured improvements in grades or learning outcomes have not been established unless a proper evaluation says otherwise.

## 9. What it is not

- It is not a replacement for teachers.
- It is not a guarantee of higher grades.
- It is not proof that every subject or syllabus is fully covered.
- It is not fully offline across all features.
- It is not an AI model that knows everything or is always available.
- It is not yet evidence of school, government or institutional endorsement.
- It is not the separate, full computer operating system being explored as a future Shadecode platform direction.

## 10. Likely questions and confident, honest answers

**What problem does Shadecode Student solve?**  
It aims to connect lessons, practice, assessment and study organisation, so learning activity can help a student understand what to work on next.

**What is Cortex?**  
Cortex is the learning-intelligence foundation. It connects learner context and learning evidence to possible explanations, insights and next actions. It is more than a chatbot, although supported AI models can assist parts of the experience.

**Does it replace teachers?**  
No. It is designed to support students' learning. Teachers remain important for instruction, judgement, encouragement and school context.

**Does it work offline?**  
Selected local-first workflows are being developed and tested. We only claim offline support for the exact activities verified on the demonstrated device. Some features, especially cloud generation and synchronization, need connectivity.

**What happens if the AI stops working?**  
The application should preserve saved work and use deterministic or local alternatives where those are supported. A feature that needs an unavailable provider should report the limitation rather than pretend it succeeded.

**Does it cover all Cambridge and ZIMSEC subjects?**  
We are expanding curriculum coverage. We will show the exact subject and syllabus areas verified in the current product rather than claim complete coverage without evidence.

**Has it improved students' grades?**  
We are not claiming measured grade improvements without a proper evaluation. The next step is to test usefulness with learners and educators and measure outcomes responsibly.

**Can a school use it?**  
We would welcome a conversation about a small, carefully scoped pilot with agreed goals, learner consent, privacy boundaries, support and evaluation.

**Who built it?**  
Shadecode is developing it. Explain the actual people and their roles accurately. Do not imply a large team, institutional partnership or endorsement that does not exist.

**Why build it in Zimbabwe?**  
The product is being developed with local learners and real study conditions in mind, including curriculum needs, affordability and inconsistent connectivity. The ambition is to build something useful locally that can grow to serve learners elsewhere.

## 11. Demonstration: what the presenter must understand

The demo should tell one complete story, not tour every menu.

Use this structure:
1. Introduce a relatable student learning problem.
2. Open the prepared demo account.
3. Show one verified subject and learning activity.
4. Complete a short task.
5. Explain the actual feedback or result.
6. Show saved/reopened work only if persistence has been tested.
7. Explain what the learner can do next, only if that recommendation is genuinely supported by the demonstrated evidence.
8. Close with the product's purpose and an invitation for feedback or a responsible pilot discussion.

Before rehearsal, the team must fill in:
- **Candidate workflow:** Exam Simulation → A-Level Physics → Waves → 5 questions.
- **Question source:** The code contains a deterministic Physics wave-speed generator. The candidate should be started with airplane mode enabled after the app and account have been prepared.
- **Marking:** The local numeric marker can mark supported generated numeric questions without a model provider. Treat the result as practice feedback, not verified exam-history evidence.
- **Primary presentation device:** Laptop running the current stable Chrome browser, connected to the projector. Prepare the demo account and route in advance. Use the Android APK as a separately tested backup, not the primary live path.
- **Why laptop first:** A larger projected interface is easier for an audience to follow, keyboard/mouse navigation is more controlled, and the presenter can keep the demo and backup material ready. This is a presentation decision, not evidence that the Android build is less capable.
- **Exact starting route:** `/exam-sim`.
- **What the learner does:** Start the prepared paper, answer a short set of questions, submit and inspect the feedback.
- **What is saved and reopened:** The exam workspace has local draft/resume storage. It must pass reload/reopen testing on the presentation device before being shown.
- **Offline step:** Candidate only. Test airplane mode, reload/reopen, resume, submit and reconnect. Do not claim every app feature works offline.
- **Backup:** A locally stored recording of the same verified workflow, clearly described as a recording/backup.

Do not improvise by clicking through untested screens. If a live step fails once, switch to the prepared backup.

## 12. The presenter's study plan

The presenter should be able to explain the product without reading this document.

**Session 1 — Understand (45 minutes)**
- Read sections 1–10.
- Explain Shadecode Student, Cortex and the learning loop aloud.
- Practise answering the first five questions.

**Session 2 — Operate (45 minutes)**
- Sign in to the demo account.
- Navigate the chosen workflow.
- Explain each action and what the learner gains from it.
- Identify which steps require internet or AI.

**Session 3 — Demonstrate (30 minutes)**
- Deliver the 90-second explanation.
- Run the complete demo without coaching.
- Answer questions in plain language.

**Session 4 — Rehearse (30 minutes)**
- Practise the 3-minute version and the backup.
- Rehearse likely technical and privacy questions.
- Correct any claim that cannot be supported by the actual product.

## 13. Presenter readiness checklist

- [ ] Can explain the product in one sentence without reading.
- [ ] Can explain the student problem it addresses.
- [ ] Can distinguish Shadecode Student, Cortex and the wider Cortex OS direction.
- [ ] Can explain the Observe → Understand → Predict → Act → Evaluate → Learn loop.
- [ ] Knows which features are verified, partial or planned.
- [ ] Knows the exact curriculum coverage shown in the demo.
- [ ] Knows which demonstrated actions require internet or AI.
- [ ] Can complete the chosen demo without assistance on the primary laptop/Chrome setup.
- [ ] Android APK backup has been installed and its fallback route separately checked.
- [ ] Can answer the likely questions honestly.
- [ ] Knows the backup plan and how to switch to it.
- [ ] Does not make unsupported claims about offline operation, grade improvement, universal curriculum coverage or institutional endorsement.

## 14. Source documents

This handbook should be read alongside:
- `docs/SHOWCASE_PRODUCT_BRIEF_2026-11-27.md`
- `docs/SHOWCASE_DEMO_SCRIPT_2026-11-27.md`
- `docs/SHOWCASE_READINESS_2026-11-27.md`
- `docs/PRODUCT_VISION_2026-09-01.md`
- `docs/architecture/PLATFORM_BOUNDARIES.md`
- `docs/LEARNING_LOOP.md`

The product repository, deployed behavior and completed tests are the evidence. Strategy documents explain direction; they do not prove a feature is shipped.
