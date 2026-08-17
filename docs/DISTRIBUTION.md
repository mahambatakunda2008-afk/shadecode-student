# Shadecode Student Distribution

Shadecode Student uses the web/PWA as the canonical product and treats native stores as distribution surfaces around the same product.

## Live distribution surfaces

| Surface | Status | Canonical path |
| --- | --- | --- |
| Web | Ready | `https://shadecodestudent.vercel.app/` |
| PWA install | Implemented | Browser install prompt + `/download` |
| Android APK | Pipeline ready | GitHub Release asset |
| Android AAB | Pipeline ready | GitHub Actions artifact / tagged release |
| Google Play | Requires publisher setup | Signed AAB + Play Console |
| Windows PWA | Ready | Browser install |
| Microsoft Store | Requires Store listing | PWABuilder / Store submission |
| iPhone/iPad | PWA install ready | Safari → Share → Add to Home Screen |
| Apple App Store | Requires Apple developer setup | Native wrapper + App Store submission |
| Direct desktop | PWA install ready | Chrome/Edge install |

## Canonical user entry point

`/download` is the public distribution hub. Every acquisition campaign should point to it unless the campaign is intentionally platform-specific.

## Android release process

1. Keep `com.shadecode.student` stable. Do not change the package ID after store publication.
2. Configure these GitHub Actions secrets for production signing:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
3. Never commit the keystore or passwords.
4. Push a tag matching `android-v*` after the intended release has been merged to `main`.
5. The Android workflow produces:
   - `ShadecodeStudent-Android.apk` for direct installation.
   - `ShadecodeStudent-Android.aab` for Google Play.
6. A tag release must be signed for store submission. Unsigned builds are for testing only.

## Google Play readiness

The repository can build an AAB, but Play publication cannot be completed by source code alone. The publisher account, signing identity, store listing, content declarations, screenshots, privacy details, and review submission live in Google Play Console.

Before first publication, verify:

- package ID is final
- production keystore is backed up securely
- AAB is signed with the production key
- version code is higher than every previously uploaded Play artifact
- privacy policy is reachable
- app screenshots and icon assets are current
- target SDK requirements are satisfied
- data-safety declarations match actual application behavior

## Microsoft Store

The PWA remains the primary Windows application. The Store submission should be generated from the production PWA origin, not a forked Windows codebase. Store metadata must use the same product name, icon, screenshots, privacy policy, and support URL.

## Apple

Safari installation is already the lowest-friction iPhone/iPad route. App Store distribution is a separate release surface and requires Apple developer credentials, bundle signing, App Store Connect metadata, and review. Do not create a second learning product for iOS.

## Direct APK safety

Direct Android downloads must point only to official Shadecode GitHub Releases or an official Shadecode-controlled domain. Never distribute APKs through arbitrary file hosts.

## Distribution analytics

Campaigns should preserve the following acquisition dimensions where possible:

- platform
- country/region
- school vs university/polytechnic vs independent student
- campaign
- referral source
- first-session activation
- install event
- account creation
- first learning action
- day-7 retention

The goal is not to maximize downloads. The goal is to maximize students who reach a useful first learning session and return.

## Release rule

No store submission should ship a build that has not passed the repository CI checks and a production smoke test. Store packages are distribution artifacts, not a substitute for product quality.
