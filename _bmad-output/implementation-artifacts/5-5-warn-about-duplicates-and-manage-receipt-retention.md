# Story 5.5: Warn About Duplicates And Manage Receipt Retention

Status: ready-for-dev

## Story

As a student,
I want duplicate warnings and receipt retention controls,
so that I avoid accidental duplicate expenses and control receipt image storage.

## Acceptance Criteria

1. Given Pplant detects a possible duplicate receipt or expense, when I review the receipt, then it shows a duplicate warning, and I can continue, edit, or discard with context.
2. Given a receipt image is stored, when I view retention settings or receipt detail, then I can choose retention behavior and delete stored receipt images while keeping expense records, and deletion updates file references and metadata.
3. Given abandoned receipt drafts are older than the cleanup threshold, when cleanup runs, then abandoned draft storage is cleaned according to policy, and total retained receipt images stay within the MVP storage threshold.

## Tasks / Subtasks

- [ ] Add duplicate detection contracts. (AC: 1)
  - [ ] Add a receipt duplicate helper under `src/domain/receipts` or `src/features/receipts` that combines parser-provided `duplicateSuspected` with local money-record matching.
  - [ ] Match only local non-deleted expense records using conservative MVP signals: same currency, same amount, same local date, and normalized merchant/source text when available.
  - [ ] Return neutral warning copy, matched-record context, and actions for continue review/save, edit fields, manual expense, or discard draft.
  - [ ] Do not block saving solely because a duplicate is suspected.

- [ ] Add receipt image retention metadata helpers. (AC: 2, 3)
  - [ ] Extend receipt capture payload parsing in a backward-compatible way so existing `keep_until_saved_or_discarded` payloads remain valid.
  - [ ] Add explicit retained/deleted metadata fields in the receipt payload JSON, not a separate receipt-drafts table for MVP.
  - [ ] Support MVP policies: keep image until user deletes it, delete image after expense save when selected, and cleanup abandoned receipt drafts after 30 days.
  - [ ] Store only file references and metadata; do not store raw OCR text or receipt content in diagnostics.

- [ ] Implement repository/service support for safe retention updates. (AC: 2, 3)
  - [ ] Add repository methods that can load/update receipt capture draft payloads for active or saved drafts by draft id and by saved money record id where needed.
  - [ ] Add a file-store delete operation that deletes only app-private receipt files and returns safe errors without logging raw paths.
  - [ ] Add a retention service that can delete a receipt image, update payload metadata, optionally mark abandoned active drafts discarded, and report cleaned counts/bytes.
  - [ ] Keep expense/money records intact when a receipt image is deleted.

- [ ] Update Receipt Review Desk and settings/privacy surfaces. (AC: 1, 2)
  - [ ] Show a duplicate warning panel in `ReceiptRouteScreen.tsx` when parser or local matching detects a possible duplicate.
  - [ ] Ensure the warning gives clear options to continue review/save, edit fields, use manual expense, or discard the receipt draft.
  - [ ] Show receipt image retention state and controls on receipt detail/review when an image is retained.
  - [ ] Update privacy/settings receipt image detail so it reflects actual current behavior and available retention controls instead of future-only copy.

- [ ] Add abandoned draft cleanup behavior. (AC: 3)
  - [ ] Implement `cleanupAbandonedReceiptDrafts` using a 30-day threshold from the PRD/NFR.
  - [ ] Cleanup must only target abandoned receipt capture drafts with retained receipt image metadata and no saved record.
  - [ ] Soft-mark cleaned active drafts as discarded through repository behavior and update payload retention metadata.
  - [ ] Do not delete money records, saved expenses, parse jobs for saved records, migrations, preferences, categories, topics, or unrelated draft kinds.

- [ ] Preserve privacy, data safety, and story boundaries. (AC: 1, 2, 3)
  - [ ] Do not add bank/payment, cloud sync, backend API, external OCR credentials, or analytics upload behavior.
  - [ ] Do not add destructive database migrations.
  - [ ] Do not delete receipt images except by explicit user action, selected delete-after-save policy, or the 30-day abandoned-draft cleanup policy.
  - [ ] Keep manual corrections and saved money records as source of truth.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add duplicate helper/service tests for parser-only duplicate signal, local exact match, non-match, deleted record exclusion, and save-not-blocked behavior.
  - [ ] Add payload/schema tests for backward-compatible retention metadata parsing.
  - [ ] Add repository/service/file-store tests for image deletion metadata updates while keeping saved money records.
  - [ ] Add cleanup tests for the 30-day threshold, active abandoned drafts, saved draft exclusion, non-receipt draft exclusion, and cleanup count/byte summaries.
  - [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 5.5 owns duplicate warnings and receipt image retention controls for the existing receipt capture/review flow.
- This story may add helper/service/repository methods and update the receipt payload JSON shape in a backward-compatible way.
- This story must not introduce a separate `receipt_drafts` table for MVP. The approved model is the shared `capture_drafts` table with a JSON payload.
- This story must not create or delete money records as part of duplicate warning display. The user remains in control.
- This story must not implement Epic 7 all-data deletion workflows. Only receipt image retention and abandoned receipt draft cleanup are in scope.

### Current Repository State

- Receipt capture is stored as an active `expense` row in `capture_drafts` with `captureMode: 'receipt'`.
- The receipt payload currently includes file metadata: `retainedImageUri`, `retentionAnchor`, `retentionPolicy`, `storageScope`, `sizeBytes`, `capturedAt`, and source info.
- `retentionPolicy` is currently `keep_until_saved_or_discarded`; Story 5.5 must parse this legacy value and may map it to a clearer MVP policy in updated payloads.
- `receipt_parse_jobs.result_json` already contains `duplicateSuspected`.
- `receiptProposalRows` already displays a text-only duplicate indicator, but the Receipt Review Desk does not yet show a dedicated warning with actions.
- `retention-cleanup.service.ts` currently returns `{ cleaned: 0 }` and has no real cleanup behavior.
- `receipt-file-store.ts` copies images into app-private receipt storage but does not yet expose a delete helper.
- Settings privacy currently explains receipt image retention as a future control rather than an available control.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add a pure duplicate helper such as `src/domain/receipts/duplicates.ts` to normalize merchant/source text and evaluate candidate matches.
- Add a small service such as `src/services/receipt-parsing/receipt-duplicate.service.ts` only if local money-record lookup needs orchestration outside the screen.
- Add retention helpers near receipt payload parsing, for example in `captureDraftPayloads.ts`, so old and new receipt payloads stay readable.
- Extend `CaptureDraftRepository` with narrowly scoped methods instead of querying SQLite directly from UI:
  - load draft by id including saved/discarded when needed;
  - update payload by draft id;
  - find saved receipt draft by saved money record id if receipt detail needs it.
- Add `deleteReceiptImageReference` to `src/services/files/receipt-file-store.ts` and keep errors path-redacted.
- Implement `cleanupAbandonedReceiptDrafts` in `src/services/files/retention-cleanup.service.ts`; inject repository/file dependencies for tests.
- Update `ReceiptRouteScreen.tsx` using existing primitives (`StatusBanner`, `Button`, `ListRow`) and the Story 5.4 recovery panel patterns.

### Retention Policy Decisions For MVP

- Default policy: keep retained receipt images until the user deletes them.
- Optional policy: delete the retained receipt image after the corrected receipt expense is saved.
- Cleanup policy: active receipt capture drafts older than 30 days with retained receipt images and no saved record are abandoned and may be cleaned.
- Storage threshold: cleanup should report retained bytes and cleaned bytes, and should be able to clean abandoned drafts so the standard MVP dataset can stay below 500 MB. Do not delete saved receipt images only to meet the threshold unless the user selected a delete policy.
- Deleting a receipt image must keep the saved expense/money record and mark receipt metadata as deleted/unavailable.

### Architecture Compliance

- Use repositories for SQLite access. React components must not import database clients, Drizzle tables, or migration utilities.
- Keep receipt parsing behind `ReceiptParsingPort`; duplicate warning logic must not call OCR providers.
- Keep money values in integer minor units.
- Use Zod-compatible parsing for payload/schema changes.
- Return typed `AppResult` and `AppError` for expected failures.
- Diagnostics and error messages must not include raw file URIs, OCR text, merchant/source, amounts, notes, line items, or draft payload JSON.
- No authentication, authorization, backend/cloud sync, bank/payment, regulated-finance, or all-data deletion behavior is in scope.

### Previous Story Intelligence

- Story 5.4 self-review verdict was `APPROVED_WITH_MINOR_NOTES`.
- Story 5.4 added `receipt-recovery-actions.ts`; duplicate warning actions should coexist with that recovery panel without removing retry/manual/keep/discard behavior.
- Story 5.4 added `recordReceiptRecoveryFailure`; Story 5.5 should not expand diagnostics unless necessary, and any new diagnostics must be redacted.
- Story 5.3 save path marks the active receipt draft saved and marks the parse job saved. If delete-after-save is selected, integrate after successful money record creation without making parser output source of truth.
- Story 5.2 known risk remains: parsing is asynchronous in app flow, not an OS background worker. Duplicate/retention UI must still work when the job is pending, failed, low-confidence, reviewed, or saved.

### UX Guidance

- Duplicate warning copy should be neutral:
  - "This looks similar to an expense already saved."
  - "Review before saving; you can still continue if this is a separate purchase."
  - "Same date and amount" or "Parser flagged this receipt" are acceptable context labels.
- Duplicate warnings must include text labels and cannot rely on warning color alone.
- Retention copy should say exactly what happens:
  - "Receipt image retained privately."
  - "Delete image, keep expense."
  - "Image deleted; the expense record remains."
  - "Abandoned receipt drafts older than 30 days can be cleaned automatically."
- Do not use guilt, blame, or financial-advice framing.

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

- Duplicate helper handles parser-only duplicate flags, exact local matches, deleted record exclusion, amount/date/currency/merchant non-matches, and neutral copy/actions.
- Receipt review UI exposes duplicate context and keeps continue/edit/manual/discard available.
- Receipt payload parsing accepts legacy `keep_until_saved_or_discarded` payloads and new retained/deleted metadata.
- Receipt image deletion updates draft payload metadata and keeps saved money records intact.
- Delete helper redacts raw file paths from expected errors.
- Cleanup only targets abandoned receipt drafts older than 30 days and excludes saved drafts, non-receipt drafts, recent active drafts, and unrelated records.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 5.5 acceptance criteria and Epic 5 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR6, FR18-FR25, FR47-FR50, NFR-REL-06, NFR-SEC-01 through NFR-SEC-06, NFR-MOB-04, NFR-MOB-06]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - receipt file handling, duplicate indicators, retention/deletion controls, repository boundaries, redacted diagnostics]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Receipt Review Desk duplicate warning and retention/privacy patterns]
- [Source: `_bmad-output/implementation-artifacts/5-4-provide-manual-fallback-and-recovery-for-receipt-failures.md` - recovery actions and manual fallback behavior]
- [Source: `_bmad-output/implementation-artifacts/5-3-review-and-correct-parsed-receipt-fields.md` - review/save flow and saved parse-job state]
- [Source: `_bmad-output/implementation-artifacts/5-1-capture-receipt-photo-and-save-draft.md` - receipt capture payload and file storage behavior]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 5.5 ready-for-dev from Epic 5, PRD, architecture, UX, Story 5.1-5.4 context, and current receipt/capture-draft code.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/5-5-warn-about-duplicates-and-manage-receipt-retention.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-08: Created Story 5.5 ready-for-dev.
