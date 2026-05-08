# Story 3.3: Create Deadline And Repeat Reminders

Status: ready-for-dev

## Story

As a student,
I want to create one-time and repeat reminders,
so that Pplant can help me remember tasks without demanding attention at the wrong time.

## Acceptance Criteria

1. Given I create a task or reminder, when I add a deadline or repeat schedule, then local reminder scheduling is configured and daily, weekly, monthly, optional end-date, and skip-occurrence rules are supported.
2. Given notification permission has not been granted, when I enable a reminder, then Pplant asks for notification permission in context and provides a manual alternative if permission is denied.
3. Given reminder scheduling fails or is unavailable, when the app detects the failure, then it records a redacted diagnostic event and shows an in-app recovery state.

## Tasks / Subtasks

- [ ] Add reminder domain contracts and validation. (AC: 1, 2, 3)
  - [ ] Add reminder types under `src/domain/reminders`, extending the existing placeholder instead of creating a parallel reminder domain elsewhere.
  - [ ] Support reminder owner kinds: `standalone`, `task`, and `task_recurrence`.
  - [ ] Support frequencies: `once`, `daily`, `weekly`, and `monthly`.
  - [ ] Validate title, optional notes, owner ids, local start date, local reminder time, optional end date, skip dates, permission/schedule state, notification ids, and timestamps.
  - [ ] Reuse `generateRecurrenceOccurrences` for daily, weekly, and monthly occurrence dates; do not write another calendar stepper.
  - [ ] Add helpers for combining `YYYY-MM-DD` local dates and `HH:mm` local times into schedule requests without storing timezone-shifted dates as the source of truth.

- [ ] Add additive reminder persistence. (AC: 1, 2, 3)
  - [ ] Add migration 011 with reminder-specific tables.
  - [ ] Do not alter `recurrence_rules`, `task_recurrence_rules`, money recurrence behavior, or task recurrence behavior.
  - [ ] Add `reminders` for reminder rules and one-time reminders:
    - `id`, `workspace_id`, `owner_kind`, `task_id`, `task_recurrence_rule_id`
    - `title`, `notes`, `frequency`, `starts_on_local_date`, `reminder_local_time`, `ends_on_local_date`
    - `source`, `source_of_truth`, `permission_status`, `schedule_state`
    - `created_at`, `updated_at`, `deleted_at`
  - [ ] Add `reminder_exceptions` for skipped repeat reminder occurrences:
    - `id`, `reminder_id`, `workspace_id`, `occurrence_local_date`, `action`, `created_at`, `updated_at`
    - Unique index on `(workspace_id, reminder_id, occurrence_local_date, action)`.
  - [ ] Add `reminder_scheduled_notifications` for platform schedule ids:
    - `id`, `reminder_id`, `workspace_id`, `occurrence_local_date`, `fire_at_local`, `scheduled_notification_id`
    - `delivery_state`, `schedule_attempted_at`, `schedule_error_category`, `created_at`, `updated_at`, `deleted_at`
    - Unique active lookup by `(workspace_id, reminder_id, occurrence_local_date)`.
  - [ ] Add `diagnostic_events` only if no reusable diagnostics repository already exists by implementation time; keep payload redacted and bounded to allowed non-sensitive metadata.
  - [ ] Add Drizzle schema mappings and migration tests proving migration 011 is additive.

- [ ] Implement reminder repository behavior. (AC: 1, 2, 3)
  - [ ] Create one-time and repeat reminder rules.
  - [ ] Get and list active reminders for the local workspace.
  - [ ] Soft-delete reminders without deleting task or task recurrence data.
  - [ ] Store skip exceptions idempotently for repeat reminder occurrences.
  - [ ] Store, replace, and soft-delete scheduled notification ids by reminder occurrence.
  - [ ] Return typed `AppResult` errors and never log reminder title, notes, task title, or occurrence details.

- [ ] Implement notification scheduler port and Expo adapter. (AC: 1, 2, 3)
  - [ ] Add `expo-notifications` using `npx expo install expo-notifications`; do not hand-edit incompatible dependency versions.
  - [ ] Expand `src/services/notifications/notification-scheduler.port.ts` to include:
    - permission read/request operations,
    - schedule operation returning platform notification id,
    - cancel by platform notification id,
    - scheduled notification inspection where useful for tests or recovery.
  - [ ] Implement `src/services/notifications/expo-notification-scheduler.ts` with `expo-notifications`.
  - [ ] Request notification permission only after the user enables or saves a reminder, never during app startup.
  - [ ] Configure an Android notification channel before requesting Android permission.
  - [ ] Treat local notification delivery as best effort; unsupported platform, denied permission, or native schedule failure should return typed recoverable errors.
  - [ ] Keep the adapter dependency-injectable so service tests do not need native notification APIs.

- [ ] Implement reminder service orchestration. (AC: 1, 2, 3)
  - [ ] Follow the same dependency-injection pattern used by task and task recurrence services: open database, run migrations, create repositories, use local workspace id.
  - [ ] Validate owner references:
    - `standalone` reminders have no task owner.
    - `task` reminders reference an active `tasks` row.
    - `task_recurrence` reminders reference an active `task_recurrence_rules` row.
  - [ ] Generate bounded virtual reminder occurrences from start date, frequency, optional end date, skip exceptions, and local time.
  - [ ] Schedule only a bounded upcoming window of concrete occurrences so optional end dates and skip exceptions remain enforceable.
  - [ ] Persist platform notification ids after successful scheduling and cancel/rewrite stale scheduled ids when a reminder is replaced during creation flow.
  - [ ] If permission is denied, save the reminder as local-only with `schedule_state = "permission_denied"` and show manual recovery copy.
  - [ ] If scheduling fails or is unavailable, save a recoverable in-app state, record a redacted `reminder_scheduling_failed` diagnostic event, and do not lose the reminder.
  - [ ] Do not implement snooze, reschedule, pause, disable, delete controls beyond basic soft-delete support needed for data safety; those belong to Story 3.4.
  - [ ] Do not implement missed-delivery recovery beyond schedule failure/unavailable states; missed reminder recovery belongs to Story 3.5.

- [ ] Add reminder UI surfaces. (AC: 1, 2, 3)
  - [ ] Replace the current placeholder `ReminderRouteScreen` with a usable reminder creation surface.
  - [ ] Add a task-linked reminder section to the existing task surface or task detail flow without breaking manual task capture.
  - [ ] Use existing primitives: `Button`, `ListRow`, `SegmentedControl`, `StatusBanner`, and `TextField`.
  - [ ] Provide controls for title, notes, owner context, frequency, start date, local reminder time, optional end date, skip occurrence, save, and save local-only when permission is denied.
  - [ ] Show scheduled, permission-denied, unavailable, and local-only recovery states with explicit text, not color alone.
  - [ ] Use neutral copy such as "Reminder saved locally", "Notifications are off", "Scheduling is unavailable right now", and "You can still use this reminder in Pplant."
  - [ ] Keep this story scoped to create/schedule flows; do not expose snooze, reschedule, pause, disable, reminder fatigue controls, Today overview integration, Review summaries, or draft persistence.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Test reminder validation for owner kind, title, notes, frequency, start/end dates, local time, skip dates, and schedule state.
  - [ ] Test recurrence generation for one-time, daily, weekly, monthly clamp, leap day, optional end date, skipped date, and bounded schedule windows.
  - [ ] Test migration 011 is additive and does not change money or task recurrence tables.
  - [ ] Test repository create/list/delete/skip/scheduled-notification replacement behavior.
  - [ ] Test service behavior with fake notification scheduler for granted, denied, unavailable, schedule failure, and cancellation/rewrite paths.
  - [ ] Test diagnostic redaction for reminder scheduling failures.
  - [ ] Test hook/reducer validation and state transitions for create, permission denied, unavailable scheduling, retry/reload, and local-only recovery.
  - [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement creation and initial local scheduling for one-time and repeat reminders only.
- Keep repeat rules limited to daily, weekly, and monthly plus optional inclusive end date and skipped occurrences.
- Do not implement Story 3.4 controls: snooze, reschedule, pause, disable, reminder fatigue tuning, or reversible timing changes.
- Do not implement Story 3.5 recovery: missed reminder detection, missed task recovery rows, or sent/dismissed/complete delivery lifecycle beyond fields needed for future compatibility.
- Do not implement Today overview, capture launcher, review summaries, reminder history search, or draft persistence in this story.
- Do not send reminder text, task titles, notes, occurrence dates, or notification ids to diagnostics.

### Current Repository State

- `src/domain/reminders/types.ts` currently only defines `ReminderDeliveryState`.
- `src/domain/reminders/schemas.ts` currently only defines `reminderDeliveryStateSchema`.
- `src/features/reminders/ReminderRouteScreen.tsx` is a placeholder screen.
- `src/services/notifications/notification-scheduler.port.ts` currently has a minimal schedule/cancel contract with `reminderId` and `fireAtLocal`.
- `src/services/notifications/expo-notification-scheduler.ts` currently returns `unavailable`; it does not import `expo-notifications`.
- `src/app/reminder/[reminderId].tsx` already routes to `ReminderRouteScreen`.
- Story 3.1 added manual tasks in `tasks` and `task_topics`.
- Story 3.2 added task/habit recurrence in dedicated `task_recurrence_*` tables and virtual occurrence generation.
- `package.json` currently does not include `expo-notifications`.
- `src/diagnostics/events.ts` already includes `reminder_scheduling_failed` and safe metadata keys such as `permissionStatus` and `deliveryState`.
- `src/diagnostics/redact.ts` allowlists diagnostic metadata keys and rejects path/URI-like sensitive values.

### Recommended Data Semantics

- A reminder is a user-visible local record, not just a platform notification id.
- `owner_kind = "standalone"` means a reminder exists independently of a task.
- `owner_kind = "task"` links to a manual task row and must not duplicate or overwrite the task.
- `owner_kind = "task_recurrence"` links to a task recurrence rule and must not materialize task occurrences.
- `frequency = "once"` represents one one-time occurrence on `starts_on_local_date` at `reminder_local_time`.
- Repeat reminders use `starts_on_local_date` as their recurrence anchor.
- `ends_on_local_date` is inclusive.
- Skipped occurrence exceptions suppress scheduling for that occurrence.
- Because platform repeat triggers cannot reliably express every optional end-date and skip rule, services should generate a bounded upcoming window and schedule concrete local notifications for those dates.
- The bounded schedule window should be small and deterministic for tests, for example 30 to 60 days or a fixed max occurrence count. Document the chosen bound in code comments and tests.
- `permission_status` stores the observed permission state when scheduling was attempted, not a promise about future OS state.
- `schedule_state` should distinguish at least `scheduled`, `permission_denied`, `unavailable`, and `failed`.
- Platform notification ids are sensitive operational identifiers. Store them locally, but do not show or log them.

### Notification Implementation Notes

- Use the official Expo SDK 55 Notifications module, installed with `npx expo install expo-notifications`.
- Use `Notifications.getPermissionsAsync()` before requesting permission and `Notifications.requestPermissionsAsync()` only in context after the user enables or saves a reminder.
- Configure Android notification channels before asking notification permission on Android.
- Use `Notifications.scheduleNotificationAsync()` to schedule local notifications and persist its returned notification id.
- Use `Notifications.cancelScheduledNotificationAsync(id)` when replacing or deleting scheduled local notifications.
- Use `Notifications.getAllScheduledNotificationsAsync()` or `Notifications.getNextTriggerDateAsync()` only where needed for recovery/testing; do not make UI depend on them for source-of-truth state.
- Keep the Expo adapter behind the port so Jest tests can use fakes and do not require native modules.
- Local notifications are best effort within platform limits; denied permission, unavailable platform support, or scheduling errors should not block saving the reminder record.

### UI Guidance

- Reminder creation should be compact and utilitarian, consistent with the existing task and recurrence forms.
- Ask for required information first: title, date, time, frequency.
- Keep optional end date, notes, owner context, and skip occurrence controls secondary.
- If permission is denied, provide a direct local-only option instead of blocking the user.
- State labels must be text-visible: "Scheduled", "Notifications are off", "Saved locally", "Scheduling unavailable", "Skipped".
- Avoid language like "failed to keep up", "missed again", "bad streak", or "ignored".
- Components must not import repositories, migrations, SQLite clients, or `expo-notifications` directly. Use hooks/services.

### Architecture Compliance

- Domain code owns reminder types, validation, and pure occurrence generation.
- Repositories own SQLite persistence, soft deletion, skip exceptions, scheduled notification ids, and diagnostic event storage if added.
- Services own database opening, migration, owner validation, permission/scheduling orchestration, diagnostics, and timestamp semantics.
- Notification adapters live under `src/services/notifications` and are called through `NotificationSchedulerPort`.
- Feature hooks own UI state and service calls.
- React components use primitives and do not import platform notification APIs.
- Use typed `AppResult` errors for expected permission denied, unavailable scheduling, validation failure, and missing owner records.
- Use Zod at row parsing and service boundary validation.

### Anti-Patterns To Avoid

- Do not reuse or alter money recurrence tables for reminders.
- Do not alter task recurrence tables except to read active owner rules when linking a reminder.
- Do not create one `tasks` row per reminder occurrence.
- Do not rely on a native infinite repeating notification when the reminder has an end date or skipped dates.
- Do not request notification permission during app startup or workspace initialization.
- Do not fail reminder save just because notification permission is denied.
- Do not log reminder title, notes, task title, occurrence local date, platform notification id, or local file/path values.
- Do not add a broad global store for reminder state.
- Do not implement future-story controls early.

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

- Domain validation and occurrence generation for one-time, daily, weekly, monthly, leap day, end date, skipped date, and invalid local time.
- Migration 011 additive safety and preservation of `recurrence_rules`, `task_recurrence_rules`, `tasks`, and existing diagnostics types.
- Repository create/list/soft-delete/skip/scheduled notification id replacement.
- Service owner validation for standalone, task, and task recurrence reminders.
- Service scheduling paths for permission granted, permission denied, unavailable scheduler, scheduling failure, and local-only save.
- Redacted diagnostic event behavior for scheduling failures.
- Hook/reducer state transitions for loading, saving, saved, permission denied, unavailable, field validation, and recovery copy.

### Previous Story Intelligence

- Story 3.1 established manual task validation, task repository/service dependency injection, local workspace scoping, and the existing `TaskForm` UI pattern.
- Story 3.2 established dedicated task recurrence tables, virtual occurrences, skip exceptions, completion rows, and reuse of `generateRecurrenceOccurrences`.
- Story 3.2 deliberately did not request notification permission, schedule notifications, create reminder records, or implement reminder recovery.
- Follow the existing service pattern: dependencies accept `openDatabase`, `migrateDatabase`, `create...Repository`, id factories, and `now`.
- Existing tests use co-located `.test.ts` files with fakes for repositories and services.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 3.3 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR36, FR37, FR38, FR40, FR41, NFR-UX-03, NFR-MOB-01, NFR-MOB-02, NFR-MOB-03, NFR-OBS-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local notifications, service port boundaries, diagnostics, repository ownership, result/error patterns]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - in-context permission, reminder recovery copy, non-color-only state, neutral language]
- [Source: `_bmad-output/implementation-artifacts/3-1-create-and-manage-daily-tasks.md` - manual task model and task UI/service/repository patterns]
- [Source: `_bmad-output/implementation-artifacts/3-2-manage-recurring-tasks-and-habits.md` - task recurrence model, virtual occurrences, and scope boundaries]
- [Source: `src/services/notifications/notification-scheduler.port.ts` - existing notification scheduler port placeholder]
- [Source: `src/services/notifications/expo-notification-scheduler.ts` - current unavailable adapter placeholder]
- [Source: `src/diagnostics/events.ts` and `src/diagnostics/redact.ts` - redacted diagnostics metadata rules]
- [Source: Expo SDK 55 Notifications docs: `https://docs.expo.dev/versions/v55.0.0/sdk/notifications/`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Pending.

### Completion Notes List

- Pending.

### File List

- Pending.

## Change Log

- 2026-05-08: Created Story 3.3 from Epic 3 reminder requirements and current codebase placeholders.
