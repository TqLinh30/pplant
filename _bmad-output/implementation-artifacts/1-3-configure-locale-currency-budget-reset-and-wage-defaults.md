# Story 1.3: Configure Locale, Currency, Budget Reset, And Wage Defaults

Status: done

## Story

As a student,
I want to configure my currency, locale, monthly reset day, and default wage,
so that Pplant calculates money, dates, and work-time context correctly for me.

## Acceptance Criteria

1. Given I open preferences, when I set currency, locale, monthly budget reset day, and hourly wage, then the preferences are saved locally, and invalid values are rejected with a clear correction path.
2. Given I have saved preferences, when money or work-entry data uses defaults, then the saved currency, locale, and default wage are available through the local preferences model, and the data model preserves support for entry-level wage overrides without requiring work-entry UI in this story.
3. Given my month reset day changes, when budget or summary calculations run, then calendar grouping uses the updated reset rule, and date calculations remain deterministic.

## Tasks / Subtasks

- [x] Define the preferences domain contract. (AC: 1, 2, 3)
  - [x] Add `src/domain/preferences/types.ts` and `src/domain/preferences/schemas.ts`.
  - [x] Model one preferences record per local workspace with `workspaceId`, `currencyCode`, `locale`, `monthlyBudgetResetDay`, `defaultHourlyWageMinor`, `defaultHourlyWageCurrencyCode`, `createdAt`, and `updatedAt`.
  - [x] Validate currency as an uppercase ISO 4217-style 3-letter code and reject unsupported values with `AppResult` / `AppError`.
  - [x] Validate locale as a non-empty BCP 47 language tag, canonicalized with `Intl.getCanonicalLocales` when available.
  - [x] Require `monthlyBudgetResetDay` from 1 through 31.
  - [x] Require default hourly wage to persist as a non-negative integer minor-unit amount. Do not store floating-point money.
- [x] Add deterministic budget-period date rules. (AC: 3)
  - [x] Extend `src/domain/common/date-rules.ts` or add a focused preferences/date helper used by it.
  - [x] Implement a pure function that resolves the active monthly budget period for a `LocalDate` and reset day.
  - [x] Define reset days beyond a month length to clamp to that month's last local day; for example reset day 31 uses Feb 28 or Feb 29 in February.
  - [x] Keep calculations independent of device clock, network state, and mutable locale formatting.
  - [x] Add boundary tests for month transitions, leap day behavior, reset day 1, reset day 31, and dates before/on/after the reset boundary.
- [x] Add the persisted preferences schema and migration. (AC: 1, 2)
  - [x] Update `src/data/db/schema.ts` with a `preferences` or `user_preferences` table, using the repo's Drizzle SQLite pattern.
  - [x] Update `src/data/db/migrations/migrate.ts` with a second idempotent tracked migration such as `002_create_user_preferences`.
  - [x] Ensure migration 002 creates only preferences storage; it must not drop, recreate, or reset `schema_migrations`, `workspaces`, or future user data.
  - [x] Use static SQL in `execSync` migration blocks and bound parameters for dynamic values in repository writes.
  - [x] Preserve Story 1.2 migration behavior and keep direct `migrateDatabase()` open failures wrapped as retryable `AppResult` errors.
- [x] Implement preferences repository and service access. (AC: 1, 2)
  - [x] Add `src/data/repositories/preferences.repository.ts` and export it from `src/data/repositories/index.ts`.
  - [x] Repositories remain the only layer that imports Drizzle tables or touches SQLite.
  - [x] Add `src/services/preferences/preferences.service.ts` for loading, saving, and exposing saved preferences defaults.
  - [x] Service dependencies should be injectable for tests, following `ensureLocalWorkspace`.
  - [x] Ensure save is an upsert per local workspace: first save creates the row, later saves update the same row and `updatedAt`.
  - [x] Return `not_found` or a clear empty-state result when no preferences have been saved; do not silently invent user financial defaults for downstream money/work flows.
  - [x] Expose default wage as money-like data with amount minor units and currency. Future work entries must be able to use this default while still storing an entry-level wage override later.
- [x] Replace the settings placeholder with a real preferences flow. (AC: 1)
  - [x] Update `src/features/settings/SettingsScreen.tsx`; keep `src/app/(tabs)/settings.tsx` as a thin route export.
  - [x] Add a feature hook/orchestrator such as `src/features/settings/usePreferenceSettings.ts`.
  - [x] Use existing UI primitives (`TextField`, `Button`, `StatusBanner`, `ListRow`, `SegmentedControl` if useful) and extend a primitive only if inline error/help text is needed by more than this screen.
  - [x] Show required fields for currency, locale, monthly reset day, and default hourly wage with accessible labels.
  - [x] Validate inline where possible and show one clear correction path per invalid field.
  - [x] Show loading, saved, unsaved, validation failed, and retryable persistence failure states with neutral copy.
  - [x] Keep the screen mobile-first, one-scroll-surface, and accessible with 44x44 minimum touch targets.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test preferences domain validation for valid/invalid currency, locale, reset day, and wage values.
  - [x] Test parsing/conversion of wage UI input into integer minor units without floating-point persistence.
  - [x] Test repository/service create, update, load, missing preferences, and recoverable open/migration/repository failures using fakes where native Expo SQLite is unavailable.
  - [x] Test migration 002 idempotence and preservation of migration 001 behavior.
  - [x] Test deterministic monthly reset calculations, including leap-year and short-month clamp cases.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npx expo install --check` before moving the story to review.

## Dev Notes

### Current Repository State

- Story 1.1 and Story 1.2 are complete. Story 1.2 added the local workspace domain, `workspaces` table, tracked migration runner, workspace repository/service, and startup `WorkspaceGate`.
- `src/app/(tabs)/settings.tsx` currently only re-exports `SettingsScreen`. Keep that route thin.
- `src/features/settings/SettingsScreen.tsx` is still a placeholder that says currency, locale, categories, budgets, savings, privacy, notifications, and data controls will live there. This story replaces only the preference subset owned by FR2.
- `src/data/db/schema.ts` currently defines `schema_migrations` and `workspaces`.
- `src/data/db/migrations/migrate.ts` currently applies `001_create_local_workspace`, tracks migrations, and catches database open failures inside the migration API.
- `src/data/repositories/workspace.repository.ts` shows the current repository pattern: Drizzle access in the repository only, row parsing through Zod-backed domain schemas, and retryable `AppResult` errors.
- `src/services/workspace/workspace.service.ts` shows the current service pattern: dependency injection for tests, open database inside a recoverable boundary, migration before repository access, and typed result returns.
- `src/domain/common/money.ts` already has `CurrencyCode`, `Money`, `asCurrencyCode`, `createMoney`, and `addMoney`. Extend or reuse these instead of creating parallel money primitives.
- `src/domain/common/date-rules.ts` is intentionally small today. This story should add deterministic monthly budget-period rules there or in a tightly named helper referenced from there.
- `src/domain/work/types.ts` and `src/features/work/WorkEntryForm.tsx` already include optional `wageMinorPerHour`. Do not build the work-entry UI or persistence table in this story; preserve this override shape and make preferences defaults available for future work stories.
- Jest currently matches `**/?(*.)+(test).ts`, so automated tests should stay in `.test.ts` files unless the Jest config is intentionally updated.
- No git repository was detected in this workspace; rely on file contents and sprint artifacts rather than commit history.

### Implementation Guidance

- Scope this story to FR2 preferences only. Do not add category/topic management, budget amount setup, savings goals, privacy controls, money record CRUD, work-entry CRUD, receipt flows, account auth, cloud sync, bank linking, payment integrations, investment/debt features, or regulated-finance behavior.
- Recommended table shape:

```text
user_preferences
  workspace_id TEXT PRIMARY KEY NOT NULL
  currency_code TEXT NOT NULL
  locale TEXT NOT NULL
  monthly_budget_reset_day INTEGER NOT NULL
  default_hourly_wage_minor INTEGER NOT NULL
  default_hourly_wage_currency_code TEXT NOT NULL
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
```

- Prefer `workspace_id` as the primary key because the MVP invariant is one preferences row for the single local workspace. A foreign key to `workspaces.id` is acceptable if implemented consistently with Expo SQLite/Drizzle support and tested.
- Store currency codes, not symbols. Store locale tags, not translated display names. Store wage in integer minor units, not decimal strings or floats.
- `defaultHourlyWageCurrencyCode` should normally match the selected `currencyCode` when the user saves. Keeping the wage currency explicit protects future wage snapshots if the default app currency changes.
- For currency minor-unit parsing, use `Intl.NumberFormat(...).resolvedOptions()` to infer currency fraction digits when the runtime supports it, and provide a deterministic fallback for common zero-decimal currencies if needed. Persist only the resulting integer minor units.
- Locale validation should use `Intl.getCanonicalLocales` where present. If the runtime lacks it, use a conservative fallback and keep tests deterministic by injecting the canonicalizer.
- The settings UI can use simple text inputs for MVP if no picker exists yet. If adding a selector, keep it local and small; do not introduce a heavy UI library.
- If no preferences exist, the settings screen should show an editable empty/setup state. Downstream defaults should return a clear missing-preferences result instead of pretending that an arbitrary default currency or wage was saved.
- Invalid-value copy should be specific and actionable, for example: "Use a 3-letter currency code like USD", "Use a locale like en-US", "Choose a reset day from 1 to 31", or "Enter a wage amount of 0 or more".
- Diagnostics are not required for routine validation failures. If adding diagnostics for persistence failures, use only existing allowed metadata keys or first extend the allowlist safely; never log currency amounts, wage values, user-entered text, raw database rows, file paths, or URIs.

### Date Rule Requirements

- Add a pure period resolver that accepts explicit local-date input and reset day. It must not read `new Date()` internally.
- Suggested contract:

```ts
type BudgetPeriod = {
  startDate: LocalDate;
  endDateExclusive: LocalDate;
};
```

- For reset day 1, a calendar month period starts on the first local day and ends on the first local day of the next month.
- For reset day N where N is greater than a month's length, clamp the reset boundary to that month's last local day.
- Use local date strings (`YYYY-MM-DD`) for deterministic tests. Avoid timezone-dependent parsing of bare date strings with JavaScript `Date` unless the function normalizes explicitly and tests prove the intended behavior.
- These date rules will be used by future budget and summary stories; this story only creates the reusable deterministic rule and tests.

### UX and Accessibility Guidance

- Settings should feel like an in-app control surface, not a landing page or dashboard.
- Keep one primary action: save preferences. Retry is appropriate only for load/save failure.
- Required fields must be visibly labeled. Validation errors should appear next to the field they affect where possible.
- Touch targets for save/retry/select controls must remain at least 44x44.
- Text scaling must not hide field labels, errors, or the save action.
- Do not rely on color alone for saved, failed, or invalid states.
- Use neutral copy. Preferences are setup controls; avoid finance advice, judgment, or urgency.

### Architecture Compliance

- Domain modules own value objects, schemas, and deterministic calculations.
- Data repositories own SQLite and Drizzle access.
- Services own orchestration, database opening, migrations, and typed error mapping.
- Features own hooks and screen state.
- Route files compose or re-export screens only.
- React components must not import SQLite clients, Drizzle tables, or migration utilities.
- Keep SQLite as the source of truth. Do not use AsyncStorage as the preferences source of truth.
- Do not add a broad global store for this story.

### Latest Technical Notes

- Expo SQLite SDK 55 documents synchronous APIs such as `execSync`, `getFirstSync`, and `runSync`. Its warning for `execSync` says it does not escape parameters and can cause SQL injection when user input is included, so keep migration SQL static and use repository bound parameters for dynamic values.
- Drizzle's Expo SQLite driver is the existing project choice; continue importing `drizzle` from `drizzle-orm/expo-sqlite` through the existing database client rather than adding another SQLite abstraction.
- Drizzle SQLite column types include `text` and `integer`, matching the current schema style for timestamps, ids, reset day, schema version, and integer minor units.
- Zod supports schema parsing and safe parsing for runtime validation; continue returning `AppResult` from domain/service boundaries instead of exposing raw thrown parse errors.
- `Intl.getCanonicalLocales` returns canonical locale names and throws for invalid language tags; wrap it so validation failures become `AppResult` errors.
- `Intl.NumberFormat` supports currency formatting options and resolved options; use it as a helper for currency fraction digits, not as the persistence format.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
```

Minimum test coverage:

- Preferences domain accepts valid values and rejects invalid currency, locale, reset day, and wage inputs with `validation_failed` and recovery `edit`.
- Currency normalization converts lower/mixed case input to uppercase before persistence.
- Locale canonicalization is deterministic in tests through injected or wrapped canonicalizer behavior.
- Wage parsing stores integer minor units and rejects malformed decimal input rather than storing floats.
- Service load returns saved preferences; missing preferences returns a clear empty/not-found state; save creates and later updates the same workspace preferences row.
- Repository/service failures return retryable `AppResult` errors, not uncaught exceptions.
- Migration 002 is applied once, tracked, and does not disturb migration 001 or existing workspace rows.
- Budget period calculation handles reset day 1, reset day 15, reset day 31, February in non-leap years, February in leap years, and dates around reset boundaries.
- Settings feature state maps loading, validation failed, saved, and retryable failure states without importing persistence details into React components.

If native Expo SQLite cannot run in Jest, use fakes for repository/service tests as Story 1.2 did and record a manual device verification note in the Dev Agent Record after implementation.

### Project Structure Notes

Expected additions or updates:

```text
src/
  app/
    (tabs)/
      settings.tsx                         # keep thin re-export
  domain/
    common/
      date-rules.ts                        # add/reset-period helper or re-export focused helper
      date-rules.test.ts
      money.ts                             # reuse/extend currency and minor-unit helpers if needed
      money.test.ts
    preferences/
      schemas.ts
      types.ts
      preferences.test.ts
  data/
    db/
      schema.ts
      migrations/
        migrate.ts
        migrate.test.ts
    repositories/
      index.ts
      preferences.repository.ts
  services/
    preferences/
      preferences.service.ts
      preferences.service.test.ts
  features/
    settings/
      SettingsScreen.tsx
      usePreferenceSettings.ts
```

These paths can be adjusted only when the existing architecture clearly suggests a better local pattern. The ownership boundaries cannot change.

### Previous Story Learnings

- Story 1.2 established `schema_migrations`, `workspaces`, `openPplantDatabase`, and an idempotent migration runner. Build on those instead of replacing the migration system.
- Story 1.2 review found direct `migrateDatabase()` database-open failures could bypass the `try` block. Keep any new migration/open logic inside recoverable `AppResult` boundaries.
- Story 1.2 used fakes for service/migration tests because Jest does not exercise native Expo SQLite directly. Continue that approach where native SQLite is unavailable.
- Story 1.1 and Story 1.2 both reinforce the same privacy rule: diagnostics must be allowlisted and must not include raw paths, URIs, receipt text, spending details, income values, task/reminder text, wage values, or reflections.
- Current UI primitives are intentionally light. Extend them carefully only when it improves reusable form accessibility or error display.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 1 objective, FR2, Story 1.3 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR2, Work-Income Tracking FR26-FR29, NFR-PERF-01, NFR-REL-04, NFR-REL-05, NFR-SEC-01, NFR-SEC-04]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Validation Strategy, Migration Strategy, Frontend Architecture, Architectural Boundaries, Requirements to Structure Mapping]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - mobile-first setup, validation, error states, accessibility, neutral copy]
- [Source: `_bmad-output/implementation-artifacts/1-2-create-single-user-local-workspace.md` - previous story implementation, review patch, validation commands, file patterns]
- [Source: Expo SQLite SDK 55 docs, verified 2026-05-08: `https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/`]
- [Source: Drizzle Expo SQLite docs, verified 2026-05-08: `https://orm.drizzle.team/docs/connect-expo-sqlite`]
- [Source: Drizzle SQLite column types docs, verified 2026-05-08: `https://orm.drizzle.team/docs/column-types/sqlite`]
- [Source: Zod basics docs, verified 2026-05-08: `https://zod.dev/basics`]
- [Source: MDN `Intl.getCanonicalLocales`, verified 2026-05-08: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/getCanonicalLocales`]
- [Source: MDN `Intl.NumberFormat`, verified 2026-05-08: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Added preferences domain types, schemas, and validation around workspace id, currency, locale, reset day, and wage minor units.
- Extended common date and money helpers for deterministic budget-period resolution and safe minor-unit parsing/formatting.
- Added SQLite schema/migration 002 plus preferences repository and service access.
- Replaced the settings placeholder with a local preferences form and feature hook.
- Added focused tests for domain, date rules, migration, service, and settings form behavior.

### Debug Log References

- `npm run typecheck` passed.
- `npm test` passed: 11 suites, 48 tests.
- `npm run lint` passed.
- `npx expo install --check` passed.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.
- Self-review report created at `docs/automation-reports/story-1.3-review.md` with verdict `APPROVED_WITH_MINOR_NOTES`.

### Completion Notes List

- Implemented `user_preferences` storage through migration `002_create_user_preferences` without destructive SQL.
- Added local preferences repository/service with retryable open/migration/persistence errors and missing-preferences handling.
- Added currency, locale, reset-day, and default-wage validation with `AppResult` error recovery.
- Added deterministic monthly budget period calculation with reset-day clamping for short months and leap years.
- Updated Settings to load, edit, validate, save, and recover local preferences while keeping route files thin.
- Updated Jest config to ignore `.claude/worktrees` so automation worktrees do not create duplicate module/test collisions.
- Native Expo SQLite persistence was not manually device-tested in this run; repository/service behavior is covered with fakes as allowed by the story.

### File List

- `_bmad-output/implementation-artifacts/1-3-configure-locale-currency-budget-reset-and-wage-defaults.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-1.3-review.md`
- `jest.config.js`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/preferences.repository.ts`
- `src/domain/common/date-rules.test.ts`
- `src/domain/common/date-rules.ts`
- `src/domain/common/money.test.ts`
- `src/domain/common/money.ts`
- `src/domain/preferences/preferences.test.ts`
- `src/domain/preferences/schemas.ts`
- `src/domain/preferences/types.ts`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/settings/usePreferenceSettings.test.ts`
- `src/features/settings/usePreferenceSettings.ts`
- `src/services/preferences/preferences.service.test.ts`
- `src/services/preferences/preferences.service.ts`
- `src/ui/primitives/TextField.tsx`

## Change Log

- 2026-05-08: Created Story 1.3 for local preferences, deterministic budget reset rules, and default wage context.
- 2026-05-08: Implemented Story 1.3 preferences domain, migration, repository/service, settings UI, tests, verification, and self-review report.
