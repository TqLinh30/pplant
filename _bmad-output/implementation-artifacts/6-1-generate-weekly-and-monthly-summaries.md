# Story 6.1: Generate Weekly And Monthly Summaries

Status: done

## Story

As a student,
I want weekly and monthly summaries across money, work, tasks, reminders, budget, and savings,
so that I can understand where my time and money went.

## Acceptance Criteria

1. Given records exist for a week or month, when I open the review, then Pplant shows spending, income, work hours, budget, savings, completed tasks, missed tasks, and reminders, and summary calculations are deterministic.
2. Given the standard MVP dataset exists, when weekly or monthly summaries load, then load performance meets the P95 target, and summary logic is testable without mobile UI.
3. Given records are added, edited, deleted, or migrated, when summaries recalculate, then results are consistent from the same source dataset, and stale cached summaries are invalidated.

## Tasks / Subtasks

- [x] Add period summary domain calculations. (AC: 1, 2, 3)
  - [x] Replace the current `weekly-summary.ts` and `monthly-summary.ts` stubs with reusable pure calculation functions or a shared `period-summary.ts` module.
  - [x] Define deterministic week and month period inputs using existing local-date helpers; week start must use the established `defaultWeekStartsOn` rule unless preferences later add an override.
  - [x] Aggregate active money records into spending, income, net amount, counts, and period records without using floating point money values.
  - [x] Aggregate active work entries into total minutes, earned income minor units, paid/unpaid counts, and entry counts.
  - [x] Aggregate direct tasks and virtual recurring task/habit occurrences into completed, open, missed/overdue, skipped, and total counts.
  - [x] Aggregate reminder occurrences and recovery states into scheduled/open, missed/recovery, disabled/unavailable/permission-denied, and total counts.
  - [x] Include budget status and savings goal progress by reusing existing budget/savings calculation helpers.
  - [x] Return partial/no-data flags for each section and neutral display labels only; do not generate advice, predictions, causal claims, or optimization recommendations.

- [x] Add review summary service orchestration. (AC: 1, 2, 3)
  - [x] Add a service under `src/services/summaries` that opens/migrates the local database, loads preferences, resolves the requested weekly or monthly period, loads existing repositories, and returns typed `AppResult`.
  - [x] Reuse existing repositories for money, work, tasks, task recurrence, reminders, budget rules, and savings goals. React components must not import SQLite clients, Drizzle schema, or migrations.
  - [x] Build recurring task/habit and reminder virtual occurrences for the whole period using existing recurrence helpers and exception/completion tables.
  - [x] Keep summaries source-of-truth driven. If no durable summary cache exists or deterministic invalidation is not already implemented, compute from repositories on demand and expose a `cacheStatus: 'fresh_from_source'` or equivalent; do not add a cache table just for this story.
  - [x] If an existing cache/snapshot table is present, only use it when invalidation after add/edit/delete/migration is deterministic and covered by tests.

- [x] Expose weekly/monthly summaries in Review. (AC: 1)
  - [x] Add review feature state/hook support for selecting a weekly or monthly period while preserving the existing end-of-day review behavior.
  - [x] Update `ReviewScreen.tsx` or a review-owned child component so it shows weekly/monthly summary sections for money, work, tasks/habits, reminders, budget, and savings.
  - [x] Use existing UI primitives (`SegmentedControl`, `StatusBanner`, `ListRow`, `Button` where appropriate) and follow `DESIGN.md`.
  - [x] Ensure loading, empty, preferences-needed, failed, and partial-data states have a clear next action or neutral explanation.
  - [x] Keep copy neutral: "Recorded this period", "No task activity in this period", "Review data is partial" are acceptable; avoid shame, advice, prediction, or financial-advice language.

- [x] Preserve boundaries, privacy, and data safety. (AC: 1, 2, 3)
  - [x] Do not change authentication, authorization, cloud sync, bank/payment integrations, receipt OCR provider behavior, or data deletion workflows.
  - [x] Do not create destructive migrations or rewrite existing money/work/task/reminder modules.
  - [x] Do not log spending details, income values, task contents, reminder text, reflections, receipt data, or raw payload JSON to diagnostics.
  - [x] Preserve manual corrections and saved records as source of truth; derived summaries must not write back into source records.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Add domain tests for weekly/monthly period boundaries, month transitions, leap days, deleted-record exclusion, deterministic sorting/counting, budget status, savings progress, and no-data states.
  - [x] Add service tests proving repository period queries, recurrence occurrence generation across the period, preferences-needed errors, open-database errors, and on-demand recomputation after changed inputs.
  - [x] Add hook/UI state tests where reasonable for weekly/monthly mode, loading/empty/failed/preferences-needed states, and non-color-only status labels.
  - [x] Add a lightweight standard MVP dataset performance guard for the pure calculation path using `standardMvpDatasetCounts` or a generated non-sensitive fixture shape that does not slow the normal test suite.
  - [x] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 6.1 owns deterministic weekly and monthly summary facts only. Story 6.2 owns reflection-only relationship copy, Story 6.3 owns prompts/reflection persistence, Story 6.4 owns reflection history/muting, and Story 6.5 owns final review accessibility polish.
- This story may update the Review surface enough to show weekly/monthly summaries, but it must not implement reflection prompts, insight muting, historical reflection storage, or new advice/optimization content.
- Durable `summary_snapshots` caching is optional in the architecture, not mandatory for this story. Computing from repositories on demand is the safer MVP approach unless an existing cache is already present with deterministic invalidation.
- No database migration should be required for MVP on-demand summaries. Stop if implementation appears to require destructive schema changes or ambiguous cache invalidation.

### Current Repository State

- `src/domain/summaries/weekly-summary.ts` and `src/domain/summaries/monthly-summary.ts` currently only define input type stubs.
- `src/domain/summaries/today-summary.ts` and `src/domain/summaries/end-of-day-review.ts` already implement pure summary aggregation patterns and list caps.
- `src/services/summaries/today.service.ts` and `src/services/summaries/end-of-day-review.service.ts` already show repository orchestration, local database opening, migration, preference loading, recurrence occurrence generation, and typed `AppResult` error handling.
- `src/features/review/ReviewScreen.tsx` currently renders the end-of-day review. Extend this feature area rather than creating a new route group unless absolutely necessary.
- `src/features/review/useEndOfDayReview.ts` provides reducer-style load/saving states. Reuse this state pattern for period reviews.
- Existing repository methods can load money records by exclusive period, work entries by date range, all summary tasks, task recurrence rules/exceptions/completions, reminders/exceptions, budget rules, and savings goals.
- `src/data/fixtures/standard-mvp-dataset.ts` currently exposes counts only. Any generated benchmark data for tests must be non-sensitive and lightweight enough for normal Jest runs.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add a shared pure domain module such as `src/domain/summaries/period-summary.ts`, then have `weekly-summary.ts` and `monthly-summary.ts` re-export specific helpers/types to avoid duplicated logic.
- Add period helpers in the summary domain or use existing `date-rules.ts` helpers. If a new helper is needed, keep it pure, typed, and covered by date-boundary tests.
- Suggested summary shape:
  - `period`: `{ kind: 'week' | 'month', startDate, endDateExclusive, label }`
  - `money`: expense/income/net minor units, counts, record count
  - `work`: minutes, earned income minor units, paid/unpaid counts
  - `tasks`: completed direct tasks, completed recurring occurrences, open, missed/overdue, skipped, total
  - `reminders`: scheduled/open occurrences, missed/recovery, disabled/unavailable/permission-denied, total
  - `budget`: existing budget status for the same period or the active budget period that overlaps the review date, with explicit period metadata
  - `savings`: existing savings goal progress summaries
  - `partial`: booleans for money, work, tasks, reminders, budget, savings
  - `cacheStatus`: `fresh_from_source` unless an existing deterministic cache is used
- For weekly summaries, resolve the containing week from the selected local date using `defaultWeekStartsOn` and a seven-day exclusive end.
- For monthly summaries, resolve the calendar month from the selected local date. Do not use monthly budget reset day as the calendar summary boundary; include budget-period metadata separately if needed.
- For budget status, reuse `calculateMoneyPlanningPeriodSummary` and `resolveBudgetPeriodForDate` for the relevant selected date so Story 1.5 reset-day decisions remain intact.
- For reminders and recurring task/habit counts, generate occurrences from `period.startDate` through `period.endDateExclusive - 1` using existing builders and their exception/completion data.
- Keep list sizes bounded if UI displays sample records. Summary counts should still reflect the full loaded period.
- Keep diagnostics out of this story unless a summary recalculation failure is explicitly recorded; any diagnostics must be redacted and contain no sensitive values.

### Architecture Compliance

- Use Expo React Native, TypeScript, local-first SQLite, repositories, Drizzle-owned schema, and Zod-compatible validation boundaries already present in the project.
- Domain functions must be pure and testable without React Native runtime or SQLite.
- Services may coordinate repositories and platform/database access; feature hooks may call services; React components must not import database clients or schema.
- Money values stay in integer minor units.
- Summary calculations must be deterministic from the same source dataset after add, edit, delete, restart, and migration events.
- Calendar rules must define local dates, week starts, month boundaries, leap days, and work entries that cross midnight consistently.
- Reflection/review copy must avoid causal, predictive, optimization, shaming, or financial-advice claims.

### Previous Story Intelligence

- Story 5.5 self-review verdict was `APPROVED_WITH_MINOR_NOTES`.
- Story 5.5 left `.claude/worktrees/` untracked; keep it out of commits.
- Recent services consistently catch local database open failures inside service APIs and return retryable `AppResult` errors.
- Recent summary and review work uses pure domain functions plus service orchestration and focused Jest tests. Continue that pattern.
- Receipt and draft work made `capture_drafts` JSON the approved MVP draft model; Story 6.1 should not modify draft behavior.
- Story 4.4 established the current Review tab as end-of-day activity. Preserve its existing behavior while adding weekly/monthly modes.

### UX Guidance

- Use compact metrics and list rows; avoid dense finance-dashboard charts for this story.
- Text labels must communicate status; do not rely on color alone.
- Good neutral copy examples:
  - "Recorded this week"
  - "No work logged in this period"
  - "Review data is partial because this section has no saved records"
  - "Summary calculated from local records"
- Avoid copy like "you overspent because", "you should", "optimize", "prediction", "bad habit", or "failure".

### Testing Requirements

Required automated checks:

```bash
npm run typecheck -- --pretty false
npm run lint
npm test
npx expo install --check
npm run build --if-present
git diff --check
```

Minimum coverage:

- Weekly period starts on Monday by default, ends seven days later, and includes/excludes boundary records correctly.
- Monthly period starts on the first day and handles month transitions and leap-year February.
- Deleted money/work/task/reminder source records are excluded from counts.
- Direct tasks and recurring task/habit occurrences count completed, open, missed/overdue, skipped, and total states deterministically.
- Reminder occurrence/recovery counts include missed or unavailable states without shaming copy.
- Budget status and savings progress reuse existing domain helpers and remain in minor units.
- Service returns settings recovery when preferences are missing and retry recovery when local database open fails.
- Service recomputes from changed repository data without returning stale cached values.
- Review UI/hook exposes weekly and monthly modes and keeps existing end-of-day behavior intact.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 6 and Story 6.1 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR42, FR43, FR50, NFR-PERF-04, NFR-PERF-06, NFR-REL-04, NFR-REL-05, NFR-MAINT-01, NFR-MAINT-02, NFR-SEC-01, NFR-SEC-04, NFR-SEC-07, NFR-UX-01, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, repository boundaries, summary caching strategy, deterministic summaries, review feature mapping]
- [Source: `DESIGN.md` - token-led calm mobile UI guidance]
- [Source: `_bmad-output/implementation-artifacts/5-5-warn-about-duplicates-and-manage-receipt-retention.md` - previous story learnings and commit hygiene]
- [Source: `src/domain/summaries/today-summary.ts` - pure summary aggregation pattern]
- [Source: `src/domain/summaries/end-of-day-review.ts` - current review summary pattern]
- [Source: `src/services/summaries/end-of-day-review.service.ts` - repository orchestration and service error handling pattern]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 6.1 ready-for-dev from Epic 6, PRD, architecture, current Review/summaries code, Story 5.5 learnings, and project automation rules.
- 2026-05-08: Started Story 6.1 implementation. Plan: add pure period summary calculations first, then service orchestration, review hook/UI support, focused tests, and full verification.
- 2026-05-08: Added pure weekly/monthly period summary calculations, source-driven period review service, Review tab day/week/month selector, and focused domain/service/reducer tests.
- 2026-05-08: Verification passed: focused Jest, typecheck, lint, full Jest, Expo install check, build-if-present, and git diff whitespace check.

### Completion Notes List

- Implemented deterministic weekly/monthly summary calculations from local source records with `cacheStatus: 'fresh_from_source'`.
- Added period review service orchestration that reuses existing repositories, recurrence builders, recovery data, budget rules, and savings goals without adding a migration or cache table.
- Extended Review with Day/Week/Month modes while preserving the existing end-of-day flow and neutral copy.
- Added focused tests for period boundaries, source recomputation, standard MVP dataset scale, service error paths, and period review state transitions.

### File List

- `_bmad-output/implementation-artifacts/6-1-generate-weekly-and-monthly-summaries.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-6.1-review.md`
- `src/domain/summaries/monthly-summary.ts`
- `src/domain/summaries/period-summary.test.ts`
- `src/domain/summaries/period-summary.ts`
- `src/domain/summaries/weekly-summary.ts`
- `src/features/review/ReviewScreen.tsx`
- `src/features/review/usePeriodReviewSummary.test.ts`
- `src/features/review/usePeriodReviewSummary.ts`
- `src/services/summaries/period-review.service.test.ts`
- `src/services/summaries/period-review.service.ts`

## Change Log

- 2026-05-08: Created Story 6.1 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed weekly/monthly summaries after verification.
