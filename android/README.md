# Shadecode Student Android

This is a **native Android client**, implemented with Kotlin and Jetpack Compose. It does not embed the Next.js website in a WebView.

## Product architecture

- **Web:** Next.js app at https://shadecodestudent.vercel.app
- **Android:** native Compose screens, Supabase Auth/REST, Room local database, DataStore session/profile cache, WorkManager sync, and native Cortex runtime components.
- **Offline:** after a learner has signed in and their subjects/lessons have synced at least once, cached subjects, cached lesson content, local lesson progress, and supported on-device Cortex flows can remain available without a connection. New accounts still need internet for initial authentication. Cloud AI, remote updates, and cross-device sync require connectivity.
- **Package:** `com.shadecode.student`

Offline does **not** mean every web feature is already implemented in the Android client. The native app currently has a smaller feature surface than the web app. Native feature parity, comprehensive offline content packs, robust conflict resolution, and an iOS SwiftUI client remain explicit work items.

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

The Android release workflow can produce an APK for installation/testing and an AAB for Google Play.

## Production signing

GitHub Actions reads these secrets when a production-signed artifact is required:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit signing keys, keystores, or Play service-account credentials. Unsigned artifacts are for testing only and must not be submitted to Google Play as production releases.

## Tagged release

After the intended changes are merged to `main`, push a tag matching `android-v*`. The Android workflow then builds the APK and AAB and publishes them as a GitHub Release.
