# Story 5.3 Review: Review And Correct Parsed Receipt Fields

## Story ID and Title

- Story 5.3: Review And Correct Parsed Receipt Fields

## Acceptance Criteria Result

- AC1: PASS. Parsed receipt review now exposes merchant, date, total, category, topics, line items, and confidence/source labels. Low-confidence, unknown, corrected, and ignored states are text-labeled through domain descriptors and the Receipt Review Desk UI.
- AC2: PASS. Edited merchant/date/total/category/topic/line-item values are validated through existing money/category/topic rules and saved as a receipt-sourced `money_records` expense with manual source-of-truth. The capture draft is soft-marked saved with the new record id, and parse result context remains preserved.
- AC3: PASS. Users can ignore line items and save a total-only expense. Ignored or invalid line-item details do not block saving when total-only mode is selected.

## Files Changed

- `_bmad-output/implementation-artifacts/5-3-review-and-correct-parsed-receipt-fields.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-5.3-review.md`
- `src/data/repositories/receipt-parse-jobs.repository.test.ts`
- `src/data/repositories/receipt-parse-jobs.repository.ts`
- `src/domain/receipts/review.test.ts`
- `src/domain/receipts/review.ts`
- `src/domain/receipts/schemas.ts`
- `src/domain/receipts/types.ts`
- `src/features/receipts/ReceiptRouteScreen.tsx`
- `src/features/receipts/receipt-parse-state.test.ts`
- `src/features/receipts/receipt-parse-state.ts`
- `src/features/receipts/receipt-review-state.test.ts`
- `src/features/receipts/receipt-review-state.ts`
- `src/services/receipt-parsing/receipt-parse-job.service.test.ts`
- `src/services/receipt-parsing/receipt-parse-job.service.ts`
- `src/services/receipt-parsing/receipt-review.service.test.ts`
- `src/services/receipt-parsing/receipt-review.service.ts`

## Database/API Changes

- Database schema: No new migration and no destructive SQL.
- Local data contract: Extended receipt parse job statuses with `reviewed` and `saved`.
- Repository contract: Added `markSaved` for `receipt_parse_jobs`, updating status and timestamps without deleting `result_json`.
- Public/backend API: No changes.

## Tests Added/Updated

- Added receipt review domain tests for draft derivation, correction labels, validation, ignored line items, and total-only save.
- Added receipt review service tests for loading review data, saving corrected receipt expenses, marking capture draft saved, preserving parse context, rejecting unsafe parse states, and returning field errors.
- Updated parse job repository/service tests for the saved parse-job lifecycle.
- Added receipt review feature helper tests for Review Desk visible labels, manual fallback, disabled/error copy, and total-only copy.

## Commands Run

- `npx jest --runInBand src/domain/receipts/review.test.ts src/features/receipts/receipt-review-state.test.ts src/services/receipt-parsing/receipt-review.service.test.ts src/data/repositories/receipt-parse-jobs.repository.test.ts src/services/receipt-parsing/receipt-parse-job.service.test.ts src/features/receipts/receipt-parse-state.test.ts` - PASS
- `npm run typecheck -- --pretty false` - PASS
- `npm run lint` - PASS
- `npm test` - PASS, 82 suites and 382 tests
- `npx expo install --check` - PASS
- `npm run build --if-present` - PASS
- `git diff --check` - PASS

## Security/Data-Safety Review

- No real OCR credentials, external AI/OCR calls, retention deletion, duplicate detection, backend, auth, or cloud sync behavior was added.
- Receipt image URIs, OCR text, merchant names, totals, line items, draft payloads, and corrected values are not logged to diagnostics.
- Final expense creation is blocked for pending, failed, retry-exhausted, missing, discarded, and non-receipt draft paths.
- Parse jobs, receipt drafts, receipt files, money records, migrations, and parse result JSON are preserved.
- Money amount input is validated into minor units before persistence.

## Architecture Consistency Review

- SQLite access remains behind repositories; the React screen calls service functions only.
- The new receipt review service follows existing service patterns: prepare DB/migrations, load preferences, validate active category/topic ids, and return typed `AppResult` failures.
- Final reviewed receipts are ordinary local `money_records` rows, so existing budget/history behavior can consume them.
- Parser output remains proposed data until explicit user save, and `sourceOfTruth: manual` prevents parsed values from overriding user-reviewed data.
- UI changes are scoped to the existing receipt draft route and reuse existing primitives.

## Known Risks

- Real-device interaction with the expanded receipt review UI was not manually tested in this automated environment.
- The save workflow uses repository calls sequentially. The default receipt money record id is deterministic per draft, which avoids duplicate expense rows on retry after a partial failure, but full cross-repository transaction handling is still a future hardening opportunity.
- Receipt currency conversion is not introduced; reviewed records continue using the user's configured currency, matching existing single-currency money behavior.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to the next story.
