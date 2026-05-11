# Story 5.2 Review: Parse Receipt Asynchronously With Visible States

## Story ID and Title

- Story 5.2: Parse Receipt Asynchronously With Visible States

## Acceptance Criteria Result

- AC1: PASS. Starting parsing from an active receipt draft creates a `receipt_parse_jobs` row in `pending` state, linked to the existing receipt expense draft id. Manual expense, navigation away, keep, and discard remain available from the receipt draft screen.
- AC2: PASS. Successful injected parser output is validated and stored as normalized proposed result JSON with merchant, date, total, line items, category, topics, unknown fields, confidence labels, and duplicate indicator. No final `money_records` row is created.
- AC3: PASS. Retry policy allows at most three automatic attempts within 24 hours per parse job, marks final automatic failure as `retry_exhausted`, and allows further retry only through explicit user action.

## Files Changed

- `_bmad-output/implementation-artifacts/5-2-parse-receipt-asynchronously-with-visible-states.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-5.2-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/receipt-parse-jobs.repository.test.ts`
- `src/data/repositories/receipt-parse-jobs.repository.ts`
- `src/domain/receipts/normalize-parse-result.ts`
- `src/domain/receipts/receipts.test.ts`
- `src/domain/receipts/retry-policy.test.ts`
- `src/domain/receipts/retry-policy.ts`
- `src/domain/receipts/schemas.ts`
- `src/domain/receipts/types.ts`
- `src/features/receipts/ReceiptRouteScreen.tsx`
- `src/features/receipts/receipt-parse-state.test.ts`
- `src/features/receipts/receipt-parse-state.ts`
- `src/services/receipt-parsing/receipt-parse-job.service.test.ts`
- `src/services/receipt-parsing/receipt-parse-job.service.ts`
- `src/services/receipt-parsing/retry-policy.ts`

## Database/API Changes

- Database changes: Added migration `014_create_receipt_parse_jobs`, creating only `receipt_parse_jobs` plus local indexes for draft latest lookup and pending/retryable work.
- Existing data safety: No destructive SQL, no `DROP TABLE`, and no changes to `capture_drafts`, `money_records`, or money recurrence tables.
- API changes: No backend/public API changes.
- Local service contract: Added receipt parse job orchestration through the existing `ReceiptParsingPort`; default parser remains `noopReceiptParser`.

## Tests Added/Updated

- Updated migration tests for migration 014 and non-destructive SQL assertions.
- Added repository lifecycle tests for pending, running, parsed, failed, retry-exhausted, latest-by-draft, and retryable listing.
- Added receipt domain schema and low-confidence tests.
- Added deterministic retry policy tests for attempt count, 24-hour windows, exhaustion, and user-initiated retry.
- Added parsing service tests for noop failure, injected success, low confidence, retry exhaustion, and active receipt draft validation.
- Added UI state helper tests for visible state descriptors, manual fallback labels, retry labels, confidence text, unknown fields, and duplicate indicators.

## Commands Run

- `npx jest --runInBand src/domain/receipts/receipts.test.ts src/domain/receipts/retry-policy.test.ts src/data/db/migrations/migrate.test.ts src/data/repositories/receipt-parse-jobs.repository.test.ts src/services/receipt-parsing/receipt-parse-job.service.test.ts src/features/receipts/receipt-parse-state.test.ts` - PASS
- `npm run typecheck -- --pretty false` - PASS
- `npm run lint` - PASS
- `npx jest --runInBand src/services/receipt-parsing/receipt-parse-job.service.test.ts src/features/receipts/receipt-parse-state.test.ts` - PASS
- `npm test` - PASS, 79 suites and 369 tests
- `npx expo install --check` - PASS
- `npm run build --if-present` - PASS
- `git diff --check` - PASS

## Security/Data-Safety Review

- Receipt images are not sent to external services by default; real OCR remains unconfigured and absent.
- Parser failures store only safe error categories such as `unavailable` or `validation_failed`; raw image URIs, OCR text, merchant names, totals, line items, and draft payloads are not written to diagnostics.
- Parser output remains proposed data on `receipt_parse_jobs.result_json` and does not create final expenses.
- Retry exhaustion prevents automatic retry loops and requires explicit user action.
- No auth, authorization, backend, sync, cloud, bank, payment, or public API behavior changed.

## Architecture Consistency Review

- SQLite access remains in repositories; feature code calls services only.
- `ReceiptParsingPort` remains the parser boundary, and the default adapter is still the noop/manual fallback parser.
- `capture_drafts` remains the active draft source of truth; parse jobs link to existing receipt expense draft ids.
- Domain validation owns parse result and job row parsing; service orchestration owns migration preparation, retry evaluation, and port invocation.
- UI state copy follows the existing text-first pattern from Story 4.5.

## Known Risks

- The parse job is asynchronous within the app flow, not an OS-level background worker. Pending jobs are recoverable and can be resumed from the receipt draft screen.
- Real-device receipt draft UI interaction was not manually tested in this automated environment.
- Real OCR provider integration, duplicate detection, review correction save, line-item editing, final expense creation, and receipt retention cleanup remain intentionally deferred to later Epic 5 stories.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to the next story.
