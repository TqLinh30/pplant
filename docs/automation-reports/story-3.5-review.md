# Story 3.5 Review: Recover From Missed Tasks And Reminders

## Story ID and Title

- Story 3.5: Recover From Missed Tasks And Reminders

## Acceptance Criteria Result

- AC1: APPROVED. Missed daily tasks, recurring task/habit occurrences, and reminder occurrences now load as recovery items with local actions.
- AC2: APPROVED. Overdue scheduled/snoozed reminder rows are marked `missed`, and disabled/unavailable/failed/permission-denied/local-only reminder states appear as in-app recovery states with neutral copy.
- AC3: APPROVED. Recovery actions update source state where applicable and append non-sensitive recovery outcome events for later Today and Review surfaces.

## Files Changed

- `_bmad-output/implementation-artifacts/3-5-recover-from-missed-tasks-and-reminders.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
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
- `src/features/recovery/recovery-handoff.tsx`
- `src/features/recovery/recovery-handoff.test.ts`
- `src/features/recovery/recovery-copy.ts`
- `src/features/recovery/recovery-copy.test.ts`
- `src/features/recovery/useRecovery.ts`
- `src/features/recovery/useRecovery.test.ts`
- `src/features/reminders/ReminderForm.tsx`
- `src/features/reminders/ReminderRouteScreen.tsx`
- `src/features/reminders/useReminderCapture.ts`
- `src/features/tasks/TaskForm.tsx`
- `src/features/tasks/TaskRecurrenceForm.tsx`
- `src/features/tasks/TaskRouteScreen.tsx`
- `src/features/tasks/useTaskCapture.ts`
- `src/features/tasks/useTaskRecurrence.ts`
- `src/services/recovery/recovery.service.ts`
- `src/services/recovery/recovery.service.test.ts`

## Database/API Changes

- Added migration `012_create_recovery_events`.
- Added `recovery_events` with only non-sensitive fields: ids, target enum, optional occurrence date, action enum, and timestamps.
- Added workspace/time and target lookup indexes.
- Added reminder repository method to mark overdue scheduled/snoozed rows as `missed` without deleting notification ids.
- Added recovery service APIs for loading recovery data and recording complete, snooze, pause, dismiss, edit, and reschedule outcomes.

## Tests Added/Updated

- Added recovery domain rule/schema tests.
- Added recovery repository tests for event persistence and target lookup.
- Updated migration tests for migration 012.
- Updated reminder repository tests for marking overdue notification rows missed.
- Added recovery service tests for missed detection, event recording, source updates, and hidden resolved items.
- Added recovery hook reducer and neutral-copy tests.
- Added recovery handoff matching tests for edit/reschedule routing.

## Commands Run

- `npm test -- --runTestsByPath src/domain/recovery/recovery.test.ts src/data/repositories/recovery.repository.test.ts src/data/repositories/reminders.repository.test.ts src/services/recovery/recovery.service.test.ts src/features/recovery/useRecovery.test.ts src/features/recovery/recovery-copy.test.ts src/data/db/migrations/migrate.test.ts`
- `npm test -- --runTestsByPath src/features/recovery/recovery-handoff.test.ts src/features/recovery/useRecovery.test.ts src/features/tasks/useTaskCapture.test.ts src/features/tasks/useTaskRecurrence.test.ts src/features/reminders/useReminderCapture.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- No secrets or credentials were added.
- No destructive migration was added.
- Recovery events intentionally exclude task/reminder titles, notes, notification platform ids, diagnostics details, file paths, receipt data, money amounts, and income values.
- Reminder missed detection updates delivery state only; it does not hard-delete reminders, tasks, completions, or scheduled notification rows.

## Architecture Consistency Review

- Domain code owns deterministic missed/recovery rules.
- Repository code owns SQLite persistence and parsing boundaries.
- Service code orchestrates existing task recurrence and reminder actions instead of duplicating scheduling logic.
- React components consume hook/service state and do not import SQLite, migrations, repositories, or notification adapters.
- Edit/reschedule recovery routing is handled at the feature layer through a provider and existing edit hooks, without duplicating scheduling or task update logic.
- Story 4 Today overview was not implemented early; the recovery panel is only mounted on existing task/reminder route surfaces.

## Known Risks

- Native notification delivery behavior still needs real device/emulator validation.
- The reusable recovery panel is mounted in route surfaces but not visually verified with screenshots in this pass.
- Reschedule/edit actions now open existing edit surfaces; richer visual affordances can be refined when Story 4 Today surfaces consume recovery items.
- `.claude/worktrees/` remains untracked and was not committed.

## Final Verdict

APPROVED
