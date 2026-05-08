# Story 4.5: Implement Today UX States And Accessibility

Status: ready-for-dev

## Story

As a student,
I want Today to be readable, accessible, and recoverable in every state,
so that the app feels calm even when data is missing, stale, offline, or failed.

## Acceptance Criteria

1. Given Today is empty, loading, offline, failed, stale, estimated, or showing missed items from implemented features, when the state appears, then it provides a clear next action, and state is not communicated by color alone.
2. Given dynamic text is enabled, when Today is displayed, then required fields, labels, and primary actions remain visible, and touch targets remain at least 44x44 px.
3. Given Today uses signature colors, when the screen renders, then colors are sparse and meaningful, and the visual system follows `DESIGN.md`.

## Tasks / Subtasks

- [ ] Define a Today UX state matrix and copy contract. (AC: 1, 3)
  - [ ] Add a small feature helper such as `src/features/today/today-ux-states.ts`.
  - [ ] Cover current implemented states: loading, refreshing, empty, ready, failed, preferences needed, stale-with-data, missed/recovery items, partial/no money, partial/no tasks/reminders, partial/no work, and draft-present state.
  - [ ] Represent offline/estimated states only when supported by existing local-first behavior; do not add fake network detection or analytics.
  - [ ] Provide clear next-action labels for each state.
  - [ ] Keep labels text-based so no state relies on color alone.
  - [ ] Keep copy neutral and non-shaming.

- [ ] Harden Today screen rendering and recovery actions. (AC: 1, 2, 3)
  - [ ] Update `src/features/today/TodayScreen.tsx` to use the UX state helper for top-level and section-level notices where practical.
  - [ ] Preserve existing Today summary ordering: header, draft recovery, money/budget, savings, tasks/reminders, work, recent activity.
  - [ ] If a refresh/load fails while prior data exists, show stale data with a retry banner instead of replacing the whole screen with a dead-end failure state.
  - [ ] Ensure loading, failed, preferences-needed, empty, missed/recovery, and partial-data states each have a clear action.
  - [ ] Do not add new persistence, migrations, auth, cloud sync, external APIs, or large dependencies.

- [ ] Improve dynamic text, touch target, and non-color-only behavior. (AC: 1, 2, 3)
  - [ ] Ensure primary Today actions and section actions use existing `Button`/`ListRow` primitives with at least 44px minimum height.
  - [ ] Make metric rows and header/action rows wrap or stack safely instead of squeezing required labels/actions.
  - [ ] Keep text visible at larger sizes; avoid fixed-height containers that clip labels.
  - [ ] Add explicit status text beside any warning/success color usage.
  - [ ] Keep signature colors sparse: use them only through existing meaningful `StatusBanner` tones or small state surfaces.

- [ ] Preserve scope boundaries and privacy. (AC: 1, 2, 3)
  - [ ] Do not change Today summary calculations except when needed to expose existing state safely.
  - [ ] Do not implement Epic 5 receipt flows, Epic 6 weekly/monthly reflection, or new reminder scheduling behavior.
  - [ ] Do not log spending details, income values, task/reminder content, work notes, receipt data, or draft payloads.
  - [ ] Do not add native accessibility libraries or UI kits.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add tests for Today UX state descriptors and next-action labels.
  - [ ] Add reducer/hook tests for stale-with-data behavior after a failed refresh.
  - [ ] Add helper/style tests where practical for touch target constants or state contract, without relying on fragile rendered style snapshots.
  - [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 4.5 is a Today hardening pass only.
- It should not redesign Today, add a new navigation model, add a UI kit, or change the core summary model unless a small state field is needed.
- It should not implement receipt capture, OCR states, weekly/monthly reflections, new diagnostics, or offline network monitors.
- Manual real-device screen reader/dynamic-type verification is desirable but not required for this automated pass; document the gap honestly.

### Current Repository State

- Story 4.1 implemented Today summary domain/service/hook/screen.
- Story 4.2 added the Today quick capture launcher.
- Story 4.3 added Today/Capture draft recovery.
- Story 4.4 added Review end-of-day activity and return-to-review edit handoffs.
- Today currently renders:
  - `src/features/today/TodayScreen.tsx`
  - `src/features/today/useTodayOverview.ts`
  - `src/features/today/QuickCaptureLauncher.tsx`
  - `src/features/capture-drafts/CaptureDraftRecoveryPanel.tsx`
- Existing primitives already enforce baseline touch target behavior:
  - `src/ui/primitives/Button.tsx` has `minHeight: 44`.
  - `src/ui/primitives/ListRow.tsx` has `minHeight: 44`.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add `src/features/today/today-ux-states.ts` and `.test.ts` for a stable contract:
  - state kind
  - title
  - description
  - next action label
  - tone
  - whether data can remain visible
- Update `src/features/today/useTodayOverview.ts` so `load_failed` preserves existing data as stale context when possible.
- Update `src/features/today/useTodayOverview.test.ts` for stale-with-data behavior.
- Update `src/features/today/TodayScreen.tsx` to:
  - show a full failed state only when no prior data exists
  - show a stale/refresh failed banner when prior data exists
  - use wrapped metric/action layout
  - keep action labels visible
- Add no database changes.

### UX Guidance

- Today should still feel like a calm daily checkpoint.
- Suggested state copy:
  - Loading: "Pplant is gathering your local overview."
  - Stale: "This overview is from the last successful local load. Try refreshing when ready."
  - Failed: "Your local data is unchanged. Try loading Today again."
  - Empty: "Start with one money record, task, reminder, or work entry when the day gives you something concrete."
  - Missed/recovery: "Some items need a calm check."
  - Partial/no data: "No money records yet today.", "No open tasks or reminders.", "No work logged today."
- Avoid blame words such as "failed task", "bad spending", "behind", or "should".
- State must be expressed through text, not color alone.
- Keep signature colors sparse and meaningful per `DESIGN.md`.

### Architecture Compliance

- Feature helper owns UI state copy and action labels.
- Domain summary calculations remain pure.
- React components may call hooks and route helpers but must not import SQLite, migrations, or platform notification APIs.
- No new diagnostics or logging of sensitive content.

### Previous Story Intelligence

- Story 4.4 review noted no physical-device screen reader or dynamic-type run; Story 4.5 should improve automated confidence but still document manual gaps.
- Story 4.4 added return-to-review route params. Do not regress those route handoffs.
- Story 4.3 draft recovery is already mounted on Today; this story may reference draft-present state but should not change draft lifecycle.

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

- Today UX state descriptors include title, description, next action, and tone for loading, failed, stale, empty, ready, preferences, recovery/missed, and partial states.
- Reducer keeps prior data visible when a refresh fails.
- Failed-without-data still shows a retry path.
- Touch target constants for Today-owned controls are not below 44 where exposed through helper contracts.
- No color-only state labels are introduced.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 4.5 acceptance criteria and Epic 4 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - NFR-A11Y-01, NFR-A11Y-02, NFR-A11Y-03, NFR-A11Y-04, NFR-UX-01, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - UI primitives, feature/domain/service boundaries, accessibility, non-color-only states]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Today Overview Stack, state variants, mobile accessibility, sparse signature colors]
- [Source: `DESIGN.md` - white canvas, dark ink, restrained controls, sparse signature colors]
- [Source: `_bmad-output/implementation-artifacts/4-1-build-the-today-overview-stack.md` - Today implementation context]
- [Source: `_bmad-output/implementation-artifacts/4-2-launch-quick-capture-within-two-taps.md` - launcher accessibility context]
- [Source: `_bmad-output/implementation-artifacts/4-3-save-and-recover-drafts-across-capture-forms.md` - Today draft recovery context]
- [Source: `_bmad-output/implementation-artifacts/4-4-review-end-of-day-activity.md` - current Review/edit handoff context]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 4.5 ready-for-dev from Epic 4, PRD, architecture, UX, DESIGN.md, and Story 4.1-4.4 implementation context.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/4-5-implement-today-ux-states-and-accessibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-08: Created Story 4.5 ready-for-dev.
