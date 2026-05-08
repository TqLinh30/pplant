# Story 3.5 Independent Code Review

## Story

Story 3.5: Recover From Missed Tasks And Reminders

## Scope Reviewed

- Diff from `521e2ae` through `cc99922`.
- Recovery domain rules, migration, repository, service orchestration, UI hook/panel, route mounting, and focused tests.

## Findings

### CHANGES_REQUESTED

1. [P1] Edit/reschedule recovery actions resolve the prompt without performing recovery.
   - Location: `src/features/recovery/useRecovery.ts:186`
   - Evidence: `edit` and `reschedule` actions call `recordHandoff`, which records a `recovery_events` row and then reloads recovery data. The recovery panel does not consume `state.editingTarget`, and the task, recurrence, and reminder forms are not wired to that handoff state.
   - Impact: A user can tap Edit or Reschedule, see the recovery item disappear, and never get an existing edit/reschedule surface. Source task/reminder state is unchanged, but the recovery event makes the item look resolved in later recovery loads.
   - AC impact: Violates AC3 and the story task that edit/reschedule should route into existing edit/update flows or expose hook state actually consumed by those forms.

## Commands Run During Review

- `git branch --show-current`
- `git status --short`
- `git diff --stat 521e2ae..cc99922`
- `git diff 521e2ae..cc99922`
- Targeted source inspection with `Get-Content` and `Select-String`

## Verification Status

Previous Story 3.5 implementation verification passed before this independent review:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

No new verification suite was run for this review-only report.

## Verdict

CHANGES_REQUESTED

Do not mark Story 3.5 done and do not proceed to Epic 4 / Story 4.1 until the edit/reschedule recovery handoff is fixed and reviewed again.

## Re-review: 2026-05-08

### Resolution

- Added `RecoveryHandoffProvider` and target matching helpers.
- `RecoveryPanel` now emits successful `edit` and `reschedule` handoffs after the recovery action succeeds.
- `TaskForm`, `TaskRecurrenceForm`, and `ReminderForm` consume matching handoffs and open their existing edit surfaces.
- `ReminderRouteScreen` filters recovery prompts to reminder targets because that route only hosts reminder editing.
- Added focused recovery handoff matching tests.

### Commands Run

- `npm test -- --runTestsByPath src/features/recovery/recovery-handoff.test.ts src/features/recovery/useRecovery.test.ts src/features/tasks/useTaskCapture.test.ts src/features/tasks/useTaskRecurrence.test.ts src/features/reminders/useReminderCapture.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

### Re-review Verdict

APPROVED

The P1 finding is resolved. Story 3.5 can be marked done and BMAD may continue to Epic 4 / Story 4.1.
