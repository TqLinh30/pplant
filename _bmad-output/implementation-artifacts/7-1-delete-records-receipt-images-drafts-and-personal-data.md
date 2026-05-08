# Story 7.1: Delete Records, Receipt Images, Drafts, And Personal Data

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want to delete individual records, receipt images, drafts, ranges, or all personal data,
so that I can control sensitive local information.

## Acceptance Criteria

1. Given I open data controls, when I choose to delete a record, type, date range, receipt image, draft, or all personal data, then Pplant explains the impact and asks for confirmation when data loss is possible.
2. Given deletion is confirmed, when the deletion service runs, then associated drafts, stored receipt images, OCR text, pending jobs, reminders, cached summaries, and derived references are removed or updated as appropriate and local deletion does not require network connectivity.
3. Given deletion completes, when I return to Today, history, review, or settings, then the deleted data is no longer visible and summaries and diagnostics contain no sensitive deleted content.

## Tasks / Subtasks

- [ ] Expand deletion domain planning and validation. (AC: 1, 2)
  - [ ] Replace the minimal `DataDeletionPlan` shape with explicit target options for record id, record type, date range, receipt image, draft id, diagnostics, and all personal data.
  - [ ] Add pure helpers that produce neutral impact copy, confirmation requirements, and affected-data labels for Settings UI.
  - [ ] Validate dangerous plans before executing: all-personal-data always requires confirmation; date ranges require `startDate <= endDate`; record/draft/image targets require ids.

- [ ] Implement local-first deletion service behavior. (AC: 2, 3)
  - [ ] Extend `src/services/privacy/data-deletion.service.ts` to preview and execute deletion plans against the local SQLite database.
  - [ ] Use existing soft-delete/status columns where available (`deleted_at`, `discarded_at`, `status`) and avoid destructive schema changes.
  - [ ] Clean related local references for each target: capture drafts, receipt parse jobs/results/OCR text, scheduled notification rows, recovery rows, topic joins, and diagnostics as appropriate.
  - [ ] Delete only app-managed stored receipt image files through existing receipt file/retention services or a safe file-delete port; never delete arbitrary external URIs.
  - [ ] Return a structured result with counts and any non-fatal file cleanup warnings.

- [ ] Add Settings data controls UI. (AC: 1, 3)
  - [ ] Extend `usePrivacySettings` with deletion preview/confirm/execute state.
  - [ ] Add a Data controls section in Settings with actions for drafts, receipt images, diagnostics, date-range records, and all personal data.
  - [ ] Show an impact summary before execution and require explicit confirmation for data loss.
  - [ ] Use neutral copy and preserve the existing local-first privacy explanation.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add domain tests for deletion-plan validation/copy.
  - [ ] Add service/repository tests covering individual deletion, date range/type deletion, draft discard, receipt image cleanup, diagnostic redaction/removal, and all-personal-data cleanup.
  - [ ] Add hook/UI tests for preview, confirmation, success, and failure states where reasonable.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement Story 7.1 only. Do not implement offline capture queues from Story 7.2, pending retry management from Story 7.3, manual-source-of-truth changes from Story 7.4, or standard benchmark fixtures from Story 7.5.
- Do not add account/auth/cloud behavior. The MVP remains single-user and local-first.
- Do not add destructive migrations or drop tables. Prefer existing soft-delete/status columns and payload cleanup.
- All deletion behavior must run without network access.

### Current Repository State

- Epic 6 is complete. Review and Today summaries already filter normal repositories, so deleted records should disappear if repositories continue honoring `deleted_at IS NULL` or non-active draft status.
- `src/services/privacy/data-deletion.service.ts` exists as a stub and should be expanded rather than duplicated.
- `src/domain/privacy/deletion-plan.ts` exists with a minimal `DataDeletionPlan` shape and should become the pure planning/validation/copy module.
- `src/features/settings/SettingsScreen.tsx` already has a Privacy section and a `BottomSheet` pattern for confirmation flows.
- `src/features/settings/usePrivacySettings.ts` currently handles privacy detail disclosure only; extend it for data controls instead of creating a separate Settings orchestration hook unless the file becomes unwieldy.
- `src/services/files/receipt-retention.service.ts` and `src/services/files/receipt-file-store.ts` own receipt file cleanup behavior. Reuse them or inject a narrow file-delete function.
- `.claude/worktrees/` remains untracked and must not be committed.

### Data Model Guidance

- Existing tables relevant to deletion include `money_records`, `work_entries`, `tasks`, `task_recurrence_rules`, `task_recurrence_completions`, `reminders`, `reminder_scheduled_notifications`, `capture_drafts`, `receipt_parse_jobs`, `recovery_events`, `diagnostic_events`, `reflections`, and `reflection_insight_preferences`.
- Use existing ownership fields: `workspace_id`, record ids, `local_date`, `deleted_at`, `discarded_at`, and draft `status`.
- For receipt drafts, image URIs and OCR/parse payloads may live in draft payload JSON and receipt parse job `result_json`. Remove stored image references and parse output when deleting images or drafts.
- Diagnostics must not retain sensitive deleted content. Story 7.5 will strengthen redacted diagnostics and fixtures; Story 7.1 should avoid adding any raw sensitive metadata and should allow diagnostics deletion/all-personal-data cleanup now.

### Recommended Implementation Shape

- Keep pure decision logic in `src/domain/privacy/deletion-plan.ts`:
  - target validation
  - confirmation requirement
  - impact title/body/actions
  - affected data categories
- Keep SQLite/file orchestration in `src/services/privacy/data-deletion.service.ts`:
  - `previewDeletionPlan(plan)` returns validated impact
  - `executeDeletionPlan(plan, dependencies)` mutates local data and returns counts
  - accept `now`/`timestamp` and optional file cleanup dependency for deterministic tests
- Use transactions for database mutations when possible. File deletion may be best-effort after database marking; report warnings without exposing paths in user-facing copy.
- Prefer adding narrow repository methods only when they are reusable and align with existing repository boundaries. Avoid direct SQLite from UI or hooks.

### UX Guidance

- Settings data controls should explain impact before data loss and require confirmation for irreversible or broad actions.
- Copy must stay neutral: use phrases like "This hides local records from summaries and history" rather than shame/advice language.
- Data controls should provide clear success/failure states and retry where appropriate.
- Keep UI compact and consistent with existing Settings sections, `StatusBanner`, `ListRow`, `Button`, `TextField`, and `BottomSheet`.

### Architecture Compliance

- Follow architecture ownership: UI screens call feature hooks; hooks call service/domain logic; services coordinate repositories/platform/file adapters; domain functions remain pure.
- Continue using TypeScript, Expo Router, local SQLite, Zod validation where useful, and `AppResult` errors from `src/domain/common/result.ts`.
- Do not store money amounts as floating point and do not log sensitive contents in diagnostics.
- Preserve deterministic summaries by making deletion use the same repository visibility filters (`deleted_at IS NULL`, active drafts, etc.).

### Previous Story Intelligence

- Story 6.5 self-review verdict was `APPROVED`.
- Recent branch review fixed active draft save linkage failures by awaiting `markDraftSaved`; deletion flows should likewise await related draft/job cleanup before reporting success.
- Recent device testing found Android tab icon glyph issues and fixed them by hiding icons. Story 7.1 should not reintroduce tab icon behavior.
- Story 6.5 known risk: no broad privacy deletion UI existed yet; this story closes that gap.

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

- Domain validation rejects ambiguous/destructive plans without confirmation.
- Deleting by id/type/date range hides records from repository/history/summary readers.
- Draft deletion marks active drafts discarded and hides them from Today/Capture recovery.
- Receipt image deletion removes app-managed image references and clears parse output/OCR-sensitive data without deleting arbitrary external URIs.
- All-personal-data cleanup covers money, work, tasks, reminders, drafts, receipt parse jobs, reflections, recovery events, and diagnostics.
- Settings hook/UI exposes preview, confirm, executing, success, and failure states.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 7 and Story 7.1 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR47, NFR-REL-06, NFR-SEC-01 through NFR-SEC-05, NFR-OBS-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, privacy/delete workflows, diagnostics redaction, data-control mapping]
- [Source: `_bmad-output/implementation-artifacts/6-5-make-reviews-accessible-and-visually-calm.md` - previous story state and Story 7 risk note]
- [Source: `src/domain/privacy/deletion-plan.ts` - current minimal deletion-plan model]
- [Source: `src/services/privacy/data-deletion.service.ts` - current deletion service stub]
- [Source: `src/features/settings/SettingsScreen.tsx` - current Settings privacy UI]
- [Source: `src/features/settings/usePrivacySettings.ts` - current Settings privacy hook]
- [Source: `src/data/db/schema.ts` - local tables and soft-delete/status columns]
- [Source: `src/services/files/receipt-retention.service.ts` - receipt image retention cleanup patterns]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-09: Created Story 7.1 ready-for-dev from Epic 7, PRD, architecture, Story 6.5 state, current privacy/settings/data/deletion stubs, and existing local-first repository patterns.

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/7-1-delete-records-receipt-images-drafts-and-personal-data.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-09: Created Story 7.1 ready-for-dev.
