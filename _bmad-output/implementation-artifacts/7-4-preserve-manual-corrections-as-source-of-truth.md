# Story 7.4: Preserve Manual Corrections As Source Of Truth

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want my manual corrections to override parsed or derived values,
so that Pplant respects what I actually fixed.

## Acceptance Criteria

1. Given I manually correct a parsed receipt, money record, or derived field, when the correction is saved, then source/provenance fields record the manual correction, and the corrected value becomes source of truth.
2. Given summaries, parsing results, app restart, migration, or future sync/backup behavior touches the same record, when updates run, then manual corrections are preserved, and derived calculations use the corrected value.
3. Given a migration or recalculation changes related data, when verification tests run, then user corrections remain intact, and no parsed value silently overwrites them.

## Tasks / Subtasks

- [ ] Tighten receipt review provenance semantics. (AC: 1, 2, 3)
  - [ ] Save an accepted parsed receipt as `source: receipt`, `sourceOfTruth: parsed`, and `userCorrectedAt: null` when the user saves without changing parsed fields.
  - [ ] Save a manually corrected receipt as `source: receipt`, `sourceOfTruth: manual`, and `userCorrectedAt` set to the save timestamp when any field or line-item review choice is changed.
  - [ ] Keep the existing receipt draft, parse job, and money record linkage behavior intact.
  - [ ] Do not create a per-field provenance table unless implementation proves the current record-level provenance cannot satisfy the story.

- [ ] Centralize manual-correction precedence checks for money records. (AC: 1, 2, 3)
  - [ ] Add a small domain helper for resolving money record provenance from receipt review save payloads and/or asserting that existing manual corrections must not be replaced by parsed values.
  - [ ] Ensure manual edits to receipt-sourced records keep `source: receipt` while switching or staying `sourceOfTruth: manual`.
  - [ ] Ensure recurring/manual money creation remains `sourceOfTruth: manual`.
  - [ ] Keep money values in integer minor units and preserve current category/topic validation.

- [ ] Prove summaries and review calculations use corrected source records only. (AC: 2, 3)
  - [ ] Add or update summary/review tests with receipt-sourced records where parsed values differ from later manual corrections.
  - [ ] Verify Today, period review, end-of-day review, and money history calculations read the saved `money_records` values and never recompute from parse job JSON.
  - [ ] Do not add summary snapshot persistence or new cache invalidation tables in this story.

- [ ] Prove migrations preserve manual correction fields. (AC: 2, 3)
  - [ ] Add migration tests that assert `source_of_truth` and `user_corrected_at` survive later migrations/recalculation setup.
  - [ ] Do not add destructive migrations or rewrite existing migration history.
  - [ ] Do not mutate existing money record source/provenance during migration.

- [ ] Preserve privacy, architecture, and story boundaries. (AC: 1, 2, 3)
  - [ ] Do not log merchant, amount, dates, notes, OCR text, receipt image URI, line items, or corrected values to diagnostics.
  - [ ] Do not add cloud sync, account auth, backend APIs, external OCR providers, or conflict-resolution services.
  - [ ] Do not implement Story 7.5 diagnostics/benchmark fixtures early.
  - [ ] Keep UI route files thin and keep SQLite access inside repositories/services.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add receipt review service/domain tests for accepted parsed saves vs corrected saves.
  - [ ] Add money service/repository tests for manual edit precedence on receipt-sourced rows.
  - [ ] Add summary/history/review tests for corrected values taking precedence.
  - [ ] Add migration preservation tests for correction metadata.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement Story 7.4 only. Do not implement Story 7.5 redacted diagnostics expansion or standard benchmark fixture generation.
- This story should strengthen the already implemented provenance model rather than introduce a large schema rewrite.
- No destructive database changes are allowed.
- No final expense may be created from parser output without an explicit user save.
- Future sync/backup is not implemented in MVP; cover its boundary by making local provenance semantics explicit and regression-tested.

### Current Repository State

- Story 2.2 added `money_records.source`, `source_of_truth`, and `user_corrected_at`, plus edit behavior that preserves original `source` and marks manual edits as `sourceOfTruth: manual`.
- Story 5.3 added receipt review/correction save behavior and currently records corrected receipts as receipt-sourced money records with manual source-of-truth semantics.
- Story 6.1 added weekly/monthly summaries that read from `money_records` and do not write back into source records.
- Story 7.3 added pending receipt parse job recovery and must remain untouched except where tests need current fakes updated.
- `ReceiptReviewSavePayload.corrected` already identifies whether review values differ from the parse result.
- `money_records` supports `sourceOfTruth: manual | parsed`; no new enum value is needed for MVP.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add a small helper in `src/domain/money` or `src/domain/receipts` rather than scattering provenance branching through services. A likely shape:

```ts
resolveReceiptReviewMoneyProvenance({ corrected, timestamp })
```

Returning:

- `{ sourceOfTruth: 'manual', userCorrectedAt: timestamp }` when corrected.
- `{ sourceOfTruth: 'parsed', userCorrectedAt: null }` when accepted as parsed.

- Use the helper in `src/services/receipt-parsing/receipt-review.service.ts` before creating the money record.
- Keep `MoneyRecordRepository.updateRecord` behavior: loading the existing record, preserving `source`, setting `sourceOfTruth: manual`, and setting `userCorrectedAt`.
- Add tests around behavior rather than broad UI changes unless a UI label currently misrepresents manual vs parsed provenance.

### UX Guidance

- Existing receipt review copy already labels "Corrected by you" and parsed confidence states. Preserve that.
- If any visible source label is touched, use text labels such as "parsed" and "user corrected"; do not rely on color alone.
- Do not add alarming copy. This is a trust-preservation behavior story, not a warning-heavy flow.

### Architecture Compliance

- SQLite remains the source of truth.
- Repositories remain the only SQLite access layer.
- Receipt parsing remains assistive; parser output does not directly mutate saved money records after review.
- Summaries and reviews consume saved records, not parse job JSON.
- Manual corrections and saved user edits must be preserved across service calls, app restart, and migrations.
- Diagnostics must stay redacted.

### Previous Story Intelligence

- Story 7.3 self-review verdict was `APPROVED_WITH_MINOR_NOTES`; the known minor risk was that receipt edit recovery hides the pending item immediately after routing. Story 7.4 does not need to change recovery routing.
- Recent review feedback fixed fire-and-forget draft saved linkage; preserve the pattern of awaiting draft/job/record updates before reporting success.
- Story 5.3 tests already cover corrected receipt saves; extend them rather than creating duplicate test infrastructure.
- Story 2.2 tests already cover manual edit precedence for receipt-sourced records; add targeted regression cases only where they clarify source-of-truth boundaries.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck -- --pretty false
npm run lint
npm test
npx expo install --check
npm run build --if-present
git diff --check
```

Minimum coverage:

- Accepted parsed receipt save creates `source: receipt`, `sourceOfTruth: parsed`, and `userCorrectedAt: null`.
- Corrected receipt save creates `source: receipt`, `sourceOfTruth: manual`, and `userCorrectedAt` set to the save timestamp.
- Later manual edit of a receipt-sourced parsed record preserves `source: receipt`, sets `sourceOfTruth: manual`, and sets `userCorrectedAt`.
- Summary/history/review calculations use the corrected `money_records.amountMinor`, `localDate`, category, topic, merchant/source, and note rather than parse job JSON.
- Migration tests prove `source_of_truth` and `user_corrected_at` are not dropped or reset by later migrations.
- No raw sensitive receipt or money fields are added to diagnostics/errors.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 7.4 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR50, NFR-REL-03, NFR-REL-07, NFR-SEC-04]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - manual correction precedence, source/provenance fields, migration preservation, repository boundaries]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - receipt correction source-of-truth and visible source labels]
- [Source: `_bmad-output/implementation-artifacts/2-2-edit-and-delete-money-records-with-summary-recalculation.md` - money record correction fields and edit precedence]
- [Source: `_bmad-output/implementation-artifacts/5-3-review-and-correct-parsed-receipt-fields.md` - receipt review save and correction detection]
- [Source: `_bmad-output/implementation-artifacts/6-1-generate-weekly-and-monthly-summaries.md` - derived summaries do not write back into source records]
- [Source: `_bmad-output/implementation-artifacts/7-3-manage-pending-network-dependent-records.md` - latest receipt recovery state]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-09: Created Story 7.4 ready-for-dev from Epic 7, PRD FR50, architecture provenance guidance, UX correction trust guidance, and completed Stories 2.2, 5.3, 6.1, and 7.3.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/7-4-preserve-manual-corrections-as-source-of-truth.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-09: Created Story 7.4 ready-for-dev.
