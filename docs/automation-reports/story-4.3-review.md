# Story 4.3 Review: Save And Recover Drafts Across Capture Forms

## Story ID and Title

- Story 4.3: Save And Recover Drafts Across Capture Forms

## Acceptance Criteria Result

- AC1: PASS. Expense, income, task, reminder, and work-entry forms persist meaningful draft payloads locally through the shared capture draft service, including debounced saves and AppState/unmount flush behavior.
- AC2: PASS. Today and Capture render active draft recovery UI with clear kind/state and resume, keep, and discard actions.
- AC3: PASS. Final save flows mark the active draft as `saved` with `savedRecordKind` and `savedRecordId`; saved/discarded drafts are hidden from active recovery. Existing final-record save flows still recalculate summaries.

## Files Changed

- `_bmad-output/implementation-artifacts/4-3-save-and-recover-drafts-across-capture-forms.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-4.3-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/capture-drafts.repository.test.ts`
- `src/data/repositories/capture-drafts.repository.ts`
- `src/data/repositories/index.ts`
- `src/domain/capture-drafts/capture-drafts.test.ts`
- `src/domain/capture-drafts/schemas.ts`
- `src/domain/capture-drafts/types.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/capture/useManualMoneyCapture.test.ts`
- `src/features/capture/useManualMoneyCapture.ts`
- `src/features/capture-drafts/CaptureDraftRecoveryPanel.tsx`
- `src/features/capture-drafts/capture-draft-recovery.test.ts`
- `src/features/capture-drafts/capture-draft-recovery.ts`
- `src/features/capture-drafts/captureDraftPayloads.test.ts`
- `src/features/capture-drafts/captureDraftPayloads.ts`
- `src/features/capture-drafts/useCaptureDraftPersistence.ts`
- `src/features/capture-drafts/useCaptureDraftRecovery.ts`
- `src/features/reminders/ReminderForm.tsx`
- `src/features/reminders/useReminderCapture.test.ts`
- `src/features/reminders/useReminderCapture.ts`
- `src/features/tasks/TaskForm.tsx`
- `src/features/tasks/useTaskCapture.test.ts`
- `src/features/tasks/useTaskCapture.ts`
- `src/features/today/TodayScreen.tsx`
- `src/features/work/WorkEntryForm.tsx`
- `src/features/work/useWorkEntryCapture.test.ts`
- `src/features/work/useWorkEntryCapture.ts`
- `src/services/capture-drafts/capture-draft.service.test.ts`
- `src/services/capture-drafts/capture-draft.service.ts`

## Database/API Changes

- Added non-destructive migration `013_create_capture_drafts`.
- Added `capture_drafts` table with JSON payload text and lifecycle fields.
- Added partial unique index for one active draft per workspace/kind.
- Added repository/service APIs for active draft upsert, list, get-by-kind, keep, discard, and mark saved.
- No final record table schemas or public external API contracts changed.

## Tests Added/Updated

- Added capture draft domain validation tests.
- Added migration tests for migration 013.
- Added capture draft repository tests for one active draft per kind, active list hiding saved/discarded drafts, keep, discard, and mark saved.
- Added capture draft service tests.
- Added draft payload helper tests for meaningful/empty detection and safe parse defaults.
- Added draft recovery route/description helper tests.
- Updated capture hook reducer tests for recovered draft application.

## Commands Run

- `npm test -- capture-drafts capture-draft.service migrate`
- `npm run typecheck -- --pretty false`
- `npm test -- captureDraftPayloads useManualMoneyCapture useTaskCapture useReminderCapture useWorkEntryCapture`
- `npm test -- capture-draft-recovery captureDraftPayloads useManualMoneyCapture useTaskCapture useReminderCapture useWorkEntryCapture`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- PASS. Migration is additive and non-destructive.
- PASS. Draft payloads are stored only in local SQLite through repositories/services.
- PASS. Recovery UI descriptions avoid exposing raw draft payload values.
- PASS. No diagnostics or logs include raw draft payloads.
- PASS. No auth, cloud sync, external API, receipt image, or OCR behavior changed.

## Architecture Consistency Review

- PASS. SQLite access remains inside repositories and services.
- PASS. Domain validation remains pure and Zod-based.
- PASS. React components use feature hooks/services and do not import DB clients or migrations.
- PASS. Existing final save paths remain source of summary recalculation.
- PASS. Story scope did not implement receipt capture or future deletion workflows.

## Known Risks

- No physical-device interruption test was run for real OS background/kill behavior.
- Jest does not render the new `.tsx` recovery panel; helper behavior and hook/service boundaries are covered, but visual/screen-reader behavior still needs a manual device pass.
- Expense and income are separate draft kinds; changing a partially entered money form from expense to income can leave one active draft per kind, matching the approved MVP rule but possibly needing later UX refinement.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD can continue to Story 4.4 because the remaining risks are manual-device verification notes, not blockers.
