# Story 7.1 Review: Delete Records, Receipt Images, Drafts, And Personal Data

## Story ID and Title

- Story 7.1: Delete Records, Receipt Images, Drafts, And Personal Data

## Acceptance Criteria Result

- AC1: PASS. Settings now includes data controls that preview impact and require confirmation before destructive local deletion.
- AC2: PASS. The deletion service executes locally against SQLite, uses existing soft-delete/status fields, discards drafts, clears receipt parse/OCR result payloads, deletes app-managed receipt image references through the receipt file port, cancels scheduled notification ids through the notification scheduler port, and requires no network access.
- AC3: PASS. Deleted records are hidden through existing repository visibility filters, active drafts are discarded, parse job results are cleared, diagnostics can be cleared, and all-personal-data cleanup removes or hides the relevant local workspace data.

## Files Changed

- `_bmad-output/implementation-artifacts/7-1-delete-records-receipt-images-drafts-and-personal-data.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-7.1-review.md`
- `src/domain/privacy/deletion-plan.ts`
- `src/domain/privacy/deletion-plan.test.ts`
- `src/domain/privacy/privacy-settings.ts`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/settings/usePrivacySettings.ts`
- `src/features/settings/usePrivacySettings.test.ts`
- `src/services/privacy/data-deletion.service.ts`
- `src/services/privacy/data-deletion.service.test.ts`

## Database/API Changes

- No schema migration was added.
- Added service-level deletion operations over existing local SQLite tables and existing soft-delete/status columns.
- Added file cleanup through the existing receipt file deletion port.
- Added notification cleanup through the existing notification scheduler port.
- No public network API or auth behavior changed.

## Tests Added/Updated

- Added `src/domain/privacy/deletion-plan.test.ts`.
- Added `src/services/privacy/data-deletion.service.test.ts`.
- Updated `src/features/settings/usePrivacySettings.test.ts`.

## Commands Run

- `npm test -- --runTestsByPath src/domain/privacy/deletion-plan.test.ts --runInBand`
- `npm test -- --runTestsByPath src/domain/privacy/deletion-plan.test.ts src/services/privacy/data-deletion.service.test.ts src/features/settings/usePrivacySettings.test.ts --runInBand`
- `npm test -- --runTestsByPath src/services/privacy/data-deletion.service.test.ts --runInBand`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- No destructive schema changes.
- Broad deletion requires explicit confirmation.
- Receipt file deletion stays behind `deleteReceiptImageReference`, which rejects paths outside app-private receipt storage.
- Draft payloads are cleared when drafts are discarded through data controls.
- Receipt parse job `result_json` is cleared when related drafts/images are deleted.
- Native notification ids are cancelled before scheduled-notification rows are soft-deleted when a scheduler is available.
- Diagnostics can be cleared locally; no raw sensitive diagnostic metadata was added.

## Architecture Consistency Review

- UI remains in Settings and calls the feature hook.
- The hook orchestrates preview/confirm state and delegates deletion execution to a service.
- Pure deletion plan validation/copy lives in `src/domain/privacy`.
- SQLite/file/notification orchestration lives in `src/services/privacy`.
- Existing repository visibility patterns are preserved; no UI direct-SQL access was added.

## Known Risks

- Manual device UI pass was not run for this story after the Settings data-controls section was added.
- Native notification cancellation is covered through the scheduler port in tests, not through a physical-device notification delivery pass.
- The deletion service intentionally centralizes broad table knowledge; future schema additions should update this service and tests.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD can continue to Story 7.2.
