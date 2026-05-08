# Story 6.3: Answer, Skip, And Save Reflection Prompts

Status: ready-for-dev

## Story

As a student,
I want short optional reflection prompts,
so that I can capture what I noticed without doing manual calculations.

## Acceptance Criteria

1. Given I open a weekly or monthly review, when prompts are shown, then there are up to 3 non-shaming prompts, and they can be completed in 60 seconds or less without manual calculation.
2. Given I answer a prompt, when I save the reflection, then it is persisted locally, and it is available in past reflections.
3. Given I do not want to answer, when I skip the prompt, then Pplant records the skip state if needed, and the user is not blocked from finishing review.

## Tasks / Subtasks

- [ ] Add reflection prompt and persistence domain models. (AC: 1, 2, 3)
  - [ ] Add a `src/domain/reflections` module with types and Zod validation for weekly/monthly reflection prompts, answered reflections, skipped prompts, rows, and save inputs.
  - [ ] Add a pure prompt builder that returns at most 3 neutral prompts for weekly/monthly summaries, requires no manual calculation, and avoids causal, predictive, optimization, financial-advice, shame, and blame wording.
  - [ ] Validate reflection period kind (`week` or `month`), local period dates, prompt id/text, optional response text length, lifecycle state (`answered` or `skipped`), and ISO timestamps.
  - [ ] Keep reflection text out of diagnostics and analytics payloads.

- [ ] Add a safe additive reflections migration and schema entry. (AC: 2, 3)
  - [ ] Add the next migration id after `014_create_receipt_parse_jobs` for a `reflections` table.
  - [ ] Store local-first reflection rows with `id`, `workspace_id`, `period_kind`, `period_start_date`, `period_end_date_exclusive`, `prompt_id`, `prompt_text`, `response_text`, `state`, `source`, `source_of_truth`, `created_at`, `updated_at`, and `deleted_at`.
  - [ ] Add an active uniqueness index for `(workspace_id, period_kind, period_start_date, prompt_id)` where `deleted_at IS NULL`.
  - [ ] Add indexes for loading reflections by workspace/period and recent history.
  - [ ] Do not alter or delete existing data, source-record tables, capture drafts, receipt tables, recurrence tables, or summary cache behavior.

- [ ] Add a reflections repository/service path. (AC: 2, 3)
  - [ ] Add `createReflectionRepository` with save/upsert, list-by-period, list-recent, and soft-delete or active-row filtering as needed for the story.
  - [ ] Implement save behavior so answering a prompt stores `state = 'answered'` with response text, and skipping stores `state = 'skipped'` with no required response text.
  - [ ] Update an existing active row for the same workspace/period/prompt instead of creating duplicate active reflections.
  - [ ] Add a service or feature hook boundary that returns `AppResult` errors and keeps React components away from SQLite clients and migration utilities.
  - [ ] Expose saved/skipped reflection counts to the weekly/monthly relationship builder so the `reflections_summary` pair can become ready when local reflections exist.

- [ ] Show optional prompts in weekly/monthly Review. (AC: 1, 2, 3)
  - [ ] Render a calm `Reflection Prompts` section in `src/features/review/ReviewScreen.tsx` for weekly/monthly modes only.
  - [ ] Use existing UI primitives/tokens (`Button`, `TextField`, `StatusBanner`, `ListRow`, spacing/color/typography tokens) and preserve Day/end-of-day review behavior.
  - [ ] Allow each prompt to be answered and saved, or skipped, without blocking the user from finishing or reading the review.
  - [ ] Show saved/skipped state in neutral language and keep partial/error states recoverable with retry-safe copy.
  - [ ] Do not implement full reflection history UI, insight dismiss/mute preferences, privacy deletion workflows, or Story 6.5 accessibility polish beyond reasonable labels/states needed here.

- [ ] Add focused tests and run verification. (AC: 1, 2, 3)
  - [ ] Add domain tests for prompt count, copy safety, period validation, answered persistence inputs, skipped-state inputs, and response length validation.
  - [ ] Add migration tests proving the reflections table/indexes are created once, preserve existing migrations/data, and do not include destructive SQL.
  - [ ] Add repository/service tests for answer save, skip save, duplicate active row replacement/update, period listing, recent listing, and validation failures.
  - [ ] Add feature hook/reducer or UI-adjacent tests where reasonable to prove prompts can be saved/skipped and weekly/monthly review uses saved reflection counts.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 6.3 owns prompt generation plus local answer/skip persistence.
- Past reflections must be made technically available through repository/service list APIs, but the full history browsing UI belongs to Story 6.4.
- Insight dismiss/mute controls, privacy deletion cascades, and accessibility polish beyond the prompt controls are future-story scope.
- Do not write prompt text, answers, skipped prompt text, or JSON payloads to diagnostics, analytics, logs, source records, capture drafts, summary cache, or receipt parsing state.

### Current Repository State

- Story 6.1 added deterministic weekly/monthly period summaries in `src/domain/summaries/period-summary.ts`, `src/services/summaries/period-review.service.ts`, and `src/features/review/usePeriodReviewSummary.ts`.
- Story 6.2 added `src/domain/summaries/reflection-relationships.ts` and weekly/monthly `Reflection Pairs` UI. The `reflections_summary` relationship currently stays partial unless a reflection count is passed.
- The data layer uses inline SQLite migrations in `src/data/db/migrations/migrate.ts`, Drizzle schema declarations in `src/data/db/schema.ts`, and repository-owned raw SQLite access.
- Existing repository patterns parse rows with Zod/domain schemas, return `AppResult`, and catch SQLite failures as retryable local errors.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add `src/domain/reflections/types.ts`, `src/domain/reflections/schemas.ts`, and `src/domain/reflections/reflection-prompts.ts`.
- Suggested prompt ids: `remember_period`, `noticed_pair`, `next_review_ease`.
- Suggested safe prompt text:
  - "What do you want to remember about this period?"
  - "Which recorded pair stood out to you?"
  - "What would make the next review easier to read?"
- Suggested table:
  - `id TEXT PRIMARY KEY NOT NULL`
  - `workspace_id TEXT NOT NULL`
  - `period_kind TEXT NOT NULL`
  - `period_start_date TEXT NOT NULL`
  - `period_end_date_exclusive TEXT NOT NULL`
  - `prompt_id TEXT NOT NULL`
  - `prompt_text TEXT NOT NULL`
  - `response_text TEXT`
  - `state TEXT NOT NULL`
  - `source TEXT NOT NULL`
  - `source_of_truth TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
  - `deleted_at TEXT`
- Suggested constraints:
  - `period_kind IN ('week', 'month')`
  - `state IN ('answered', 'skipped')`
  - `source = 'manual'`
  - `source_of_truth = 'manual'`
- Prefer upsert/update semantics that preserve one active row per prompt/period and keep history queries simple.
- In Review UI, build prompts from the loaded `PeriodReviewData.summary`, load existing reflections for the same period, and save/skip through a feature hook. A failure should leave local data unchanged and show a retry-safe warning.

### Architecture Compliance

- Domain functions must stay pure and testable without React Native or SQLite.
- Only repositories may access SQLite. React components must not import database clients, Drizzle tables, or migration utilities.
- Services and feature hooks may orchestrate repositories, migrations, period metadata, and UI state.
- Reflection content is sensitive personal data under NFR-SEC-01 and must be excluded from diagnostics under NFR-SEC-04.
- Prompt and status copy must comply with NFR-SEC-07 and NFR-UX-02: personal reflection framing, no financial-advice positioning, no causal/predictive/optimization claims, and no shaming language.

### Previous Story Intelligence

- Story 6.2 self-review verdict was `APPROVED_WITH_MINOR_NOTES`.
- Story 6.2 deliberately did not create persistence. This story is the first safe point to add the `reflections` table because the architecture explicitly lists it.
- Story 6.2 relationship copy guard is the model for prohibited prompt wording tests.
- Story 6.1 and 6.2 known risks: no manual device UI pass and no real-device P95 benchmark. Keep Story 6.3 automated tests focused and document the remaining manual UI risk.

### UX Guidance

- Prompts should be optional and fast: no more than 3 prompts, short labels, and no required manual calculations.
- Use neutral state labels such as "Saved", "Skipped", "Ready when you are", and "Your review can continue without this note."
- Avoid dense forms, scores, charts, red/green judgment states, or advice-like copy.
- Keep weekly/monthly prompt controls in the Review surface; do not add a new route unless the existing UI cannot support the flow cleanly.

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

- Prompt builder returns 1-3 prompts for week/month summaries and never requires manual calculation.
- Prompt copy is guarded against causal, predictive, optimization, financial-advice, shame, and blame wording.
- Reflection validation rejects invalid period kind, invalid dates, empty prompt ids/text, invalid state, invalid timestamps, and overlong response text.
- Migration creates `reflections` and required indexes, runs only once, and contains no destructive SQL.
- Repository/service can save an answer, skip a prompt, update an existing active reflection for the same period/prompt, list by period, and list recent reflections.
- Weekly/monthly Review can render prompt controls and saved/skipped states without changing Day/end-of-day behavior.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 6.3 acceptance criteria and Epic 6 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR44, FR45, MVP boundary clarification, NFR-SEC-01, NFR-SEC-04, NFR-SEC-07, NFR-UX-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, reflections table, repository boundaries, redacted diagnostics, FR42-FR46 mapping]
- [Source: `DESIGN.md` - token-led calm review UI guidance]
- [Source: `_bmad-output/implementation-artifacts/6-2-show-reflection-only-relationships.md` - relationship builder and future persistence boundary]
- [Source: `src/domain/summaries/reflection-relationships.ts` - reflection count input for the reflections/summary pair]
- [Source: `src/services/summaries/period-review.service.ts` - weekly/monthly summary orchestration]
- [Source: `src/features/review/ReviewScreen.tsx` - current Review modes and sections]
- [Source: `src/data/db/migrations/migrate.ts` - inline migration pattern]
- [Source: `src/data/repositories/capture-drafts.repository.ts` - AppResult repository pattern]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 6.3 ready-for-dev from Epic 6, PRD, architecture, Story 6.2 implementation, current migration/repository patterns, and user-approved autonomous workflow.

### Completion Notes List

### File List

## Change Log

- 2026-05-08: Created Story 6.3 ready-for-dev.
