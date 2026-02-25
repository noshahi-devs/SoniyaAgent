# Soniya Agent OTA Guide (EAS Update)

## One-Time Setup Done
- `runtimeVersion` policy set to `fingerprint` in `app.json`.
- EAS build channels added in `eas.json`:
  - `development`
  - `preview`
  - `production`
- Public API key support added: `EXPO_PUBLIC_GEMINI_API_KEY`.

## Changes That DO NOT Need Rebuild
- React/JS logic changes in `App.jsx`, `components/*`, `api/*`.
- Styling, layout, animations, text changes.
- Assets referenced in JS (images, UI graphics) when shipped via update.
- Prompt/response behavior changes in `api/gemini.js`.

## Changes That REQUIRE Rebuild
- `app.json` native fields:
  - `android.package`, `ios.bundleIdentifier`
  - icons, native splash config, permissions
  - plugins list/config
- Adding/removing native modules (new Expo/React Native native dependency).
- Upgrading Expo SDK / React Native version.
- Background/wake-word native capabilities (e.g. foreground service + microphone background behavior).

## Recommended Release Flow
1. Native-impacting changes -> `eas build` first.
2. JS/UI-only changes -> `eas update --channel production`.
3. Keep channel-specific testing:
   - `preview` for QA
   - `production` for live users

## Env Key Usage
- Put key in `.env` (local):
  - `EXPO_PUBLIC_GEMINI_API_KEY=...`
- For CI/EAS Update, set environment variable in EAS environment as well.

## Current One-Time Rebuild Triggered
- Added `expo-battery` dependency.
- Added Android permissions: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`.
