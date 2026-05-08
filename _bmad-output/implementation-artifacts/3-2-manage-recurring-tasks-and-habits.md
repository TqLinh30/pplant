# Story 3.2: Manage Recurring Tasks And Habits

Status: done

## Story

As a student,
I want recurring tasks and habits with completion by day,
so that routine planning does not need to be rebuilt manually.

## Acceptance Criteria

1. Given I create a recurring task or habit, when I choose daily, weekly, or monthly recurrence, then a task/habit recurrence rule is saved locally, generated occurrences are virtual, and each occurrence can be marked complete by local day.
2. Given a recurring task or habit exists, when I edit, pause, resume, skip one occurrence, stop, delete, mark complete, or undo completion, then the selected action affects the correct occurrence or series and recovery language remains neutral.
3. Given recurrence calculations hit week starts, month transitions, leap days, start/end bounds, skipped dates, stopped series, or completed days, when occurrences are generated, then local calendar rules are applied consistently and tests cover the boundary cases.

## Tasks / Subtasks

- [x] Define recurring task/habit domain contracts and validation. (AC: 1, 2, 3)
  - [x] Add task recurrence types under `src/domain/tasks`, not by expanding the money-specific `RecurrenceRule` type.
  - [x] Support `kind = "task" | "habit"`.
  - [x] Support `frequency = "daily" | "weekly" | "monthly"` using existing recurrence frequency conventions.
  - [x] Validate required title, optional notes, high/low priority, optional category, optional topics, start local date, optional end local date, pause/stop/delete timestamps, skip dates, and completion dates.
  - [x] Define virtual occurrence view state from rule + skip exceptions + completion rows: `open`, `skipped`, or `completed`.
  - [x] Reuse `generateRecurrenceOccurrences` for local date generation; do not reimplement calendar stepping.
- [x] Add additive task/habit recurrence persistence. (AC: 1, 2, 3)
  - [x] Add migration 010 with separate task/habit recurrence tables.
  - [x] Do not alter `recurrence_rules`, `recurrence_rule_topics`, `recurrence_exceptions`, or recurring money behavior.
  - [x] Add `task_recurrence_rules` with series template fields:
    - `id`, `workspace_id`, `kind`, `title`, `notes`, `priority`, `frequency`
    - `starts_on_local_date`, `ends_on_local_date`
    - `category_id`, `source`, `source_of_truth`, `user_corrected_at`
    - `paused_at`, `stopped_at`, `stopped_on_local_date`, `deleted_at`
    - `created_at`, `updated_at`
  - [x] Add `task_recurrence_topics` with one rule to many topics.
  - [x] Add `task_recurrence_exceptions` for skipped virtual occurrences.
  - [x] Add `task_recurrence_completions` for completion-by-day with a unique rule/date constraint and soft undo through `deleted_at`.
  - [x] Add Drizzle schema mappings and migration tests.
- [x] Add task recurrence repository behavior. (AC: 1, 2, 3)
  - [x] Create, update, get, list active rules, pause, resume, stop, soft-delete series.
  - [x] Insert/replace topic joins atomically when rules are created or updated.
  - [x] Create idempotent skip exceptions for one occurrence.
  - [x] Mark an occurrence complete by local date and undo completion without duplicating completion rows.
  - [x] List exceptions and completions for a rule so services can build virtual occurrence views.
  - [x] Return typed `AppResult` errors and do not log titles, notes, topics, categories, or occurrence dates.
- [x] Add task recurrence service behavior. (AC: 1, 2, 3)
  - [x] Open/migrate the local database using the same service dependency pattern as Story 3.1.
  - [x] Validate active category/topic ids with `CategoryTopicRepository`.
  - [x] Generate bounded virtual occurrence views from rules, skip exceptions, completions, pause state, stop date, start date, and end date.
  - [x] Store `source = "manual"` and `sourceOfTruth = "manual"`.
  - [x] Set `userCorrectedAt` when a series is manually edited.
  - [x] Do not create rows in the `tasks` table for generated occurrences.
  - [x] Do not schedule notifications, request notification permission, or create reminder records in this story.
- [x] Add recurring task/habit UI surface. (AC: 1, 2)
  - [x] Add a recurring task/habit section to the existing task surface using current UI primitives.
  - [x] Provide controls for kind, frequency, title, notes, priority, start date, optional end date, category, topics, save/edit, pause/resume, skip next occurrence, stop, delete, mark complete, and undo completion.
  - [x] Show generated virtual occurrences with explicit text state, not color-only state.
  - [x] Use neutral copy such as "Paused", "Skipped", "Completed for this day", "Series stopped", and "No upcoming occurrences".
  - [x] Keep this story scoped to recurring tasks/habits; do not implement reminders, snooze/reschedule, missed reminder recovery, Today overview, Review summaries, or draft persistence.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test validation for title, notes, priority, kind, frequency, start/end dates, category, topics, skips, and completions.
  - [x] Test migration 010 is additive and does not modify recurring money tables.
  - [x] Test repository create/edit/pause/resume/stop/delete/topic replacement/skip/complete/undo behavior.
  - [x] Test service virtual occurrence generation for daily, weekly, monthly, week starts, month clamp, leap days, end dates, stopped dates, skipped dates, and completions.
  - [x] Test hook validation and state transitions for create, edit, pause/resume, skip, stop, delete, complete, and undo completion.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### User Decisions For This Story

- Use a schema dedicated to recurring tasks and habits.
- Keep generated occurrences virtual; do not materialize them into `tasks`.
- Store completion-by-day in a separate completion table.
- Do not change the existing money recurrence schema or behavior.

### Scope Boundaries

- Implement recurring task/habit series management and completion-by-day only.
- Do not add notification scheduling, notification permission requests, reminder records, reminder recovery states, snooze, reschedule, Today overview, Review summaries, or draft recovery.
- Do not add complex recurrence rules beyond daily, weekly, and monthly.
- Do not implement holiday calendars, multiple rules per series, automatic optimization, streak pressure, or shame/guilt language.
- Do not log recurring task/habit contents or occurrence details to diagnostics.

### Current Repository State

- Story 3.1 added manual tasks in:
  - `src/domain/tasks/types.ts`
  - `src/domain/tasks/schemas.ts`
  - `src/domain/tasks/task-summary.ts`
  - `src/data/repositories/tasks.repository.ts`
  - `src/services/tasks/task.service.ts`
  - `src/features/tasks/TaskForm.tsx`
  - `src/features/tasks/useTaskCapture.ts`
- Manual task rows live in `tasks` and task topic joins live in `task_topics`.
- Existing recurrence support is money-specific:
  - `src/domain/recurrence/types.ts` defines `RecurrenceRule` with money fields.
  - `src/data/repositories/recurrence-rules.repository.ts` reads/writes `recurrence_rules`.
  - `src/services/money/recurring-money.service.ts` owns generated recurring money records.
- Shared recurrence generation already exists in `src/domain/recurrence/generate-occurrences.ts`.

### Required Data Model

Use these new tables for migration 010. Names may be adjusted only for consistency if all tests and story docs are updated.

`task_recurrence_rules`

- `id TEXT PRIMARY KEY NOT NULL`
- `workspace_id TEXT NOT NULL`
- `kind TEXT NOT NULL` with values `task` or `habit`
- `title TEXT NOT NULL`
- `notes TEXT`
- `priority TEXT NOT NULL` with values `high` or `low`
- `frequency TEXT NOT NULL` with values `daily`, `weekly`, `monthly`
- `starts_on_local_date TEXT NOT NULL`
- `ends_on_local_date TEXT`
- `category_id TEXT`
- `source TEXT NOT NULL`
- `source_of_truth TEXT NOT NULL`
- `user_corrected_at TEXT`
- `paused_at TEXT`
- `stopped_at TEXT`
- `stopped_on_local_date TEXT`
- `deleted_at TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

`task_recurrence_topics`

- `rule_id TEXT NOT NULL`
- `topic_id TEXT NOT NULL`
- `workspace_id TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- Primary key or unique index on `(rule_id, topic_id)`.

`task_recurrence_exceptions`

- `id TEXT PRIMARY KEY NOT NULL`
- `rule_id TEXT NOT NULL`
- `workspace_id TEXT NOT NULL`
- `occurrence_local_date TEXT NOT NULL`
- `action TEXT NOT NULL` with value `skip`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- Unique index on `(workspace_id, rule_id, occurrence_local_date, action)`.

`task_recurrence_completions`

- `id TEXT PRIMARY KEY NOT NULL`
- `rule_id TEXT NOT NULL`
- `workspace_id TEXT NOT NULL`
- `occurrence_local_date TEXT NOT NULL`
- `completed_at TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `deleted_at TEXT`
- Unique index on `(workspace_id, rule_id, occurrence_local_date)`.

### Recurrence Semantics

- Virtual occurrence dates are generated from rule fields plus `generateRecurrenceOccurrences`.
- `startsOnLocalDate` is the anchor date for daily, weekly, and monthly recurrence.
- Monthly recurrence must preserve current generator behavior: clamp to the original anchor day when a month is shorter.
- `endsOnLocalDate` bounds occurrence generation inclusively.
- `stoppedOnLocalDate` bounds occurrence generation inclusively for the final allowed date. A stopped series should produce no dates after the stop local date.
- `pausedAt` suppresses active upcoming occurrence views without deleting the rule, exceptions, or completions.
- `deletedAt` removes the series from active lists without deleting historical rows.
- Skip exceptions remove one virtual occurrence date from normal active occurrence views.
- A completion row marks one generated occurrence date complete. Undo completion sets `deletedAt`; marking complete again should reactivate or update the existing row rather than creating duplicates.
- If an occurrence date is skipped and completed, skipped wins for active occurrence display; services should prevent completing skipped dates where practical.

### UI Guidance

- Add recurring task/habit management inside the existing task route/surface rather than creating a separate landing page.
- Use segmented controls for kind and frequency.
- Use current primitives: `Button`, `ListRow`, `SegmentedControl`, `StatusBanner`, and `TextField`.
- Keep form copy compact. Required fields first; optional category/topics/notes/end date after.
- State copy must be neutral and recoverable. Avoid "failed habit", "broken streak", "missed again", "overdue shame", or similar wording.
- State must be communicated with text labels, not color alone.

### Architecture Compliance

- Domain code owns types, validation, and pure occurrence view calculation.
- Repositories own SQLite persistence, transactions, soft delete, topic joins, skips, and completions.
- Services own database opening, migrations, workspace scoping, active category/topic validation, timestamp semantics, and virtual occurrence orchestration.
- Feature hooks own UI state and service calls.
- React components must not import SQLite clients, migrations, or repositories.
- Use typed `AppResult` errors for expected failures.
- Use Zod at row parsing and boundary validation.

### Anti-Patterns To Avoid

- Do not modify the existing money recurrence tables or money recurrence service to support tasks.
- Do not copy/paste a second calendar generator. Reuse `generateRecurrenceOccurrences`.
- Do not materialize all future occurrences into `tasks`.
- Do not use the `tasks` table as the completion-by-day ledger for recurring habits.
- Do not add a broad global store for task recurrence state.
- Do not add new large dependencies.
- Do not schedule reminders or request notification permission in Story 3.2.
- Do not use color-only state indicators.

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

- Domain parsing and validation for rules, exceptions, completions, and occurrence views.
- Recurrence boundary tests for daily, weekly, monthly clamp, leap day, start/end bounds, skipped date, stopped date, and paused series.
- Migration 010 additive safety and money recurrence table preservation.
- Repository transaction behavior for topic replacement and idempotent completion/skip writes.
- Service active category/topic validation and virtual occurrence views.
- Hook state transitions and validation flows for all user-visible actions.

### Previous Story Intelligence

- Story 3.1 established manual task validation, soft delete, topic joins, service dependency injection, local workspace scoping, and task UI patterns.
- Story 3.1 stores task deadline as optional `YYYY-MM-DD` local date. Story 3.2 should not introduce reminder scheduling or due-time semantics.
- Story 3.1 task UI is already mounted in `TaskForm`; recurring task/habit UI should extend that surface without breaking manual task capture.
- Story 3.1 self-review noted the Capture tab still has a money-preferences gate before rendering the whole capture surface; the task route independently exposes task UI.
- Recent tests use co-located `.test.ts` files with fakes for repository/service behavior. Follow that pattern.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 3.2 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR35, FR37, FR41, NFR-REL-04, NFR-REL-05, NFR-SEC-04, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, repository boundaries, recurrence/reminder ownership, diagnostics redaction, date storage]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - gentle recurrence, completion-by-day, neutral recovery language, non-color-only state]
- [Source: `_bmad-output/implementation-artifacts/3-1-create-and-manage-daily-tasks.md` - manual task model and UI/service/repository patterns]
- [Source: `src/domain/recurrence/generate-occurrences.ts` - shared recurrence date generation]
- [Source: `src/services/money/recurring-money.service.ts` - existing money recurrence pattern to avoid modifying]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npx jest src/domain/tasks/task-recurrence.test.ts src/data/repositories/task-recurrence.repository.test.ts src/services/tasks/task-recurrence.service.test.ts src/features/tasks/useTaskRecurrence.test.ts src/data/db/migrations/migrate.test.ts --runInBand`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

### Completion Notes List

- Added additive migration 010 and Drizzle schema mappings for dedicated task/habit recurrence rules, topics, skip exceptions, and completion-by-day rows.
- Added task recurrence domain contracts, row parsing, validation, and virtual occurrence view construction using the shared recurrence generator.
- Added repository/service/hook layers for create, edit, pause, resume, stop, delete, skip, complete, undo completion, and bounded preview loading.
- Added recurring task/habit controls to the existing task surface with text-based state labels and neutral recovery copy.
- Added focused domain, migration, repository, service, and hook tests. Full verification passed.

### File List

- `_bmad-output/implementation-artifacts/3-2-manage-recurring-tasks-and-habits.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-3.2-review.md`
- `docs/automation-reports/overnight-summary.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/task-recurrence.repository.test.ts`
- `src/data/repositories/task-recurrence.repository.ts`
- `src/domain/tasks/schemas.ts`
- `src/domain/tasks/task-recurrence.test.ts`
- `src/domain/tasks/task-recurrence.ts`
- `src/domain/tasks/types.ts`
- `src/features/tasks/TaskForm.tsx`
- `src/features/tasks/TaskRecurrenceForm.tsx`
- `src/features/tasks/useTaskRecurrence.test.ts`
- `src/features/tasks/useTaskRecurrence.ts`
- `src/services/tasks/task-recurrence.service.test.ts`
- `src/services/tasks/task-recurrence.service.ts`

## Change Log

- 2026-05-08: Created Story 3.2 from Epic 3 recurring task/habit requirements with user-approved schema direction.
- 2026-05-08: Implemented Story 3.2 recurring task/habit rules, virtual occurrences, completion ledger, UI, tests, and verification.
