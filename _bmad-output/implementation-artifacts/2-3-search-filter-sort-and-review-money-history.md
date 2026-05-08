# Story 2.3: Search, Filter, Sort, And Review Money History

Status: done

## Story

As a student,
I want to search, filter, sort, and review money history,
so that I can understand spending and income by time, category, topic, source, and amount.

## Acceptance Criteria

1. Given money records exist, when I open history, then I can view spending and income by day, week, and month, and category, topic, merchant/source, and amount are visible where relevant.
2. Given I apply filters or sorting, when I filter by date, category, topic, merchant/source, or amount, then matching records are shown, and the filter state is understandable and removable.
3. Given the standard MVP dataset is present, when history loads or filters change, then interaction remains responsive, and long lists use pagination or virtualization where needed.

## Tasks / Subtasks

- [x] Define money history query and summary contracts. (AC: 1, 2, 3)
  - [x] Add domain types/helpers for history filters, sort order, pagination, and period summaries.
  - [x] Support day, week, and month summary grouping from local dates.
  - [x] Use integer minor units only; never convert money to floats.
  - [x] Treat soft-deleted money records as hidden from history.
- [x] Extend money record repository for history queries. (AC: 1, 2, 3)
  - [x] Add a paginated active-record history query.
  - [x] Support date range, category, topic, merchant/source text, amount min/max, kind, and sort options.
  - [x] Preserve workspace scoping and parameterized SQL.
  - [x] Do not add a migration unless a safe index is clearly needed; Story 2.1/2.2 indexes already cover workspace/date/category/topic paths.
- [x] Add money history service behavior. (AC: 1, 2, 3)
  - [x] Open the database, run migrations, require saved preferences, and scope to `localWorkspaceId`.
  - [x] Load category/topic labels, including archived items referenced by old records.
  - [x] Return history records, pagination metadata, and day/week/month summaries.
  - [x] Return typed retry/settings errors using existing `AppResult` patterns.
- [x] Replace the History placeholder with a focused money history screen. (AC: 1, 2, 3)
  - [x] Add a feature hook for money history loading, filters, sorting, and pagination.
  - [x] Show loading, empty, failed, and preferences-needed states with neutral copy and one clear action.
  - [x] Display record amount, date, kind, category, topics, merchant/source, and note when present.
  - [x] Provide understandable filter state and removable filter controls.
  - [x] Provide day/week/month summary tabs or segmented controls.
  - [x] Keep the scope to money history only; do not implement work/task/reminder/reflection history in this story.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test domain history summaries for day/week/month and soft-deleted exclusion.
  - [x] Test repository filters, sorting, pagination, topic join filtering, and parameterized behavior with fakes.
  - [x] Test service loading, missing preferences, labels, filters, summaries, and pagination metadata.
  - [x] Test history hook state for load, filters, sort changes, clear filters, and load more.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Current Repository State

- Story 2.1 added manual money record creation and the Capture screen.
- Story 2.2 added edit/delete behavior, soft delete via `deleted_at`, receipt provenance fields, `user_corrected_at`, and active period queries for summary recalculation.
- `src/features/history/HistoryScreen.tsx` is still a placeholder behind `src/app/(tabs)/history.tsx`.
- `money_records` has indexes on `(workspace_id, deleted_at, local_date, kind)` and `(workspace_id, category_id, deleted_at, local_date)`. `money_record_topics` has indexes on `(workspace_id, topic_id)` and `(money_record_id)`.
- `CategoryTopicRepository.listItems(kind, workspaceId, { includeArchived: true })` can be used to label archived categories/topics that historical records still reference.

### Scope Boundaries

- Implement money history only for records from `money_records`.
- Do not implement work, task, reminder, reflection, receipt draft, recurring money, or all-data history in this story.
- Do not implement edit/delete from the History screen unless it is already trivial through existing Capture behavior; the acceptance criteria only require review/search/filter/sort.
- Do not add summary snapshot persistence or cache invalidation tables.
- Do not show soft-deleted money records in normal history results.
- Do not log merchant/source, notes, amounts, category/topic ids, or dates to diagnostics.

### Recommended Query Behavior

- Query fields:
  - `kind`: optional `expense` or `income`.
  - `dateFrom` / `dateTo`: optional inclusive local-date bounds.
  - `categoryId`: optional exact category id; include records with `NULL` category only when no category filter is set.
  - `topicId`: optional exact topic id through `money_record_topics`.
  - `merchantOrSource`: optional trimmed text search against `merchant_or_source`.
  - `amountMinorMin` / `amountMinorMax`: optional integer minor-unit bounds.
  - `sort`: `date_desc`, `date_asc`, `amount_desc`, or `amount_asc`.
  - `limit` and `offset`: bounded pagination.
- Default behavior should show active records ordered by newest local date, then newest creation time, then id.
- Filter SQL must use placeholders; do not string-interpolate user values into SQL.
- If filtering by topic, prefer `EXISTS` or an inner join scoped by workspace and topic id.

### Summary Guidance

- Day summary: group by `record.localDate`.
- Week summary: group by Monday-start local weeks using the existing `defaultWeekStartsOn = 1`.
- Month summary: group by `YYYY-MM`.
- Summaries should calculate expense total, income total, and net total using active records returned by a summary query or by the filtered result set if the implementation keeps the initial scope limited.
- For pagination, record list can be page-limited, but visible summary should be explicit about whether it represents the current filtered page or all matching records. Prefer all matching filtered records if repository support is straightforward; otherwise label it as current-page context.

### UX and Accessibility Guidance

- Keep History quiet and scannable, closer to an operational tool than a marketing surface.
- Use segmented controls for day/week/month and sort options.
- Use text fields for search/date/amount inputs and list rows for records.
- Use neutral copy for no results, such as "No matching records" with a clear way to clear filters.
- Do not rely on color alone for kind, filter, or summary states.
- Ensure long merchant/source or note text does not overlap primary record metadata.

### Architecture Compliance

- Domain modules own query-shape types and pure summary helpers.
- Repositories own SQLite access and history query SQL.
- Services own database opening, migrations, saved preferences, category/topic label loading, workspace scoping, and typed error mapping.
- Feature hooks own transient filters, sort, loading, and pagination state.
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

- Day/week/month grouping with expense, income, net totals.
- Soft-deleted records excluded from history and summaries.
- Date/category/topic/merchant-source/amount/kind filters.
- Sort options and pagination metadata.
- Missing preferences returns settings recovery.
- Archived category/topic labels can still be displayed for historical records.
- Hook clear-filters and load-more behavior.

### Project Structure Notes

Expected additions or updates:

```text
src/
  data/
    repositories/
      money-records.repository.ts
      money-records.repository.test.ts
  domain/
    money/
      calculations.ts
      money.test.ts
      types.ts
  features/
    history/
      HistoryScreen.tsx
      useMoneyHistory.ts
      useMoneyHistory.test.ts
  services/
    money/
      money-history.service.ts
      money-history.service.test.ts
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.3 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR15, FR17, NFR-PERF-03, NFR-PERF-06, NFR-SEC-01, NFR-SEC-04, NFR-MAINT-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - SQLite history/filtering support, repository boundaries, long-history pagination, frontend boundaries]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - history filters, navigation, empty/loading state, accessibility guidance]
- [Source: `_bmad-output/implementation-artifacts/2-2-edit-and-delete-money-records-with-summary-recalculation.md` - soft delete, active record queries, provenance, planning summary behavior]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add domain history query, pagination, and day/week/month summary helpers.
- Extend money repository with parameterized active-history query support.
- Add money history service that loads preferences, labels, records, summaries, and pagination metadata.
- Replace the History placeholder with a money-history hook/screen using filters, sort, summary mode, and load-more behavior.
- Add focused domain, repository, service, and hook tests, then run full verification.

### Debug Log References

- `npm run typecheck` passed after implementation and again after UI formatting cleanup.
- `npm run lint` passed after implementation and after UI formatting cleanup.
- `npm test` passed after adding Story 2.3 coverage: 27 suites, 148 tests.
- `npx expo install --check` passed with dependencies up to date.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.
- A repository fake query branch was verified with the focused repository test before full regression.

### Completion Notes List

- Added money history query, sort, pagination, and summary contracts with day/week/month grouping from local dates.
- Added active-record repository history queries with workspace scoping, placeholder parameters, topic filtering through `EXISTS`, bounded pagination, and soft-delete exclusion.
- Added money history service behavior that opens local storage, runs migrations, requires preferences, loads archived category/topic labels for historical display, validates filters, and returns typed recovery errors.
- Replaced the History placeholder with a focused money-history UI for summaries, filters, sorting, visible filter state, empty/loading/error/preferences-needed states, and load-more pagination.
- Kept Story 2.3 scoped to money history only; work history, recurring money, reminders, receipt parsing, and summary persistence remain future-story work.

### File List

- `_bmad-output/implementation-artifacts/2-3-search-filter-sort-and-review-money-history.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-2.3-review.md`
- `src/data/repositories/money-records.repository.test.ts`
- `src/data/repositories/money-records.repository.ts`
- `src/domain/money/calculations.ts`
- `src/domain/money/money.test.ts`
- `src/domain/money/types.ts`
- `src/features/history/HistoryScreen.tsx`
- `src/features/history/useMoneyHistory.test.ts`
- `src/features/history/useMoneyHistory.ts`
- `src/services/money/money-history.service.test.ts`
- `src/services/money/money-history.service.ts`

## Change Log

- 2026-05-08: Created Story 2.3 from sprint backlog with money-history scope boundaries and Story 2.2 learnings.
- 2026-05-08: Implemented Story 2.3 money history query/service/UI behavior, focused tests, verification, and self-review.
