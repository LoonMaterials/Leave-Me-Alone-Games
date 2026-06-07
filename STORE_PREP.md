# iOS and Android Store Prep

This project is currently a static web/PWA version of the app. It is ready for browser play and home-screen installation, but native store release requires platform packaging.

## Current Build Status

Ready:

- Offline-capable PWA shell
- Web app manifest
- iPhone home-screen metadata
- App icons at 180, 192, and 512 px
- No ads
- No accounts
- No analytics
- No tracking scripts
- No external network calls except service worker requests for same-origin app files
- Mobile portrait and landscape layouts
- Separate game folders under `games/`
- Klondike Solitaire
- FreeCell
- Per-game controls and persistence
- Local/session persistence

Needs before store submission:

- Final app icon artwork
- Screenshots
- Store listing copy
- Support URL
- Hosted privacy policy URL
- Age rating answers
- Real-device test pass
- Native iOS or Android wrapper project

## iOS Path

Native iOS App Store release requires macOS and Xcode.

Recommended wrapper:

- Swift or SwiftUI iOS app
- `WKWebView`
- Bundle `index.html`, `launcher.css`, `launcher.js`, `manifest.webmanifest`, `sw.js`, `icons/`, and `games/`
- Load `index.html` from the app bundle
- Disable native scrolling/bouncing in the `WKWebView` scroll view
- Test on real iPhone and iPad in portrait and landscape
- Distribute through TestFlight before App Review

Current Apple requirement to account for:

- App Store uploads after April 28, 2026 require builds using the iOS/iPadOS 26 SDK or later.

## Android Path

Recommended Android route:

- Trusted Web Activity if publishing the hosted PWA
- Native WebView wrapper if bundling the files locally
- Android App Bundle (`.aab`) for Google Play
- Target Android 15 / API level 35 or higher for new Google Play submissions under the current published requirement

Trusted Web Activity needs:

- Hosted HTTPS PWA
- Valid manifest
- App icons
- Digital Asset Links file at `/.well-known/assetlinks.json`
- Android package name
- Signing certificate fingerprint

Those last two values come from the Android project/signing key and cannot be filled in correctly until that project exists.

## Recommended Next Milestones

1. Confirm the GitHub Pages version is stable.
2. Use Lighthouse or Chrome DevTools to verify PWA installability.
3. Create final app icon artwork.
4. Capture phone screenshots.
5. Decide native packaging path:
   - iOS: Mac/Xcode `WKWebView`
   - Android: TWA or WebView wrapper
6. Create store accounts:
   - Apple Developer Program
   - Google Play Console
7. Run beta testing:
   - TestFlight for iOS
   - Internal testing track for Android
