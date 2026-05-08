# Story 3.5: Recover From Missed Tasks And Reminders

Status: review

## Story

As a student,
I want missed tasks and reminders to show recovery actions,
so that I can continue without feeling punished.

## Acceptance Criteria

1. Given a task or reminder is missed, when I return to Pplant, then the item appears with neutral status language and recovery actions such as complete, snooze, reschedule, pause, dismiss, or edit are available.
2. Given a reminder delivery is missed, disabled, or unavailable, when Pplant opens, then in-app recovery state is shown and user action is recorded without shame-based copy.
3. Given recovery state is displayed, when I choose a recovery action, then task/reminder state updates locally and recovery outcome data is available to later Today and Review surfaces.

## Tasks / Subtasks

- [x] Resolve Story 3.4 scheduling cleanup finding before or during this story. (AC: 1, 2)
  - [x] Ensure reminders that move to permission-denied, unavailable, failed, or local-only during reschedule/snooze cancel active platform notification ids before local scheduled rows are soft-deleted.
  - [x] Add regression tests for previously scheduled reminders entering denied/unavailable/local-only states.

- [x] Define recovery domain contracts and deterministic missed rules. (AC: 1, 2, 3)
  - [x] Add typed recovery target kinds for `task`, `task_recurrence_occurrence`, and `reminder_occurrence`.
  - [x] Define missed daily task as an active non-done task with `deadlineLocalDate < todayLocalDate`.
  - [x] Define missed recurring task/habit occurrence as an open virtual occurrence with `localDate < todayLocalDate`, bounded to a safe lookback window.
  - [x] Define missed reminder occurrence as an active scheduled notification whose `fireAtLocal` is before the current local date/time and whose delivery state is `scheduled` or `snoozed`.
  - [x] Treat disabled, unavailable, failed, permission-denied, and local-only reminder states as in-app recovery states without calling them user failure.
  - [x] Do not materialize task recurrence occurrences into task rows.

- [x] Add safe recovery persistence for outcomes. (AC: 3)
  - [x] Add migration 012 for a focused `recovery_events` table, or an equivalent narrowly scoped recovery-outcome table, without destructive changes.
  - [x] Store only non-sensitive identifiers and enum values: `id`, `workspace_id`, `target_kind`, `target_id`, optional `occurrence_local_date`, `action`, `occurred_at`, `created_at`.
  - [x] Add indexes for workspace/time and target lookup.
  - [x] Do not store task title, reminder title, notes, notification platform ids, or raw diagnostic details in recovery events.
  - [x] Add repository methods to create/list recovery events and to determine whether a missed item has already been resolved or dismissed.

- [x] Implement recovery service orchestration. (AC: 1, 2, 3)
  - [x] Add a service that loads missed task, recurring task/habit, and reminder recovery items from existing repositories.
  - [x] Bound lookback to avoid scanning unbounded recurrence history; default recommended lookback is 14 days unless existing patterns suggest another safe constant.
  - [x] Mark overdue reminder scheduled-notification rows as `missed` when recovery scan detects them.
  - [x] Expose recovery actions:
    - `complete` daily task: reuse existing task update behavior to set state to `done`.
    - `complete` recurring occurrence: reuse `completeTaskRecurrenceOccurrence`.
    - `snooze` reminder: reuse Story 3.4 `snoozeReminder`.
    - `reschedule` reminder: route into existing reminder edit/update flow; do not duplicate scheduler logic.
    - `pause` reminder: reuse Story 3.4 `pauseReminder`.
    - `dismiss` recovery item: record a recovery event and leave source task/reminder data intact.
    - `edit` task/reminder: open existing edit surfaces or expose hook state needed by those forms.
  - [x] Record a recovery event for every completed, snoozed, rescheduled, paused, dismissed, or edited recovery action.
  - [x] Return typed `AppResult` errors and avoid logging sensitive titles, notes, local file paths, platform notification ids, or receipt data.

- [x] Add recovery UI using existing primitives. (AC: 1, 2, 3)
  - [x] Build a compact recovery list/panel that can be reused by later Today and Review stories.
  - [x] Mount the recovery panel in the current task/reminder route surfaces without replacing the Story 4 Today overview placeholder.
  - [x] Use neutral labels such as "Needs a next step", "Reminder did not stay active", "You can choose what to do next", and avoid shame words such as "failed", "ignored", "bad streak", or "late again" in user-facing copy.
  - [x] Show state using text, not color alone.
  - [x] Keep actions descriptive and ordered by likely recovery: complete, snooze/reschedule, pause, edit, dismiss.
  - [x] Ensure touch targets remain at least 44 px through existing `Button`/`ListRow` primitives.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test missed detection for daily task deadlines, recurring task/habit virtual occurrences, scheduled reminder rows, and disabled/unavailable reminder states.
  - [x] Test recovery-event persistence and no sensitive metadata storage.
  - [x] Test service actions for complete, snooze, pause, dismiss, and edit/reschedule handoff.
  - [x] Test that dismissed/resolved recovery items do not reappear in the same lookback window.
  - [x] Test hook/reducer or feature state transitions for loading, empty, action success, action failure, and neutral copy.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement in-app recovery for missed tasks, missed recurring task/habit occurrences, missed reminders, and disabled/unavailable reminder states.
- Do not build the full Story 4 Today overview yet. Create reusable recovery service/UI that Story 4 can consume later, and mount it only where existing routes can safely show it.
- Do not create native notification response tracking beyond what is needed to mark locally overdue scheduled notifications as `missed` when the app returns.
- Do not implement weekly/monthly summaries, review analytics, streaks, habit scoring, or causal insights.
- Do not implement push/server scheduling, authentication, cloud sync, or complex recurrence.
- Do not change money recurrence tables or receipt flows.

### Current Repository State

- Story 3.1 provides daily tasks with `todo`, `doing`, and `done`; deadlines are stored as local dates.
- Story 3.2 provides recurring task/habit rules, virtual occurrences, skip exceptions, and completion rows. Occurrences are not materialized as task rows.
- Story 3.3 provides reminder domain contracts, migration 011, scheduled notification rows, notification scheduler port, and redacted scheduling diagnostics.
- Story 3.4 provides reminder timing controls: update/reschedule, snooze, pause/resume, disable/enable, delete, and UI controls.
- `ReminderDeliveryState` already includes `missed`, `dismissed`, and `complete`.
- `TodayScreen` is still a placeholder; Story 4.1 owns the full Today overview.
- Independent Story 3.4 review found a P2 cancellation bug in denied/unavailable/local-only schedule transitions. Fix before relying on those paths for recovery.

### Recommended Data Semantics

- `recovery_events` should be an append-only local event log for user recovery choices, not a source-of-truth replacement for tasks or reminders.
- Recovery event actions should be enum-like strings, recommended: `complete`, `snooze`, `reschedule`, `pause`, `dismiss`, `edit`.
- For daily tasks, source-of-truth state remains the `tasks` row.
- For recurring task/habit occurrences, source-of-truth completion remains `task_recurrence_completions`; skip remains `task_recurrence_exceptions`.
- For reminders, source-of-truth schedule remains `reminders` plus `reminder_scheduled_notifications`.
- A dismissed recovery event hides that recovery prompt but must not delete or complete the underlying task/reminder.
- A completed recovery action should update the source domain first, then record the recovery event.
- A failed recovery action should leave source data unchanged where possible and surface an action error with a retry path.

### UI Guidance

- Recovery panel should feel like a small work queue, not a blame list.
- Suggested user-facing labels:
  - "Needs a next step"
  - "This was still open after its date"
  - "Reminder did not stay active"
  - "Choose what happens next"
  - "Dismiss for now"
- Avoid:
  - "Failed"
  - "Ignored"
  - "Missed again"
  - "Bad streak"
  - "Overdue pile"
- State must be visible in text and announced through normal React Native accessibility labels supplied by existing primitives.

### Architecture Compliance

- Domain code owns deterministic missed/recovery rules and enum validation.
- Repository code owns SQLite access and migration-backed persistence.
- Services orchestrate existing task, recurrence, reminder, and notification service actions.
- UI hooks own feature state and service calls.
- React components must not import repositories, migrations, SQLite clients, or `expo-notifications`.
- Diagnostics, if added, must use the existing redaction strategy and must not include sensitive task/reminder content.

### Anti-Patterns To Avoid

- Do not materialize recurring task occurrences into `tasks`.
- Do not use native infinite repeat notification triggers.
- Do not hard-delete tasks, reminders, scheduled notification rows, completions, or recovery events.
- Do not store raw titles, notes, platform notification ids, file paths, OCR text, spending details, or income values in recovery events or diagnostics.
- Do not make missed state depend on app locale formatting strings; use local date/time domain rules.
- Do not implement Story 4 Today overview, Story 4 end-of-day review, or Story 6 summaries early.

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

- Migration 012 preserves existing task/reminder data.
- Recovery schemas reject invalid target kinds/actions and invalid dates.
- Missed detection is deterministic across today/yesterday boundaries.
- Recurring task/habit missed detection uses virtual occurrences and bounded lookback.
- Reminder missed detection updates eligible scheduled rows to `missed` without touching paused/disabled/deleted reminders incorrectly.
- Recovery actions update source domain state and record recovery events.
- Recovery list excludes dismissed/resolved items.
- UI/hook tests cover loading, empty, success, failure, and neutral copy states.

### Previous Story Intelligence

- Story 3.4 deliberately kept missed-delivery recovery out of scope; do not treat existing snooze/pause/disable UI as sufficient recovery.
- Story 3.4 added `snoozed`, `paused`, and `disabled` reminder schedule states and service APIs that should be reused rather than duplicated.
- Story 3.4 review finding: permission-denied/unavailable/local-only transitions must cancel active platform notifications before local notification rows are cleared.
- Story 3.3 scheduling uses a bounded 60-day / 30-occurrence window and concrete local notifications.
- Story 3.2 established separate recurrence tables for tasks/habits and virtual occurrence generation.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 3.5 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR40, FR41, NFR-UX-02, NFR-MOB-02, NFR-MOB-03]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local notifications, recovery states, repository/service boundaries, diagnostics rules]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Reminder Recovery Row, recovery-first overdue/missed states, neutral copy, non-color-only state]
- [Source: `_bmad-output/implementation-artifacts/3-4-control-reminder-timing-and-reminder-fatigue.md` - reminder timing controls and deferred Story 3.5 scope]
- [Source: `docs/automation-reports/story-3.4-code-review.md` - independent Story 3.4 review finding]
- [Source: `src/domain/tasks/types.ts`, `src/domain/tasks/task-recurrence.ts`, `src/data/repositories/tasks.repository.ts`, `src/data/repositories/task-recurrence.repository.ts`, `src/services/tasks/task.service.ts`, `src/services/tasks/task-recurrence.service.ts`]
- [Source: `src/domain/reminders/types.ts`, `src/domain/reminders/reminder-occurrences.ts`, `src/data/repositories/reminders.repository.ts`, `src/services/reminders/reminder.service.ts`, `src/features/reminders/useReminderCapture.ts`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Resolved Story 3.4 notification cleanup finding in commit `e7ee971`; code review report updated in `521e2ae`.
- 2026-05-08: Added recovery domain rules, migration 012, recovery repository, recovery service, hook state, compact UI panel, and focused tests.
- 2026-05-08: Verification passed: `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

### Completion Notes List

- Story 3.4 scheduling cleanup prerequisite completed before beginning recovery implementation.
- Recovery contracts now cover task, recurring occurrence, and reminder occurrence targets with non-sensitive local recovery events.
- Recovery loading detects overdue daily tasks, virtual recurring task/habit occurrences, overdue reminder notifications, and non-active reminder schedule states.
- Recovery actions update source data where applicable and append outcome events for later Today/Review surfaces.
- A reusable `RecoveryPanel` is mounted on task and reminder route surfaces with neutral text and existing 44 px-safe primitives.

### File List

- `src/services/reminders/reminder.service.ts`
- `src/services/reminders/reminder.service.test.ts`
- `_bmad-output/implementation-artifacts/3-5-recover-from-missed-tasks-and-reminders.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-3.4-code-review.md`
- `docs/automation-reports/overnight-summary.md`
- `docs/automation-reports/story-3.5-review.md`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/recovery.repository.ts`
- `src/data/repositories/recovery.repository.test.ts`
- `src/data/repositories/reminders.repository.ts`
- `src/data/repositories/reminders.repository.test.ts`
- `src/domain/recovery/recovery-rules.ts`
- `src/domain/recovery/recovery.test.ts`
- `src/domain/recovery/schemas.ts`
- `src/domain/recovery/types.ts`
- `src/features/recovery/RecoveryPanel.tsx`
- `src/features/recovery/recovery-copy.ts`
- `src/features/recovery/recovery-copy.test.ts`
- `src/features/recovery/useRecovery.ts`
- `src/features/recovery/useRecovery.test.ts`
- `src/features/reminders/ReminderRouteScreen.tsx`
- `src/features/tasks/TaskRouteScreen.tsx`
- `src/services/recovery/recovery.service.ts`
- `src/services/recovery/recovery.service.test.ts`

## Change Log

- 2026-05-08: Created Story 3.5 ready-for-dev from Epic 3 recovery requirements, PRD/architecture/UX context, and Story 3.4 implementation review.
- 2026-05-08: Started implementation and recorded resolved Story 3.4 notification cleanup prerequisite.
- 2026-05-08: Implemented missed task/reminder recovery and moved story to review.
