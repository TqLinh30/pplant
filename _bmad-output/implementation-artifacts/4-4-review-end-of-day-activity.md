# Story 4.4: Review End-Of-Day Activity

Status: done

## Story

As a student,
I want to review end-of-day activity across spending, tasks, reminders, and work,
so that I can understand how the day went in one loop.

## Acceptance Criteria

1. Given I open the end-of-day review, when activity exists for the day, then Pplant shows spending, tasks, reminders, and work-income entries together, and the review uses neutral, non-shaming language.
2. Given some categories have no data, when the review renders, then Pplant shows partial-data states, and no section implies failure or blame.
3. Given I mark a task done or adjust an entry from review, when I save the change, then Today and summaries update, and I return to relevant updated context.

## Tasks / Subtasks

- [x] Define end-of-day review summary contracts and pure calculations. (AC: 1, 2)
  - [x] Add a focused domain module such as `src/domain/summaries/end-of-day-review.ts`.
  - [x] Include local date, money records for the day, task items/completions, recurring task/habit occurrences for the day, reminder items/occurrences/recovery state, work entries, activity counts, and partial-data flags.
  - [x] Keep the summary computed from existing records; do not add a new source-of-truth table.
  - [x] Use integer minor units for money and local-date comparisons for day filtering.
  - [x] Cap lists so the review cannot render unbounded history.
  - [x] Keep all copy/state labels neutral and non-shaming.

- [x] Implement an end-of-day review service. (AC: 1, 2, 3)
  - [x] Add a service such as `src/services/summaries/end-of-day-review.service.ts`.
  - [x] Open and migrate the local database safely, load preferences, and resolve the current local date from the injected clock.
  - [x] Reuse existing repositories/services for money, tasks, task recurrence, reminders, recovery, and work entries.
  - [x] Reuse the same local-first repository boundaries as Today; React components must not import SQLite clients, migration utilities, or Drizzle tables.
  - [x] Return typed `AppResult` failures with retry-oriented messages.
  - [x] Do not schedule/cancel platform notifications from review load.

- [x] Replace the Review placeholder with an end-of-day review surface. (AC: 1, 2, 3)
  - [x] Replace `src/features/review/ReviewScreen.tsx` placeholder content with a mobile-first review screen.
  - [x] Add a feature hook such as `src/features/review/useEndOfDayReview.ts` for loading, ready, partial/empty, and failed states.
  - [x] Show sections for spending/income, tasks/habits, reminders/recovery, work-income, and a short daily activity list.
  - [x] Use existing UI primitives/tokens and the `DESIGN.md` visual direction; avoid nested cards, decorative dashboards, or one-note color styling.
  - [x] Use explicit text labels for states such as "No spending logged today", "No reminders need review", and "No work logged today"; do not rely on color alone.
  - [x] Keep weekly/monthly reflection prompts, insight cards, and saved reflections out of scope for Story 4.4.

- [x] Add action handoffs for task completion and entry adjustment. (AC: 3)
  - [x] Allow a non-deleted open task shown in review to be marked done through existing task service/repository behavior.
  - [x] After mark-done succeeds, refresh review data so Today and summaries can reflect the updated source record on next load.
  - [x] Provide edit/adjust actions that route to existing detail/edit surfaces for money, task, reminder, and work entries where available.
  - [x] Return users to the relevant review context after editing by using existing navigation patterns or route params; do not duplicate edit forms inside review.
  - [x] Keep actions accessible with clear labels and at least 44x44 touch targets.

- [x] Preserve scope, privacy, and content safety. (AC: 1, 2, 3)
  - [x] Do not implement Epic 6 weekly/monthly summaries, reflection prompts, saved reflections, or muted insights.
  - [x] Do not implement receipt capture/parsing, receipt review, or receipt retention behavior.
  - [x] Do not add auth, cloud sync, server APIs, analytics, or large dependencies.
  - [x] Do not log spending details, income values, task titles/notes, reminder content, work notes, receipt data, or draft payloads.
  - [x] Avoid financial advice, causal claims, prediction, optimization, or blame language.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Add domain tests for full-data, partial-data, empty-data, bounded-list, money minor-unit totals, task completion, reminder/recovery, and work summaries.
  - [x] Add service tests with fake repositories/dependencies for local-date filtering, failure handling, and refresh after task completion where practical.
  - [x] Add hook/helper tests for loading, ready, failed, partial/empty, mark-task-done, and edit-route behavior where practical.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 4.4 owns the end-of-day review inside the current Review tab.
- It is a daily review surface, not the Epic 6 weekly/monthly reflection system.
- The review should be a computed view over existing local records and recurrence/recovery helpers.
- Avoid new database tables unless a non-destructive additive table becomes unavoidable. The expected implementation should not need a migration.
- Do not create or edit final records through duplicated review forms. Use existing services/repositories for direct task completion and existing route surfaces for adjustments.

### Current Repository State

- Story 4.1 completed Today overview:
  - `src/domain/summaries/today-summary.ts`
  - `src/services/summaries/today.service.ts`
  - `src/features/today/useTodayOverview.ts`
  - `src/features/today/TodayScreen.tsx`
- Story 4.2 completed the quick capture launcher and safe route targets:
  - money -> `/(tabs)/capture` with `quick=expense|income`
  - task -> `/task/new`
  - reminder -> `/reminder/new`
  - work -> `/work/new`
- Story 4.3 completed shared capture draft recovery and mounted draft recovery cards on Today and Capture.
- `src/features/review/ReviewScreen.tsx` is currently a placeholder.
- `src/app/(tabs)/review.tsx` is already the Review tab route and should remain a thin route wrapper.
- Existing detail routes are available for adjustment handoff:
  - `src/app/money/[moneyRecordId].tsx`
  - `src/app/task/[taskId].tsx`
  - `src/app/reminder/[reminderId].tsx`
  - `src/app/work/[workEntryId].tsx`
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Data Semantics

- End-of-day review is day-scoped by local date.
- Spending/income should include active money records for the selected/current day only.
- Work should include active work entries for the selected/current day only.
- Tasks should include active tasks relevant to the day:
  - tasks completed on the day
  - open tasks due today or overdue
  - bounded active open tasks when there is no deadline context
- Recurring task/habit occurrences should remain virtual and day-bounded.
- Reminders should include active reminders with occurrences for the day plus existing missed/recovery state where available.
- Recovery data from Story 3.5 should remain non-sensitive and should not denormalize titles/notes/platform notification IDs.
- Partial-data states are expected and should be explicit, not treated as errors.

### Recommended Implementation Shape

- Add `src/domain/summaries/end-of-day-review.ts` and `.test.ts` for pure summary calculations.
- Add `src/services/summaries/end-of-day-review.service.ts` and `.test.ts` by following the safe prepare/access pattern from Today service.
- Add `src/features/review/useEndOfDayReview.ts` and `.test.ts` for load/refresh/action state.
- Replace the placeholder in `src/features/review/ReviewScreen.tsx`.
- Keep route files thin. If route params are needed after edits, parse them in the feature layer and treat unknown params as no-op.
- Reuse existing UI primitives:
  - `Button`
  - `ListRow`
  - `StatusBanner`
  - `Chip`
  - React Native `ScrollView`, `View`, and `Text`
- Use a small feature helper for edit targets if it keeps routing declarative and testable.

### UI Guidance

- Review should feel like a calm closing loop for the day, not a report card.
- Suggested section order:
  - "End of day"
  - "Money today"
  - "Tasks and habits"
  - "Reminders"
  - "Work context"
  - "Activity"
- Suggested neutral copy:
  - "No spending logged today."
  - "No completed tasks yet today."
  - "No reminder needs review right now."
  - "No work logged today."
  - "Nothing to adjust here."
- Avoid words such as "failed", "bad", "wasted", "should", or "behind" in user-facing review copy unless the term is an explicit technical state already used elsewhere and paired with recovery action.
- Use sparse color and text labels together. State must not be communicated by color alone.
- Keep primary actions near-black and restrained per `DESIGN.md`; use secondary/outline actions for edit/adjust.

### Architecture Compliance

- Domain code owns summary calculations and state classification.
- Services coordinate repositories and existing domain functions.
- Feature hooks own loading, refreshing, and action orchestration.
- React components render state and call hooks/route helpers only.
- Repositories are the only layer that should access SQLite.
- No raw diagnostics or logging of sensitive personal content.

### Previous Story Intelligence

- Story 4.1 already created a Today summary service with a safe prepare/access pattern. Reuse its local-date, repository, recurrence, and recovery-loading approach where practical.
- Story 4.2 route helpers made quick capture targets explicit and testable; use the same style for review edit targets.
- Story 4.3 added draft recovery to Today and Capture only. Story 4.4 should not alter draft lifecycle or the `capture_drafts` schema.
- Story 3.5 recovery events intentionally store limited non-sensitive metadata; preserve that privacy boundary.

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

- Full-data review showing money, tasks, reminders, and work together.
- Partial-data and empty-data states with neutral labels.
- Same-day filtering for money/work and completed tasks.
- Recurring task/habit occurrence inclusion without materializing rows.
- Reminder/recovery state inclusion without notification scheduling side effects.
- Mark-task-done refresh path.
- Edit route target mapping for money, task, reminder, and work.
- Service failure handling for database/migration/repository errors.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 4.4 acceptance criteria and Epic 4 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR9, FR7, FR33-FR41, NFR-UX-01, NFR-UX-02, NFR-A11Y-03, NFR-A11Y-04, NFR-SEC-01, NFR-SEC-04, NFR-SEC-07]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, Expo Router, summary calculations, feature/domain/service/repository boundaries, redacted diagnostics]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - daily loop, end-of-day review, neutral recovery, Today/Review patterns, accessibility]
- [Source: `_bmad-output/implementation-artifacts/4-1-build-the-today-overview-stack.md` - Today summary/service patterns]
- [Source: `_bmad-output/implementation-artifacts/4-2-launch-quick-capture-within-two-taps.md` - explicit route target helpers]
- [Source: `_bmad-output/implementation-artifacts/4-3-save-and-recover-drafts-across-capture-forms.md` - draft recovery scope and UI placement]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 4.4 ready-for-dev from Epic 4, PRD, architecture, UX, and Story 4.1-4.3 implementation context.
- 2026-05-08: Started Story 4.4 implementation.
- 2026-05-08: Added end-of-day review domain summary, local-first service, Review screen, edit-return handoffs, focused tests, and full verification.

### Completion Notes List

- Implemented Review as a computed end-of-day surface across same-day money records, relevant tasks, virtual recurring task/habit occurrences, reminders/recovery, work entries, and activity.
- Added direct mark-done behavior for open daily tasks in Review; completion updates the source task and refreshes review data.
- Added explicit edit route handoffs for money, task, reminder, and work entries with return-to-review behavior after save/delete.
- Preserved scope boundaries: no Epic 6 weekly/monthly reflection, no receipt/OCR behavior, no migrations, no auth/cloud/API changes, and no new dependencies.
- Automated verification passed; no physical-device/manual dynamic-text or screen-reader run was performed in this pass.

### File List

- `_bmad-output/implementation-artifacts/4-4-review-end-of-day-activity.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-4.4-review.md`
- `src/domain/summaries/end-of-day-review.test.ts`
- `src/domain/summaries/end-of-day-review.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/reminders/ReminderForm.tsx`
- `src/features/review/ReviewScreen.tsx`
- `src/features/review/end-of-day-review-routes.test.ts`
- `src/features/review/end-of-day-review-routes.ts`
- `src/features/review/useEndOfDayReview.test.ts`
- `src/features/review/useEndOfDayReview.ts`
- `src/features/tasks/TaskForm.tsx`
- `src/features/work/WorkEntryForm.tsx`
- `src/services/summaries/end-of-day-review.service.test.ts`
- `src/services/summaries/end-of-day-review.service.ts`

## Change Log

- 2026-05-08: Created Story 4.4 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed end-of-day activity review implementation and self-review.
