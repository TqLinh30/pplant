# Story 2.1: Create Manual Expense And Income Records

Status: done

## Story

As a student,
I want to manually create expense and income records with useful metadata,
so that I can track money quickly without bank integrations.

## Acceptance Criteria

1. Given I start manual money capture, when I enter amount, date, category, topic, merchant/source, and notes, then the record is saved locally, and amount is stored as integer minor units with a currency code.
2. Given required fields are missing or invalid, when I try to save, then inline validation identifies the problem, and no partial final record is created.
3. Given I save a valid record, when the save completes, then the record is persisted locally and the money feature exposes the saved result, and the record is available to budget, savings, history, and summary inputs for later Today and Review surfaces.

## Tasks / Subtasks

- [x] Define manual money record domain contracts. (AC: 1, 2, 3)
  - [x] Update or extend `src/domain/money/*` for final persisted money records, not only draft placeholders.
  - [x] Model `expense` and `income` records with stable `id`, `workspaceId`, `kind`, `amountMinor`, `currencyCode`, `localDate`, optional `categoryId`, zero or more `topicIds`, optional `merchantOrSource`, optional `note`, `source`, `sourceOfTruth`, `createdAt`, and `updatedAt`.
  - [x] Treat amount, kind, local date, workspace, currency, source, and source-of-truth as required.
  - [x] Treat category, topics, merchant/source, and note as optional metadata. PRD says records may have one category and zero or more topics.
  - [x] Validate amount as positive integer minor units and parse UI amount through existing money helpers.
  - [x] Validate local date as a real deterministic `YYYY-MM-DD` date through existing date helpers.
  - [x] Validate merchant/source and note as trimmed mobile-friendly text with clear maximum lengths.
  - [x] Store manual records with `source = "manual"` and `sourceOfTruth = "manual"` in this story.
- [x] Add safe local persistence. (AC: 1, 2, 3)
  - [x] Update `src/data/db/schema.ts` with `money_records` and a join table for `money_record_topics`.
  - [x] Add migration `005_create_money_records` after migration 004 in `src/data/db/migrations/migrate.ts`.
  - [x] Migration 005 must be idempotent and non-destructive. It must not drop, recreate, or reset existing workspaces, preferences, categories/topics, budgets, savings goals, or migrations.
  - [x] Store all money values as integer minor units plus currency code. Do not store floating-point values.
  - [x] Add indexes for workspace/date/kind lookup, category lookup, and topic lookup for later budget, savings, history, and summary inputs.
  - [x] Use static SQL for migration DDL and bound parameters for dynamic repository writes.
  - [x] Ensure create writes are atomic so validation or topic write failures do not leave a partial final record.
- [x] Implement repository and service access. (AC: 1, 2, 3)
  - [x] Add a money records repository such as `src/data/repositories/money-records.repository.ts`.
  - [x] Repository must create manual records, load records by id, and list recent records for the local workspace.
  - [x] Add a money service such as `src/services/money/money-record.service.ts`.
  - [x] Service must open the database, run migrations, load saved preferences for currency/locale context, and scope writes to `localWorkspaceId`.
  - [x] If preferences are missing, return a clear settings recovery path instead of inventing currency defaults.
  - [x] Validate selected category/topic ids against active local category/topic records when ids are provided.
  - [x] Expose saved records as typed service results for future budget, savings, history, and summary inputs without implementing those future surfaces.
- [x] Build manual money capture UI. (AC: 1, 2, 3)
  - [x] Update `src/features/capture/CaptureScreen.tsx`; keep route files thin.
  - [x] Add a feature hook/orchestrator such as `src/features/capture/useManualMoneyCapture.ts`.
  - [x] Use existing primitives (`TextField`, `Button`, `SegmentedControl`, `ListRow`, `StatusBanner`) rather than adding UI dependencies.
  - [x] Support expense/income selection, amount, local date, category selection, topic selection, merchant/source, and notes.
  - [x] Show loading, preferences-needed, empty optional category/topic lists, validation failed, saved, and retryable persistence failure states.
  - [x] Keep copy fast and neutral. Do not frame spending as advice or shame.
  - [x] Keep existing capture route as the place to start manual money capture; do not implement Today launcher or receipt capture in this story.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test domain validation for amount, date, kind, currency, optional category/topics, merchant/source, note, manual source, and row parsing.
  - [x] Test migration 005 idempotence and preservation of migrations 001 through 004.
  - [x] Test repository create/get/list behavior and no partial record on simulated topic write failure.
  - [x] Test service missing preferences, successful create, invalid money/date/category/topic inputs, and retryable open/migration failures using fakes where native Expo SQLite is unavailable.
  - [x] Test capture feature state for loading, preferences-needed, validation errors, successful save, field clearing, category/topic selection, and retryable failures.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Current Repository State

- Stories 1.1 through 1.6 are complete on `auto/codex-overnight-1`.
- `src/domain/money/types.ts`, `schemas.ts`, and `calculations.ts` currently contain early placeholders. Story 2.1 should evolve these into persisted manual money record contracts.
- `src/features/capture/CaptureScreen.tsx` is currently a placeholder and can become the manual money capture entry point while keeping `src/app/(tabs)/capture.tsx` thin.
- `src/features/money/MoneyRouteScreen.tsx` is currently a placeholder for detail routing. Story 2.1 can expose repository/service results, but should not implement full edit/detail/history UI unless directly needed.
- `src/data/db/migrations/migrate.ts` currently has migrations 001 through 004. Story 2.1 should add migration 005 after budget/savings.
- Story 1.3 preferences provide saved currency and locale. Manual money capture should use saved preferences instead of unsaved UI defaults.
- Story 1.4 categories/topics provide active local category/topic records. Manual money capture should allow no category/topics, but selected ids must refer to active local items.
- Story 1.5 budgets/savings consume future money records later. Story 2.1 should persist records in a shape budget/savings/history/summary services can consume later, but should not implement Today/Review recalculation surfaces early.
- Story 1.6 privacy copy treats spending history and income records as sensitive. Do not add diagnostics or logs that include amounts, merchant/source, notes, categories, topics, or dates.

### Requirement Clarifications From Existing Artifacts

- Required fields for Story 2.1: kind, amount, local date, workspace, currency, manual source, and manual source-of-truth.
- Optional metadata for Story 2.1: category, topics, merchant/source, and note. PRD says records may have one category and zero or more topics.
- Expense and income amounts should be stored as positive minor-unit values; `kind` determines whether the value is spending or income for later summaries.
- Currency should come from saved preferences. Do not let one manual record choose a different currency in this story.
- Manual records should not create receipt drafts, receipt parse jobs, recurring money schedules, work entries, budget recalculation records, savings events, or summary snapshots in this story.

### Recommended Database Shape

Recommended additive tables:

```text
money_records
  id TEXT PRIMARY KEY NOT NULL
  workspace_id TEXT NOT NULL
  kind TEXT NOT NULL                         # "expense" | "income"
  amount_minor INTEGER NOT NULL              # positive integer minor units
  currency_code TEXT NOT NULL
  local_date TEXT NOT NULL                   # YYYY-MM-DD
  category_id TEXT
  merchant_or_source TEXT
  note TEXT
  source TEXT NOT NULL                       # "manual"
  source_of_truth TEXT NOT NULL              # "manual"
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  deleted_at TEXT                            # nullable, unused until Story 2.2

money_record_topics
  money_record_id TEXT NOT NULL
  topic_id TEXT NOT NULL
  workspace_id TEXT NOT NULL
  created_at TEXT NOT NULL
  PRIMARY KEY (money_record_id, topic_id)
```

`deleted_at` is included only as a nullable lifecycle field for future edit/delete without changing Story 2.1 behavior. Do not implement delete behavior in this story.

Recommended indexes:

```text
idx_money_records_workspace_date_kind
idx_money_records_workspace_category_date
idx_money_record_topics_workspace_topic
idx_money_record_topics_record
```

### UX and Accessibility Guidance

- Capture should feel fast and utilitarian. Avoid dashboard-style finance advice.
- Use a segmented control for Expense/Income.
- Use explicit labels for amount, date, category, topics, merchant/source, and notes.
- If categories/topics are empty, explain they are optional and can be set up later in Settings.
- Save success should show the saved record in neutral terms.
- Validation errors should be inline and field-specific.
- Do not rely on color alone for validation or saved states.
- Touch targets should remain at least 44x44 through existing primitives.

### Architecture Compliance

- Domain modules own validation, parsing, and pure record shaping.
- Data repositories own SQLite access.
- Services own database opening, migration, preference lookup, category/topic validation, workspace scoping, and typed error mapping.
- Feature hooks own form state and service orchestration.
- React components must not import SQLite clients, Drizzle tables, migrations, or repositories.
- SQLite remains the source of truth. Do not use AsyncStorage.
- No new runtime dependency is expected. Stop if a dependency seems necessary.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npm run build --if-present
git diff --check
```

Minimum test coverage:

- Amount rejects blank, zero, negative, malformed decimal input, too many minor-unit decimals, and unsupported currency with `validation_failed` and recovery `edit`.
- Date rejects blank, malformed, and impossible dates.
- Kind accepts only `expense` or `income`.
- Category id is optional, but provided ids must be non-empty and active.
- Topic ids are optional, must be unique when provided, and must be active.
- Merchant/source and note trim whitespace and reject over-limit text.
- Manual records parse only supported `source` and `sourceOfTruth` values.
- Migration 005 is applied once, tracked, creates `money_records` and `money_record_topics`, and does not disturb migrations 001 through 004.
- Repository create writes record and topics atomically; simulated topic write failure leaves no final record.
- Service load/create requires saved preferences for currency/locale and returns a settings recovery path if missing.
- Capture feature state maps loading, preferences-needed, validation failed, saved, and retryable persistence failures.

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
      money-records.repository.ts
      money-records.repository.test.ts
      index.ts
  domain/
    money/
      types.ts
      schemas.ts
      money.test.ts
  features/
    capture/
      CaptureScreen.tsx
      useManualMoneyCapture.ts
      useManualMoneyCapture.test.ts
  services/
    money/
      money-record.service.ts
      money-record.service.test.ts
```

These paths can be adjusted only when the existing architecture clearly suggests a better local pattern. Ownership boundaries cannot change.

### Previous Story Learnings

- Story 1.3 established preference-based currency/locale defaults. Manual money capture should reuse those saved preferences.
- Story 1.4 established category/topic repository/service patterns and fake usage adapters. Validate selected category/topic ids without implementing future record reassignment flows.
- Story 1.5 established budget/savings data as future summary inputs and avoided implementing future summary surfaces early.
- Story 1.6 established that money details are sensitive. Do not add diagnostics, logs, or review reports containing sample real spending details beyond generic fixtures.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.1 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR11, FR12, FR13, FR16, FR17, NFR-PERF-01, NFR-REL-02, NFR-REL-04, NFR-SEC-01, NFR-SEC-04, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Validation Strategy, Migration Strategy, API & Communication Patterns, Structure Patterns, Requirements to Structure Mapping]
- [Source: `_bmad-output/implementation-artifacts/1-3-configure-locale-currency-budget-reset-and-wage-defaults.md` - saved preferences and currency/locale patterns]
- [Source: `_bmad-output/implementation-artifacts/1-4-manage-categories-and-topics.md` - category/topic service and repository patterns]
- [Source: `_bmad-output/implementation-artifacts/1-5-set-monthly-budget-rules-and-savings-goals.md` - budget/savings future input discipline]
- [Source: `_bmad-output/implementation-artifacts/1-6-view-privacy-relevant-settings.md` - sensitive-data and diagnostics discipline]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add manual money record domain validation/parsing around positive minor-unit amounts, local dates, optional category/topics, and manual provenance.
- Add non-destructive migration 005 plus repository create/get/list with atomic create.
- Add money record service that uses saved preferences, validates selected active category/topics, and scopes writes to the local workspace.
- Replace the capture placeholder with a manual expense/income form and hook state using existing primitives.
- Add focused domain, migration, repository, service, and capture-state tests, then run full verification.

### Debug Log References

- `npm test -- src/domain/money/money.test.ts` initially failed due a test syntax typo, then passed after fixing the test.
- `npm test -- migrate.test.ts` passed after migration 005 updates.
- `npm test -- money-records.repository.test.ts` passed with fake SQLite client coverage for create/get/list and transaction rollback.
- `npm test -- money-record.service.test.ts` passed with fakes for preferences, category/topic validation, open/migration failure, and create behavior.
- `npm test -- useManualMoneyCapture.test.ts` passed for capture state and validation behavior.
- `npm run typecheck` passed.
- `npm run lint` passed after removing one duplicate import warning.
- `npm test` passed: 25 suites, 126 tests.
- `npx expo install --check` passed.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.
- Safety scan found no destructive SQL, secrets, diagnostics logging, external network calls, receipt upload, or deletion implementation introduced by Story 2.1. The only match was existing UI token imports.

### Completion Notes List

- Added persisted manual money record contracts with positive minor-unit amounts, preference currency, local dates, optional category/topics, optional merchant/source, optional notes, and manual provenance.
- Added idempotent migration 005 for `money_records` and `money_record_topics` with workspace/date/category/topic indexes.
- Added money records repository with atomic create, get-by-id, and recent-list access.
- Added money record service that runs migrations, requires saved preferences, validates selected active category/topics, and scopes writes to the local workspace.
- Replaced the Capture placeholder with a manual expense/income capture form using existing primitives and neutral copy.
- Added focused domain, migration, repository, service, and capture-state tests.
- Native Expo SQLite persistence and mobile UI behavior were not manually device-tested in this automation run; repository/service behavior is covered with fakes.

### File List

- `_bmad-output/implementation-artifacts/2-1-create-manual-expense-and-income-records.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-2.1-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/money-records.repository.test.ts`
- `src/data/repositories/money-records.repository.ts`
- `src/domain/money/money.test.ts`
- `src/domain/money/schemas.ts`
- `src/domain/money/types.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/capture/useManualMoneyCapture.test.ts`
- `src/features/capture/useManualMoneyCapture.ts`
- `src/services/money/money-record.service.test.ts`
- `src/services/money/money-record.service.ts`

## Change Log

- 2026-05-08: Created and started Story 2.1 for manual expense and income record creation.
- 2026-05-08: Implemented Story 2.1 domain, migration, repository, service, capture UI, tests, verification, and self-review preparation.
