# Story 5.5 Review: Warn About Duplicates And Manage Receipt Retention

## Story

- Story ID: 5.5
- Title: Warn About Duplicates And Manage Receipt Retention
- Review date: 2026-05-08
- Reviewer: Codex autonomous BMAD implementation agent

## Acceptance Criteria Result

- AC1: PASS. Receipt Review Desk now loads parser and local-record duplicate signals, shows a neutral duplicate warning, and keeps continue review, edit fields, manual expense, and discard actions available without blocking save.
- AC2: PASS. Receipt payload metadata now supports retained/deleted state and keep/delete-after-save policies in the existing `capture_drafts` JSON model. Receipt detail can update policy or delete the image while keeping saved expense links intact.
- AC3: PASS. Abandoned receipt cleanup uses the 30-day threshold, targets only active abandoned receipt drafts with retained images, updates payload metadata, soft-discards cleaned drafts, and reports cleaned counts/bytes.

## Files Changed

- `_bmad-output/implementation-artifacts/5-5-warn-about-duplicates-and-manage-receipt-retention.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-5.5-review.md`
- `src/data/repositories/capture-drafts.repository.test.ts`
- `src/data/repositories/capture-drafts.repository.ts`
- `src/domain/privacy/privacy-settings.ts`
- `src/domain/receipts/duplicates.test.ts`
- `src/domain/receipts/duplicates.ts`
- `src/features/capture-drafts/captureDraftPayloads.test.ts`
- `src/features/capture-drafts/captureDraftPayloads.ts`
- `src/features/receipts/ReceiptRouteScreen.tsx`
- `src/services/capture-drafts/capture-draft.service.test.ts`
- `src/services/files/receipt-file-store.test.ts`
- `src/services/files/receipt-file-store.ts`
- `src/services/files/receipt-retention.service.test.ts`
- `src/services/files/receipt-retention.service.ts`
- `src/services/files/retention-cleanup.service.ts`
- `src/services/receipt-parsing/receipt-duplicate.service.test.ts`
- `src/services/receipt-parsing/receipt-duplicate.service.ts`
- `src/services/receipt-parsing/receipt-parse-job.service.test.ts`
- `src/services/receipt-parsing/receipt-parse-job.service.ts`

## Database/API Changes

- No database migration was added.
- The existing `capture_drafts.payload_json` contract was extended in a backward-compatible way.
- Capture draft repository gained scoped read/update methods for saved/active draft payload metadata.
- No backend, auth, cloud sync, bank/payment, or public API behavior changed.

## Tests Added/Updated

- Added receipt duplicate domain and service tests.
- Added receipt retention service and cleanup tests.
- Extended receipt file-store tests for safe image deletion and path-redacted failures.
- Extended capture draft payload tests for legacy retention metadata and retained/deleted state.
- Extended capture draft repository tests for saved draft payload updates and cleanup candidate listing.
- Extended receipt parse-job tests to prevent parsing after a retained image is deleted.

## Commands Run

- `npx jest --runInBand src/domain/receipts/duplicates.test.ts src/services/receipt-parsing/receipt-duplicate.service.test.ts src/features/capture-drafts/captureDraftPayloads.test.ts src/services/files/receipt-file-store.test.ts src/services/files/receipt-retention.service.test.ts src/data/repositories/capture-drafts.repository.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npx jest --runInBand src/services/receipt-parsing/receipt-parse-job.service.test.ts src/services/files/receipt-retention.service.test.ts src/services/receipt-parsing/receipt-duplicate.service.test.ts src/domain/receipts/duplicates.test.ts`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- Receipt image deletion is limited to app-private receipt storage paths.
- Expected deletion errors do not echo raw file paths.
- No OCR text, receipt image content, merchant/source, amount, notes, line items, or payload JSON were added to diagnostics.
- Saved money records remain intact when receipt images are deleted.
- Cleanup excludes saved drafts, recent active drafts, non-receipt drafts, and unrelated records.
- No destructive database migration was introduced.

## Architecture Consistency Review

- SQLite access stays behind repositories.
- Duplicate matching is pure domain logic plus a small service for local money-record lookup.
- Retention uses the approved shared `capture_drafts` JSON payload model rather than adding a separate receipt draft table.
- File deletion is isolated in the file service layer.
- Receipt parsing remains behind the existing parser port and refuses parsing when the retained image has already been deleted.

## Known Risks

- Real-device file deletion and receipt review UI interaction were not manually tested.
- Cleanup currently enforces the 30-day abandoned-draft policy but does not delete saved receipt images solely to meet the 500 MB threshold unless the user selected a delete policy.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to the next story.
