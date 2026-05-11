# Story 6.3 Self-Review: Answer, Skip, And Save Reflection Prompts

## Story ID and Title

- Story: 6.3 - Answer, Skip, And Save Reflection Prompts
- Review date: 2026-05-08
- Reviewer: Codex autonomous BMAD implementation agent

## Acceptance Criteria Result

- AC1: PASS. Weekly/monthly Review now shows up to 3 optional prompts, and domain tests guard prompt count, short copy, non-shaming language, and no manual-calculation wording.
- AC2: PASS. Answered reflections persist locally through the new `reflections` table and repository/service path, can be listed by period, and can be listed by recent history for Story 6.4.
- AC3: PASS. Skipping a prompt persists `state = 'skipped'` without requiring response text, and the Review UI keeps the summary available with neutral saved/skipped states and retry-safe warnings.

## Files Changed

- `_bmad-output/implementation-artifacts/6-3-answer-skip-and-save-reflection-prompts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-6.3-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/reflections.repository.test.ts`
- `src/data/repositories/reflections.repository.ts`
- `src/domain/reflections/reflection-prompts.test.ts`
- `src/domain/reflections/reflection-prompts.ts`
- `src/domain/reflections/schemas.test.ts`
- `src/domain/reflections/schemas.ts`
- `src/domain/reflections/types.ts`
- `src/features/review/ReviewScreen.tsx`
- `src/features/review/useReflectionPrompts.test.ts`
- `src/features/review/useReflectionPrompts.ts`
- `src/services/reflections/reflection.service.test.ts`
- `src/services/reflections/reflection.service.ts`

## Database/API Changes

- Added additive migration `015_create_reflections`.
- Added `reflections` Drizzle schema entry.
- New table columns: `id`, `workspace_id`, `period_kind`, `period_start_date`, `period_end_date_exclusive`, `prompt_id`, `prompt_text`, `response_text`, `state`, `source`, `source_of_truth`, `created_at`, `updated_at`, `deleted_at`.
- Added active unique index for one active reflection row per workspace/period/prompt.
- Added period and recent-history indexes.
- Added repository API: `saveReflection`, `listReflectionsForPeriod`, `listRecentReflections`.
- Added service API: `saveReflectionPrompt`, `listPeriodReflections`, `listRecentReflections`.
- No destructive migrations, auth changes, source-record writes, summary cache writes, diagnostics writes, or external API changes.

## Tests Added/Updated

- Added `src/domain/reflections/reflection-prompts.test.ts`.
- Added `src/domain/reflections/schemas.test.ts`.
- Added `src/data/repositories/reflections.repository.test.ts`.
- Added `src/services/reflections/reflection.service.test.ts`.
- Added `src/features/review/useReflectionPrompts.test.ts`.
- Updated migration tests for `015_create_reflections`.

## Commands Run

- `npx jest src/domain/reflections/reflection-prompts.test.ts src/domain/reflections/schemas.test.ts --runInBand`
- `npx jest src/data/repositories/reflections.repository.test.ts --runInBand`
- `npx jest src/data/db/migrations/migrate.test.ts src/data/repositories/reflections.repository.test.ts --runInBand`
- `npx jest src/services/reflections/reflection.service.test.ts --runInBand`
- `npx jest src/features/review/useReflectionPrompts.test.ts --runInBand`
- `npx jest src/domain/reflections/reflection-prompts.test.ts src/domain/reflections/schemas.test.ts src/data/db/migrations/migrate.test.ts src/data/repositories/reflections.repository.test.ts src/services/reflections/reflection.service.test.ts src/features/review/useReflectionPrompts.test.ts src/domain/summaries/reflection-relationships.test.ts --runInBand`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- Reflection text is stored only in the local `reflections` table and is not sent to diagnostics, analytics, logs, source records, capture drafts, receipt parsing jobs, or summary cache.
- Migration is additive and contains no `DROP TABLE` or destructive alteration.
- Reflection repository filters active rows with `deleted_at IS NULL` and preserves existing active row identity when updating a period/prompt.
- Inputs validate workspace/id shape, period kind, local dates, prompt id/text, answer length, lifecycle state, and timestamps before writes.
- No secrets, environment files, auth, authorization, cloud sync, OCR provider, notification, or privacy deletion behavior changed.

## Architecture Consistency Review

- Domain prompt building and validation are pure and testable without React Native or SQLite.
- Only `src/data/repositories/reflections.repository.ts` accesses SQLite for reflection rows.
- Service orchestration returns `AppResult` and handles migration/open failures as retryable local errors.
- Review UI consumes feature hook state and does not import database clients, Drizzle schema, or migration utilities.
- Story 6.4 scope is preserved: recent listing exists for future history, but no full history UI or dismiss/mute controls were implemented.

## Known Risks

- No manual device UI pass was performed; coverage is through typecheck, lint, Jest, and Expo dependency verification.
- Reflection history browsing and mute/dismiss controls remain future Story 6.4 scope.
- Privacy deletion cascades for reflections remain Epic 7 scope.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to Story 6.4 because all acceptance criteria are satisfied, verification passed, and remaining risks are expected future-story scope.
