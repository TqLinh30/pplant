# Story 2.5: Create Work-Hour And Shift Entries

Status: done

## Story

As a part-time-working student,
I want to record direct work hours and detailed shifts,
so that Pplant can calculate earned income and work-time context.

## Acceptance Criteria

1. Given I start work entry capture, when I enter direct hours or shift start/end/break values, then the work entry is saved locally, and paid/unpaid status and wage used for the entry are recorded.
2. Given I override the default wage for one entry, when the entry is saved, then the override applies only to that entry, and historical wage snapshots are preserved.
3. Given a shift crosses midnight, when earned income and work duration are calculated, then local timezone and date-boundary rules are applied correctly, and the result is testable outside UI.

## Tasks / Subtasks

- [x] Define work-entry domain contracts and deterministic calculations. (AC: 1, 2, 3)
  - [x] Support direct-hour entries and shift entries as distinct entry modes.
  - [x] Store durations as integer minutes and money as integer minor units.
  - [x] Calculate net shift duration from start/end local date-time values minus break minutes.
  - [x] Allow shifts that cross midnight by requiring explicit start and end local dates.
  - [x] Calculate earned income from net paid minutes and the entry wage snapshot using deterministic rounding to nearest minor unit.
  - [x] Preserve historical wage snapshots and wage source per entry.
- [x] Add safe work-entry persistence. (AC: 1, 2, 3)
  - [x] Add migration 008 with an additive `work_entries` table and indexes.
  - [x] Preserve existing data and migrations; no destructive database changes.
  - [x] Store entry mode, local date, duration, shift local date/time fields, break minutes, paid status, wage snapshot, earned income, category, topics, note, source, source-of-truth, timestamps, and soft-delete state.
  - [x] Add `work_entry_topics` for optional topic tags.
- [x] Add work-entry repository and service behavior. (AC: 1, 2, 3)
  - [x] Create, edit, soft-delete, list recent entries, and load capture data.
  - [x] Require saved preferences and use default hourly wage unless the entry has an override.
  - [x] Validate active category/topic ids using existing category/topic rules.
  - [x] Keep wage override scoped to the saved entry only.
  - [x] Return typed `AppResult` errors and avoid logging sensitive work/income details.
- [x] Add work-entry capture UI surface. (AC: 1, 2)
  - [x] Add a focused hook for work entry loading, form state, editing, validation, and action state.
  - [x] Add a capture screen section for direct hours and shift entry using existing primitives.
  - [x] Provide entry-mode controls, paid/unpaid controls, wage override, category/topic selection, note, save/edit/delete, and recent entry list.
  - [x] Keep this story scoped to work-entry capture only; do not implement work history, work-time expense equivalents, summaries, recurring work, tasks, reminders, receipts, or notifications.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test work duration and earned-income calculations for direct hours, paid/unpaid entries, wage override, break subtraction, and cross-midnight shifts.
  - [x] Test migration 008 preserves existing data and adds work entry tables/indexes.
  - [x] Test repository create/edit/delete/list behavior with wage snapshots and topics.
  - [x] Test service validation, missing preferences, default wage, override wage, category/topic validation, and soft delete.
  - [x] Test hook load/create/edit/delete validation flows.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement work-hour and shift capture only.
- Do not implement Story 2.6 work history aggregation or search/filter/review.
- Do not implement Story 2.7 expense-to-work-time equivalents.
- Do not create money records from work entries in this story; earned income is stored on `work_entries` for later work history/summary stories.
- Do not implement recurring work shifts, payroll periods, taxes, tips, overtime, multiple jobs, or notification scheduling.
- Do not log wage, earned income, dates, categories, topics, or notes to diagnostics.

### Current Repository State

- Story 1.3 stores default hourly wage in preferences as integer minor units and currency code.
- Story 1.4 categories and topics are shared optional context. Category/topic repositories validate active items.
- Stories 2.1-2.4 established local money record repository/service/hook patterns, source/source-of-truth provenance, soft-delete, migrations, and capture UI conventions.
- Existing `src/domain/work` and `src/features/work/WorkEntryForm.tsx` are skeletons only and can be replaced within this story scope.

### Required Data Model

Use additive migration 008:

- `work_entries`
  - `id`, `workspace_id`
  - `entry_mode`: `hours` or `shift`
  - `local_date`: local date used for primary grouping and recent display
  - `duration_minutes`: net work duration after break
  - `started_at_local_date`, `started_at_local_time`
  - `ended_at_local_date`, `ended_at_local_time`
  - `break_minutes`
  - `paid`: integer boolean 0/1
  - `wage_minor_per_hour`, `wage_currency_code`, `wage_source`: `default` or `override`
  - `earned_income_minor`
  - `category_id`, `note`
  - `source`: `manual`
  - `source_of_truth`: `manual`
  - `created_at`, `updated_at`, `deleted_at`
- `work_entry_topics`
  - `work_entry_id`, `topic_id`, `workspace_id`, `created_at`

Recommended indexes:

- `idx_work_entries_workspace_date`
- `idx_work_entries_workspace_mode`
- `idx_work_entry_topics_entry`

### Work Calculation Semantics

- Local dates use `YYYY-MM-DD`.
- Local times use 24-hour `HH:MM`.
- Direct-hour entries require a local date and positive duration minutes.
- Shift entries require start local date/time and end local date/time. End must be after start, and it may be on the next local date for cross-midnight shifts.
- Break minutes must be non-negative and less than total shift minutes.
- Net duration is total shift minutes minus break minutes.
- Paid entries calculate `earnedIncomeMinor = Math.round(durationMinutes * wageMinorPerHour / 60)`.
- Unpaid entries preserve paid status and wage snapshot but store `earnedIncomeMinor = 0`.
- Wage defaults come from saved preferences. A wage override applies only to that entry and is stored as its own snapshot.
- All amounts and wages are integer minor units; no floating-point money values are persisted.

### Architecture Compliance

- Domain modules own work-entry types, validation, and pure calculations.
- Repositories own SQLite persistence, transactions, soft delete, and topic joins.
- Services own database opening, migrations, saved preferences, workspace scoping, active category/topic validation, default wage application, and typed error mapping.
- Feature hooks own UI state and call services.
- React components must not import SQLite clients, Drizzle tables, migrations, or repositories.

### UX Guidance

- Keep work capture calm and compact on the Capture screen.
- Use segmented controls for entry mode and paid/unpaid state.
- Use date/time text fields with helper copy for `YYYY-MM-DD` and `HH:MM`.
- Show calculated duration and earned income after save in neutral language.
- Show recent work entries with mode, date, duration, paid/unpaid, wage source, and earned income.
- Do not use financial-advice language or imply that an unpaid entry is a mistake.

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

Minimum coverage:

- Direct hours and shift calculation.
- Cross-midnight shift duration.
- Break subtraction and invalid break bounds.
- Paid/unpaid earned-income behavior.
- Default wage and override wage snapshots.
- Migration 008 preserves existing data.
- Repository create/edit/delete/list behavior.
- Service validation for preferences, categories, topics, and wage input.
- Hook flow for load, create, edit, delete, and validation.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.5 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR26, FR27, FR28, FR29, NFR-REL-05, NFR-SEC-01, NFR-SEC-04, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - work domain/repository ownership, SQLite repositories, local-first persistence, date/time correctness]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - work entry form, wage override optional metadata, neutral copy, capture patterns]
- [Source: `_bmad-output/implementation-artifacts/2-4-manage-recurring-expenses-and-income.md` - additive migration, repository/service/hook/UI patterns]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Replace work skeletons with domain types, schemas, and pure duration/income calculations.
- Add additive migration 008 and Drizzle schema mappings for work entries and topics.
- Add a work-entry repository and service following existing money/category/preferences patterns.
- Add a focused work-entry hook and Capture screen section.
- Add domain, migration, repository, service, and hook tests, then run full verification.

### Debug Log References

- 2026-05-08: Replaced work skeletons with work-entry types, schemas, and pure duration/earned-income calculations.
- 2026-05-08: Added migration 008, Drizzle schema mappings, work-entry repository, service, and capture hook.
- 2026-05-08: Added Work Entry section to Capture via `WorkEntryForm`, including direct hours, shift capture, paid/unpaid, wage override, category/topic, edit, and delete flows.
- 2026-05-08: Ran full verification: typecheck, lint, test, expo install check, build-if-present, and diff whitespace check.

### Completion Notes List

- Work entries now store direct-hour or shift mode, net duration minutes, wage snapshot, wage source, paid status, earned income, optional category/topics, note, provenance, and soft-delete state.
- Shift calculations use explicit local start/end date and time strings, allowing cross-midnight shifts without runtime timezone dependence.
- Paid entries calculate earned income from integer minutes and integer wage minor units; unpaid entries preserve wage context and store zero earned income.
- Work entries do not create money records in this story; work history, summaries, and expense work-time equivalents remain future scoped stories.

### File List

- `_bmad-output/implementation-artifacts/2-5-create-work-hour-and-shift-entries.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/work-entries.repository.ts`
- `src/data/repositories/work-entries.repository.test.ts`
- `src/domain/work/types.ts`
- `src/domain/work/schemas.ts`
- `src/domain/work/work-time.ts`
- `src/domain/work/work.test.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/work/WorkEntryForm.tsx`
- `src/features/work/useWorkEntryCapture.ts`
- `src/features/work/useWorkEntryCapture.test.ts`
- `src/services/work/work-entry.service.ts`
- `src/services/work/work-entry.service.test.ts`

## Change Log

- 2026-05-08: Created Story 2.5 from Epic 2 work-income tracking requirements.
- 2026-05-08: Implemented work-hour and shift capture, persistence, service, UI, tests, and verification.
