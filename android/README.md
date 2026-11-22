# Shadecode Student Android

This is a **native Android client**, implemented with Kotlin and Jetpack Compose. It does not embed the Next.js website in a WebView.

## Product architecture

- **Web:** Next.js app at https://shadecodestudent.vercel.app
- **Android:** native Compose screens, Supabase Auth/REST, Room local database, DataStore session/profile cache, WorkManager sync, and native Cortex runtime components.
- **Offline:** after a learner has signed in and their subjects/lessons have synced at least once, cached subjects, cached lesson content, local lesson progress, supported on-device Cortex flows, image-to-text extraction, and explicitly downloaded past-paper PDFs can remain available without a connection. New accounts still need internet for initial authentication. Cloud AI, remote updates, the remote paper catalogue and downloading new papers require connectivity.
- **Snap & Extract:** the native app includes an image picker, a memory-conscious source preview, and bundled on-device Latin OCR. Extracted text is editable and can be copied/shared; raw OCR and edited text can be saved to a private app-local library (up to 20 recent extracts, with a per-text size limit). The library can be searched offline by title or text content. Deleting an extract removes its local text record. Source images are not copied into that library, and saved source URIs may no longer be readable later. Spacing cleanup and phrase redaction operate on a text copy. It does not yet interpret graphs/diagrams, translate offline, process audio/video, or redact original image pixels. OCR must be reviewed before exam use.
- **Package:** `com.shadecode.student`

Offline does **not** mean every web feature is already implemented in the Android client. The native app currently has a smaller feature surface than the web app. Native feature parity, robust conflict resolution, and an iOS SwiftUI client remain explicit work items. The Android client now has an opt-in first-visit starter-pack flow for papers already available through the authorized catalogue; this is not a claim that complete papers are bundled with the APK or that redistribution rights are granted. Downloaded past papers are saved privately on-device and can be reopened offline; no real board paper is bundled until redistribution permission/licensing is documented.

## Offline resource library (native Android)

The first native resource-library slice is available from **Learn → Offline resource library**.

- Import a learner-selected PDF (up to 100 MB), plain-text file or Markdown file (up to 5 MB) through Android's document picker.
- Resource payloads are copied into account-isolated app-private storage. Room stores metadata, provenance, checksum, file size, reading position and annotations.
- A resource is listed only after its complete payload is written, synced, SHA-256 checked and its Room record committed.
- Saved resources can be searched locally by title, subject, qualification, syllabus, topic and indexed text. Text/Markdown content is indexed; PDF text extraction and full-text search remain outstanding.
- PDF files render inside the native app with previous/next page navigation. The last opened page is saved locally and restored when the resource is reopened. TXT/Markdown files open in the in-app reader.
- Notes can be created and stored locally for text/Markdown resources. Room also has account-scoped bookmark, note and highlight records; PDF page-level annotation UI remains outstanding.
- The Android client imports and exports the browser-compatible version-1 `.scpack` format. Packs are checked for manifest structure, file bounds, MIME, PDF signature and SHA-256 before import; imported provenance is reset to **unverified**.
- Supported review labels are preserved as metadata. Imported files default to **unverified**; importing a file never makes it official or teacher-approved.

This remains a foundation, not complete native resource parity. PDF text extraction/search, PDF annotations, atomic all-or-nothing multi-file pack commits, teacher-curated signed packs, diagrams/attachments, cross-device sync, and real-device airplane-mode validation remain open. Do not claim full native resource parity until those are implemented and tested.

## Build locally

Prerequisites:

- Android Studio / Android SDK
- JDK 17+
- Gradle wrapper included in this directory

From the repository root on Windows:

```powershell
cd android
.`\gradlew.bat assembleDebug
```

On macOS/Linux:

```bash
cd android
./gradlew assembleDebug
```

The Android release workflow always produces an unsigned debug APK for preview/testing. Once the persistent signing secrets are configured, it also builds a signed release APK and Play Store AAB, generates a SHA-256 checksum manifest, and attaches these files to a tagged GitHub release. The signed path has not yet been verified by a production-signed build.

## Production signing

GitHub Actions reads these secrets when a production-signed artifact is required:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit signing keys, keystores, or Play service-account credentials. Unsigned artifacts are for testing only and must not be submitted to Google Play as production releases.

## Tagged release

After the intended changes are merged to `main`, push a tag matching `android-v*`. The Android workflow then builds the APK and AAB and publishes them as a GitHub Release.


## Current release and product work register

See [the subject-personalization and Android release register](../docs/roadmaps/SUBJECT_PERSONALIZATION_AND_ANDROID_RELEASE_REGISTER_2026-10-27.md) for the agreed scope, implementation findings, acceptance criteria, release checklist, and items still incomplete.

Important release rule: a commit or a successful build is not proof of a production release. Match the build artifact's workflow `head_sha` to the exact source commit. Confirm signing before calling an APK production-ready. Real-device smoke testing and Google Play publication must be reported separately and only after they occur.

The mobile release checklist covers startup, authentication/profile, navigation, offline Snap & Extract, saved-extract search, persistence, supported Android versions/ABIs, and the status of signing credentials. Subject selection and profile personalization must be aligned with the web client; a web-only change does not automatically ship in the native app.


### Offline resource packs and browser library

The web/PWA Study Library now exposes a personal offline resource area. Students can import PDF, TXT and Markdown files, open the stored copy without a network request, remove local files, and export/import a portable `.scpack` bundle. Android uses the same version-1 container format, allowing packs to move between web and native clients. The bundle stores a versioned manifest and raw file payloads; every imported file is re-hashed with SHA-256. Imported pack provenance is deliberately downgraded to `unverified` because a pack is not a cryptographic publisher signature.

Browser storage is best-effort unless the browser grants persistent storage. Students should keep exported packs as backups. Browser storage can still be cleared by the operating system or the user, and this implementation does not yet synchronize the browser and Android libraries.

The current web reader uses the browser PDF viewer for PDFs and a plain text reader for TXT/Markdown. PDF text indexing, in-app page-level annotations, cross-device transfer, teacher-signed packs and real airplane-mode acceptance tests remain outstanding.
