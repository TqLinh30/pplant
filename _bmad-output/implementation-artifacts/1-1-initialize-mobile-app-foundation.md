# Story 1.1: Initialize Mobile App Foundation

Status: done

## Story

As a developer implementing Pplant,
I want the Expo React Native foundation initialized with the documented architecture structure,
so that all future stories share one consistent mobile app baseline.

## Acceptance Criteria

1. Given the repository has no app scaffold, when the starter initialization is performed, then the project uses Expo React Native, TypeScript, and Expo Router, and the command and SDK assumptions are documented for future verification.
2. Given the app foundation exists, when the source tree is organized, then it includes `src/app`, `src/features`, `src/domain`, `src/data`, `src/services`, `src/diagnostics`, `src/ui`, and `src/test`, and route files remain thin composition layers.
3. Given the app foundation exists, when CI or local verification runs, then typecheck, lint, and unit test scripts are available, and future agents have a consistent baseline for implementation.

## Tasks / Subtasks

- [x] Scaffold and merge the Expo app foundation safely. (AC: 1)
  - [x] Re-check the official Expo `create-expo-app` documentation immediately before running the scaffold command because the architecture calls out the SDK 55 transition.
  - [x] Use Expo React Native with TypeScript and Expo Router. The documented architecture command is `npx create-expo-app@latest Pplant --template default@sdk-55 --yes`.
  - [x] Because the current workspace root is already `Pplant` and contains planning artifacts, do not create a nested `Pplant/Pplant` app. Either scaffold in a temporary sibling directory and merge generated app files into the current root, or use an official current-directory workflow only if the latest Expo CLI docs/tooling explicitly supports this non-empty root case.
  - [x] Preserve existing project context directories and files: `.agents`, `.claude`, `_bmad`, `_bmad-output`, `docs`, `airtable`, and `DESIGN.md`.
  - [x] Set Expo app display name, slug, and package metadata to `Pplant` after merge. Do not leave temporary scaffold names in `app.json`, `app.config.*`, `package.json`, or README.
  - [x] Document the exact scaffold command, Expo SDK assumption, Node/npm versions, and any merge deviation in `README.md`.
- [x] Establish Expo Router route groups under `src/app`. (AC: 2)
  - [x] Ensure Expo Router uses `src/app` as the route directory and that non-route code lives outside `src/app`.
  - [x] Add root layout, not-found route, bottom tab layout, and initial placeholder routes for Today, Capture, History, Review, and Settings.
  - [x] Add placeholder detail routes for future receipt, reminder, task, and money record screens only as thin composition layers.
  - [x] Keep route files limited to layout/screen composition. Do not place domain logic, persistence access, service calls, or large UI components in route files.
- [x] Create the documented source tree and architecture boundaries. (AC: 2, 3)
  - [x] Create `src/features`, `src/domain`, `src/data`, `src/services`, `src/diagnostics`, `src/ui`, and `src/test` with the folders listed in Project Structure Notes.
  - [x] Add initial common domain primitives: `src/domain/common/result.ts`, `src/domain/common/app-error.ts`, `src/domain/common/ids.ts`, `src/domain/common/money.ts`, and `src/domain/common/date-rules.ts`.
  - [x] Add initial data-layer shells: `src/data/db/client.ts`, `src/data/db/schema.ts`, `src/data/db/migrations/migrate.ts`, `src/data/repositories`, and `src/data/fixtures/standard-mvp-dataset.ts`.
  - [x] Add initial service/diagnostic shells for environment access, receipt parsing port/noop parser, notification scheduler port, privacy deletion, diagnostics events, redaction, and diagnostics service.
  - [x] Install only foundation dependencies needed by this story: Expo scaffold dependencies, `expo-sqlite`, `drizzle-orm`, `drizzle-kit`, `zod`, and test/lint dependencies compatible with the scaffolded Expo SDK.
  - [x] Do not implement full feature behavior, full database schema, OCR provider integration, account auth, cloud sync, bank/payment integrations, or production notification scheduling in this story.
- [x] Establish token-led UI foundation from `DESIGN.md`. (AC: 2, 3)
  - [x] Add `src/ui/tokens/colors.ts`, `typography.ts`, `spacing.ts`, and `radius.ts` using the documented Pplant/Airtable-style tokens.
  - [x] Add initial UI primitive shells for Button, IconButton, TextField, BottomSheet, ListRow, Chip, SegmentedControl, EmptyState, and StatusBanner only if needed by placeholder screens.
  - [x] Use React Native styling and local token modules. Do not introduce a heavy UI kit at the starter layer.
  - [x] Preserve mobile accessibility defaults: readable labels, non-color-only status patterns, dynamic-text tolerance, and 44x44 minimum target guidance for future controls.
- [x] Add baseline tooling, tests, and CI. (AC: 3)
  - [x] Add `typecheck`, `lint`, `test`, and `test:watch` scripts to `package.json`.
  - [x] Configure TypeScript to use the Expo base config, strict checks where compatible with the scaffold, and a stable path alias such as `@/*` for `src/*`.
  - [x] Configure Jest using Expo's current unit testing guidance and add at least one pure unit test for a foundation module such as `AppResult`, `AppError`, money minor units, or token exports.
  - [x] Add `.github/workflows/ci.yml` or equivalent local CI documentation that runs install, typecheck, lint, and unit tests.
  - [x] Verify the scripts run successfully on the scaffolded baseline.
- [x] Add implementation handoff documentation. (AC: 1, 2, 3)
  - [x] Update `README.md` with setup commands, scaffold source, SDK assumption, script list, project structure summary, and architecture guardrails.
  - [x] Include a short note that MVP is local-first and explicitly excludes account auth, cloud sync, backend API, bank/payment integrations, investment/debt features, and regulated-finance APIs.
  - [x] Include a "Future story boundaries" note: Story 1.2 owns single-user local workspace behavior; later stories own concrete money/task/reminder/receipt feature behavior.

### Review Findings

- [x] [Review][Patch] Harden diagnostic redaction before future services use it [`src/diagnostics/redact.ts:3`] -- The story and architecture require redacted diagnostics, but the current redactor only removes exact metadata keys (`receiptText`, `receiptImage`, `amount`, `income`, `taskText`, `reminderText`, `reflection`). Sensitive variants such as `receiptImageUri`, `ocrText`, `merchant`, `amountMinor`, `incomeValue`, or an `errorMessage` containing a file URI would pass through. `src/services/files/receipt-file-store.ts` already creates an error message with the raw receipt URI, so this needs a stricter redaction policy or allowlisted metadata shape before later services start recording diagnostics. Resolved 2026-05-08 by switching diagnostic metadata to an allowlist, dropping path/URI-like values, removing raw receipt URIs from receipt-file expected errors, and adding regression tests.

## Dev Notes

### Current Repository State

- This is the first implementation story. There is no previous story file and no previous implementation learning to import.
- The current workspace root is `C:\Users\tqlin\Downloads\codex\project\Pplant`.
- Current root contents are planning and support artifacts only: `.agents`, `.claude`, `airtable`, `docs`, `_bmad`, `_bmad-output`, and `DESIGN.md`.
- No app scaffold was detected at story creation time: no `package.json`, no Expo config, and no `src` tree.
- No git repository was detected during planning, so do not rely on git history for scaffold decisions.

### Required Stack

- Expo React Native, TypeScript, and Expo Router are required for the MVP foundation.
- Architecture-selected starter command: `npx create-expo-app@latest Pplant --template default@sdk-55 --yes`.
- The SDK-specific template flag exists because the architecture notes an Expo SDK 55 transition period. Re-check Expo's official create-expo-app docs on implementation day and document the exact command actually used.
- Expo Router should own file-based navigation. Use `src/app` for routes and keep feature/domain/data/service/UI code outside `src/app`.
- Use local-first foundations. SQLite through `expo-sqlite`, Drizzle ORM, and Zod are architecture decisions for the app baseline, but this story should create only initial shells and tooling, not full feature schemas.

### Architecture Guardrails

- Route files in `src/app` compose screens only.
- UI components must not import SQLite clients, Drizzle tables, or migration utilities.
- Repositories are the only layer that should access SQLite.
- Expected failures should use typed `AppResult` and `AppError` primitives.
- Zod should be used at boundaries where untrusted or external data enters the app.
- Money values must be represented as integer minor units with currency codes, not floating-point amounts.
- Diagnostics must be redacted. Do not log raw receipt images, OCR text, spending details, income values, task contents, reminder text, or reflections.
- MVP must not introduce account authentication, cloud sync, a general backend API, server reminders, bank/payment integrations, investment/debt features, or regulated-finance flows.

### Project Structure Notes

Minimum structure expected after this story:

```text
Pplant/
  README.md
  package.json
  app.json or app.config.*
  tsconfig.json
  babel.config.js
  metro.config.js
  eslint.config.js
  prettier.config.js
  drizzle.config.ts
  .env.example
  .github/
    workflows/
      ci.yml
  assets/
  src/
    app/
      _layout.tsx
      +not-found.tsx
      (tabs)/
        _layout.tsx
        index.tsx
        capture.tsx
        history.tsx
        review.tsx
        settings.tsx
      receipt/
        [receiptDraftId].tsx
      reminder/
        [reminderId].tsx
      task/
        [taskId].tsx
      money/
        [moneyRecordId].tsx
    features/
      today/
      capture/
      money/
      receipts/
      work/
      tasks/
      reminders/
      recurrence/
      review/
      history/
      settings/
    domain/
      common/
      money/
      receipts/
      work/
      tasks/
      reminders/
      recurrence/
      summaries/
      privacy/
    data/
      db/
        client.ts
        schema.ts
        migrations/
          migrate.ts
      repositories/
      fixtures/
        standard-mvp-dataset.ts
    services/
      camera/
      files/
      notifications/
      receipt-parsing/
      privacy/
      environment/
    diagnostics/
    ui/
      tokens/
      primitives/
      components/
      accessibility/
    test/
      factories/
      fixtures/
      repository-test-utils.ts
      device-scenarios.md
```

If the official Expo scaffold generates routes or components in a different default location, move/adapt them into the architecture structure rather than leaving duplicate route trees.

### UX and Design Constraints

- The foundation should support the mobile-first "Calm Daily Checkpoint" direction.
- Use a token-led custom mobile design system based on `DESIGN.md`: white canvas, near-black ink, hairline borders, restrained typography, modest radius, and sparse signature color moments.
- Do not introduce a generic finance-dashboard UI kit or marketing-style hero layout inside the app.
- Bottom navigation should be reserved for major zones: Today, Capture, History, Review, and Settings.
- Placeholder screens should already follow neutral, non-shaming copy and accessible labels where visible.
- Touch targets for future primary controls should be designed around at least 44x44 px.

### Testing Requirements

Required local verification before marking implementation complete:

```bash
npm run typecheck
npm run lint
npm test
```

Recommended additional checks:

```bash
npx expo --version
npx expo-doctor
```

Test expectations for this story:

- At least one unit test must execute through the configured `test` script.
- Unit tests should target pure foundation modules and must not require a mobile UI runtime for this story.
- Typecheck and lint must pass with the generated scaffold and new source tree.
- CI should run the same checks or document exactly how local verification is equivalent.

### Implementation Risks to Avoid

- Do not scaffold into `Pplant/Pplant`.
- Do not overwrite BMad/project planning context while merging scaffold output.
- Do not leave both `app/` and `src/app/` route trees active.
- Do not implement full domain features early just to populate folders.
- Do not add cloud/auth/backend/bank/payment scope.
- Do not select an OCR provider in this story. Add only the port/noop shell required for future stories.
- Do not use floating-point money helpers in foundation examples or tests.
- Do not create broad global state for domain data.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 1.1 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Starter Template Evaluation, Core Architectural Decisions, Enforcement Guidelines, Project Structure & Boundaries, Implementation Handoff]
- [Source: `_bmad-output/planning-artifacts/prd.md` - MVP scope, FR1, FR7-FR10, NFR-A11Y-03, NFR-MOB-07, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Design System Foundation, Accessibility Requirements, Component Strategy, Form Patterns, Navigation Patterns]
- [Source: `DESIGN.md` - colors, typography, spacing, radius, component tokens]
- [Source: Expo official docs, verified 2026-05-07: `https://docs.expo.dev/more/create-expo/`]
- [Source: Expo official docs, verified 2026-05-07: `https://docs.expo.dev/router/reference/src-directory/`]
- [Source: Expo official docs, verified 2026-05-07: `https://docs.expo.dev/router/basics/core-concepts/`]
- [Source: Expo official docs, verified 2026-05-07: `https://docs.expo.dev/develop/unit-testing/`]
- [Source: Expo official docs, verified 2026-05-07: `https://docs.expo.dev/guides/typescript/`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Verified scaffold tooling: `node --version` -> `v22.22.2`; `npm --version` -> `10.9.7`; `npx create-expo-app@latest --version` -> `3.5.3`.
- Scaffolded in temporary sibling directory with `npx create-expo-app@latest Pplant-scaffold-20260507-2315 --template default@sdk-55 --yes --no-install`, then merged generated files into the existing `Pplant` root while preserving planning artifacts.
- Installed foundation dependencies: Expo scaffold packages, `expo-sqlite`, `drizzle-orm`, `drizzle-kit`, `zod`, Jest/Jest Expo, ESLint, Prettier, and TypeScript.
- Validation passed: `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, and `npx expo --version` -> `55.0.29`.
- `npx expo config --type public` loaded the Pplant config successfully with SDK `55.0.0`, slug `pplant`, scheme `pplant`, Expo Router, and `expo-sqlite`.
- `npx expo-doctor` was attempted after dependency version alignment; the remaining failure was an Expo API network timeout to `exp.host:443` during the remote config schema check, not a local type/lint/test failure.
- `npm audit --audit-level=high` exited successfully; npm still reports low/moderate transitive advisories in Expo/Jest/Drizzle tooling chains that require breaking `--force` downgrades or major changes to auto-fix.
- Started Expo Metro locally at `http://localhost:8082` because port `8081` was already occupied.
- Resolved review finding on 2026-05-08. Validation passed: `npm test` (3 suites, 7 tests), `npm run typecheck`, `npm run lint`, and `npx expo install --check`.

### Completion Notes List

- Initialized the Expo React Native SDK 55 foundation without creating a nested `Pplant/Pplant` app.
- Replaced the Expo demo routes with thin Expo Router composition files under `src/app`, including bottom tabs for Today, Capture, History, Review, and Settings plus placeholder detail routes for receipt, reminder, task, and money records.
- Added architecture-ready source boundaries across `src/features`, `src/domain`, `src/data`, `src/services`, `src/diagnostics`, `src/ui`, and `src/test`.
- Added typed foundation primitives for `AppResult`, `AppError`, entity ids, local dates, and integer minor-unit money values.
- Added local-first data/service shells for SQLite/Drizzle, migrations, repositories, receipt parsing, notifications, privacy deletion, camera/file placeholders, and redacted diagnostics.
- Added token-led UI primitives and placeholder screens aligned with `DESIGN.md` without introducing a heavy UI kit.
- Added Jest, ESLint, Prettier, Metro, Babel, Drizzle, `.env.example`, CI, README handoff docs, and a passing money foundation unit test.
- Resolved the code-review redaction issue by allowing only approved non-sensitive diagnostic metadata, filtering path/URI-like values, and removing raw receipt URI interpolation from receipt file-store errors.

### File List

- `.env.example`
- `.github/workflows/ci.yml`
- `.gitignore`
- `.vscode/extensions.json`
- `.vscode/settings.json`
- `app.json`
- `assets/expo.icon/Assets/expo-symbol 2.svg`
- `assets/expo.icon/Assets/grid.png`
- `assets/expo.icon/icon.json`
- `assets/images/android-icon-background.png`
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-monochrome.png`
- `assets/images/expo-badge.png`
- `assets/images/expo-badge-white.png`
- `assets/images/expo-logo.png`
- `assets/images/favicon.png`
- `assets/images/icon.png`
- `assets/images/logo-glow.png`
- `assets/images/react-logo.png`
- `assets/images/react-logo@2x.png`
- `assets/images/react-logo@3x.png`
- `assets/images/splash-icon.png`
- `assets/images/tabIcons/explore.png`
- `assets/images/tabIcons/explore@2x.png`
- `assets/images/tabIcons/explore@3x.png`
- `assets/images/tabIcons/home.png`
- `assets/images/tabIcons/home@2x.png`
- `assets/images/tabIcons/home@3x.png`
- `assets/images/tutorial-web.png`
- `babel.config.js`
- `drizzle.config.ts`
- `eslint.config.js`
- `jest.config.js`
- `metro.config.js`
- `package.json`
- `package-lock.json`
- `prettier.config.js`
- `README.md`
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/capture.tsx`
- `src/app/(tabs)/history.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/review.tsx`
- `src/app/(tabs)/settings.tsx`
- `src/app/_layout.tsx`
- `src/app/+not-found.tsx`
- `src/app/money/[moneyRecordId].tsx`
- `src/app/receipt/[receiptDraftId].tsx`
- `src/app/reminder/[reminderId].tsx`
- `src/app/task/[taskId].tsx`
- `src/data/db/client.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/fixtures/standard-mvp-dataset.ts`
- `src/data/repositories/index.ts`
- `src/diagnostics/diagnostics.service.ts`
- `src/diagnostics/events.ts`
- `src/diagnostics/redact.test.ts`
- `src/diagnostics/redact.ts`
- `src/domain/common/app-error.ts`
- `src/domain/common/date-rules.ts`
- `src/domain/common/ids.ts`
- `src/domain/common/money.test.ts`
- `src/domain/common/money.ts`
- `src/domain/common/result.ts`
- `src/domain/money/calculations.ts`
- `src/domain/money/schemas.ts`
- `src/domain/money/types.ts`
- `src/domain/privacy/deletion-plan.ts`
- `src/domain/receipts/normalize-parse-result.ts`
- `src/domain/receipts/schemas.ts`
- `src/domain/receipts/types.ts`
- `src/domain/recurrence/generate-occurrences.ts`
- `src/domain/recurrence/schemas.ts`
- `src/domain/recurrence/types.ts`
- `src/domain/reminders/schemas.ts`
- `src/domain/reminders/types.ts`
- `src/domain/summaries/monthly-summary.ts`
- `src/domain/summaries/today-summary.ts`
- `src/domain/summaries/weekly-summary.ts`
- `src/domain/tasks/schemas.ts`
- `src/domain/tasks/types.ts`
- `src/domain/work/schemas.ts`
- `src/domain/work/types.ts`
- `src/domain/work/work-time.ts`
- `src/features/capture/CaptureLauncherSheet.tsx`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/history/HistoryScreen.tsx`
- `src/features/money/MoneyRouteScreen.tsx`
- `src/features/receipts/ReceiptRouteScreen.tsx`
- `src/features/recurrence/RecurrenceControl.tsx`
- `src/features/reminders/ReminderRouteScreen.tsx`
- `src/features/review/ReviewScreen.tsx`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/tasks/TaskRouteScreen.tsx`
- `src/features/today/TodayScreen.tsx`
- `src/features/work/WorkEntryForm.tsx`
- `src/services/camera/camera.service.ts`
- `src/services/environment/env.ts`
- `src/services/files/receipt-file-store.ts`
- `src/services/files/receipt-file-store.test.ts`
- `src/services/files/retention-cleanup.service.ts`
- `src/services/notifications/expo-notification-scheduler.ts`
- `src/services/notifications/notification-scheduler.port.ts`
- `src/services/privacy/data-deletion.service.ts`
- `src/services/receipt-parsing/noop-receipt-parser.ts`
- `src/services/receipt-parsing/ocr-receipt-parser.ts`
- `src/services/receipt-parsing/receipt-parsing.port.ts`
- `src/services/receipt-parsing/retry-policy.ts`
- `src/test/device-scenarios.md`
- `src/test/factories/index.ts`
- `src/test/fixtures/index.ts`
- `src/test/repository-test-utils.ts`
- `src/ui/accessibility/focus.ts`
- `src/ui/accessibility/labels.ts`
- `src/ui/components/ConfidenceLabel.tsx`
- `src/ui/components/FeaturePlaceholderScreen.tsx`
- `src/ui/components/RecoveryActions.tsx`
- `src/ui/components/SourceLabel.tsx`
- `src/ui/primitives/BottomSheet.tsx`
- `src/ui/primitives/Button.tsx`
- `src/ui/primitives/Chip.tsx`
- `src/ui/primitives/EmptyState.tsx`
- `src/ui/primitives/IconButton.tsx`
- `src/ui/primitives/ListRow.tsx`
- `src/ui/primitives/SegmentedControl.tsx`
- `src/ui/primitives/StatusBanner.tsx`
- `src/ui/primitives/TextField.tsx`
- `src/ui/tokens/colors.ts`
- `src/ui/tokens/radius.ts`
- `src/ui/tokens/spacing.ts`
- `src/ui/tokens/typography.ts`
- `tsconfig.json`

## Change Log

- 2026-05-07: Implemented Story 1.1 Expo React Native foundation, source boundaries, token UI shells, tooling, tests, CI, and README handoff documentation.
- 2026-05-08: Resolved code-review redaction finding and added regression tests for diagnostic metadata and receipt-file error messages.
