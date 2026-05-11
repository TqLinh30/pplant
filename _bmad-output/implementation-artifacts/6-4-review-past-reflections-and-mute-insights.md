# Story 6.4: Review Past Reflections And Mute Insights

Status: done

## Story

As a student,
I want to review past reflections and dismiss or mute neutral insights,
so that reflection remains useful and adjustable.

## Acceptance Criteria

1. Given past reflections exist, when I open reflection history, then I can view saved reflections by period, and sensitive content is not logged to diagnostics.
2. Given a neutral insight appears, when I dismiss or mute it, then the preference is saved locally, and future display respects the mute/dismiss state.
3. Given I delete related records or all personal data, when reflection history is updated, then linked summaries and reflections update or delete according to privacy rules, and no orphaned derived references remain.

## Tasks / Subtasks

- [x] Add insight preference domain models and filtering helpers. (AC: 2, 3)
  - [x] Add reflection-owned types/schemas for neutral insight preference actions: `dismissed` and `muted`.
  - [x] Treat Story 6.2 relationship ids (`money_time`, `work_savings`, `tasks_reminders`, `receipts_spending`, `reflections_summary`) as the MVP neutral insight ids.
  - [x] Use period-scoped dismiss state and global mute state. Suggested scope keys: `week:<startDate>`, `month:<startDate>`, and `global`.
  - [x] Add a pure filter helper that removes muted insights everywhere and dismissed insights for the current period only.
  - [x] Keep preference data non-sensitive: store ids, scope, action, timestamps, and deleted state only; do not store relationship prose values, money amounts, task contents, or reflection text in preference rows.

- [x] Add a safe additive insight preferences migration and schema entry. (AC: 2, 3)
  - [x] Add the next migration id after `015_create_reflections` for a `reflection_insight_preferences` table.
  - [x] Store `id`, `workspace_id`, `insight_id`, `action`, `scope_key`, `period_kind`, `period_start_date`, `created_at`, `updated_at`, and `deleted_at`.
  - [x] Add an active uniqueness index for one active preference per workspace/insight/scope.
  - [x] Add indexes for loading active preferences by workspace and for future privacy/data-deletion cleanup.
  - [x] Do not alter or delete existing reflection rows, source records, capture drafts, receipt records, recurrence records, or diagnostics.

- [x] Extend reflection repository/service APIs for history and preferences. (AC: 1, 2, 3)
  - [x] Reuse Story 6.3 reflection storage and ensure only active, answered reflections are shown in UI history.
  - [x] Add repository/service methods to save dismiss/mute preferences, list active preferences, and soft-delete preference rows for future privacy deletion workflows.
  - [x] Add repository/service methods to soft-delete reflection rows by id or workspace to support Story 7.1 without adding deletion UI in this story.
  - [x] Return `AppResult` errors and keep SQLite access inside repositories only.
  - [x] Do not log reflection text or insight preference payloads to diagnostics.

- [x] Show reflection history and insight controls in Review. (AC: 1, 2, 3)
  - [x] Add a compact `Past Reflections` section in weekly/monthly Review that lists recent answered reflections labeled by period.
  - [x] Keep skipped prompts out of saved-reflection history, while skipped prompt state remains available in the current-period prompt UI from Story 6.3.
  - [x] Add `Dismiss` and `Mute` controls to neutral relationship cards.
  - [x] Respect saved preferences by hiding dismissed current-period insight cards and muted insight cards in future displays.
  - [x] Provide neutral recovery copy for empty, loading, failed, dismissed, and muted states.
  - [x] Preserve Day/end-of-day review behavior.

- [x] Add focused tests and run verification. (AC: 1, 2, 3)
  - [x] Add domain tests for preference validation, scope-key behavior, and filtering of dismissed/muted insights.
  - [x] Add migration tests for the new preference table/indexes and non-destructive SQL.
  - [x] Add repository/service tests for history listing, save dismiss, save mute, duplicate active preference update/upsert, active preference listing, and soft-delete cleanup helpers.
  - [x] Add feature hook/reducer tests for reflection history and insight preference states.
  - [x] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 6.4 owns browsing saved reflection history and dismissing/muting existing neutral relationship insights.
- "Neutral insight" in this story means the Story 6.2 relationship cards, not a new predictive insights engine.
- Dismiss is period-scoped and hides the relationship for the current week/month only. Mute is global by insight id and hides it in future displays until future controls expose unmute.
- Full privacy/data deletion UI and broad deletion orchestration remain Story 7.1. Story 6.4 should only keep reflection/history/preference repositories compatible with future deletion through active filtering and cleanup helpers.
- Do not add causal, predictive, optimization, scoring, or financial-advice logic.

### Current Repository State

- Story 6.3 added `reflections` persistence with active uniqueness by workspace/period/prompt, `listReflectionsForPeriod`, `listRecentReflections`, `saveReflectionPrompt`, `listPeriodReflections`, and `listRecentReflections`.
- Review weekly/monthly mode now renders `Reflection Pairs` and `Reflection Prompts`.
- `buildReflectionRelationships` returns relationship ids that are stable and suitable as MVP insight ids.
- Current privacy deletion service is only `previewDeletionPlan`; privacy settings explicitly say broader deletion controls arrive in later privacy/data-control stories.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add or extend `src/domain/reflections` with:
  - `ReflectionInsightPreference`
  - `ReflectionInsightPreferenceAction = 'dismissed' | 'muted'`
  - scope helpers for period/global scope keys
  - `filterReflectionRelationshipsForPreferences`
- Add repository methods in `src/data/repositories/reflections.repository.ts` or a sibling reflection-insight repository if the file becomes too large.
- Suggested preference table:
  - `id TEXT PRIMARY KEY NOT NULL`
  - `workspace_id TEXT NOT NULL`
  - `insight_id TEXT NOT NULL`
  - `action TEXT NOT NULL`
  - `scope_key TEXT NOT NULL`
  - `period_kind TEXT`
  - `period_start_date TEXT`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
  - `deleted_at TEXT`
- Suggested constraints:
  - `action IN ('dismissed', 'muted')`
  - period scoped rows require period kind/start date
  - global mute rows use `scope_key = 'global'`
- UI can keep this simple: show recent answered reflections and add secondary buttons on each relationship card for `Dismiss` and `Mute`.

### Architecture Compliance

- Domain filtering must be pure and testable without React Native or SQLite.
- Only repositories may access SQLite.
- Services and hooks may orchestrate repositories and UI state through `AppResult`.
- Reflection text is sensitive personal data and must not be written to diagnostics.
- Insight preferences must store only non-sensitive identifiers and lifecycle metadata.
- No auth, cloud sync, external API, OCR provider, or notification behavior should change.

### Previous Story Intelligence

- Story 6.3 self-review verdict was `APPROVED_WITH_MINOR_NOTES`.
- Story 6.3 known risks: no manual device UI pass; privacy deletion cascades remain Epic 7 scope.
- Story 6.3 already implemented history-capable list APIs; prefer extending them rather than duplicating reflection storage.
- Story 6.2 copy guard and relationship ids should be reused for neutral insight filtering.

### UX Guidance

- Past reflections should be compact and calm; show period label, prompt text, and answer text without dense charts.
- Do not show skipped prompts in saved-reflection history.
- Dismiss/mute copy should be neutral, such as "Hidden for this period" or "Muted for future reviews."
- Avoid destructive language unless a future delete story adds confirmation flows.
- Keep color non-semantic where possible; labels must carry state meaning.

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

- Past reflection history lists answered reflections by period and excludes skipped/deleted rows.
- Sensitive reflection text is not sent to diagnostics/logging code.
- Dismissed insights are hidden only for the matching period scope.
- Muted insights are hidden across future period displays.
- Preference writes are idempotent/upsert-like for the same workspace/insight/scope.
- Migration is additive, indexed, and non-destructive.
- Review UI/hook state can load history, save dismiss, save mute, and preserve the Review screen after failures.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 6.4 acceptance criteria and Epic 6 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR45, FR46, FR47, NFR-SEC-01, NFR-SEC-04, NFR-SEC-05, NFR-SEC-07]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, repository boundaries, redacted diagnostics, privacy deletion architecture]
- [Source: `DESIGN.md` - calm token-led Review UI guidance]
- [Source: `_bmad-output/implementation-artifacts/6-3-answer-skip-and-save-reflection-prompts.md` - reflection persistence and history-capable APIs]
- [Source: `docs/automation-reports/story-6.3-review.md` - Story 6.3 known risks and future-story boundaries]
- [Source: `src/domain/summaries/reflection-relationships.ts` - stable relationship ids and no-advice copy]
- [Source: `src/domain/reflections/types.ts` - current reflection persistence model]
- [Source: `src/data/repositories/reflections.repository.ts` - current reflection repository pattern]
- [Source: `src/services/reflections/reflection.service.ts` - current reflection service boundary]
- [Source: `src/features/review/ReviewScreen.tsx` - current Review relationships/prompts UI]
- [Source: `src/services/privacy/data-deletion.service.ts` - current deletion preview-only boundary]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 6.4 ready-for-dev from Epic 6, PRD, architecture, Story 6.3 implementation/review, current Review UI, reflections repository/service, and privacy deletion boundary.
- 2026-05-08: Started Story 6.4 implementation. Plan: add pure preference filtering and validation first, add additive insight-preference migration/repository/service APIs, wire reflection history and dismiss/mute controls into Review, then run focused and full verification.
- 2026-05-08: Added insight preference filtering, `016_create_reflection_insight_preferences`, history/preference service APIs, Review history and dismiss/mute controls, and verification.

### Completion Notes List

- Implemented period-scoped dismiss and global mute preferences for neutral reflection relationship cards.
- Added additive `reflection_insight_preferences` persistence with active uniqueness by workspace/insight/scope.
- Added pure filtering so dismissed pairs hide only for the current period and muted pairs hide across future reviews.
- Added active answered reflection history in weekly/monthly Review, excluding skipped/deleted rows.
- Added soft-delete repository/service helpers to support future privacy deletion workflows without adding broad deletion UI in this story.
- Full verification passed: typecheck, lint, full Jest, Expo install check, build-if-present, and whitespace diff check.

### File List

- `_bmad-output/implementation-artifacts/6-4-review-past-reflections-and-mute-insights.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-6.4-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/reflection-insight-preferences.repository.test.ts`
- `src/data/repositories/reflections.repository.ts`
- `src/domain/reflections/insight-preferences.test.ts`
- `src/domain/reflections/insight-preferences.ts`
- `src/domain/reflections/schemas.ts`
- `src/domain/reflections/types.ts`
- `src/features/review/ReviewScreen.tsx`
- `src/features/review/useReflectionHistory.test.ts`
- `src/features/review/useReflectionHistory.ts`
- `src/services/reflections/reflection.service.test.ts`
- `src/services/reflections/reflection.service.ts`

## Change Log

- 2026-05-08: Created Story 6.4 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed reflection history and mute/dismiss implementation after verification.
