# Story 5.3: Review And Correct Parsed Receipt Fields

Status: done

## Story

As a student,
I want to review and correct parsed receipt fields,
so that imperfect OCR still feels trustworthy and recoverable.

## Acceptance Criteria

1. Given parsed receipt results are available, when I open Receipt Review Desk, then merchant, date, total, line items, category, topic, and confidence labels are visible, and low-confidence fields are highlighted with text labels, not color alone.
2. Given a parsed field is wrong, when I edit merchant, date, total, category, topic, or line items, then my correction is saved as source of truth, and the receipt photo/draft context is preserved.
3. Given line-item review is not useful, when I ignore line items or save total-only, then Pplant creates a valid total-only expense, and discarded line-item details do not block saving.

## Tasks / Subtasks

- [x] Add receipt review and correction domain contracts. (AC: 1, 2, 3)
  - [x] Add review draft types/helpers that derive editable merchant, date, total, category, topics, and line items from `NormalizedReceiptParseResult`.
  - [x] Validate corrected total in minor units, corrected local date, optional category/topic ids, merchant length, and line-item amount values using existing money/category/topic validation patterns.
  - [x] Track whether each final field is user-corrected, accepted parsed data, unknown, or ignored with text labels available to UI.
  - [x] Support total-only save by ignoring line-item details without failing validation.

- [x] Implement receipt review save orchestration. (AC: 2, 3)
  - [x] Load active receipt draft, latest parsed/low-confidence parse job, preferences, categories, and topics for the Review Desk.
  - [x] Save a reviewed receipt as a `money_records` expense with `source: receipt`.
  - [x] Use `sourceOfTruth: manual` and `userCorrectedAt` when user corrections are applied; do not let parsed values override corrections.
  - [x] Soft-mark the existing `capture_drafts` row as saved with `savedRecordKind: money_record` and the new money record id.
  - [x] Preserve receipt draft context and parse job result until later retention/deletion stories handle cleanup.
  - [x] Do not create final expenses from pending, failed, retry-exhausted, missing, discarded, or non-receipt drafts.

- [x] Add reviewed/saved parse-job state support where needed. (AC: 2, 3)
  - [x] Extend receipt parse job domain status validation to include reviewed/saved lifecycle states if the save workflow needs them.
  - [x] Add repository method(s) to mark a parsed job reviewed/saved without destructive migration.
  - [x] Keep migration changes non-destructive; avoid a new receipt line-item table unless implementation proves impossible without it.

- [x] Build the Receipt Review Desk surface. (AC: 1, 2, 3)
  - [x] Update receipt draft/review screen so parsed and low-confidence jobs show editable fields, confidence/source labels, and correction errors.
  - [x] Provide controls for merchant, date, total, category, topic, line-item edit, ignore line items, save corrected receipt, manual expense, keep draft, and discard draft.
  - [x] Keep low-confidence, unknown, corrected, and ignored states text-labeled and reachable by screen readers.
  - [x] Ensure manual expense remains available if review cannot proceed.
  - [x] After save, show a calm saved state with the final total-only expense summary and no implication that OCR was final truth.

- [x] Preserve privacy, data safety, and story boundaries. (AC: 1, 2, 3)
  - [x] Do not add real OCR credentials, external AI/OCR calls, duplicate warning logic, receipt retention cleanup, image deletion, or diagnostics expansion beyond redacted local errors.
  - [x] Do not log receipt image URI, OCR text, merchant, spending amount, line items, draft payloads, or corrected values to diagnostics.
  - [x] Do not change auth, cloud sync, backend/public APIs, regulated-finance scope, or unrelated capture flows.
  - [x] Do not delete parse jobs, receipt drafts, receipt files, money records, or migrations.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Add domain tests for deriving review drafts, correction flags, low-confidence text labels, line-item edits, ignored line items, and total-only validation.
  - [x] Add service tests for loading review data, saving corrected receipt expenses, marking draft saved, preserving parse context, rejecting unsafe states, and user-correction source-of-truth behavior.
  - [x] Add repository tests for any reviewed/saved parse-job transition added in this story.
  - [x] Add feature/helper tests for Review Desk visible labels, manual fallback, save disabled/error states, and total-only save path.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 5.3 owns review, correction, and saving a reviewed receipt-based expense.
- Story 5.3 may create a final `money_records` expense only after explicit user save from parsed/low-confidence review state.
- Story 5.3 should save a total-only expense for MVP. Line-item details can be edited to help the user reconcile the total, or ignored, but they do not need a persistent line-item table in this story.
- Story 5.3 must not implement duplicate warnings, retention settings, receipt image deletion, abandoned draft cleanup, real OCR provider setup, external API calls, or failure recovery diagnostics beyond safe local errors; those belong to later stories.
- The approved shared draft model remains: receipt capture uses an `expense` row in `capture_drafts` with receipt-specific JSON payload.

### Current Repository State

- Story 5.1 implemented receipt capture using shared `capture_drafts` with `captureMode: receipt`, app-private file metadata, `/receipt/new`, and `/receipt/[receiptDraftId]`.
- Story 5.2 added local `receipt_parse_jobs`, migration `014_create_receipt_parse_jobs`, parse job repository, retry policy, `receipt-parse-job.service.ts`, normalized parse result schemas, and visible receipt parse states.
- `ReceiptRouteScreen.tsx` currently shows receipt metadata, parse status, proposed fields, start/resume/retry parsing, manual expense, keep, and discard.
- `NormalizedReceiptParseResult` now includes merchant, localDate, totalMinor, currency, lineItems, categoryId, topicIds, unknownFields, and duplicateSuspected.
- Existing money record service creates manual records with `source: manual`; Story 5.3 needs a receipt-specific save path or extension that sets `source: receipt`.
- Existing `money_records` already supports `source: receipt`, `sourceOfTruth: manual | parsed`, `userCorrectedAt`, category/topic links, and soft deletion.
- Existing `capture_drafts.repository.ts` can mark a draft saved by id or active kind with saved record linkage.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add feature/domain helpers under `src/features/receipts` or `src/domain/receipts`, for example:
  - `receipt-review.ts` for deriving editable review drafts, formatting source/confidence labels, line-item update helpers, and total-only save payloads.
  - `receipt-review.test.ts` for pure correction and labeling behavior.
- Add service orchestration under `src/services/receipt-parsing` or `src/services/receipts`, for example:
  - `receipt-review.service.ts` to prepare DB access, load active receipt draft + parse job + preferences/categories/topics, validate corrected fields, create receipt money record, mark draft saved, and mark parse job saved/reviewed.
  - Keep repositories as the only SQLite access layer; do not import SQLite/Drizzle from React components.
- Extend `src/data/repositories/receipt-parse-jobs.repository.ts` only if a reviewed/saved transition is needed.
- Prefer extending `src/services/money/money-record.service.ts` or using `MoneyRecordRepository.createManualRecord` through a receipt review service rather than duplicating money validation logic.
- Update `ReceiptRouteScreen.tsx` incrementally; do not introduce a broad navigation rewrite.

### UX Guidance

- The review screen should frame OCR as assistance:
  - "Review proposed fields before saving."
  - "Low confidence - review needed."
  - "Corrected by you."
  - "Line items ignored; saving total only."
- Required editable fields for save: total amount greater than zero and valid local date. Merchant/category/topics/line items are optional where existing money rules allow.
- Category and topic selectors should reuse existing list-row/toggle patterns from manual money capture where practical.
- Primary action: `Save corrected receipt`.
- Secondary/recovery actions: `Manual expense`, `Keep draft`, `Discard draft`, and `Ignore line items`.
- Do not rely on color alone for low confidence, unknown, corrected, or ignored states.
- Avoid nested cards and keep the screen mobile-first, text-first, and calm per `DESIGN.md`.

### Architecture Compliance

- `ReceiptParsingPort` remains the only parser boundary. Story 5.3 consumes parse job results; it must not call OCR providers.
- Parser output is not source of truth until the user reviews/saves; manual corrections must override parsed data and derived summaries.
- Money amounts must remain in minor units.
- Final receipt expense records must be ordinary local `money_records` rows so budget/history/summary behavior remains deterministic.
- Diagnostics, if any are touched, must remain redacted and must not include receipt image URI, OCR text, merchant, totals, line items, or corrected values.
- No backend, auth, cloud sync, bank/payment, or regulated-finance behavior is in scope.

### Previous Story Intelligence

- Story 5.2 self-review verdict was `APPROVED_WITH_MINOR_NOTES`; known risk was that parse jobs are asynchronous within app flow, not an OS-level worker. Pending jobs can be resumed from the receipt draft screen.
- Story 5.2 service tests use injected repositories and parser ports; continue that pattern for review save tests.
- Story 5.2 stores parser failures as safe categories and stores successful parse output in `receipt_parse_jobs.result_json`.
- Story 5.1 self-review noted real-device camera/photo-library behavior still needs manual testing later; do not broaden scope.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npm run build --if-present
git diff --check
```

Minimum coverage:

- Review draft derivation shows merchant, date, total, category, topics, line items, confidence, unknown fields, and duplicate indicator labels.
- Low-confidence and unknown states have text labels.
- Edited merchant/date/total/category/topic/line items are reflected in the final save payload.
- Ignoring line items allows a valid total-only receipt expense.
- Saving from parsed/low-confidence job creates one `money_records` expense with `source: receipt`, minor-unit amount, local date, category/topic links, and user correction source-of-truth behavior.
- Saving marks the existing receipt capture draft as saved with `savedRecordKind: money_record` and `savedRecordId`.
- Pending/failed/retry-exhausted/missing/discarded/non-receipt states cannot create a receipt expense.
- No raw receipt URI, OCR text, merchant, totals, line items, or corrected values appear in diagnostic/error messages.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 5.3 acceptance criteria and Epic 5 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR19, FR20, FR21, FR22, FR23, FR50, NFR-REL-03, NFR-SEC-03, NFR-SEC-04, NFR-A11Y-04, NFR-UX-04, NFR-MOB-06]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - receipt parsing trust, manual correction precedence, `ReceiptParsingPort`, repository boundaries, source/provenance fields]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Receipt Review Desk, confidence/source labels, editable correction fields, text-labeled low confidence]
- [Source: `_bmad-output/implementation-artifacts/5-2-parse-receipt-asynchronously-with-visible-states.md` - parse job schema, service, UI state, retry behavior]
- [Source: `_bmad-output/implementation-artifacts/5-1-capture-receipt-photo-and-save-draft.md` - shared receipt draft payload and app-private receipt file context]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 5.3 ready-for-dev from Epic 5, PRD, architecture, UX, Story 5.1/5.2 implementation context, and current receipt review/money save patterns.
- 2026-05-08: Started Story 5.3 implementation.
- 2026-05-08: Added receipt review domain contracts, save orchestration, UI review desk, reviewed/saved parse-job support, and focused tests.
- 2026-05-08: Verification passed: focused Jest, typecheck, lint, full Jest, Expo install check, build-if-present, and git diff whitespace check.

### Completion Notes List

- Implemented receipt review drafts, correction/source labels, validation, and total-only line-item ignore behavior.
- Added receipt review service to load active receipt drafts and parsed jobs, validate active category/topic ids, save a reviewed receipt as a `source: receipt` money record, mark the draft saved, and mark the parse job saved while preserving parse result JSON.
- Updated the receipt route screen with editable merchant/date/total/note/category/topic/line-item controls, text-labeled confidence/correction states, manual fallback, keep/discard actions, and a calm saved state.
- Preserved story boundaries: no real OCR credentials/calls, duplicate warning logic, receipt retention cleanup, backend/auth/sync changes, destructive migration, or raw receipt diagnostics.

### File List

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

## Change Log

- 2026-05-08: Created Story 5.3 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed receipt review/correction flow and marked Story 5.3 done after verification.
