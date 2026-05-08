# Story 6.5: Make Reviews Accessible And Visually Calm

Status: ready-for-dev

## Story

As a student,
I want review screens to be accessible and visually calm,
so that reflection feels clear rather than like a dense finance report.

## Acceptance Criteria

1. Given review screens render, when dynamic text or screen reader is used, then prompts, summaries, actions, and relationship labels remain accessible, and focus order is logical.
2. Given summary status uses color accents, when status is displayed, then text or icon labels also communicate meaning, and color is not the only indicator.
3. Given review content uses signature surfaces, when the screen displays, then the visual style follows the token-led design system, and avoids shame, advice, prediction, and over-dense charts.

## Tasks / Subtasks

- [ ] Improve Review accessibility semantics without changing data behavior. (AC: 1, 2)
  - [ ] Add or refine screen-reader labels/hints for Review mode selection, summary sections, status banners, reflection prompt actions, relationship controls, and past reflection rows.
  - [ ] Mark section headings as headings where supported.
  - [ ] Ensure button labels describe the action and scope, especially dismiss/mute/skip/save.
  - [ ] Preserve existing Day, Week, and Month behavior and data loading.

- [ ] Strengthen non-color-only states. (AC: 2)
  - [ ] Ensure status banners include text labels for loading, empty, failed, saved, partial, dismissed, muted, and warning states.
  - [ ] Ensure relationship partial/hidden states are communicated in text, not only background color.
  - [ ] Avoid adding icon-only controls unless accessible labels are present.

- [ ] Apply calm token-led visual polish. (AC: 3)
  - [ ] Use existing `DESIGN.md` tokens and UI primitives.
  - [ ] Keep sections compact, readable, and not chart-heavy.
  - [ ] Avoid shame, advice, prediction, optimization language, and dense finance-dashboard styling.
  - [ ] Do not add new dependencies or large layout rewrites.

- [ ] Add focused tests and run verification. (AC: 1, 2, 3)
  - [ ] Add tests for any new pure accessibility/copy helpers.
  - [ ] Update existing reducer/domain copy tests if copy changes.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 6.5 is polish and accessibility for existing Review surfaces only.
- Do not add new database tables, migrations, reflection features, deletion workflows, or broad navigation changes.
- Do not implement Story 7 privacy/data-control behavior.
- Do not introduce charts, scores, predictions, recommendations, or financial advice.

### Current Repository State

- Story 6.1 added weekly/monthly summaries in Review.
- Story 6.2 added reflection relationships.
- Story 6.3 added reflection prompts.
- Story 6.4 added past reflections and dismiss/mute controls.
- `ReviewScreen.tsx` now owns several Review sections and uses existing UI primitives.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Prefer small UI primitive improvements that benefit Review without changing behavior:
  - `StatusBanner` can expose a combined accessibility label.
  - `SegmentedControl` can accept a group accessibility label and option accessibility labels/hints.
  - `ReviewScreen` section headings can use `accessibilityRole="header"`.
- If pure copy/accessibility helpers are added, place them near `src/features/review` and test them.
- Keep all copy neutral and concise.

### Architecture Compliance

- UI components may receive accessibility props but should not import repositories, services, migrations, or domain internals unnecessarily.
- Domain/service/data behavior should remain unchanged.
- Review copy must continue complying with NFR-SEC-07 and NFR-UX-02.

### Previous Story Intelligence

- Story 6.4 self-review verdict was `APPROVED_WITH_MINOR_NOTES`.
- Story 6.4 known risks: no manual device UI pass, unmute not implemented, broad privacy deletion UI remains Story 7.1.
- Story 6.5 should reduce the manual UI risk where automated checks can reasonably cover static labels/copy, but it still may require a later device screen-reader pass.

### UX Guidance

- Use labels over color-only semantics.
- Keep status and reflection language gentle and optional.
- Preserve the current calm white-canvas/surface-soft rhythm.
- Avoid nested-card visual density and finance-dashboard composition.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck -- --pretty false
npm run lint
npm test
npx expo install --check
npm run build --if-present
git diff --check
```

Minimum coverage:

- New helper copy is tested for clear labels and prohibited advice/shame language if added.
- Existing Review reducer/domain tests continue passing.
- No database/migration behavior changes.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 6.5 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - NFR-A11Y-01, NFR-A11Y-04, NFR-UX-02, NFR-SEC-07]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - UI primitives, accessibility labels, Review mapping]
- [Source: `DESIGN.md` - token-led calm visual design guidance]
- [Source: `_bmad-output/implementation-artifacts/6-4-review-past-reflections-and-mute-insights.md` - current Review feature surface]
- [Source: `src/features/review/ReviewScreen.tsx` - current Review UI]
- [Source: `src/ui/primitives/SegmentedControl.tsx` - Review mode control primitive]
- [Source: `src/ui/primitives/StatusBanner.tsx` - status primitive]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 6.5 ready-for-dev from Epic 6, PRD, architecture, Story 6.4 implementation/review, current Review UI, and UI primitive patterns.

### Completion Notes List

### File List

## Change Log

- 2026-05-08: Created Story 6.5 ready-for-dev.
