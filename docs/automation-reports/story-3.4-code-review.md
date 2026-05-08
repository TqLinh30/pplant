# Story 3.4 Code Review: Control Reminder Timing And Reminder Fatigue

## Review Target

- Branch: `auto/codex-overnight-1`
- Story commit: `6d6989f feat: complete story 3.4 - reminder timing controls`
- Story file: `_bmad-output/implementation-artifacts/3-4-control-reminder-timing-and-reminder-fatigue.md`

## Findings

### [P2] Cancel platform notifications before dropping local rows when permission is no longer granted

- File: `src/services/reminders/reminder.service.ts`
- Lines: 626-640, 1097-1103, 1281-1307
- Status: RESOLVED in `e7ee971 fix: address story 3.4 notification cleanup`

`scheduleReminderNotifications()` returns `permission_denied` or `local_only` before calling `cancelExistingScheduledNotifications()`. `updateReminder()` then applies that result and soft-deletes scheduled-notification rows, so an already-scheduled reminder that is rescheduled after permissions are revoked can lose its local notification ids while the native notifications remain queued. `snoozeReminder()` has the same pattern in its permission/unavailable branches: it calls `replaceScheduledNotifications(..., [])` without first cancelling existing platform ids. Fix by cancelling active scheduled notification ids before clearing local rows on every non-scheduled transition, and add tests where a previously scheduled reminder enters denied/unavailable/local-only state.

## Resolution

- Added `cancelExistingScheduledNotificationsBeforeClear()` so denied, unavailable, and local-only transitions cancel native notification ids before local scheduled-notification rows are cleared.
- Updated update and snooze flows to return the cancellation error instead of forgetting local ids when native cancellation fails.
- Added reminder service regression tests for update permission loss, snooze permission loss, and cancellation failure preserving local ids.

## Acceptance Criteria Review

- AC1: APPROVED. Main controls exist, and denied/unavailable/local-only transitions now cancel native schedules before rows are cleared.
- AC2: APPROVED. Paused/disabled reminders remain visible and task/recurrence data is not deleted.
- AC3: APPROVED. UI labels are descriptive and state is visible through text, not color only.

## Commands Run

- `git branch --show-current`
- `git status --short`
- `git show --stat --oneline 6d6989f`
- `git show --name-only --format=short 6d6989f`
- Read Story 3.4 implementation files and relevant notification adapter code.
- `npm test -- --runTestsByPath src/services/reminders/reminder.service.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `git diff --check`

## Security/Data-Safety Review

- No secrets or sensitive raw diagnostics were introduced.
- No destructive migration was added.
- The original data-safety issue is resolved: local scheduled-notification rows are retained if native cancellation fails, preserving ids for future cleanup.

## Final Verdict

APPROVED

Recommendation: Story 3.5 implementation can proceed from `_bmad-output/implementation-artifacts/3-5-recover-from-missed-tasks-and-reminders.md`.
