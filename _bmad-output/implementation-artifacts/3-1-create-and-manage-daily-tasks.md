# Story 3.1: Create And Manage Daily Tasks

Status: done

## Story

As a student,
I want to create, edit, delete, and review daily tasks,
so that I can plan school and personal work in Pplant.

## Acceptance Criteria

1. Given I create a task, when I enter title, optional notes, state, priority, and deadline, then the task is saved locally, and To Do, Doing, Done, high priority, and low priority are supported.
2. Given a task exists, when I edit, delete, or change state, then the update persists locally, and task summary inputs and derived task state update for later Today and Review surfaces.
3. Given required task fields are invalid, when I try to save, then validation explains the issue, and no invalid final task is stored.

## Tasks / Subtasks

- [x] Define daily task domain contracts and validation. (AC: 1, 2, 3)
  - [x] Support `todo`, `doing`, and `done` task states.
  - [x] Support `high` and `low` task priorities.
  - [x] Validate required title, optional notes, optional deadline local date, optional category, and optional topics.
  - [x] Provide deterministic task summary counts for later Today/Review surfaces.
  - [x] Exclude soft-deleted tasks from active summaries.
- [x] Add additive task persistence. (AC: 1, 2, 3)
  - [x] Add migration 009 with `tasks` and `task_topics`.
  - [x] Preserve existing data and migrations; no destructive database changes.
  - [x] Store title, notes, state, priority, deadline local date, completion timestamp, category, topics, source, source-of-truth, user correction timestamp, created/updated timestamps, and soft-delete state.
  - [x] Add indexes for active workspace/state/deadline and topic lookups.
- [x] Add task repository and service behavior. (AC: 1, 2, 3)
  - [x] Create, edit, soft-delete, get, list recent tasks, and list summary tasks.
  - [x] Validate active category/topic ids.
  - [x] Set/clear `completedAt` deterministically when state changes to/from Done.
  - [x] Return typed `AppResult` errors and avoid logging task contents.
- [x] Add task capture/review UI surface. (AC: 1, 2, 3)
  - [x] Add a daily task section to Capture using existing primitives.
  - [x] Provide state and priority controls, title, notes, deadline, category/topic selection, save/edit/delete, and recent task list.
  - [x] Replace the task route placeholder with the same daily task surface.
  - [x] Keep this story scoped to manual daily tasks; do not implement recurring tasks, habits, reminders, notification scheduling, missed-task recovery, Today overview, or review reflections.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test task validation, parsing, summaries, and deleted-task exclusion.
  - [x] Test migration 009 preserves existing data and adds task tables/indexes.
  - [x] Test repository create/edit/delete/list behavior with topics.
  - [x] Test service validation, category/topic validation, done completion timestamps, and summary recalculation.
  - [x] Test hook create/edit/delete validation flows.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement manual daily task CRUD and lightweight review only.
- Deadline is stored as an optional local date string (`YYYY-MM-DD`) in Story 3.1.
- Categories and topics are optional because PRD says categories/topics are shared reporting context for tasks.
- Use soft delete from the first persisted task model.
- Store `source = "manual"` and `sourceOfTruth = "manual"` for this manual task story.
- Store `completedAt` when state becomes `done`; clear it when state changes away from `done`.
- Do not implement recurring tasks, habits, reminders, notification permissions, notification scheduling, snooze/reschedule, missed-task recovery, Today overview, or weekly/monthly review.
- Do not log task titles, notes, categories, topics, or deadlines to diagnostics.

### Current Repository State

- `src/domain/tasks/types.ts` and `src/domain/tasks/schemas.ts` currently contain state/priority skeletons only.
- `src/features/tasks/TaskRouteScreen.tsx` is a placeholder.
- Architecture already expects `src/domain/tasks`, `src/features/tasks`, and `src/data/repositories/tasks.repository.ts`.
- Existing money/work repositories provide the local SQLite, soft-delete, category/topic, and service/hook patterns to follow.

### Task Semantics

- Task title is required, trimmed, and capped at 120 characters.
- Task notes are optional, trimmed, and capped at 500 characters.
- Task states are exactly `todo`, `doing`, and `done`.
- Task priorities are exactly `high` and `low`.
- Deadline is optional and uses local date validation from `src/domain/common/date-rules.ts`.
- Task summaries count active tasks by state and priority, and count overdue open tasks relative to a supplied local date.
- Deleted tasks are excluded from active recent lists and summaries.

### Architecture Compliance

- Domain modules own task types, validation, and pure summary calculation.
- Repositories own SQLite persistence, transactions, soft delete, and topic joins.
- Services own database opening, migrations, workspace scoping, active category/topic validation, timestamp semantics, and typed error mapping.
- Feature hooks own UI state and service calls.
- React components must not import SQLite clients, migrations, or repositories.

### UX Guidance

- Keep the task section compact and calm inside Capture.
- Use segmented controls for task state and priority.
- Use text fields for title, notes, and deadline.
- Use list rows for category/topic selection and recent tasks.
- Use neutral copy for done, removed, validation, and empty states.
- Do not use streak, guilt, punishment, or productivity-shaming language.

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

- Title, notes, state, priority, deadline, category, and topic validation.
- Done state completion timestamp behavior.
- Soft delete exclusion from active lists/summaries.
- Migration 009 additive safety.
- Repository topic replacement on edit.
- Service active category/topic validation.
- Hook create, edit, delete, and validation flows.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 3.1 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR33, FR34, FR36, FR42, NFR-REL-04, NFR-SEC-04, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - tasks domain/repository ownership, SQLite persistence, diagnostics redaction]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - task capture, priority/deadline metadata, neutral task language]
- [Source: `_bmad-output/implementation-artifacts/2-7-show-expense-impact-as-work-time-context.md` - recent local-first story/report patterns]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add task domain validation, row parsing, and pure summary calculation.
- Add additive migration 009 plus Drizzle schema mappings.
- Add task repository and service following money/work local-first patterns.
- Add a task capture hook and UI surface in Capture and task route.
- Add domain, migration, repository, service, and hook tests, then run full verification.

### Debug Log References

- 2026-05-08: Ran focused Story 3.1 tests for domain, migration, repository, service, and hook behavior.
- 2026-05-08: Ran full verification: `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

### Completion Notes List

- Added manual daily task domain validation, parsing, and deterministic summary counts.
- Added additive migration 009 for `tasks` and `task_topics`, plus Drizzle schema mappings.
- Added task repository/service behavior for create, edit, soft delete, recent list, summary inputs, active category/topic validation, and Done completion timestamps.
- Added reusable task capture UI to Capture and the task route.
- Added focused domain, migration, repository, service, and hook tests; full verification passed.

### File List

- `_bmad-output/implementation-artifacts/3-1-create-and-manage-daily-tasks.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/tasks.repository.test.ts`
- `src/data/repositories/tasks.repository.ts`
- `src/domain/tasks/schemas.ts`
- `src/domain/tasks/task-summary.ts`
- `src/domain/tasks/tasks.test.ts`
- `src/domain/tasks/types.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/tasks/TaskForm.tsx`
- `src/features/tasks/TaskRouteScreen.tsx`
- `src/features/tasks/useTaskCapture.test.ts`
- `src/features/tasks/useTaskCapture.ts`
- `src/services/tasks/task.service.test.ts`
- `src/services/tasks/task.service.ts`

## Change Log

- 2026-05-08: Created Story 3.1 from Epic 3 daily task requirements.
- 2026-05-08: Implemented and verified manual daily task creation, editing, deletion, summaries, persistence, and UI.
