# Story 5.1 Review: Capture Receipt Photo And Save Draft

## Story ID and Title

- Story 5.1: Capture Receipt Photo And Save Draft

## Acceptance Criteria Result

- AC1: PASS. Receipt capture requests camera or photo-library permission only after the user chooses `Take photo` or `Choose photo`. Permission-denied states keep `Manual expense` visible.
- AC2: PASS. Selected/captured images are copied into app-private receipt storage and saved as an active `expense` draft payload with retained file reference and retention metadata. Drafts survive navigation through the existing `capture_drafts` table.
- AC3: PASS. Canceled capture does not save a draft or create an expense. Saved receipt drafts expose manual expense, keep, and discard actions; no final `money_records` row is created by Story 5.1.
- AC4: PASS. The Today quick capture launcher now includes `Receipt`, routed to `/receipt/new`, while the manual expense action remains available.

## Files Changed

- `_bmad-output/implementation-artifacts/5-1-capture-receipt-photo-and-save-draft.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app.json`
- `docs/automation-reports/story-5.1-review.md`
- `package-lock.json`
- `package.json`
- `src/app/receipt/new.tsx`
- `src/features/capture-drafts/capture-draft-recovery.test.ts`
- `src/features/capture-drafts/capture-draft-recovery.ts`
- `src/features/capture-drafts/captureDraftPayloads.test.ts`
- `src/features/capture-drafts/captureDraftPayloads.ts`
- `src/features/receipts/ReceiptCaptureScreen.tsx`
- `src/features/receipts/ReceiptRouteScreen.tsx`
- `src/features/receipts/receipt-capture.test.ts`
- `src/features/receipts/receipt-capture.ts`
- `src/features/receipts/useReceiptCapture.test.ts`
- `src/features/receipts/useReceiptCapture.ts`
- `src/features/today/QuickCaptureLauncher.tsx`
- `src/features/today/quick-capture.test.ts`
- `src/features/today/quick-capture.ts`
- `src/services/camera/camera.service.ts`
- `src/services/files/receipt-file-store.test.ts`
- `src/services/files/receipt-file-store.ts`

## Database/API Changes

- Database changes: None. No migrations or new tables were added.
- API changes: No backend/public API changes.
- Local payload contract change: active receipt drafts are stored in the existing `capture_drafts` table as `kind: expense` with `captureMode: receipt`.
- Dependency changes: Added Expo first-party `expo-image-picker` and direct `expo-file-system` dependency; configured contextual image-picker permission copy in `app.json`.

## Tests Added/Updated

- Added receipt draft payload validation tests in `captureDraftPayloads.test.ts`.
- Added receipt file-store success/redaction tests in `receipt-file-store.test.ts`.
- Added receipt capture orchestration tests in `receipt-capture.test.ts`.
- Added receipt capture reducer tests in `useReceiptCapture.test.ts`.
- Updated quick capture tests for receipt routing.
- Updated draft recovery tests so receipt expense drafts resume to the receipt draft screen and do not expose raw file paths.

## Commands Run

- `npx expo install expo-image-picker expo-file-system`
- `npm test -- captureDraftPayloads receipt-file-store receipt-capture useReceiptCapture capture-draft-recovery quick-capture`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- Receipt images are copied to app-private document storage through `expo-file-system`.
- Raw source image URIs are not included in expected `AppError.message` or retained error `cause` from file-copy failures.
- Receipt draft recovery descriptions do not expose raw `file://` paths.
- No receipt image is uploaded or sent to OCR/AI services.
- No final expense is created without later explicit user confirmation.
- No auth, authorization, cloud sync, or backend behavior changed.

## Architecture Consistency Review

- Route files remain thin; receipt flow orchestration lives in `src/features/receipts`.
- Camera/image selection is isolated in `src/services/camera`.
- File persistence is isolated in `src/services/files`.
- Draft persistence reuses `src/services/capture-drafts` and the existing repository/migration model.
- The implementation follows the user-approved shared `capture_drafts` model instead of adding an early receipt-specific table.

## Known Risks

- Real-device camera/photo-library permission behavior was not manually tested in this automated environment.
- Receipt image cleanup, duplicate detection, OCR parse jobs, review correction, and final expense save remain intentionally deferred to later Epic 5 stories.
- `npm install` reported existing audit findings after dependency installation; required verification commands still passed. No audit fix was applied because that could introduce broad dependency churn outside Story 5.1.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to the next story.
