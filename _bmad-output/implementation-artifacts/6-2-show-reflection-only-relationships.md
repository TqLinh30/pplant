# Story 6.2: Show Reflection-Only Relationships

Status: ready-for-dev

## Story

As a student,
I want to see neutral relationships between money, time, work, tasks, reminders, receipts, and reflections,
so that I can write my own interpretation without receiving advice or blame.

## Acceptance Criteria

1. Given review data exists, when Pplant displays relationships, then it shows existing records side by side, and it avoids causal, predictive, optimization, and financial-advice claims.
2. Given relationship data is partial or missing, when the review renders, then Pplant uses partial/no-data states, and it does not imply the user failed.
3. Given relationship copy is displayed, when content is reviewed, then it frames insights as personal planning and reflection, and it follows non-shaming copy guidelines.

## Tasks / Subtasks

- [ ] Add pure reflection-relationship domain helpers. (AC: 1, 2, 3)
  - [ ] Add a review-owned or summary-owned pure module such as `src/domain/summaries/reflection-relationships.ts`.
  - [ ] Build relationship cards from existing `PeriodReviewSummary` data and source records only; do not infer causes, predict future behavior, recommend changes, or give financial advice.
  - [ ] Support MVP relationship groups: money/time, work income/savings, tasks/reminders, receipts/spending, and reflections/summary.
  - [ ] Return explicit partial/no-data state for each relationship group.
  - [ ] Include neutral labels and descriptions suitable for UI display, not diagnostics.
  - [ ] Add a prohibited-copy guard test for words/phrases such as `because`, `caused`, `predict`, `optimize`, `should`, `must`, `financial advice`, and shame/blame phrasing.

- [ ] Add source facts needed for side-by-side relationships. (AC: 1, 2)
  - [ ] Reuse Story 6.1 period summaries and repository-loaded source records.
  - [ ] If needed, extend `PeriodReviewSummary` with deterministic receipt-sourced expense facts (`receiptExpenseCount`, `receiptExpenseAmountMinor`) derived from `MoneyRecord.source === 'receipt'`.
  - [ ] Do not add a reflections table or reflection persistence in this story; Story 6.3/6.4 own reflection answers/history. Until then, reflection relationship state should be partial/no-data.
  - [ ] Do not add a summary cache or migration unless a safe existing cache path already exists and deterministic invalidation is covered.

- [ ] Show relationships in Review for weekly/monthly modes. (AC: 1, 2, 3)
  - [ ] Add a Review feature component or section that displays relationship cards below the weekly/monthly summaries.
  - [ ] Keep Day/end-of-day review behavior unchanged unless a small shared helper is required.
  - [ ] Use existing UI primitives and `DESIGN.md` tokens; avoid dense charts or finance-dashboard styling.
  - [ ] Include clear partial/no-data states such as "Not enough saved records for this pair yet" without implying failure.
  - [ ] Ensure text labels carry the meaning; do not rely on color alone.

- [ ] Preserve privacy, data safety, and story boundaries. (AC: 1, 2, 3)
  - [ ] Do not write relationship output to diagnostics, analytics, summary cache, reflection storage, or source records.
  - [ ] Do not log raw spending details, income values, task contents, reminder text, receipt data, reflection text, or JSON payloads.
  - [ ] Do not change authentication, authorization, cloud sync, bank/payment integrations, receipt OCR provider behavior, or data deletion workflows.
  - [ ] Do not implement reflection prompts, saved reflections, history, dismiss/mute controls, or insights from Stories 6.3-6.5.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add domain tests for all relationship groups with complete, partial, and empty source data.
  - [ ] Add tests that relationship copy stays neutral and does not include causal/advice/prohibited language.
  - [ ] Add UI/reducer/component tests where reasonable to prove weekly/monthly review exposes relationship labels and partial states.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 6.2 owns display-ready relationship facts only. It must show existing data side by side without interpretation.
- Story 6.2 must not create reflection prompts, save reflection answers, add reflection history, or implement mute/dismiss behavior.
- "Relationship" means a neutral pairing of two existing facts, for example: "Spending recorded" beside "Work time recorded." It does not mean correlation, causation, forecasting, recommendations, or scoring.
- Reflection data is not implemented yet. The reflections/summary group should show a partial/no-data state until Stories 6.3 and 6.4 add persistence.

### Current Repository State

- Story 6.1 added `src/domain/summaries/period-summary.ts`, `src/services/summaries/period-review.service.ts`, `src/features/review/usePeriodReviewSummary.ts`, and Day/Week/Month modes in `ReviewScreen.tsx`.
- `PeriodReviewSummary` already exposes money, work, tasks, reminders, budget, savings, partial states, period metadata, and `cacheStatus: 'fresh_from_source'`.
- `MoneyRecord.source` supports `manual`, `receipt`, and `recurring`, which can support receipt/spending relationship facts without joining receipt parse jobs.
- Current Review UI already renders weekly/monthly summary sections with neutral status banners and no advice.
- No reflections repository or reflection schema has been implemented in the current codebase; do not invent persistence in this story.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add a pure `buildReflectionRelationships` function that accepts:
  - `summary: PeriodReviewSummary`
  - optionally full-period money records if receipt-sourced counts are not included in `PeriodReviewSummary`
  - optional reflection counts only if an existing source already exists; otherwise use no-data.
- Suggested relationship group shape:
  - `id`: `money_time`, `work_savings`, `tasks_reminders`, `receipts_spending`, `reflections_summary`
  - `title`: neutral card title
  - `primary`: label/value pair
  - `secondary`: label/value pair
  - `state`: `ready` or `partial`
  - `description`: neutral sentence that does not make claims
  - `missingReason`: optional neutral partial-state text
- Good copy examples:
  - "Recorded side by side for reflection."
  - "Saved records are shown together; interpretation stays yours."
  - "Not enough saved records for this pair yet."
  - "Receipt-based expenses are listed beside total spending."
- Avoid copy examples:
  - "You spent more because..."
  - "You should..."
  - "Pplant predicts..."
  - "Optimize your..."
  - "Bad habit", "failure", "waste", or blame language.

### Architecture Compliance

- Domain functions must be pure and testable without React Native or SQLite.
- Services may compute relationship inputs from existing summary/source data but should not create new persistence.
- React components may render display-ready relationship objects; they must not import database clients, Drizzle schema, migrations, or parse-job internals.
- Relationship copy must comply with NFR-SEC-07 and NFR-UX-02: personal planning/reflection framing, non-shaming language, no financial-advice positioning.
- Sensitive source details must stay local and out of diagnostics.

### Previous Story Intelligence

- Story 6.1 self-review verdict was `APPROVED_WITH_MINOR_NOTES`.
- Story 6.1 deliberately avoided durable summary caching and uses `cacheStatus: 'fresh_from_source'`.
- Story 6.1 known risks: no manual device UI pass and no real-device P95 benchmark. Keep Story 6.2 tests focused and do not expand the risk surface with storage or new dependencies.
- Story 6.1 Review UI added Day/Week/Month segmented control; relationships should appear only for weekly/monthly review unless there is a clear reason to show them in Day mode.
- Story 6.1 service/domain tests are the model for pure calculation and orchestration tests.

### UX Guidance

- Keep relationship cards compact and calm. Use the same section rhythm as the Story 6.1 period summary sections.
- Avoid dense visualizations, charts, scores, or red/green judgment signals.
- Prefer side-by-side labels and values over prose-heavy insight paragraphs.
- Partial states are normal data states, not user failures.

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

- Relationship groups are produced for money/time, work/savings, tasks/reminders, receipts/spending, and reflections/summary.
- Complete data returns `ready` relationship groups with deterministic labels and values.
- Missing money, work, savings, reminders, receipt, or reflection data returns partial states with neutral copy.
- Receipt/spending relationship uses local source facts such as `MoneyRecord.source === 'receipt'` and does not require OCR payloads.
- Prohibited copy/advice guard rejects causal, predictive, optimization, financial-advice, and shaming words/phrases.
- Weekly/monthly Review UI exposes the relationship section without breaking Day/end-of-day review behavior.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 6.2 acceptance criteria and Epic 6 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR43, MVP boundary clarification for reflection-only relationships, NFR-SEC-07, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - FR42-FR46 mapping, no-advice content rules, redacted diagnostics, local-first summary boundaries]
- [Source: `DESIGN.md` - calm token-led Review UI guidance]
- [Source: `_bmad-output/implementation-artifacts/6-1-generate-weekly-and-monthly-summaries.md` - period summary implementation and known risks]
- [Source: `src/domain/summaries/period-summary.ts` - current weekly/monthly summary facts]
- [Source: `src/features/review/ReviewScreen.tsx` - current Review UI modes]
- [Source: `src/domain/money/types.ts` - `MoneyRecord.source` supports receipt-sourced expenses]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 6.2 ready-for-dev from Epic 6, PRD, architecture, Story 6.1 implementation, and current Review/summary code.

### Completion Notes List

### File List

## Change Log

- 2026-05-08: Created Story 6.2 ready-for-dev.
