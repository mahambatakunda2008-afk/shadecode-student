# Learn browser verification

Shadecode Student now has a Playwright browser contract for generated Learn lessons.

## Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

Create a dedicated test/student account that has already completed onboarding. Do not use a personal production password in a committed file.

PowerShell:

```powershell
$env:E2E_EMAIL="test-account@example.com"
$env:E2E_PASSWORD="your-test-password"
$env:BASE_URL="https://shadecodestudent.vercel.app"
```

Optional controls:

```powershell
$env:E2E_LEARN_SUBJECT="Chemistry"
$env:E2E_LEARN_TOPICS="Organic Chemistry,Algebra,Mechanics,Data Structures"
```

Run against a running server:

```bash
npm run test:learn:e2e
```

Run against local Next.js automatically:

```bash
START_SERVER=1 npm run test:learn:e2e
```

## What this catches

The test is intentionally stronger than a page-load smoke test. It verifies that a broad learning request:

- reaches the Learn UI and generation flow
- produces at least 16 rendered lesson sections
- contains a meaningful amount of substantive content
- renders the deep-learning section architecture
- does not render an empty lesson
- produces a full-page screenshot on success for visual inspection

The test is not a replacement for curriculum or factual evaluation. It is the browser-level contract proving that the deep lesson pipeline survives from request to rendered student experience.

Use a dedicated test account and real production/staging environment only when generation costs and data mutation are acceptable.
