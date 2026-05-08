# Story 2.2: Edit And Delete Money Records With Summary Recalculation

Status: done

## Story

As a student,
I want to edit and delete expense or income records,
so that my summaries stay accurate when I correct my history.

## Acceptance Criteria

1. Given a money record exists, when I edit amount, date, category, topic, merchant/source, or note, then changes are persisted locally, and budget remaining and savings progress recalculate.
2. Given a money record exists, when I delete it, then it is removed or marked according to repository rules, and related summaries, filters, and cached values update deterministically.
3. Given the record came from receipt parsing, when I manually edit it, then manual correction is stored as source of truth, and later derived updates do not overwrite the correction.

## Tasks / Subtasks

- [x] Extend money record domain provenance and summary contracts. (AC: 1, 2, 3)
  - [x] Allow persisted money rows to represent future receipt-sourced records with `source = "receipt"` while Story 2.2 still does not implement receipt capture.
  - [x] Allow `sourceOfTruth = "parsed"` for future receipt-derived rows and set it to `"manual"` on any manual edit.
  - [x] Add nullable `userCorrectedAt` to the money record domain model for manual corrections.
  - [x] Add deterministic planning summary calculation helpers for affected budget periods.
  - [x] Recalculate budget status from active expense records in each affected budget period.
  - [x] Recalculate savings progress from `savings_goals.currentAmountMinor` only. Per user clarification on 2026-05-08, money record edits/deletes must not mutate savings goal current amount.
- [x] Add safe local persistence updates. (AC: 1, 2, 3)
  - [x] Add migration `006_add_money_record_corrections` after migration 005.
  - [x] Migration 006 must be additive and non-destructive.
  - [x] Update `src/data/db/schema.ts` with `user_corrected_at`.
  - [x] Add repository update behavior that validates input, updates record fields, preserves original `source`, sets `source_of_truth = "manual"`, sets `user_corrected_at`, and atomically replaces topic joins.
  - [x] Add repository delete behavior that marks `deleted_at` and `updated_at`; do not hard-delete money records in this story.
  - [x] Add repository period query behavior for active records so budget summary inputs can recalculate after edits/deletes.
- [x] Implement service behavior for edit/delete. (AC: 1, 2, 3)
  - [x] Extend `src/services/money/money-record.service.ts`.
  - [x] Service must open the database, run migrations, require saved preferences, scope to `localWorkspaceId`, and validate active category/topic ids.
  - [x] Edit must load the existing active record first, validate inputs, persist updates, and return recalculated planning summaries for affected periods.
  - [x] Delete must load the existing active record first, soft-delete it, and return recalculated planning summaries for the deleted record's affected period.
  - [x] If a record is missing or already deleted, return a clear `not_found` edit recovery error.
  - [x] Do not implement summary snapshot persistence unless existing code already requires it. No summary cache exists as of Story 2.1.
- [x] Update manual capture UI for edit/delete. (AC: 1, 2)
  - [x] Extend `src/features/capture/useManualMoneyCapture.ts`.
  - [x] Recent money records should be editable from the Capture screen.
  - [x] Editing should populate the existing form, allow cancel, save changes, and show inline validation.
  - [x] Deleting should soft-delete via service and remove the record from visible recent records.
  - [x] Saved/deleted states should use neutral copy and mention planning context was recalculated.
  - [x] Do not implement full history search/filter/sort from Story 2.3.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test domain parsing for receipt source, parsed/manual source-of-truth, and `userCorrectedAt`.
  - [x] Test planning summary recalculation with edited/deleted records, budget status, and manual savings progress.
  - [x] Test migration 006 idempotence and preservation of migrations 001 through 005.
  - [x] Test repository update/delete/period query and atomic topic replacement failure behavior.
  - [x] Test service edit/delete, missing record, receipt-sourced manual correction, affected-period summary recalculation, and active category/topic validation.
  - [x] Test capture state for start edit, cancel edit, save edit, delete, validation errors, and recent-list updates.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Current Repository State

- Story 2.1 added manual money record creation, migration `005_create_money_records`, `money_records`, `money_record_topics`, repository/service access, and a manual capture form.
- Story 2.1 deliberately included `deleted_at` as a future lifecycle field. Story 2.2 should use it for soft delete.
- Story 2.1 persisted manual records with `source = "manual"` and `sourceOfTruth = "manual"`.
- Architecture says every record that may come from automation should include provenance fields such as `source`, `confidence`, `user_corrected_at`, and `source_of_truth`. Story 2.2 should add `user_corrected_at` and manual correction semantics without implementing receipt parsing.
- Story 1.5 stores `savings_goals.currentAmountMinor` as manual current amount.

### User Clarification

- On 2026-05-08, the user clarified: "savings progress vẫn là manual currentAmountMinor".
- Therefore, Story 2.2 recalculates savings progress by re-reading savings goals and running the existing pure savings progress calculation.
- Story 2.2 must not mutate `savings_goals.current_amount_minor` from money record create/edit/delete.

### Scope Boundaries

- Implement edit/delete for existing money records only.
- Do not implement Story 2.3 history search/filter/sort.
- Do not implement Story 2.4 recurring money.
- Do not implement receipt capture, receipt draft tables, parse jobs, receipt line items, OCR, or receipt correction UI.
- Supporting `source = "receipt"` in domain/repository tests is allowed only to preserve future source-of-truth semantics.
- Do not hard-delete money records in this story.
- Do not add diagnostics containing amounts, merchant/source, notes, category/topic ids, or dates.

### Recommended Data Changes

Add nullable correction timestamp:

```text
money_records
  user_corrected_at TEXT
```

Fresh databases should apply migration 005 and then migration 006. Existing local databases with migration 005 should receive migration 006 non-destructively.

### Summary Recalculation Guidance

- For edit:
  - Determine the existing record's budget period from its old `localDate`.
  - Determine the updated record's budget period from its new `localDate`.
  - Recalculate each distinct affected period.
- For delete:
  - Determine the deleted record's budget period from its old `localDate`.
  - Recalculate that period after the soft delete.
- Budget status:
  - Sum active expense records in the affected period using integer minor units.
  - If budget rules exist, use `calculateBudgetStatus`.
  - If no budget rules exist, return `budgetStatus: null`.
- Savings progress:
  - For each active savings goal, use `calculateSavingsGoalProgress` from current manual `currentAmountMinor` and `targetAmountMinor`.
  - Do not write savings goals.
- Summary cache:
  - No `summary_snapshots` persistence exists yet, so no cache invalidation table is required. Return recalculated summary results as service outputs for future surfaces.

### UX and Accessibility Guidance

- Keep Capture fast and utilitarian.
- Recent records can be tapped to edit.
- Form labels remain explicit and inline errors remain field-specific.
- Delete action should use neutral copy such as "Remove from active records" rather than alarming language.
- Do not rely on color alone for saved/deleted/validation states.

### Architecture Compliance

- Domain modules own validation, parsing, and pure recalculation helpers.
- Repositories own SQLite access and transaction boundaries.
- Services own database opening, migrations, saved preference lookup, category/topic validation, workspace scoping, and typed error mapping.
- Feature hooks own form state and screen orchestration.
- React components must not import SQLite clients, Drizzle tables, migrations, or repositories.

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

- Receipt-sourced row can parse with `source = "receipt"` and `sourceOfTruth = "parsed"`.
- Manual edit of receipt-sourced row stores `sourceOfTruth = "manual"` and `userCorrectedAt`.
- Edit validates amount, date, category, topics, merchant/source, and note.
- Edit atomically replaces topic joins.
- Delete marks `deletedAt` and hides deleted records from normal get/list/period queries.
- Period summary recalculates budget status from active expenses only.
- Period summary recalculates savings progress from manual savings goal current amount only and does not mutate savings goals.
- Missing or already-deleted records return `not_found`.

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
  domain/
    money/
      calculations.ts
      money.test.ts
      schemas.ts
      types.ts
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

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.2 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR11, FR12, FR13, FR16, FR17, FR50, NFR-REL-03, NFR-REL-04, NFR-SEC-04, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - provenance/source-of-truth fields, migration strategy, repository boundaries, summary calculation boundaries]
- [Source: `_bmad-output/implementation-artifacts/2-1-create-manual-expense-and-income-records.md` - manual money record schema/service/UI patterns]
- [Source: User clarification, 2026-05-08: savings progress remains manual `currentAmountMinor`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Extend money provenance/domain summary contracts for edit/delete and manual correction behavior.
- Add migration 006 for `user_corrected_at`, update schema/repository methods for update, soft delete, and period queries.
- Extend money service with edit/delete and affected-period planning summary recalculation.
- Extend capture hook/screen with recent-record edit/delete flows.
- Add focused tests and run full verification before marking done.

### Debug Log References

- `npm run typecheck` passed after the first implementation pass and again during final verification.
- `npm test` passed after adding Story 2.2 coverage: 25 suites, 138 tests.
- `npm run lint` initially reported React hook dependency warnings in `useManualMoneyCapture.ts`; fixed with memoized service adapters, then lint passed cleanly.
- `npx expo install --check` passed with dependencies up to date.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.
- Safety review found migration 006 is additive only. The repository uses a scoped `DELETE FROM money_record_topics` only to atomically replace join rows during edit; money records themselves are soft-deleted with `deleted_at`.

### Completion Notes List

- Added money record provenance support for `source = "receipt"`, `sourceOfTruth = "parsed"`, and nullable `userCorrectedAt`.
- Added deterministic planning summary helpers that sum active expenses/income per affected budget period, calculate budget status, and read savings progress from manual `savings_goals.currentAmountMinor` without mutating savings goals.
- Added non-destructive migration `006_add_money_record_corrections` and updated schema/repository mappings for `user_corrected_at`.
- Added repository update, soft delete, active period query, and atomic topic replacement behavior.
- Added service edit/delete flows that open local data, run migrations, require saved preferences, validate active category/topic ids, preserve receipt source, set manual source of truth on edit, and return recalculated planning summaries.
- Extended Capture state/UI so recent records can be tapped to edit, cancelled, saved, or removed from active records with neutral recalculation copy.
- Did not implement Story 2.3 history search/filter/sort, receipt capture/parsing, summary snapshot persistence, or automatic savings-goal current amount updates.

### File List

- `_bmad-output/implementation-artifacts/2-2-edit-and-delete-money-records-with-summary-recalculation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-2.2-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/money-records.repository.test.ts`
- `src/data/repositories/money-records.repository.ts`
- `src/domain/money/calculations.ts`
- `src/domain/money/money.test.ts`
- `src/domain/money/schemas.ts`
- `src/domain/money/types.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/capture/useManualMoneyCapture.test.ts`
- `src/features/capture/useManualMoneyCapture.ts`
- `src/services/money/money-record.service.test.ts`
- `src/services/money/money-record.service.ts`

## Change Log

- 2026-05-08: Created and started Story 2.2 with user clarification that savings progress remains manual current amount.
- 2026-05-08: Implemented Story 2.2 edit/delete persistence, summary recalculation, Capture UI updates, focused tests, verification, and self-review.
