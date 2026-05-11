# Story 2.6: Review Work History And Earned Income

Status: done

## Story

As a part-time-working student,
I want to review work hours and income by day, week, and month,
so that I can understand how much effort produced my money.

## Acceptance Criteria

1. Given work entries exist, when I open work history, then I can view hours and earned income by day, week, and month, and wage snapshots are preserved in historical records.
2. Given I search or filter work history, when I filter by date range or relevant work fields, then matching entries are shown, and totals update consistently.
3. Given work entries are edited or deleted, when work totals and summary inputs recalculate, then earned income, hours, and derived work summary inputs update deterministically.

## Tasks / Subtasks

- [x] Define work-history domain contracts and summary calculations. (AC: 1, 2, 3)
  - [x] Add history query, sort, page, and summary types for work entries.
  - [x] Summarize work duration minutes and earned income by day, Monday-start week, and month.
  - [x] Preserve wage snapshot details per listed record.
  - [x] Exclude soft-deleted work entries from history and summaries.
- [x] Add work-history repository behavior. (AC: 1, 2, 3)
  - [x] Add filtered/paginated history queries to the work entry repository.
  - [x] Support date range, entry mode, paid/unpaid, category, topic, and note search filters.
  - [x] Support deterministic sort orders by date, duration, and earned income.
  - [x] Keep topic joins and total counts consistent with active, filtered rows.
- [x] Add work-history service and feature state. (AC: 1, 2, 3)
  - [x] Load preferences, categories, topics, filtered work records, pages, and summaries.
  - [x] Validate filters with typed `AppResult` errors.
  - [x] Add a focused hook for filters, sort, summary mode, loading, pagination, and errors.
  - [x] Recalculate summaries from current repository results after edits/deletes by reading current active data.
- [x] Add work-history UI surface. (AC: 1, 2)
  - [x] Add a work-history section to the History screen using existing primitives.
  - [x] Provide day/week/month summary controls.
  - [x] Provide filters for date range, mode, paid state, category, topic, note search, and sort.
  - [x] Show records with duration, earned income, paid state, wage source, and wage snapshot.
  - [x] Keep this story scoped to reviewing existing work entries; do not implement work-entry editing here, work-time expense equivalents, weekly review reflections, recurring work, tasks, reminders, receipts, or notifications.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test summary grouping for day/week/month and deleted-entry exclusion.
  - [x] Test repository filters, sorting, pagination, and total counts.
  - [x] Test service validation, missing preferences, summary recalculation, and category/topic loading.
  - [x] Test hook filter/apply/clear/load-more flows.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement work history review only.
- Do not implement work-entry editing inside history; Story 2.5 capture remains the edit/delete surface.
- Do not implement Story 2.7 expense impact as work-time context.
- Do not create or modify money records from work history.
- Do not add payroll, tax, tips, overtime, recurring work, tasks, reminders, receipts, notifications, or weekly reflection features.
- Do not log wage, earned income, dates, categories, topics, or notes to diagnostics.

### Current Repository State

- Story 2.5 added `work_entries`, `work_entry_topics`, work domain validation/calculations, repository create/edit/delete/recent list, work-entry service, capture hook, and Capture UI.
- Work entries store integer duration minutes, integer wage minor units, `earnedIncomeMinor`, paid state, wage source, wage currency, soft-delete, category, topics, and local dates.
- Money History already provides a useful pattern for filtered history service/hook/UI in `src/services/money/money-history.service.ts`, `src/features/history/useMoneyHistory.ts`, and `src/features/history/HistoryScreen.tsx`.

### Work History Semantics

- History lists only active work entries (`deletedAt === null`).
- Date filtering uses `work_entries.local_date`.
- Entry-mode filters are `hours`, `shift`, or all.
- Paid-state filters are `paid`, `unpaid`, or all.
- Note search is case-insensitive over `note`.
- Topic filtering uses `work_entry_topics`.
- Summary modes are exactly `day`, `week`, and `month`.
- Week summaries use the existing Monday-start rule (`defaultWeekStartsOn = 1`).
- Summary rows include total duration minutes, total earned income minor, paid duration minutes, unpaid duration minutes, and record count.
- Wage snapshots are not recomputed from preferences in history; listed records show stored wage source, wage amount, and wage currency.

### Architecture Compliance

- Domain modules own work-history types and pure summary grouping.
- Repositories own SQLite filtering, pagination, sorting, and topic joins.
- Services own database opening, migrations, saved preferences, workspace scoping, filter validation, and typed error mapping.
- Feature hooks own UI state and call services.
- React components must not import SQLite clients, migrations, or repositories.

### UX Guidance

- Add work history to the existing History tab as a separate section below money history.
- Keep the work section operational and calm; avoid heavy dashboard composition.
- Use segmented controls for summary mode, entry mode, paid state, and sort.
- Use text fields for dates and note search.
- Show empty, loading, filters-active, failed, and preferences-needed states with neutral copy.
- Show wage snapshots as context, not advice.

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

- Day/week/month summary grouping.
- Deleted-entry exclusion.
- Date, mode, paid, category, topic, and note filters.
- Sort by newest/oldest, duration, and earned income.
- Pagination and total counts.
- Service missing preferences and invalid filter validation.
- Hook load, filter, clear, and load-more flows.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.6 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR28, FR30, FR32, NFR-REL-04, NFR-REL-05, NFR-SEC-01, NFR-SEC-04, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - work domain/repository ownership, history/review surfaces, summary determinism]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - history filters, work-income context, calm review copy]
- [Source: `_bmad-output/implementation-artifacts/2-5-create-work-hour-and-shift-entries.md` - work-entry data model and calculation semantics]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Extend work domain with history query/page/summary types and pure grouping calculations.
- Extend work-entry repository with filtered history queries and topic-aware counts.
- Add work-history service and hook following money-history patterns.
- Add a work-history panel to the History screen.
- Add domain, repository, service, hook tests, then run full verification.

### Debug Log References

- 2026-05-08: Added work-history query/page/sort types and pure day/week/month summary grouping.
- 2026-05-08: Added filtered, paginated, topic-aware work-history repository queries and counts.
- 2026-05-08: Added work-history service and hook for filters, sort, summary mode, loading, pagination, and typed errors.
- 2026-05-08: Added `WorkHistoryPanel` to the History screen using existing primitives.
- 2026-05-08: Ran full verification: typecheck, lint, test, expo install check, build-if-present, and diff whitespace check.

### Completion Notes List

- Work history now lists active work entries with date/mode/paid/category/topic/note filters, deterministic date/duration/earned sorting, pagination, and total counts.
- Summaries recalculate from current active repository results for day, Monday-start week, and month groupings.
- Historical wage snapshots are shown from each work entry's stored wage amount, wage currency, and wage source; preferences are used only for formatting context.
- The History screen now has a separate work-history review section; editing work entries and expense work-time equivalents remain future-story scope.

### File List

- `_bmad-output/implementation-artifacts/2-6-review-work-history-and-earned-income.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-2.6-review.md`
- `src/data/repositories/work-entries.repository.ts`
- `src/data/repositories/work-entries.repository.test.ts`
- `src/domain/work/types.ts`
- `src/domain/work/work-history.ts`
- `src/domain/work/work.test.ts`
- `src/features/history/HistoryScreen.tsx`
- `src/features/work/WorkHistoryPanel.tsx`
- `src/features/work/useWorkHistory.ts`
- `src/features/work/useWorkHistory.test.ts`
- `src/services/work/work-history.service.ts`
- `src/services/work/work-history.service.test.ts`

## Change Log

- 2026-05-08: Created Story 2.6 from Epic 2 work-history requirements.
- 2026-05-08: Implemented work-history summaries, repository filters, service/hook state, History UI, tests, and verification.
