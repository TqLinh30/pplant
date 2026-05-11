# Story 4.2: Launch Quick Capture Within Two Taps

Status: done

## Story

As a student,
I want to start common capture flows from Today quickly,
so that recording life events fits into short daily sessions.

## Acceptance Criteria

1. Given Today has loaded, when I open the capture launcher, then expense, task, work entry, income, and reminder capture actions are available, and each supported capture flow starts within no more than two taps after overview load.
2. Given receipt capture has not yet been implemented, when the capture launcher renders during Epic 4, then receipt capture is either absent or clearly unavailable, and no broken receipt flow is exposed to users.
3. Given an action requires permission such as camera or notifications, when I select that action, then the permission request appears in context, and manual alternatives remain available when permission is denied.
4. Given I use screen reader or dynamic text, when the capture launcher opens, then each action has an accessible label, and text scaling does not hide required actions.

## Tasks / Subtasks

- [x] Define quick capture action contracts and routing behavior. (AC: 1, 2, 3, 4)
  - [x] Add a small typed model for supported quick capture actions in `src/features/today/quick-capture.ts` or equivalent.
  - [x] Include exactly these supported actions for Story 4.2: expense, income, task, work entry, reminder.
  - [x] Omit receipt capture for Story 4.2, or show it only as disabled/unavailable with explicit copy; do not route to receipt capture yet.
  - [x] Map actions to existing safe destinations: manual money capture for expense/income, task capture, work entry capture, and reminder capture.
  - [x] Keep route targets declarative and testable; avoid stringly typed ad hoc routing inside button handlers where a helper can make behavior explicit.

- [x] Add the Today capture launcher UI. (AC: 1, 2, 4)
  - [x] Add a primary Today header action such as "Capture" that opens the launcher in one tap.
  - [x] Use existing `BottomSheet`, `Button`, `ListRow`, `StatusBanner`, tokens, and React Native primitives.
  - [x] Render the actions in a stable mobile-first layout that tolerates dynamic text without hiding required actions.
  - [x] Give every action a descriptive `accessibilityLabel`.
  - [x] Ensure the selected action starts its capture flow on the second tap.
  - [x] Keep existing section-level buttons if useful, but the launcher must be the primary Story 4.2 path.

- [x] Wire action targets to existing capture surfaces. (AC: 1, 3)
  - [x] For expense and income, deep-link into the existing Capture tab and preselect the manual money kind when possible.
  - [x] For task, route to the existing task capture surface (`src/app/task/[taskId].tsx` / `TaskRouteScreen`) using a safe "new" route value if needed.
  - [x] For reminder, route to the existing reminder capture surface (`src/app/reminder/[reminderId].tsx` / `ReminderRouteScreen`) using a safe "new" route value if needed.
  - [x] For work entry, add a small route/screen wrapper if needed so the work form can start without forcing the user to scroll through unrelated Capture content.
  - [x] Do not duplicate form business logic; reuse existing feature forms/hooks.
  - [x] Do not request notification permission in the launcher itself. Reminder permission should remain contextual in the reminder flow, with the existing local-only fallback when denied.

- [x] Preserve boundaries and future-story scope. (AC: 2, 3)
  - [x] Do not implement receipt capture, receipt draft persistence, receipt parsing, Story 4.3 draft recovery, Story 4.4 end-of-day review, or Story 4.5 exhaustive UX state matrix.
  - [x] Do not add migrations or new persistent state for the launcher.
  - [x] Do not add large dependencies or a new UI kit.
  - [x] Do not log action titles, user-entered money/task/reminder/work details, or permission-sensitive data.

- [x] Add focused tests and verification. (AC: 1, 2, 3, 4)
  - [x] Add tests for quick capture action definitions: required actions present, receipt absent/disabled, labels available, and route mapping stable.
  - [x] Add reducer/helper tests for launcher open/close/select behavior if a reducer/helper is introduced.
  - [x] Add route/deep-link tests where reasonable for Capture preselection or work route wrapper behavior.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement only the quick capture launcher and safe handoff to existing capture surfaces.
- The launcher is not a draft system. Story 4.3 owns draft persistence/recovery.
- The launcher is not receipt capture. Epic 5 owns receipt photo, parsing, and correction.
- The launcher is not a full accessibility hardening pass. Story 4.5 owns exhaustive state/accessibility coverage, but Story 4.2 must include baseline accessible labels and visible text states.
- Avoid architecture changes; this story should be mostly feature UI, lightweight routing helpers, and tests.

### Current Repository State

- Story 4.1 is complete in commit `7d2c3b2`.
- Today now renders from `src/features/today/TodayScreen.tsx` using `useTodayOverview`.
- Today currently has section-level buttons that route to Capture or Settings, but no primary capture launcher sheet.
- Existing bottom sheet primitive: `src/ui/primitives/BottomSheet.tsx`.
- Existing Capture tab route: `src/app/(tabs)/capture.tsx` -> `src/features/capture/CaptureScreen.tsx`.
- `CaptureScreen` currently places manual money capture at the top, recurring money next, then `TaskForm`, then `WorkEntryForm`.
- `TaskForm` includes daily tasks, recurrence, and `ReminderForm`; dedicated task route exists at `src/app/task/[taskId].tsx`.
- Dedicated reminder route exists at `src/app/reminder/[reminderId].tsx`.
- There is no dedicated work route yet; adding a thin `src/app/work/[workEntryId].tsx` and `src/features/work/WorkRouteScreen.tsx` wrapper around `WorkEntryForm` is a small, safe option if it keeps the work action within two taps.
- `src/features/money/MoneyRouteScreen.tsx` is currently a placeholder; do not send users there for manual expense/income creation unless it is made real in scope. Prefer deep-linking the existing Capture tab and preselecting expense/income.

### Recommended Implementation Shape

- Add `src/features/today/quick-capture.ts` with:
  - `QuickCaptureActionId = 'expense' | 'income' | 'task' | 'work' | 'reminder'`
  - action metadata: title, description, accessible label, route target, optional disabled reason.
  - helper `quickCaptureActions` and `targetForQuickCaptureAction`.
- Add `src/features/today/QuickCaptureLauncher.tsx` or keep a small component near Today if simpler.
- Today header should expose one primary `Capture` button that opens `BottomSheet`.
- Bottom sheet action tap should close the sheet and route:
  - expense: `/(tabs)/capture` with query/param that sets manual money kind to `expense`
  - income: `/(tabs)/capture` with query/param that sets manual money kind to `income`
  - task: `/task/new`
  - reminder: `/reminder/new`
  - work: `/work/new` if a route wrapper is added, otherwise a bounded Capture handoff that lands on work entry without scrolling
- If adding Capture query params, keep them narrow, e.g. `quick=expense | income`, and handle unknown params as no-op.
- If adding Work route, keep it thin and reuse `WorkEntryForm`; do not fork work capture behavior.
- Use `router.push` only from feature/UI action handlers, not from domain helpers.

### Permission Guidance

- Do not request camera permission because receipt action should be absent or unavailable in Story 4.2.
- Do not request notification permission when the launcher opens.
- Reminder permission should remain contextual in the reminder save/scheduling flow. Existing reminder behavior already supports local-only/fallback states when permission is denied or unavailable; preserve that.
- If copy references permissions, keep it neutral and explicit: "Notifications are requested when you save a reminder. You can save local-only if they are off."

### UI Guidance

- Capture launcher should feel like a focused action sheet, not a dashboard.
- Avoid decorative cards and nested card layouts.
- Keep actions scan-friendly and stable under text scaling; one action per row is safer than a dense grid.
- Each action row should include text state, not just icons or color.
- Use neutral labels:
  - "Expense"
  - "Income"
  - "Task"
  - "Work entry"
  - "Reminder"
- Suggested receipt copy if disabled instead of absent: "Receipt capture arrives later. Use manual expense for now."

### Architecture Compliance

- React components may import feature helpers, router, and UI primitives.
- React components must not import SQLite clients, migrations, repositories, `expo-notifications`, or camera APIs for this story.
- Domain/service layers should not be needed unless a tiny route helper is placed in feature code.
- No database migrations.
- No new external dependencies.

### Performance Guidance

- The launcher should not trigger data loading or migrations.
- Opening the sheet should be synchronous UI state only.
- Selecting an action should perform only one route transition.

### Previous Story Intelligence

- Story 4.1 introduced Today overview, summary service, and report at `docs/automation-reports/story-4.1-review.md`.
- 4.1 left section buttons pointing to Capture/Settings; 4.2 should add the primary launcher path without regressing those sections.
- 4.1 verification passed: `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.
- `.claude/worktrees/` is untracked and must not be committed.

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

- Quick capture action list includes expense, income, task, work, and reminder.
- Receipt action is absent or disabled/unavailable; no route to a broken receipt flow.
- Every action has an accessible label and user-facing title.
- Route target helper maps each supported action to the intended safe route.
- Unknown Capture query params do not break Capture.
- If a work route wrapper is added, it renders `WorkEntryForm` through existing patterns.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 4.2 acceptance criteria and Epic 4 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR8, NFR-UX-01, NFR-UX-03, NFR-A11Y-02, NFR-A11Y-03]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Expo Router, feature/domain/service boundaries, local-first capture, permission context]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Capture Launcher Sheet, bottom-sheet patterns, two-tap capture, accessible labels]
- [Source: `_bmad-output/implementation-artifacts/4-1-build-the-today-overview-stack.md` - Today overview implementation context]
- [Source: `src/features/today/TodayScreen.tsx`, `src/features/capture/CaptureScreen.tsx`, `src/ui/primitives/BottomSheet.tsx`, `src/features/tasks/TaskForm.tsx`, `src/features/reminders/ReminderForm.tsx`, `src/features/work/WorkEntryForm.tsx`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 4.2 ready-for-dev from Epic 4, PRD, architecture, UX, and Story 4.1 implementation context.
- 2026-05-08: Started Story 4.2 implementation.
- 2026-05-08: Added quick capture action model, launcher sheet, Capture tab preselection, Work route wrapper, focused tests, and verification.

### Completion Notes List

- Implemented a primary Today "Capture" launcher using the existing `BottomSheet` and row primitives.
- Added typed quick capture actions for expense, income, task, work entry, and reminder; receipt capture is not exposed as a route in Story 4.2.
- Expense/income handoff deep-links into the Capture tab with a sequenced quick param so repeated same-action handoffs are applied.
- Work entry now has a thin dedicated route wrapper that reuses `WorkEntryForm`.
- Reminder notification permission remains contextual in the reminder flow; the launcher does not request platform permissions.
- Automated verification passed; no physical-device/manual dynamic-text run was performed in this pass.

### File List

- `_bmad-output/implementation-artifacts/4-2-launch-quick-capture-within-two-taps.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-4.2-review.md`
- `src/app/work/[workEntryId].tsx`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/capture/quickCaptureParams.ts`
- `src/features/capture/quickCaptureParams.test.ts`
- `src/features/today/QuickCaptureLauncher.tsx`
- `src/features/today/TodayScreen.tsx`
- `src/features/today/quick-capture.ts`
- `src/features/today/quick-capture.test.ts`
- `src/features/work/WorkRouteScreen.tsx`

## Change Log

- 2026-05-08: Created Story 4.2 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed quick capture launcher implementation and self-review.
