# Story 1.5: Set Monthly Budget Rules And Savings Goals

Status: done

## Story

As a student,
I want to set a monthly budget and basic savings goals,
so that I can see whether my spending supports my plans.

## Acceptance Criteria

1. Given I open budget setup, when I set monthly budget amount, reset day behavior, and rollover/no-rollover preference, then the rules are saved locally and invalid budget values are handled with inline validation.
2. Given I open savings goals, when I create or edit a goal with target amount and optional target date, then the goal is saved locally and it is available to budget, savings, and summary inputs for later Today and Review surfaces.
3. Given budget or savings data changes, when dependent summaries recalculate, then the app uses deterministic calculations and no floating-point money storage is introduced.

## Tasks / Subtasks

- [x] Define budget planning domain contracts. (AC: 1, 2, 3)
  - [x] Add a focused domain module such as `src/domain/budgets/*`.
  - [x] Model one active budget rules record per local workspace with `workspaceId`, `monthlyBudgetAmountMinor`, `currencyCode`, `resetDaySource`, `rolloverPolicy`, `overBudgetBehavior`, `createdAt`, and `updatedAt`.
  - [x] Model savings goals with stable `id`, `workspaceId`, `name`, `targetAmountMinor`, `currentAmountMinor`, `currencyCode`, optional `targetDate`, `createdAt`, `updatedAt`, and nullable `archivedAt`.
  - [x] Validate budget amount and savings target as positive integer minor-unit amounts; validate manual current amount as a non-negative integer minor-unit amount.
  - [x] Validate goal names as trimmed, non-empty, mobile-friendly text.
  - [x] Validate optional target date as a real deterministic local date string (`YYYY-MM-DD`) using existing date helpers.
  - [x] Store all money values as integer minor units and currency codes; do not store decimals or floating-point values.
- [x] Add deterministic budget and savings calculations. (AC: 1, 2, 3)
  - [x] Reuse Story 1.3 `resolveBudgetPeriodForDate` and saved preference reset day; do not add a budget-specific reset-day override in this story.
  - [x] Implement pure budget status calculation that accepts explicit budget amount and spent amount minor units.
  - [x] Use the user-approved policy: over-budget does not block future expense entry, remaining budget may be negative, and the status is a neutral warning state.
  - [x] Use the user-approved no-rollover policy: positive remaining budget does not carry into the next monthly budget; it becomes a deterministic `savingsFundContributionMinor` summary input. Do not automatically mutate savings goals in this story.
  - [x] Implement pure savings progress calculation with integer outputs, such as remaining minor units and progress basis points.
- [x] Add safe local persistence. (AC: 1, 2, 3)
  - [x] Update `src/data/db/schema.ts` with `budgets` and `savings_goals` tables.
  - [x] Add migration `004_create_budgets_savings_goals` after migration 003 in `src/data/db/migrations/migrate.ts`.
  - [x] Migration 004 must be idempotent and non-destructive: it must not drop, recreate, or reset existing migrations, workspaces, preferences, categories, topics, or future user data.
  - [x] Use static SQL for migration DDL and bound parameters for all dynamic repository writes.
  - [x] Add indexes for workspace lookup, active savings-goal lookup, and target-date ordering.
- [x] Implement repository and service access. (AC: 1, 2, 3)
  - [x] Add budget planning repository access for loading/saving budget rules and creating/editing/listing savings goals.
  - [x] Keep SQLite access inside repositories only.
  - [x] Add a budget planning service that opens the database, runs migrations, loads saved preferences, and scopes all writes to `localWorkspaceId`.
  - [x] If preferences are not saved, return a clear `not_found` / settings recovery path instead of inventing currency or reset-day defaults.
  - [x] Save budget rules as an upsert per workspace, using the saved preference currency and reset day source.
  - [x] Create and edit savings goals without changing ids; editing must update the row and timestamp rather than creating a duplicate goal.
  - [x] Expose loaded budget rules and active savings goals as inputs for future Today/Review summaries without implementing those future surfaces.
- [x] Build the settings UI flow for budget and savings. (AC: 1, 2)
  - [x] Update `src/features/settings/SettingsScreen.tsx`; keep route files thin.
  - [x] Add a feature hook/orchestrator such as `src/features/settings/useBudgetPlanningSettings.ts`.
  - [x] Use existing primitives (`TextField`, `Button`, `StatusBanner`, `ListRow`, `SegmentedControl`, `IconButton`, `BottomSheet`) rather than adding a UI dependency.
  - [x] Show monthly budget amount, reset-day behavior sourced from preferences, no-rollover-to-savings behavior, and neutral over-budget behavior.
  - [x] Show inline validation for invalid budget amount, savings goal name, target amount, current amount, and target date.
  - [x] Support creating and editing savings goals with target amount, manual current amount, and optional target date.
  - [x] Show loading, empty/setup, preferences-needed, validation failed, saved, and retryable persistence failure states with neutral copy.
  - [x] Keep Story 1.3 preferences and Story 1.4 category/topic controls usable on the same settings screen.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test budget/savings domain validation for money minor units, goal names, target dates, policy enums, and row parsing.
  - [x] Test deterministic budget period/status calculations, including negative remaining and savings-fund contribution behavior.
  - [x] Test savings progress calculation using integer math with no floating-point persistence or percent dependence.
  - [x] Test migration 004 idempotence and preservation of migrations 001/002/003.
  - [x] Test repository/service load, save budget upsert, missing preferences, create/edit/list goals, validation errors, and retryable open/migration failures using fakes where native Expo SQLite is unavailable.
  - [x] Test settings feature state for loading, preferences-needed, budget validation, saved budget, goal create/edit validation, saved goals, empty state, and retryable failures.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, and `npm run build --if-present`.

## Dev Notes

### Current Repository State

- Stories 1.1 through 1.4 are complete and committed on `auto/codex-overnight-1`.
- Story 1.3 added preferences, saved currency/locale/monthly reset day/default wage, and deterministic budget-period date rules in `src/domain/common/date-rules.ts`.
- Story 1.4 added categories/topics, migration `003_create_categories_topics`, category/topic repository/service, `useCategoryTopicSettings`, and category/topic controls on `SettingsScreen`.
- `src/features/settings/SettingsScreen.tsx` is now a settings control surface containing Preferences and Categories/Topics. Story 1.5 should extend this screen carefully without replacing those flows.
- `src/app/(tabs)/settings.tsx` remains a thin route export and should stay thin.
- Existing service pattern: open database inside a recoverable boundary, run `migrateDatabase`, create repositories, return typed `AppResult`.
- Existing repository pattern: repositories own SQLite/Drizzle access and map failures to retryable `AppResult` errors.
- Existing money helpers in `src/domain/common/money.ts` already parse/format money UI strings into integer minor units and validate currency codes. Reuse them.
- Existing date helpers in `src/domain/common/date-rules.ts` already validate local dates and resolve budget periods from explicit local-date input and reset day. Reuse them.
- Current migrations are `001_create_local_workspace`, `002_create_user_preferences`, and `003_create_categories_topics`.
- Jest matches `.test.ts` files and ignores `.claude/worktrees`.

### User Decisions For Story 1.5

- Rollover: do not carry remaining budget into the next month.
- Surplus behavior: positive remaining budget becomes a savings-fund contribution input for future summaries. Do not automatically mutate savings goals or create transactions in this story.
- Over-budget behavior: do not block expense entry; future budget summaries may show negative remaining and a neutral warning.
- Reset day: use the saved Story 1.3 preferences reset day; do not add a per-budget override in Story 1.5.
- Savings goals: store target amount, optional target date, and manual current amount. Future money records may update savings progress later.

### Implementation Guidance

- Scope this story to FR4 and FR5 setup only. Do not implement expense/income CRUD, Today overview, Review summaries, recurring money, work entries, automatic goal allocation, transfers, or financial advice.
- Budget rules should be stored as one row per workspace. Recommended shape:

```text
budgets
  workspace_id TEXT PRIMARY KEY NOT NULL
  monthly_budget_amount_minor INTEGER NOT NULL
  currency_code TEXT NOT NULL
  reset_day_source TEXT NOT NULL              # "preferences"
  rollover_policy TEXT NOT NULL              # "savings_fund"
  over_budget_behavior TEXT NOT NULL         # "allow_negative_warning"
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
```

- Savings goals should be stored as active rows with stable ids. Recommended shape:

```text
savings_goals
  id TEXT PRIMARY KEY NOT NULL
  workspace_id TEXT NOT NULL
  name TEXT NOT NULL
  target_amount_minor INTEGER NOT NULL
  current_amount_minor INTEGER NOT NULL
  currency_code TEXT NOT NULL
  target_date TEXT
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  archived_at TEXT
```

- `reset_day_source`, `rollover_policy`, and `over_budget_behavior` should be lowercase enum-like strings.
- Use saved preferences as the source of currency and reset day. If preferences are missing, show a setup state and do not silently save budget rules using UI defaults.
- `savingsFundContributionMinor` is a deterministic summary output, not a persisted transaction in this story.
- Current amount may be greater than target amount. That should represent an over-target goal and should not be rejected.
- Target date is optional. Empty UI input should persist as `null`; non-empty input must be a real local date (`YYYY-MM-DD`).
- Budget and savings names/amounts can reveal sensitive financial context. Do not add diagnostics containing amounts, names, target dates, raw rows, or future spending records.
- No new runtime dependency is expected. If an additional dependency seems necessary, stop for approval.

### UX and Accessibility Guidance

- Settings should remain a calm in-app control surface. Avoid dashboard-style finance advice.
- Use neutral copy: "over budget" states should be warning context, not blame.
- Budget reset behavior should be explained as coming from preferences. Provide a visible route to save preferences first when needed.
- No-rollover behavior should say that positive remaining budget is available for savings instead of being added to next month.
- Do not rely on color alone for budget, warning, or savings progress states.
- Required fields must have labels and inline correction messages.
- Touch targets must remain at least 44x44.
- Keep text sizes compact within settings sections; avoid hero-scale type inside forms.

### Architecture Compliance

- Domain modules own validation, row parsing, and pure budget/savings calculations.
- Data repositories own SQLite access.
- Services own database opening, migrations, preference lookup, workspace scoping, and typed error mapping.
- Feature hooks own form state and screen behavior.
- React components must not import SQLite clients, Drizzle tables, migration utilities, or repositories.
- SQLite remains the source of truth. Do not use AsyncStorage.
- Do not add a global state store for this story.

### Latest Technical Notes

- Expo SQLite SDK 55 synchronous APIs such as `execSync`, `getFirstSync`, `getAllSync`, and `runSync` are already used in this project. Keep migration SQL static because `execSync` does not parameterize user input.
- Drizzle Expo SQLite remains the configured database layer through `openPplantDatabase`; repository raw SQL may use `$client` only with bound parameters, following Story 1.4 precedent.
- Drizzle SQLite `text` and `integer` columns match the current schema style for ids, timestamps, enum-like strings, and integer minor units.
- Zod remains the runtime validation tool for domain row parsing and boundary validation.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npm run build --if-present
```

Minimum test coverage:

- Budget amount rejects zero, negative, non-integer, malformed decimal UI input, and unsupported currencies with `validation_failed` and recovery `edit`.
- Budget rules parse only supported policies: `preferences`, `savings_fund`, and `allow_negative_warning`.
- Budget status allows negative remaining, sets neutral warning state when spent exceeds budget, returns no next-period carryover, and returns positive remaining as `savingsFundContributionMinor`.
- Savings goal validation trims names, rejects empty/over-limit names, requires positive target amount, accepts current amount 0 or higher, accepts current amount above target, and validates optional target date.
- Savings progress calculation uses integer math, including over-target progress.
- Migration 004 is applied once, tracked, creates `budgets` and `savings_goals`, and does not disturb migrations 001/002/003.
- Service load requires saved preferences for currency/reset-day context and returns a clear settings recovery if missing.
- Budget save upserts one workspace row and updates `updatedAt`.
- Goal create/edit/list preserves ids and uses active rows.
- Settings feature state maps loading, preferences-needed, budget validation failed, budget saved, goal validation failed, goal saved, empty goals, and retryable persistence failures.
- If native Expo SQLite cannot run in Jest, use fakes as Stories 1.2-1.4 did and record the limitation in the Dev Agent Record.

### Project Structure Notes

Expected additions or updates:

```text
src/
  data/
    db/
      schema.ts
      migrations/
        migrate.ts
        migrate.test.ts
    repositories/
      index.ts
      budget-planning.repository.ts
      budget-planning.repository.test.ts
  domain/
    budgets/
      schemas.ts
      types.ts
      budgets.test.ts
  features/
    settings/
      SettingsScreen.tsx
      useBudgetPlanningSettings.ts
      useBudgetPlanningSettings.test.ts
  services/
    budgets/
      budget-planning.service.ts
      budget-planning.service.test.ts
```

These paths can be adjusted only when the existing architecture clearly suggests a better local pattern. Ownership boundaries cannot change.

### Previous Story Learnings

- Story 1.4 successfully used a combined repository/service for closely related setup data and covered it with fakes. A combined budget-planning repository/service is acceptable if it keeps SQLite access out of UI and keeps contracts clear.
- Story 1.4 kept future record integrations behind an injectable adapter instead of implementing future stories early. Apply the same discipline: expose summary-ready budget/savings data, but do not implement Today/Review or money-record recalculation.
- Story 1.4 added more settings UI to one screen. Keep Story 1.5 UI compact and avoid nested cards or decorative layout.
- Story 1.3 established currency parsing/formatting and reset-day date rules. Reuse those helpers instead of duplicating money/date parsing.
- Stories 1.2-1.4 used fakes for native Expo SQLite in Jest; continue that approach where native SQLite is unavailable.
- Privacy rule from Stories 1.1-1.4: diagnostics must not include raw paths, URIs, receipt text, spending details, income values, task/reminder text, wage values, reflections, category/topic names, budget amounts, or savings goal details.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 1 objective, Story 1.5 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR4, FR5, FR16, FR42, NFR-PERF-03, NFR-REL-04, NFR-REL-05, NFR-REL-07, NFR-SEC-01, NFR-SEC-04, NFR-SEC-07, NFR-A11Y-03, NFR-A11Y-04, NFR-UX-01, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Validation Strategy, Migration Strategy, Structure Patterns, Data Modeling Patterns, Architectural Boundaries, Requirements to Structure Mapping]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - budget/savings context, neutral warning copy, settings surfaces, accessibility, non-color-only states]
- [Source: `_bmad-output/implementation-artifacts/1-4-manage-categories-and-topics.md` - previous story implementation patterns, migration 003, settings UI, tests, validation commands]
- [Source: User clarification, 2026-05-08: no rollover to next month; positive remaining goes to savings fund; over-budget allows negative remaining with neutral warning; reset day comes from preferences; savings goals store target/current/manual values]
- [Source: Expo SQLite SDK 55 docs, verified 2026-05-08: `https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/`]
- [Source: Drizzle Expo SQLite docs, verified 2026-05-08: `https://orm.drizzle.team/docs/connect-expo-sqlite`]
- [Source: Drizzle SQLite column types docs, verified 2026-05-08: `https://orm.drizzle.team/docs/column-types/sqlite`]
- [Source: Zod basics docs, verified 2026-05-08: `https://zod.dev/basics`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add budget/savings domain types, validation, row parsing, and deterministic integer calculations.
- Add non-destructive SQLite tables through migration `004_create_budgets_savings_goals` plus repository/service access.
- Add a settings hook/UI for monthly budget rules and savings goals while preserving preferences and category/topic controls.
- Add domain, migration, repository/service, and settings-state tests, then run the full verification suite.

### Debug Log References

- `npm test -- budgets.test.ts` initially failed before domain implementation, then passed after `src/domain/budgets/*`.
- `npm test -- migrate.test.ts` initially failed before migration 004, then passed after schema/migration updates.
- `npm test -- budget-planning.service.test.ts` initially failed before service/repository implementation, then passed after adding budget planning service access.
- `npm test -- budget-planning.repository.test.ts` passed with a fake SQLite client covering budget upsert and goal create/update/list behavior.
- `npm test -- useBudgetPlanningSettings.test.ts` initially failed before settings hook implementation, then passed after adding reducer/hook state.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 19 suites, 98 tests.
- `npx expo install --check` passed.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.
- Safety scan with `Select-String` found no destructive migration SQL, new diagnostics logging, or secrets introduced by Story 1.5.
- Self-review cleanup split a typed settings-hook dispatch into explicit validation/action branches; post-cleanup `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check` passed.

### Completion Notes List

- Added `budgets` and `savings_goals` persistence through idempotent migration `004_create_budgets_savings_goals`.
- Added budget rules and savings goal domain models with integer minor-unit validation, fixed policy enums, optional local-date target dates, and stable goal ids.
- Added deterministic budget status calculation: negative remaining is allowed, positive remaining becomes `savingsFundContributionMinor`, and next-period carryover is always zero.
- Added deterministic savings progress calculation using integer basis points.
- Added budget planning repository/service with saved-preferences dependency, budget upsert, savings goal create/edit/list, and retryable persistence errors.
- Extended Settings with budget and savings setup while preserving Story 1.3 preferences and Story 1.4 category/topic controls.
- Native Expo SQLite persistence was not manually device-tested in this run; repository/service behavior is covered with fakes as allowed by the story.

### File List

- `_bmad-output/implementation-artifacts/1-5-set-monthly-budget-rules-and-savings-goals.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-1.5-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/budget-planning.repository.test.ts`
- `src/data/repositories/budget-planning.repository.ts`
- `src/data/repositories/index.ts`
- `src/domain/budgets/budgets.test.ts`
- `src/domain/budgets/schemas.ts`
- `src/domain/budgets/types.ts`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/settings/useBudgetPlanningSettings.test.ts`
- `src/features/settings/useBudgetPlanningSettings.ts`
- `src/services/budgets/budget-planning.service.test.ts`
- `src/services/budgets/budget-planning.service.ts`

## Change Log

- 2026-05-08: Created Story 1.5 for monthly budget rules and basic savings goals using clarified budget/savings policies.
- 2026-05-08: Implemented Story 1.5 budget/savings domain, migration, repository/service, settings UI, tests, verification, and self-review preparation.
- 2026-05-08: Completed self-review cleanup and post-cleanup verification.
