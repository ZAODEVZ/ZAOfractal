# ZAO Fractal app

Expo + TypeScript. Read-only, works offline, no wallet, no login. iOS and Android from one codebase, built by EAS, so no Mac is needed for builds. Background: ZAOresearch doc 1995.

## Screens

- **Now:** next Fractal, live countdown, hexaflake that fills over the week, Monday reminder switch, links to Discord and zao.frapps.xyz (they open outside the app).
- **Ranks:** ZOR and OG Respect leaderboards, each holder's history.
- **Votes:** latest 40 OREC proposals, tally, voters, awards.
- **Read:** the whitepaper as native text, by chapter.

Wallets show as short addresses with a generated mark. `data/members.json` is not bundled until Zaal rules on publishing names.

## Run and check

```bash
cd app
npm ci
npm test            # time, reminders, content rules (Node 22.18+)
npm run typecheck
npx expo start      # Expo Go or a dev build
npm run export:web  # static web preview in dist/
```

## Refresh the data

```bash
node scripts/pull-data.mjs   # repo root, pulls OP Mainnet into data/
cd app && npm run data       # regenerates src/data, CI fails if you forget
```

The app shows the snapshot date on each data screen. A new snapshot needs a new build.

## Time logic

`src/lib/time.ts` computes Monday 18:00 on the New York clock with `Intl`, and takes Fractal numbers from `site/src/lib/week.ts` (Fractal 122 = 2 Nov 2026). Reminders are dated instants for the next 12 weeks, topped up each time the app opens, because a repeating weekly trigger follows the phone's clock and would drift across US clock changes. If someone does not open the app for 12 weeks, reminders stop and the switch shows off.

## Brand

Tokens are thezao.com's navy and gold, the same as ZAOfractal PR 39. Gold means action, plus the flake. Icons and splash come from `scripts/make-icons.mjs`; output in `assets/` is committed.

## Android APK from CI

`.github/workflows/app-android.yml` needs no Expo account. It runs `expo prebuild` and Gradle, and uploads the `zao-fractal-apk` artifact. It is signed with the debug key: for testers, not for Google Play.

## TestFlight: what each person does

Secrets go in EAS, never in this repo.

### Zaal

1. Enrol at developer.apple.com/programs/enroll as an individual, legal name, 2FA on, 99 USD a year.
2. After approval, in App Store Connect: add the app with bundle ID `com.thezao.fractal`, and invite IMan as App Manager.
3. Join the Expo organisation when IMan invites you.
4. On your Mac, once: pull this repo, then in `app/` run `npx eas-cli@latest credentials -p ios` and sign in with Apple. This creates the certificate, profile and App Store Connect key, stored by EAS. Only the Account Holder can do this. Repeat about yearly. You never share your password.
5. Install TestFlight on your iPhone and accept the invite.
6. Rule on names: short addresses (default) or display names.

### IMan

1. Create a free Expo organisation at expo.dev and invite Zaal.
2. In `app/`, run `npx eas-cli@latest init`. It writes the project ID into `app.json`; commit that.
3. Build: `npx eas-cli@latest build -p ios --profile production`
4. Send: `npx eas-cli@latest submit -p ios --latest`. The build shows in TestFlight about 10 to 15 minutes later.
5. Android for testers: `npx eas-cli@latest build -p android --profile preview`, or take the CI APK.
6. Before external testing or a store listing: use https://fractal.thezao.com/privacy as the privacy URL (ships with this PR's site change) and explain the app in the review notes as the companion to a weekly live meeting.

Free EAS includes 15 iOS and 15 Android builds; the free queue can pass 90 minutes.

## Store rules we keep to

No wallet connect or signing. Nothing is unlocked by holding Respect. No Respect for app actions, no "earn" wording.
