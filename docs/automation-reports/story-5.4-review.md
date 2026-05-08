# Story 5.4 Review: Provide Manual Fallback And Recovery For Receipt Failures

## Story

- Story ID: 5.4
- Title: Provide Manual Fallback And Recovery For Receipt Failures
- Review date: 2026-05-08
- Reviewer: Codex autonomous BMAD implementation agent

## Acceptance Criteria Result

- AC1: PASS. Receipt parse states now resolve through an explicit recovery action model that offers retry, edit draft/review, manual expense, keep draft, and discard draft actions where applicable. Failed, retry-exhausted, pending/running, low-confidence, reviewed, saved, and draft-only states have clear labels and recommended next actions.
- AC2: PASS. Manual expense fallback reuses the existing active expense draft handoff for receipt drafts and remains available without parser success, OCR configuration, or network access. Draft choice remains explicit through manual handoff, keep, and discard actions.
- AC3: PASS. Recovery action failures record only the `receipt_recovery_action_failed` diagnostic with safe metadata. Redaction tests cover receipt URI, OCR text, merchant/source, amount, line items, notes, draft payloads, saved record ids, and corrected values.

## Files Changed

- `_bmad-output/implementation-artifacts/5-4-provide-manual-fallback-and-recovery-for-receipt-failures.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-5.4-review.md`
- `src/diagnostics/events.ts`
- `src/diagnostics/redact.test.ts`
- `src/features/capture-drafts/captureDraftPayloads.test.ts`
- `src/features/receipts/ReceiptRouteScreen.tsx`
- `src/features/receipts/receipt-recovery-actions.test.ts`
- `src/features/receipts/receipt-recovery-actions.ts`
- `src/services/receipt-parsing/receipt-recovery-diagnostics.service.test.ts`
- `src/services/receipt-parsing/receipt-recovery-diagnostics.service.ts`

## Database/API Changes

- No database migration was added.
- No stored receipt, money, draft, or parse-job schema was changed.
- No backend or public API contract was changed.
- Diagnostic event names/allowed metadata were extended locally for redacted recovery failure logging.

## Tests Added/Updated

- Added recovery action helper tests for parse states, recommended actions, manual fallback visibility, retry-exhausted behavior, and saved-state suppression.
- Added recovery diagnostic service tests proving only safe metadata is persisted.
- Extended diagnostic redaction tests for receipt recovery failure metadata.
- Extended capture draft payload tests to prove receipt expense drafts can hand off to manual money capture without parsing.

## Commands Run

- `npx jest --runInBand src/features/receipts/receipt-recovery-actions.test.ts src/services/receipt-parsing/receipt-recovery-diagnostics.service.test.ts src/diagnostics/redact.test.ts src/features/capture-drafts/captureDraftPayloads.test.ts src/features/receipts/receipt-parse-state.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npm run typecheck -- --pretty false`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- No real OCR credentials, external OCR calls, secrets, or network provider integrations were added.
- Recovery diagnostics avoid raw receipt image URIs, OCR text, merchant/source, amount, line items, notes, payload JSON, saved record ids, and corrected values.
- No automatic final expense is created from parser output.
- Draft deletion still happens only through the existing explicit discard path.
- No authentication, authorization, bank/payment, regulated-finance, sync, or backend behavior was changed.

## Architecture Consistency Review

- Receipt parsing remains behind existing parser/service boundaries.
- Receipt recovery copy and action mapping live in a feature helper instead of being embedded entirely in the screen.
- Diagnostics are handled through a service helper with no feature-to-service circular dependency.
- The shared `capture_drafts` model is preserved; receipt capture remains an `expense` draft with receipt-specific JSON payload.
- Existing review/save behavior from Story 5.3 remains intact.

## Known Risks

- Real-device manual fallback navigation was not manually tested.
- Manual fallback currently uses the existing active expense draft handoff; a later UX pass may add a more direct return path after manual save.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to the next story.
