# Story 4.1: Build The Today Overview Stack

Status: done

## Story

As a student,
I want one Today overview for money, tasks, reminders, savings, and work context,
so that I can understand my day without switching between separate dashboards.

## Acceptance Criteria

1. Given I open Pplant, when Today loads, then I see today's money, tasks, reminders, budget status, savings progress, and work-income context, and information is grouped with calm visual hierarchy.
2. Given Today has no records yet, when the screen loads, then it shows useful empty states, and each empty state offers one clear next action.
3. Given the standard MVP dataset exists, when Today loads from local data, then load performance meets the P95 target, and long computations do not block interaction.

## Tasks / Subtasks

- [x] Define Today summary contracts and deterministic calculations. (AC: 1, 2, 3)
  - [x] Expand `src/domain/summaries/today-summary.ts` from placeholder input into typed Today summary models.
  - [x] Include local date, budget period, money totals for today, budget status, savings progress, task counts, upcoming/open task items, reminder state counts, recovery item count, work minutes/income for today, and recent activity rows.
  - [x] Keep calculations pure, deterministic, and based on local dates; do not use locale-formatted strings as comparison inputs.
  - [x] Cap list surfaces and recent activity so Today does not render unbounded history.

- [x] Implement a Today overview service. (AC: 1, 2, 3)
  - [x] Add `src/services/summaries/today.service.ts`.
  - [x] Open/migrate the local database once per Today load and coordinate existing repositories/services where practical.
  - [x] Reuse existing repositories and domain functions: preferences, budget planning, money records, task summaries, task recurrence virtual occurrences, reminders, recovery events/items, and work entries.
  - [x] Use `resolveBudgetPeriodForDate` with the saved preferences reset day.
  - [x] Do not add or modify database migrations for this story unless a non-destructive additive table becomes absolutely necessary; preferred approach is computed summary data.
  - [x] Return typed `AppResult` errors and avoid logging or persisting sensitive task/reminder/money/work details outside existing tables.

- [x] Replace the Today placeholder with the real overview stack. (AC: 1, 2)
  - [x] Implement a feature hook such as `src/features/today/useTodayOverview.ts` with loading, ready, empty/partial, and failed states.
  - [x] Replace `src/features/today/TodayScreen.tsx` placeholder with a scrollable mobile-first overview.
  - [x] Use existing primitives/tokens (`StatusBanner`, `ListRow`, `Button`, `Chip`, typography, spacing, colors) instead of introducing a UI kit.
  - [x] Show sections in this order: date/week header, money and budget, savings, tasks and reminders, work context, recent activity.
  - [x] Use neutral copy and explicit text state; do not communicate status by color alone.
  - [x] For Story 4.1, do not build the Story 4.2 capture launcher sheet, Story 4.3 draft recovery, Story 4.4 end-of-day review, or Story 4.5 exhaustive UX state matrix early.

- [x] Surface useful empty and partial states. (AC: 2)
  - [x] If there are no money records today, show one clear next action pointing to capture.
  - [x] If there are no open tasks/reminders, show calm "clear for now" or setup copy without implying failure.
  - [x] If budget rules or savings goals are not configured, show one clear next action pointing to settings/setup context.
  - [x] If work entries are absent today, show a neutral empty state and one clear next action.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Add unit tests for Today summary calculations, including empty input, mixed money records, over-budget state, savings progress, task/reminder counts, and work totals.
  - [x] Add service tests with fake repositories/dependencies where reasonable to verify local-date filtering, bounded list counts, and failure handling.
  - [x] Add hook/reducer tests for loading, ready, empty/partial, and failed states.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement the Today overview stack only.
- Do not implement the quick capture launcher sheet; Story 4.2 owns it.
- Do not implement draft persistence or draft recovery; Story 4.3 owns it.
- Do not implement end-of-day review; Story 4.4 owns it.
- Do not implement the full Today accessibility/state-hardening pass beyond baseline accessible labels, loading, failed, empty, and non-color-only text; Story 4.5 owns the comprehensive pass.
- Do not implement weekly/monthly reflection summaries, receipt capture/parsing, cloud sync, authentication, or new external services.

### Current Repository State

- `src/features/today/TodayScreen.tsx` is still a placeholder using `FeaturePlaceholderScreen`.
- `src/domain/summaries/today-summary.ts` currently only exports `TodaySummaryInput`.
- Bottom tabs already route Today through `src/app/(tabs)/index.tsx`.
- Existing related data sources:
  - Money records: `src/data/repositories/money-records.repository.ts`, `src/services/money/money-history.service.ts`, `src/domain/money/calculations.ts`.
  - Budget/savings: `src/data/repositories/budget-planning.repository.ts`, `src/services/budgets/budget-planning.service.ts`, `src/domain/budgets/schemas.ts`.
  - Tasks: `src/data/repositories/tasks.repository.ts`, `src/services/tasks/task.service.ts`, `src/domain/tasks/task-summary.ts`.
  - Recurring tasks/habits: `src/data/repositories/task-recurrence.repository.ts`, `src/services/tasks/task-recurrence.service.ts`, `src/domain/tasks/task-recurrence.ts`.
  - Reminders: `src/data/repositories/reminders.repository.ts`, `src/services/reminders/reminder.service.ts`, `src/domain/reminders/reminder-occurrences.ts`.
  - Recovery: `src/services/recovery/recovery.service.ts`, `src/features/recovery/RecoveryPanel.tsx`, `src/features/recovery/recovery-handoff.tsx`.
  - Work: `src/data/repositories/work-entries.repository.ts`, `src/services/work/work-history.service.ts`, `src/domain/work/work-history.ts`.
- Story 3.5 is complete and approved. It added recovery events and a feature-level recovery handoff provider. Do not mount the actionful `RecoveryPanel` in Today unless the edit/reschedule handoff is safely handled by nearby edit surfaces; for Story 4.1 a read-only recovery summary or non-action list is safer.

### Recommended Data Semantics

- Today is a computed view, not a new source of truth.
- Money totals should use integer minor units only.
- Budget status should use the saved preferences reset day and the current budget period.
- Savings progress remains manual `currentAmountMinor` from savings goals.
- Task summary should include active non-deleted tasks and count open/done/overdue using the same domain rules as Story 3.1.
- Recurring task/habit occurrences should remain virtual; do not materialize occurrences into `tasks`.
- Reminder summaries should use reminder schedule state and upcoming occurrences; do not create or cancel platform notifications from Today load except through already-safe recovery scan behavior if explicitly reused.
- Recovery items should remain non-shaming and should not store titles/notes/platform ids in recovery events.

### UI Guidance

- Today should feel like a calm daily checkpoint, not a finance dashboard.
- Use compact sections with clear headings; avoid nested cards and decorative section cards.
- Suggested section labels:
  - "Today"
  - "Money today"
  - "Budget and savings"
  - "Tasks and reminders"
  - "Work context"
  - "Recent activity"
- Suggested neutral empty copy:
  - "No money records yet today."
  - "No open tasks due today."
  - "No reminder needs attention right now."
  - "No work logged today."
- Use one clear next action per empty/partial state. It can route to existing Capture or Settings surfaces; the quick launcher itself belongs to Story 4.2.
- Use text state such as "Within budget", "Over budget warning", "Needs a next step", and "Clear for now"; do not rely on color alone.

### Architecture Compliance

- Domain code owns Today summary calculations and deterministic date/amount rules.
- Service code orchestrates repositories and existing domain functions.
- Feature hooks own load state and service calls.
- React components must not import SQLite clients, migrations, repositories, or `expo-notifications`.
- No raw diagnostics or new logging of spending details, income values, task titles/notes, reminder notes, platform notification ids, receipt data, or local file paths.

### Performance Guidance

- The PRD target is daily overview P95 under 1 second for the standard MVP dataset.
- Keep Today queries bounded:
  - Today money: current local date only.
  - Budget: current budget period only.
  - Tasks/reminders: active summary/upcoming/recovery slices only.
  - Work: current local date only.
  - Recent activity: small fixed cap, recommended 5-8 rows.
- Avoid unbounded recurrence scans; use existing bounded recurrence and recovery helpers.
- Avoid repeated open/migrate cycles in a single Today load if a small shared prepare-access service is practical.

### Previous Story Intelligence

- Story 3.5 fixed edit/reschedule handoff routing in commit `10651cb`; actionful recovery UI needs a provider and a nearby consumer.
- Recovery events intentionally store only non-sensitive ids/enums/timestamps. Preserve that privacy boundary.
- Story 3.5 verification after the fix passed: focused handoff tests, `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.
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

- Empty Today summary.
- Today money totals and recent activity from same-day records only.
- Budget status for current reset-day period.
- Savings progress from manual current amount.
- Task and recurring/habit counts without materializing recurrence rows.
- Reminder/recovery state counts with neutral labels.
- Work minutes and income for the current day.
- Hook state transitions for loading, success, failed, and empty/partial data.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 4.1 acceptance criteria and Epic 4 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR7, NFR-PERF-02, NFR-UX-01, NFR-UX-02, NFR-A11Y-03, NFR-A11Y-04]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, Expo Router, feature/domain/service/repository boundaries, summary calculations]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Today Overview Stack, neutral copy, mobile-first overview, non-color-only status]
- [Source: `_bmad-output/implementation-artifacts/3-5-recover-from-missed-tasks-and-reminders.md` - recovery service/UI and approved handoff fix]
- [Source: `src/features/today/TodayScreen.tsx`, `src/domain/summaries/today-summary.ts`, `src/services/recovery/recovery.service.ts`, `src/features/recovery/recovery-handoff.tsx`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 4.1 ready-for-dev from Epic 4, PRD, architecture, UX, and Story 3.5 implementation context.
- 2026-05-08: Started Story 4.1 implementation.
- 2026-05-08: Added pure Today summary calculator, overview service, feature hook, real Today screen, focused tests, and full verification.

### Completion Notes List

- Implemented Today as a computed local overview with no database migration or new source of truth.
- Reused existing repository/domain boundaries for preferences, money, budgets, savings, tasks, task recurrence, reminders, recovery, and work entries.
- Kept recurring task/habit occurrences virtual and savings progress based on manual `currentAmountMinor`.
- Mounted a read-only recovery summary/list instead of actionful recovery controls, preserving Story 3.5 handoff boundaries.
- Automated verification passed; no physical-device/manual UI run was performed in this pass.

### File List

- `_bmad-output/implementation-artifacts/4-1-build-the-today-overview-stack.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-4.1-review.md`
- `src/domain/summaries/today-summary.ts`
- `src/domain/summaries/today-summary.test.ts`
- `src/features/today/TodayScreen.tsx`
- `src/features/today/useTodayOverview.ts`
- `src/features/today/useTodayOverview.test.ts`
- `src/services/summaries/today.service.ts`
- `src/services/summaries/today.service.test.ts`

## Change Log

- 2026-05-08: Created Story 4.1 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed Today overview stack implementation and self-review.
