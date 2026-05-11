# Story 7.4 Review: Preserve Manual Corrections As Source Of Truth

## Story ID and Title

- Story 7.4: Preserve Manual Corrections As Source Of Truth

## Acceptance Criteria Result

- AC1: PASS. Receipt review now distinguishes accepted parsed saves from changed saves: accepted parsed values persist as `sourceOfTruth: parsed`, while any manual correction or total-only line-item choice persists as `sourceOfTruth: manual` with `userCorrectedAt`.
- AC2: PASS. Money edits continue to preserve `source: receipt` and switch receipt-sourced parsed records to manual source-of-truth. Today, period review, end-of-day review, and history tests use saved corrected `money_records` values.
- AC3: PASS. Migration tests assert correction metadata is additive and later migrations do not update/reset `source_of_truth` or `user_corrected_at`.

## Files Changed

- `_bmad-output/implementation-artifacts/7-4-preserve-manual-corrections-as-source-of-truth.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-7.4-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/domain/money/provenance.test.ts`
- `src/domain/money/provenance.ts`
- `src/domain/summaries/end-of-day-review.test.ts`
- `src/domain/summaries/period-summary.test.ts`
- `src/domain/summaries/today-summary.test.ts`
- `src/services/money/money-history.service.test.ts`
- `src/services/receipt-parsing/receipt-review.service.test.ts`
- `src/services/receipt-parsing/receipt-review.service.ts`

## Database/API Changes

- No schema migration was added.
- No public route/API contract changed.
- Added a small domain helper for receipt review money provenance.
- Receipt review save behavior changed only for unedited accepted parsed receipts, which now persist `sourceOfTruth: parsed` and `userCorrectedAt: null`.

## Tests Added/Updated

- Added money provenance unit tests.
- Updated receipt review service tests for accepted parsed saves, corrected saves, and total-only line-item saves.
- Updated Today, period review, end-of-day review, and money history tests to prove corrected saved money records drive calculations.
- Updated migration tests to guard correction metadata preservation.

## Commands Run

- `npm test -- --runTestsByPath src/domain/money/provenance.test.ts src/services/receipt-parsing/receipt-review.service.test.ts src/services/money/money-record.service.test.ts src/domain/summaries/today-summary.test.ts src/domain/summaries/period-summary.test.ts src/domain/summaries/end-of-day-review.test.ts src/services/money/money-history.service.test.ts src/data/db/migrations/migrate.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- PASS. No diagnostics or error messages were expanded with receipt or money details.
- PASS. No raw receipt image URI, OCR text, merchant, amount, dates, notes, line items, or corrected values are logged.
- PASS. No auth, cloud sync, backend API, external OCR provider, or secret handling changed.
- PASS. No destructive migration or data rewrite was added.

## Architecture Consistency Review

- PASS. Provenance logic lives in the domain layer and receipt review orchestration remains in the service layer.
- PASS. Repositories remain the SQLite boundary; UI route files were not changed.
- PASS. Summaries and reviews continue to consume saved `money_records` rather than parse job JSON.
- PASS. Story 7.5 diagnostics/benchmark scope was not implemented early.

## Known Risks

- Record-level provenance remains the MVP model. Per-field provenance would require a schema expansion and was intentionally avoided because existing acceptance criteria can be satisfied safely with `sourceOfTruth` and `userCorrectedAt`.
- Manual device verification was not rerun for this narrow data/provenance story; automated coverage and full gates passed.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD can continue to Story 7.5.
