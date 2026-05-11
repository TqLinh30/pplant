# Pplant

Pplant is a mobile-first, local-first personal life management app built with Expo and React Native. The current product experience is centered around **MoneyNote**, a soft, visual money journal for recording daily income and expenses, reviewing spending patterns, and keeping photo-based mood journals.

The app is designed for people who want a private, lightweight daily companion without account setup, cloud sync, or heavy accounting workflows. Core data is stored locally on the device.

## Product Scope

Pplant combines several daily-life workflows in one mobile app:

- Personal finance tracking with income and expense records.
- Calendar-based spending review.
- Monthly, yearly, all-time, and category-level reports.
- Photo journal entries with mood tracking.
- Receipt draft capture and local image retention controls.
- Tasks, reminders, work-hour entries, review flows, recovery flows, and privacy controls.
- Local preferences for language, currency, locale, background, and app appearance.

The newest UI direction uses the MoneyNote visual system: illustrated category icons, calm pastel surfaces, large mobile-friendly actions, and chart views designed for quick scanning on a phone.

## Key Features

### MoneyNote Entry

MoneyNote is the main finance workflow.

- Create manual expense and income records.
- Choose the record date.
- Add a short note or merchant/source text.
- Enter an amount using the selected currency.
- Pick from illustrated expense and income categories.
- Save records into the local SQLite database.
- Edit or delete existing records.
- Keep finance screens synchronized through local change events.

Default expense categories include food, daily spending, clothing, cosmetics, social fees, health, education, electricity, transport, phone, and rent.

Default income categories include salary, allowance, bonus, side income, investment, and temporary income.

### Calendar Review

The calendar tab helps the user review records by day.

- Month grid with daily income and expense totals.
- Previous and next month navigation.
- Selected-day transaction list.
- Daily journal preview alongside money records.
- Locale-aware date formatting.
- Local month summary calculations.

### Reports

The report area focuses on visual spending and income breakdowns.

- Monthly report summary for income, expense, and net balance.
- Donut chart by category.
- Matching color markers in the category list so chart colors can be read clearly.
- Category rows that open a category detail screen.
- Category detail screen with monthly bar trend and grouped transactions.
- Yearly, all-time, and category report routes.
- Chart scaling fixes so bars align with the Y axis and baseline markers.

### Journal

The journal feature records a moment from the day with a mood.

- Floating camera action in the bottom tab bar.
- Inline `CameraView` capture screen.
- Fast photo preview after capture.
- Reduced capture latency through faster camera options.
- Optional note after taking the photo.
- Mood selection with custom illustrated mood faces.
- Local image persistence for journal photos.
- Daily timeline with time, mood, note, and photo thumbnail.
- Mood statistics with a true SVG pie chart.

### Receipt Drafts

Receipt capture is built as a safe draft workflow.

- Capture or choose a receipt image.
- Store the image locally as a draft.
- Keep parsing and expense creation separate from image capture.
- Let the user review and confirm before saving final expense data.
- Support image retention choices.

### Settings And Privacy

The app includes local user controls for:

- Language selection.
- Currency and locale preferences.
- App background presets and custom background photos.
- Budget-related preferences.
- Category management.
- CSV export and JSON backup flows.
- Data deletion previews for local records, drafts, receipt images, diagnostics, and workspace data.

## Languages

The app currently supports:

- Vietnamese (`vi`)
- English (`en`)
- Traditional Chinese (`zh-Hant`)

Global app strings live under `src/i18n`. Some feature screens also keep local copy maps when they need highly specific UI text.

## Tech Stack

### Runtime

- Expo SDK 55
- React Native 0.83
- React 19
- Expo Router
- TypeScript

### UI

- React Navigation bottom tabs
- React Native SVG
- Expo Image
- Expo Camera
- Expo Image Picker
- Expo Status Bar and System UI
- Montserrat through `@expo-google-fonts/montserrat`

### Data

- Expo SQLite
- Drizzle ORM and drizzle-kit
- Zod validation
- App-private file storage for photos, receipts, settings, and backups

### Quality

- TypeScript type checking
- ESLint with Expo config
- Jest and jest-expo
- Prettier

## Project Structure

```text
src/
  app/                 Expo Router route files
  data/                SQLite client, schema, migrations, repositories
  diagnostics/         Diagnostic events, redaction, validation
  domain/              Pure business rules, schemas, types, calculations
  features/            Screens, hooks, and feature orchestration
  i18n/                Language state, translations, language persistence
  services/            Application services and use-case boundaries
  ui/                  Shared primitives and design tokens
```

Main feature folders:

```text
src/features/capture           Manual money capture and quick capture
src/features/history           Money history views
src/features/journal           Photo journal and mood statistics
src/features/moneynote         MoneyNote entry, calendar, reports, settings UI
src/features/receipts          Receipt draft and receipt review flows
src/features/review            End-of-day and period review screens
src/features/settings          Preferences, app background, privacy settings
src/features/tasks             Task capture and recurrence
src/features/work              Work-hour entries and work history
```

## Architecture Notes

- `src/app` should stay thin and route to feature screens.
- `src/features` owns screen state, hooks, and presentation logic.
- `src/services` coordinates use cases and repository calls.
- `src/domain` contains pure business logic and validation rules.
- `src/data` owns SQLite access and repository implementations.
- UI should not import SQLite directly.
- Local events keep related screens up to date after records change.

## Getting Started

### Prerequisites

- Node.js LTS
- npm
- Android Studio and Android SDK for Android builds
- A configured Android emulator or physical Android device

### Install Dependencies

```powershell
npm install
```

### Start The Expo Dev Server

```powershell
npm start
```

### Run On Android

```powershell
npm run android
```

### Run On Web

```powershell
npm run web
```

## Quality Checks

Run type checking:

```powershell
npm run typecheck
```

Run lint:

```powershell
npm run lint
```

Run tests:

```powershell
npm test
```

## Android Release Builds

The native Android folder is generated output and is normally ignored by git. If a fresh clone does not have an `android/` folder, generate it first:

```powershell
npx expo prebuild --platform android
```

Build a release APK:

```powershell
cd android
.\gradlew assembleRelease
```

APK output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Build a release Android App Bundle:

```powershell
cd android
.\gradlew bundleRelease
```

AAB output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## GitHub Releases

Do not commit APK or AAB files directly into the source repository. Treat them as release artifacts.

Recommended release flow:

1. Push source code to `main`.
2. Build the APK or AAB locally or in CI.
3. Create a GitHub Release with a semantic tag such as `v1.0.0`.
4. Upload `app-release.apk` or `app-release.aab` as a release asset.
5. Add release notes describing user-facing changes.

Example with GitHub CLI:

```powershell
gh release create v1.0.0 `
  android/app/build/outputs/apk/release/app-release.apk `
  --target main `
  --title "Pplant v1.0.0" `
  --notes "MoneyNote reports, journal camera, app icon, and UI polish."
```

## Data And Privacy

Pplant is local-first. The current app does not require a backend account for its core workflows.

Local data includes:

- Money records
- Categories and topics
- Preferences
- Receipt drafts and retained receipt image references
- Journal entries and journal photo references
- Tasks and reminders
- Work entries
- Review and recovery state
- Diagnostics and deletion previews

Photos and user-generated records are handled through local storage and SQLite-backed services. Data deletion flows are modeled explicitly so the user can preview affected data before removal.

## Development Guidelines

- Keep feature changes close to the existing architecture.
- Prefer domain and service logic over putting business rules directly in UI components.
- Keep route files small.
- Do not commit generated native build folders or release binaries.
- Use GitHub Releases for APK/AAB distribution.
- Run typecheck and lint before pushing meaningful code changes.

## Repository Status

This repository is currently an Expo/React Native mobile app with a local-first MVP architecture. The active product surface is MoneyNote plus photo journaling, with additional daily-life modules present in the codebase for tasks, reminders, work, receipts, reviews, privacy, and recovery.
