# Story 7.2 Review: Support Offline Core Capture

## Story ID and Title

- Story 7.2: Support Offline Core Capture

## Acceptance Criteria Result

- AC1: PASS. Manual money, task, reminder, and work capture remain local-first. User-facing save copy now makes local persistence explicit, and reminder local-only scheduling behavior remains covered by existing tests.
- AC2: PASS. Receipt capture still saves the receipt image reference and expense draft before parsing. Draft-saved and permission-denied/unavailable copy keeps manual expense entry visible and does not require OCR.
- AC3: PASS. Today and Capture reuse `CaptureDraftRecoveryPanel`, which now renders enriched recovery items with active receipt parse-job labels after app restart. Ordinary active drafts are labeled as saved locally.

## Files Changed

- `_bmad-output/implementation-artifacts/7-2-support-offline-core-capture.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-7.2-review.md`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/capture-drafts/CaptureDraftRecoveryPanel.tsx`
- `src/features/capture-drafts/capture-draft-recovery.test.ts`
- `src/features/capture-drafts/capture-draft-recovery.ts`
- `src/features/capture-drafts/useCaptureDraftRecovery.test.ts`
- `src/features/capture-drafts/useCaptureDraftRecovery.ts`
- `src/features/receipts/receipt-capture.test.ts`
- `src/features/receipts/receipt-capture.ts`
- `src/features/tasks/TaskForm.tsx`
- `src/features/work/WorkEntryForm.tsx`

## Database/API Changes

- No database schema changes.
- No public API, auth, sync, or external service changes.
- `useCaptureDraftRecovery` now enriches active receipt drafts by reading the latest local receipt parse job through the existing receipt parse-job service.

## Tests Added/Updated

- Added `src/features/capture-drafts/useCaptureDraftRecovery.test.ts`.
- Updated `src/features/capture-drafts/capture-draft-recovery.test.ts` for local/offline labels and all receipt parse-job states.
- Updated `src/features/receipts/receipt-capture.test.ts` for OCR-independent draft save/manual fallback copy.

## Commands Run

- `npm test -- --runTestsByPath src/features/capture-drafts/capture-draft-recovery.test.ts src/features/capture-drafts/useCaptureDraftRecovery.test.ts src/features/receipts/receipt-capture.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- No sensitive receipt URI, OCR text, money details, task/reminder content, work notes, or draft payload values are exposed in recovery labels or tests.
- No new diagnostics or logging were added.
- Receipt draft descriptions intentionally avoid rendering retained image URI values.
- No destructive database or file operations were introduced.

## Architecture Consistency Review

- The implementation keeps the app local-first and uses existing `capture_drafts` and `receipt_parse_jobs` tables.
- React components consume hook output only; no component imports SQLite repositories.
- New copy logic is pure and covered by unit tests.
- Expected unavailable/offline parsing states are represented as recoverable UI labels rather than thrown errors.

## Known Risks

- No physical airplane-mode/device interruption pass was performed in this story cycle; coverage is automated and code-level.
- Enriched receipt parse-job loading is per active receipt draft. MVP cardinality keeps active drafts small, so this is acceptable for now.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD can continue to Story 7.3.
