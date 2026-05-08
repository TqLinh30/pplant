# Story 2.4: Manage Recurring Expenses And Income

Status: done

## Story

As a student,
I want to create and manage recurring expenses and income,
so that predictable money events do not need to be rebuilt manually.

## Acceptance Criteria

1. Given I create a recurring money item, when I choose daily, weekly, or monthly recurrence, then Pplant saves a recurrence rule, and future occurrences can be generated consistently.
2. Given a recurring money item exists, when I edit, pause, skip one occurrence, stop, or delete it, then the selected action affects the correct occurrence or series, and history and summaries remain consistent.
3. Given a recurrence crosses timezone, week-start, or month-boundary conditions, when occurrences are generated, then date rules are deterministic, and test coverage verifies boundary behavior.

## Tasks / Subtasks

- [x] Define recurrence domain contracts and deterministic date rules. (AC: 1, 2, 3)
  - [x] Extend recurrence types for daily, weekly, and monthly money recurrence rules.
  - [x] Add pure occurrence generation bounded by local date range and count.
  - [x] Clamp monthly occurrences to the last valid day when the anchor day exceeds the target month length.
  - [x] Apply Monday-start week semantics for weekly recurrence by adding 7 local-calendar days from the anchor date.
  - [x] Exclude skipped occurrence dates and dates after stop/end dates.
- [x] Add safe recurring-money persistence. (AC: 1, 2)
  - [x] Add migration 007 with `recurrence_rules`, `recurrence_exceptions`, and additive money-record recurrence link columns.
  - [x] Preserve existing money records and migrations; no destructive database changes.
  - [x] Store rule templates with integer minor units, currency code, kind, date, category, topics, merchant/source, and note.
  - [x] Store skip-one-occurrence as an exception row even before a money record exists.
  - [x] Link generated records with `recurrence_rule_id` and `recurrence_occurrence_date`.
- [x] Add recurring-money repository and service behavior. (AC: 1, 2, 3)
  - [x] Create, update, pause/resume, stop, soft-delete, skip occurrence, list rules, preview occurrences, and generate due occurrences.
  - [x] Require saved preferences and validate category/topic ids using existing active-item rules.
  - [x] Do not materialize all future records; only create due or explicitly generated occurrences.
  - [x] Use `source = "recurring"` and `sourceOfTruth = "manual"` for generated records.
  - [x] Keep already materialized records unchanged when a series is edited; edits affect future unmaterialized occurrences.
  - [x] Return typed `AppResult` errors and avoid logging sensitive money details.
- [x] Add recurring-money UI surface. (AC: 1, 2)
  - [x] Add a focused hook for recurring money loading, form state, action state, previews, and generation.
  - [x] Add a screen section for creating and managing recurring money items using existing primitives.
  - [x] Provide daily/weekly/monthly segmented controls, neutral status copy, pause/resume, skip next, stop, delete, and generate due actions.
  - [x] Keep this story scoped to recurring money only; do not implement recurring tasks, reminders, notification scheduling, work entries, or receipt recurrence.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test recurrence generation for daily, weekly, monthly, leap day/month clamp, stop/end, and skips.
  - [x] Test migration 007 preserves existing data and adds recurrence tables/link columns.
  - [x] Test repository create/update/actions/generate behavior with fakes.
  - [x] Test service validation, missing preferences, active category/topic rules, due generation, and duplicate prevention.
  - [x] Test hook load/create/action flows.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### User-Approved Product Decisions

- Do not create all future `money_records` when a recurring money rule is saved.
- Materialize records only when occurrences are due or when the user explicitly triggers generation.
- Add `recurrence_rule_id` and `recurrence_occurrence_date` metadata to generated `money_records`.
- Generated recurring records use `source = "recurring"` and `sourceOfTruth = "manual"`.
- Editing a series affects future unmaterialized occurrences only; already materialized records remain unchanged unless the user edits those records directly.
- Skip/delete one occurrence must be represented by an exception row even before a generated `money_record` exists.

### Current Repository State

- Story 2.1 added manual money capture, `money_records`, `money_record_topics`, and manual record service behavior.
- Story 2.2 added edit/delete, active period summary recalculation, `source`, `sourceOfTruth`, soft delete, `userCorrectedAt`, and savings progress reading from manual `savings_goals.currentAmountMinor`.
- Story 2.3 added money history querying, pagination, summaries, and the History screen. History hides soft-deleted records and can display generated recurring records once they are materialized.
- `src/domain/recurrence` and `src/features/recurrence/RecurrenceControl.tsx` exist as minimal skeletons only.
- No `recurrence_rules` repository exists yet.

### Scope Boundaries

- Implement recurring expenses/income only.
- Do not implement recurring tasks, habits, reminders, notification scheduling, work entries, receipt recurrence, receipt parsing, Today overview integration, recurring savings events, or automatic background jobs.
- Do not schedule local notifications from recurring money rules.
- Do not generate future records indefinitely or without a bounded date/count.
- Do not mutate manual savings-goal current amounts from recurring money generation.
- Do not log merchant/source, notes, amounts, category/topic ids, or dates to diagnostics.

### Required Data Model

Use additive migration 007:

- `recurrence_rules`
  - `id`, `workspace_id`, `owner_kind`, `frequency`, `starts_on_local_date`, `ends_on_local_date`, `last_generated_local_date`, `paused_at`, `stopped_at`, `deleted_at`, `created_at`, `updated_at`
  - money template fields: `money_kind`, `amount_minor`, `currency_code`, `category_id`, `merchant_or_source`, `note`
  - owner/source fields: `source`, `source_of_truth`
- `recurrence_rule_topics`
  - `recurrence_rule_id`, `topic_id`, `workspace_id`, `created_at`
- `recurrence_exceptions`
  - `id`, `recurrence_rule_id`, `workspace_id`, `occurrence_local_date`, `action`, `money_record_id`, `created_at`, `updated_at`
- `money_records`
  - add nullable `recurrence_rule_id`
  - add nullable `recurrence_occurrence_date`

Recommended indexes:

- `idx_recurrence_rules_workspace_owner_active`
- `idx_recurrence_rules_workspace_due`
- `idx_recurrence_rule_topics_rule`
- `idx_recurrence_exceptions_rule_date`
- `idx_money_records_recurrence_occurrence`

### Recurrence Semantics

- Frequency options are exactly `daily`, `weekly`, and `monthly`.
- Date inputs are local dates (`YYYY-MM-DD`) validated with `asLocalDate`.
- Daily recurrence increments by one local calendar day.
- Weekly recurrence increments by seven local calendar days from the anchor date; this is deterministic and independent of runtime timezone.
- Monthly recurrence preserves the start-date day as the anchor when possible and clamps to the last day for shorter months. Example: `2026-01-31` produces `2026-02-28`, `2026-03-31`, `2026-04-30`.
- A rule with `paused_at` or `deleted_at` does not generate occurrences. A rule with `stopped_at` generates no occurrences after the stop date.
- `ends_on_local_date` is inclusive.
- Skip-one occurrence writes a `recurrence_exceptions` row with action `skip`; generated occurrences exclude that date.
- Duplicate prevention: generation must not create a second active money record for the same `recurrence_rule_id` and `recurrence_occurrence_date`.

### Architecture Compliance

- Domain modules own recurrence types, validation, and pure date generation.
- Repositories own SQLite persistence, migrations, transactions, and duplicate prevention.
- Services own database opening, migrations, saved preferences, workspace scoping, active category/topic validation, and typed error mapping.
- Feature hooks own UI state and call services.
- React components must not import SQLite clients, Drizzle tables, migrations, or repositories.

### UX Guidance

- Keep the surface calm and operational, not a dense finance dashboard.
- Use segmented controls for recurrence frequency and kind.
- Use neutral status copy: "Paused", "Stopped", "Skipped next occurrence", "No due occurrences".
- Use clear action labels: "Generate due", "Pause", "Resume", "Skip next", "Stop series", "Delete series".
- Do not rely on color alone for paused/stopped/due states.
- Show previews as dates, not as generated records, until materialized.

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

- Daily/weekly/monthly occurrence generation.
- Month-end clamp and leap-day behavior.
- Pause, stop, delete, skip, and end date exclusion.
- Migration 007 preserves existing data and supports recurrence metadata.
- Repository duplicate prevention for generated records.
- Service validation for preferences, category/topic ids, and due generation.
- Hook flow for load, create, pause/resume, skip, stop/delete, and generate due.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.4 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR14, FR15, FR16, NFR-REL-04, NFR-REL-05, NFR-REL-07, NFR-SEC-01, NFR-SEC-04, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - recurrence domain, SQLite repositories, migrations, provenance, repository boundaries]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - recurrence controls, neutral recovery copy, form patterns, accessibility]
- [Source: `_bmad-output/implementation-artifacts/2-3-search-filter-sort-and-review-money-history.md` - money history visibility, soft-delete filtering, summary behavior]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Extend pure recurrence generation first, including local-date arithmetic and skip/stop/end behavior.
- Add additive migration 007 plus schema mappings for recurrence rules, topics, exceptions, and generated money record metadata.
- Add a recurrence repository and service that validate preferences/category/topic state, manage rules/actions, and materialize only due/explicitly generated occurrences.
- Add a focused recurring-money hook and UI section using existing primitives.
- Add domain, migration, repository, service, and hook tests, then run full verification.

### Debug Log References

- 2026-05-08: Added recurrence domain model and pure occurrence generator with deterministic local-date daily, weekly, monthly, clamp, end, stop, skip, and bounded count behavior.
- 2026-05-08: Added migration 007 and repositories/services for recurrence rules, exceptions, generated record provenance, duplicate prevention, and due occurrence materialization.
- 2026-05-08: Added recurring money hook and Capture screen section with save/edit/pause/resume/skip/stop/delete/generate due actions.
- 2026-05-08: Ran full verification: typecheck, lint, test, expo install check, build-if-present, and diff whitespace check.

### Completion Notes List

- Recurring money rules are stored as templates and do not create future `money_records` on save.
- Due generation creates only bounded due records, links them with `recurrence_rule_id` and `recurrence_occurrence_date`, and uses `source = "recurring"` plus `sourceOfTruth = "manual"`.
- Skip next writes a recurrence exception before any money record exists; series edits preserve already materialized records by carrying `lastGeneratedLocalDate`.
- UI now shows recurring money creation, previews, neutral action copy, and series controls on the Capture screen.

### File List

- `_bmad-output/implementation-artifacts/2-4-manage-recurring-expenses-and-income.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/money-records.repository.ts`
- `src/data/repositories/money-records.repository.test.ts`
- `src/data/repositories/recurrence-rules.repository.ts`
- `src/data/repositories/recurrence-rules.repository.test.ts`
- `src/domain/common/date-rules.ts`
- `src/domain/money/types.ts`
- `src/domain/money/schemas.ts`
- `src/domain/money/money.test.ts`
- `src/domain/recurrence/types.ts`
- `src/domain/recurrence/schemas.ts`
- `src/domain/recurrence/generate-occurrences.ts`
- `src/domain/recurrence/recurrence.test.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/capture/useManualMoneyCapture.test.ts`
- `src/features/capture/useRecurringMoney.ts`
- `src/features/capture/useRecurringMoney.test.ts`
- `src/services/money/money-record.service.test.ts`
- `src/services/money/money-history.service.test.ts`
- `src/services/money/recurring-money.service.ts`
- `src/services/money/recurring-money.service.test.ts`

## Change Log

- 2026-05-08: Created Story 2.4 with user-approved recurring money materialization and exception decisions.
- 2026-05-08: Implemented recurring expenses/income rules, persistence, services, UI, tests, and review artifacts.
