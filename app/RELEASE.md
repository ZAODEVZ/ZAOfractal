# Release: first TestFlight build from Zaal's accounts

This replaces the IMan and Zaal split in README.md. Zaal owns the Apple Developer account and the Expo login. Run every command from this `app/` folder. Passwords and 2FA codes are typed by Zaal only; nobody else sees or stores them.

Short addresses stay the default in the snapshot (display names are a separate ruling).

## Before the commands

- Apple Developer membership active, Zaal is Account Holder (developer.apple.com, Membership). Free to check.
- App Store Connect: My Apps, plus, New App. iOS, name "ZAO Fractal" (fallback "ZAO Fractal Weekly" if taken), English, bundle ID `com.thezao.fractal` (register it under Identifiers first if it is not in the list), SKU `zao-fractal`. Needs Zaal's Apple sign-in and 2FA.
- A free Expo account at expo.dev under Zaal's own login.

## Commands, in order

1. `npx eas-cli@latest login` - needs Zaal's Expo sign-in (password, 2FA if on). Free.
2. `npx eas-cli@latest init` - creates the project on Expo and writes `extra.eas.projectId` and `owner` into `app.json`. Needs the Expo login from step 1. Free. Commit the `app.json` change on a branch and open a PR; never push to main.
3. `npx eas-cli@latest build -p ios --profile production` - the first run asks to sign in to Apple and generate the distribution certificate and provisioning profile (Zaal's Apple ID, password and 2FA code; Account Holder only). Cloud build, no Mac needed. Free EAS tier: 15 iOS builds a month, and the free queue can pass 90 minutes. `autoIncrement` bumps the build number each time.
4. `npx eas-cli@latest submit -p ios --latest` - uploads the build to App Store Connect; may ask for the Apple sign-in or an App Store Connect API key (EAS can create one). The build shows in TestFlight about 10 to 15 minutes later. Free.

## After submit

- TestFlight tab: create an internal group, add Zaal. Export compliance should not prompt (`ITSAppUsesNonExemptEncryption` is false).
- Install TestFlight on the iPhone, accept the invite, install the build.

## Costs

- Apple Developer Program: 99 USD a year, already held.
- EAS free tier covers this; no paid plan needed for a first build.
- Android for testers needs no Expo account: take the CI APK from `.github/workflows/app-android.yml`.
