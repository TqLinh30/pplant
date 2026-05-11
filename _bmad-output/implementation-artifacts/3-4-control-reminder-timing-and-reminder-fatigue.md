# Story 3.4: Control Reminder Timing And Reminder Fatigue

Status: done

## Story

As a student,
I want to snooze, reschedule, pause, disable, or delete reminders,
so that reminders stay useful instead of noisy.

## Acceptance Criteria

1. Given a reminder exists, when I choose snooze, reschedule, pause, disable, or delete, then the reminder state and schedule update correctly and the action is reversible where appropriate.
2. Given a repeat reminder is paused or disabled, when I return to the task or reminder detail, then Pplant shows the current state clearly and important task data is not deleted.
3. Given I use assistive technology, when reminder controls are displayed, then each action has a descriptive label and logical focus order and state is not communicated by color alone.

## Tasks / Subtasks

- [x] Extend reminder state contracts for timing controls. (AC: 1, 2, 3)
  - [x] Extend `ReminderScheduleState` and validation to include `snoozed`, `paused`, and `disabled`.
  - [x] Keep reminder source-of-truth schedule fields as local date/time strings; do not store timezone-shifted source data.
  - [x] Treat snooze as a temporary next-occurrence notification shift, not a recurrence rule rewrite.
  - [x] Treat reschedule as an edit to the reminder's source-of-truth start date, time, end date, frequency, owner, title, and notes.
  - [x] Treat pause and disable as schedule controls that cancel active platform notifications without deleting task or task recurrence data.

- [x] Add repository support for reminder updates and state transitions. (AC: 1, 2)
  - [x] Add an `updateReminder` repository method that preserves `created_at` and only mutates reminder fields owned by the reminder record.
  - [x] Reuse existing soft delete behavior for delete; do not hard-delete reminders, tasks, task recurrence rules, exceptions, or scheduled notification rows.
  - [x] Reuse `replaceScheduledNotifications` to soft-delete stale platform notification ids when snoozing, rescheduling, pausing, disabling, enabling, or deleting.
  - [x] Return typed `AppResult` errors and do not log reminder title, notes, task title, occurrence local date, or platform notification ids.

- [x] Implement service orchestration for reminder timing actions. (AC: 1, 2)
  - [x] Add service APIs for reschedule/update, snooze next occurrence, pause, resume, disable, enable, and delete.
  - [x] On reschedule, cancel existing scheduled notifications, update reminder source fields, and reschedule a bounded upcoming window using the Story 3.3 scheduler rules.
  - [x] On snooze, cancel the next scheduled occurrence and schedule a single replacement notification 30 minutes from the current local time; preserve the original recurrence source fields.
  - [x] On pause or disable, cancel active scheduled notification ids and update schedule state to `paused` or `disabled`.
  - [x] On resume or enable, reschedule the bounded upcoming window and update state based on permission/scheduling outcome.
  - [x] On delete, cancel active scheduled notification ids and soft-delete the reminder.
  - [x] Keep Story 3.5 missed-delivery recovery out of scope: do not implement missed detection, dismissed recovery persistence, or Today recovery rows here.

- [x] Add reminder timing UI controls. (AC: 1, 2, 3)
  - [x] Update the reminder feature hook/reducer to support editing an existing reminder and running timing actions.
  - [x] Update `ReminderForm` so saved reminders expose clear controls: edit timing, snooze 30 minutes, pause/resume, disable/enable, skip next occurrence, and delete reminder.
  - [x] Show `Snoozed`, `Paused`, `Disabled`, `Scheduled`, `Notifications are off`, `Scheduling unavailable`, and `Saved locally` with explicit text and neutral recovery copy.
  - [x] Use existing primitives: `Button`, `ListRow`, `SegmentedControl`, `StatusBanner`, and `TextField`.
  - [x] Make destructive delete text-clear and keep it separate from primary save actions.
  - [x] Ensure controls remain predictable in source/focus order and button labels are descriptive.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test schedule-state validation for `snoozed`, `paused`, and `disabled`.
  - [x] Test repository update, state transition, scheduled-notification replacement, and soft delete behavior.
  - [x] Test service behavior with fake notification scheduler for reschedule, snooze, pause/resume, disable/enable, delete, and cancellation/rewrite paths.
  - [x] Test hook/reducer validation and state transitions for edit, reschedule, snooze, pause/resume, disable/enable, delete, and recovery copy.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement reminder timing controls for existing reminder records only.
- Keep snooze simple and deterministic for MVP: "Snooze 30 minutes" from the action time.
- Keep reschedule as editing the reminder record and rewriting the bounded scheduled notification window.
- Pause and disable are reversible schedule states. Resume/enable reschedules the reminder using the same permission/scheduling flow from Story 3.3.
- Delete remains a soft delete and must cancel active scheduled notifications.
- Do not implement missed delivery detection, missed reminder recovery records, dismissed-state history, Today overview recovery rows, Review summaries, notification fatigue analytics, complex recurrence, or OS settings deep links in this story.
- Do not request notification permission on startup.
- Do not add a broad global store.

### Current Repository State

- Story 3.3 added `reminders`, `reminder_exceptions`, `reminder_scheduled_notifications`, and `diagnostic_events` through migration 011.
- `ReminderScheduleState` currently includes `scheduled`, `permission_denied`, `unavailable`, `failed`, and `local_only`.
- `ReminderDeliveryState` already includes `scheduled`, `sent`, `missed`, `snoozed`, `paused`, `disabled`, `dismissed`, and `complete`.
- `reminder_scheduled_notifications.delivery_state` can already represent `snoozed`, `paused`, and `disabled` values at the notification row level.
- `reminders.schedule_state` is a text column and can be safely extended at the domain/schema level without a database migration.
- `createReminderRepository` currently supports create/list/get/delete/update schedule state, skip exceptions, and scheduled-notification replacement.
- `reminder.service.ts` currently supports create, load, skip next occurrence, and delete. It already has helper logic for owner validation, bounded scheduling, cancellation, diagnostics, and schedule state updates.
- `useReminderCapture.ts` currently supports create, save local-only, reload, owner/frequency fields, task/recurrence owner selection, and skip next occurrence.
- `ReminderForm.tsx` currently supports reminder creation, local-only save, listing reminders, recovery state copy, and skip next occurrence.

### Recommended Data Semantics

- `schedule_state = "snoozed"` means the next occurrence has a temporary replacement scheduled notification. The reminder source date/time remains unchanged.
- `delivery_state = "snoozed"` should be used on the replacement scheduled notification row for the snoozed occurrence.
- `schedule_state = "paused"` means the reminder is intentionally stopped until resumed. Active scheduled notification rows should be soft-deleted after platform cancellation.
- `schedule_state = "disabled"` means notifications for this reminder are intentionally off until enabled. The reminder remains visible and editable.
- Rescheduling should preserve the reminder id and created timestamp, update `updated_at`, and set `source_of_truth = "manual"`.
- Resume and enable should reuse the bounded scheduling window from Story 3.3, not native infinite repeat triggers.
- A one-time reminder can be snoozed if it has a next open occurrence. A repeat reminder can be snoozed for the next open occurrence only.
- Deleted reminders should not appear in active reminder lists, and delete must not delete linked task or task recurrence data.

### UI Guidance

- Controls should be compact and utilitarian, consistent with `TaskRecurrenceForm` and Story 3.3 `ReminderForm`.
- Use neutral copy:
  - "Snoozed for 30 minutes"
  - "Reminder paused"
  - "Reminder disabled"
  - "Reminder resumed"
  - "Reminder enabled"
  - "Reminder removed from active reminders"
  - "You can turn this back on later"
- Avoid shame or pressure language such as "ignored", "failed", "missed again", "bad streak", or "too many reminders".
- State must be visible in text, not color alone.
- Button labels should include the action and target concept, for example "Snooze reminder 30 min", "Pause reminder", "Resume reminder", "Disable reminder", "Enable reminder", and "Delete reminder".

### Architecture Compliance

- Domain owns reminder state types and validation.
- Repository owns SQLite updates and scheduled notification row replacement.
- Service owns schedule orchestration, cancellation, permission/scheduler outcomes, and timestamp semantics.
- Notification adapter remains behind `NotificationSchedulerPort`.
- Feature hook owns UI state and service calls.
- React components use UI primitives and do not import repositories, migrations, SQLite clients, or `expo-notifications`.
- Use typed `AppResult` errors for expected validation, unavailable scheduling, permission denied, and missing reminder records.

### Anti-Patterns To Avoid

- Do not alter money recurrence or task recurrence tables.
- Do not materialize task occurrences or create task rows for reminders.
- Do not hard-delete reminder records or scheduled notification rows.
- Do not rely on native infinite repeat triggers for recurrence.
- Do not log reminder title, notes, task title, occurrence local date, platform notification id, or local file/path values.
- Do not implement Story 3.5 missed-recovery behavior early.
- Do not introduce a new notification library or dependency.

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

- Domain validation for new schedule states.
- Repository update and reminder timing state transitions.
- Scheduled notification replacement when snoozing, pausing, disabling, resuming, enabling, rescheduling, and deleting.
- Service behavior with fake notification scheduler for all timing actions and cancellation paths.
- Hook/reducer state transitions for edit, reschedule, snooze, pause/resume, disable/enable, delete, reload, and field validation.

### Previous Story Intelligence

- Story 3.3 established reminder domain contracts, migration 011, repository/service patterns, notification scheduler port, Expo adapter, redacted scheduling diagnostics, and `ReminderForm`/`useReminderCapture`.
- Story 3.3 intentionally deferred snooze, reschedule, pause, disable, reminder fatigue tuning, and reversible timing changes to this story.
- Story 3.3 scheduling uses a bounded 60-day / 30-occurrence window and concrete local notifications so optional end dates and skip exceptions remain enforceable.
- Story 3.3 delete service already soft-deletes reminders and scheduled notification rows after platform cancellation; Story 3.4 should expose and test it in UI flow.
- Existing tests use co-located `.test.ts` files with fakes for repositories and services.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 3.4 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR38, FR39, FR40, FR41, NFR-UX-02, NFR-UX-03, NFR-MOB-01, NFR-MOB-02, NFR-MOB-03]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local notifications, reminder states, repository/service boundaries, diagnostics rules]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Reminder Recovery Row, calm controls, non-color-only state, recovery actions]
- [Source: `_bmad-output/implementation-artifacts/3-3-create-deadline-and-repeat-reminders.md` - reminder schema/service/UI and explicit deferred Story 3.4 scope]
- [Source: `docs/automation-reports/story-3.3-review.md` - Story 3.3 review notes and known risks]
- [Source: `src/domain/reminders/types.ts`, `src/domain/reminders/schemas.ts`, `src/data/repositories/reminders.repository.ts`, `src/services/reminders/reminder.service.ts`, `src/features/reminders/useReminderCapture.ts`, `src/features/reminders/ReminderForm.tsx`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

### Completion Notes List

- Extended reminder schedule-state validation with `snoozed`, `paused`, and `disabled` without a database migration.
- Added reminder update/reschedule repository and service flow that preserves reminder identity and rewrites scheduled notification rows.
- Added snooze, pause/resume, disable/enable, and delete orchestration with bounded scheduling reused from Story 3.3.
- Updated reminder hook/UI with edit timing and explicit timing-control buttons using existing primitives and text-based state.
- Added focused domain, repository, service, and hook tests for the new control paths.

### File List

- `_bmad-output/implementation-artifacts/3-4-control-reminder-timing-and-reminder-fatigue.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-3.4-review.md`
- `src/data/repositories/reminders.repository.ts`
- `src/data/repositories/reminders.repository.test.ts`
- `src/domain/reminders/schemas.ts`
- `src/domain/reminders/types.ts`
- `src/domain/reminders/reminders.test.ts`
- `src/features/reminders/ReminderForm.tsx`
- `src/features/reminders/useReminderCapture.ts`
- `src/features/reminders/useReminderCapture.test.ts`
- `src/services/reminders/reminder.service.ts`
- `src/services/reminders/reminder.service.test.ts`

## Change Log

- 2026-05-08: Created Story 3.4 from Epic 3 reminder timing/fatigue requirements and Story 3.3 implementation context.
- 2026-05-08: Implemented reminder timing controls, tests, and verification for Story 3.4.
