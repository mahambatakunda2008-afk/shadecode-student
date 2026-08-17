# Shadecode Student Android app

This directory is the native Android distribution shell for Shadecode Student.

## Architecture

The production app is still the Next.js/PWA codebase. Android is a thin native shell around the same web application, so feature development does not fork the product into two codebases.

- Web/PWA: `https://shadecodestudent.vercel.app`
- Android shell: WebView-based native application
- Offline behavior: provided by the existing service worker + IndexedDB local-first layer
- Native package: `com.shadecode.student`

## Local Android build

Prerequisites:

- Android Studio / Android SDK
- JDK 17+
- Gradle 8.9+

The release pipeline produces both:

- APK for direct installation/testing
- AAB for Google Play distribution

## Production signing

GitHub Actions reads these secrets when a production-signed artifact is required:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Never commit signing keys, keystores, or Play service-account credentials.

## Tagged release

After the intended changes are merged to `main`, push a tag matching `android-v*`. The Android workflow then builds the APK and AAB and publishes them as a GitHub Release.

Unsigned artifacts may be produced for testing when signing secrets are not configured. They must not be submitted to Google Play as production releases.
