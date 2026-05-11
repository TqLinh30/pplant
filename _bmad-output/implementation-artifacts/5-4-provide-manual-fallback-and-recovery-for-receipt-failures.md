# Story 5.4: Provide Manual Fallback And Recovery For Receipt Failures

Status: done

## Story

As a student,
I want receipt failures to offer manual fallback and recovery actions,
so that a failed scan does not block expense tracking.

## Acceptance Criteria

1. Given parsing is unavailable, failed, incomplete, or wrong, when I view the receipt state, then Pplant offers retry, edit draft, manual expense entry, discard, or keep draft actions, and the next action is clear.
2. Given network-dependent parsing is unavailable, when I create a manual expense from the receipt flow, then manual entry works offline, and the draft can be linked, discarded, or retained according to user choice.
3. Given a recovery action fails, when the failure is handled, then Pplant records only redacted diagnostic data, and no receipt image, OCR text, or spending detail is logged.

## Tasks / Subtasks

- [x] Add receipt recovery action contracts. (AC: 1, 2, 3)
  - [x] Add a feature/domain helper that maps receipt parse states and review availability to explicit actions: retry, edit draft/review, manual expense, keep draft, discard draft, and unavailable fallback.
  - [x] Label failed, retry-exhausted, pending, incomplete, wrong/low-confidence, and manual fallback states with neutral text and a clear recommended next action.
  - [x] Ensure recovery labels are text-first and do not rely on color alone.

- [x] Implement manual fallback handoff from receipt flow. (AC: 1, 2)
  - [x] Preserve the existing shared `capture_drafts` model: receipt capture remains an `expense` draft with `captureMode: receipt`.
  - [x] Route manual expense entry from the receipt screen using the existing active expense draft handoff where safe, so the receipt draft can be linked when the manual record is saved.
  - [x] Make the user's draft choice explicit: keep receipt draft, discard receipt draft, or continue manual entry linked to the receipt draft.
  - [x] Do not require network access, OCR configuration, or parsing success for manual expense creation.

- [x] Add safe recovery diagnostics. (AC: 3)
  - [x] Record a redacted diagnostic event when a recovery action fails, using only safe event names, timestamps, app version placeholder/default, error category, retry count/job state/offline/timeout-style metadata where available.
  - [x] Do not include receipt image URI, OCR text, merchant/source, amount, line items, note, draft payload JSON, saved record id, or corrected values in diagnostic metadata or error messages.
  - [x] Extend diagnostic redaction tests if new diagnostic event names or metadata keys are added.

- [x] Update Receipt Review Desk recovery UI. (AC: 1, 2, 3)
  - [x] Update `ReceiptRouteScreen.tsx` so failed/unavailable/incomplete/wrong states show a dedicated recovery action surface with retry, manual expense, edit/review where applicable, keep, and discard.
  - [x] Keep manual expense visible while parsing is pending, failed, retry-exhausted, low-confidence, or unavailable.
  - [x] Show a calm status after keep/discard/manual handoff attempts and a safe error state if an action fails.
  - [x] Preserve Story 5.3 review/correction and saved-state behavior.

- [x] Preserve privacy, data safety, and story boundaries. (AC: 1, 2, 3)
  - [x] Do not add real OCR credentials, external OCR/AI calls, duplicate warning logic, retention cleanup/image deletion, or backend/cloud sync behavior.
  - [x] Do not create final receipt expenses automatically from parser output.
  - [x] Do not delete parse jobs, receipt drafts, receipt files, money records, migrations, or stored parse results except through existing explicit discard behavior.
  - [x] Do not change auth, authorization, bank/payment, regulated-finance, or unrelated capture flows.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Add feature/helper tests for recovery action labels, recommended next action, manual fallback availability, retry-exhausted behavior, and total no-color-only labeling.
  - [x] Add service or integration-style tests for manual fallback handoff/linking behavior where existing capture draft services allow it.
  - [x] Add diagnostics tests proving recovery failures redact receipt URI, OCR text, merchant/source, amount, line items, notes, payloads, and record ids.
  - [x] Add screen/state tests around failure UI copy and action availability where reasonable.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 5.4 owns recovery and manual fallback around receipt parsing failures or unusable parse output.
- Manual fallback must work without OCR/network availability and must not require a production OCR provider.
- Story 5.4 may improve the receipt screen's recovery action structure and diagnostic event coverage for recovery failures.
- Story 5.4 must not implement duplicate warnings, receipt retention settings, receipt image deletion, automatic abandoned-draft cleanup, or real OCR provider integration; those remain later stories.
- Story 5.4 must not change the approved shared draft model: receipt capture uses an `expense` row in `capture_drafts` with receipt-specific JSON payload.

### Current Repository State

- Story 5.1 implemented receipt capture as an active `expense` draft with `captureMode: receipt`, app-private receipt file metadata, `/receipt/new`, and `/receipt/[receiptDraftId]`.
- Story 5.2 added local `receipt_parse_jobs`, retry policy, parser port orchestration, normalized parse result JSON, and visible parse states.
- Story 5.3 added receipt review drafts, review validation, the `receipt-review.service.ts` save path, reviewed/saved parse-job status support, and editable Review Desk UI.
- `ReceiptRouteScreen.tsx` already shows receipt metadata, parse status, proposed fields, Review Desk fields when parsed/low-confidence, parse retry/start, manual expense, keep, discard, and saved state.
- The current manual expense button routes to `/(tabs)/capture?draft=expense&draftSeq=...`; the Capture screen can resume the active expense draft, including receipt draft payload fields, through `parseMoneyCaptureDraftPayload`.
- `useManualMoneyCapture` saves generic manual money records with `source: manual` and marks the active draft saved by kind after successful creation.
- `diagnostics` currently contains `events.ts`, `diagnostics.service.ts`, `redact.ts`, and redaction tests. Allowed metadata is intentionally narrow.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add a feature helper under `src/features/receipts`, for example `receipt-recovery-actions.ts`, to keep recovery action copy/test logic outside the component.
- Consider adding a small service helper under `src/services/receipt-parsing` only if recovery diagnostics or manual-fallback handoff needs orchestration beyond the screen.
- Reuse existing primitives (`StatusBanner`, `Button`, `ListRow`, `TextField`) and keep the screen mobile-first and calm.
- If diagnostic event names/metadata need extension, update `src/diagnostics/events.ts`, `src/diagnostics/redact.ts` tests, and keep values generic.
- Prefer existing capture draft services (`getActiveCaptureDraft`, `markActiveCaptureDraftSaved`, `discardCaptureDraft`, `keepCaptureDraft`) over direct repository access from UI.

### UX Guidance

- Recovery copy should make the next action obvious without blame:
  - "Parsing did not finish. Manual expense entry still works."
  - "Automatic tries are paused. Retry manually or enter the expense."
  - "Review looks incomplete. Edit the draft or save manually."
  - "Draft kept for later."
  - "Draft discarded. No expense was created."
- Primary action should be the safest next step for the state. Failed/retry-exhausted states can prioritize manual expense or retry depending on retry availability.
- Recovery actions should include manual expense, keep draft, and discard draft consistently; retry/edit should appear only where the current state supports them.
- Use explicit labels for offline/unavailable, failed, retry-exhausted, low-confidence, and manual states; do not rely on color alone.

### Architecture Compliance

- `ReceiptParsingPort` remains the only parser boundary; Story 5.4 must not call OCR providers directly.
- Repositories remain the only SQLite access layer; React components should call services/helpers.
- Manual corrections and manual fallback must remain source-of-truth over parsed data.
- Diagnostics must use redacted, non-sensitive event names/categories/metadata only.
- No backend/public API, auth, sync, bank/payment, or regulated-finance behavior is in scope.

### Previous Story Intelligence

- Story 5.3 self-review verdict was `APPROVED_WITH_MINOR_NOTES`; known risks were real-device review UI not manually tested, sequential repository calls in receipt save, and no currency conversion.
- Story 5.3 introduced `receiptReviewDeskCopyFor` feature helper tests; follow that pattern for recovery-action copy.
- Story 5.3 extended parse job statuses to `reviewed` and `saved`; recovery helpers must account for these states without re-enabling parse retries for saved records.
- Story 5.2 known risk remains: parse jobs are asynchronous within app flow, not OS-level background workers. Pending jobs remain recoverable from the receipt draft screen.

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

- Recovery action helper labels failed, unavailable/noop, retry-exhausted, pending/running, low-confidence/wrong, parsed/incomplete, reviewed, saved, and draft-only states.
- Manual expense fallback remains available when parsing is unavailable, failed, retry-exhausted, pending, low-confidence, or wrong.
- Retry is available only for draft/no job, pending, failed, and retry-exhausted states that support explicit user retry; saved/reviewed states must not imply automatic parsing.
- Keep and discard actions remain available for active receipt drafts until saved/discarded.
- Manual fallback handoff preserves a link to the active receipt draft where existing capture draft behavior supports it.
- Recovery diagnostics redact receipt URI, OCR text, merchant/source, amount, line items, notes, payload JSON, saved record ids, and corrected values.
- No final expense is created automatically from pending/failed parser output.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 5.4 acceptance criteria and Epic 5 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR20, FR21, FR48, FR49, FR50, NFR-PERF-05, NFR-REL-08, NFR-SEC-03, NFR-SEC-04, NFR-UX-01, NFR-MOB-03, NFR-MOB-05, NFR-OBS-01, NFR-OBS-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - manual fallback when OCR unavailable, adapter boundaries, repository boundaries, redacted diagnostics, local-first recovery]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Receipt Review Desk recovery states, recovery-first copy, manual alternatives, feedback patterns]
- [Source: `_bmad-output/implementation-artifacts/5-3-review-and-correct-parsed-receipt-fields.md` - review desk/save behavior, reviewed/saved states, current file list]
- [Source: `_bmad-output/implementation-artifacts/5-2-parse-receipt-asynchronously-with-visible-states.md` - parse states, retry policy, noop parser/manual fallback behavior]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 5.4 ready-for-dev from Epic 5, PRD, architecture, UX, Story 5.2/5.3 implementation context, and current diagnostics/capture-draft patterns.
- 2026-05-08: Started Story 5.4 implementation.
- 2026-05-08: Added receipt recovery action helper, safe recovery diagnostics, manual fallback handoff coverage, and recovery panel UI.
- 2026-05-08: Verification passed: focused Jest, typecheck, lint, full Jest, Expo install check, build-if-present, and git diff whitespace check.

### Completion Notes List

- Implemented explicit receipt recovery action modeling for draft, pending, running, parsed, low-confidence, reviewed, failed, retry-exhausted, and saved states.
- Updated receipt route UI with a dedicated recovery action surface that keeps retry, edit review/draft, manual expense, keep draft, and discard draft available where appropriate.
- Added redacted receipt recovery failure diagnostics and tests proving sensitive receipt/spending fields are dropped.
- Confirmed receipt draft payloads can hand off to manual expense capture without parsing or network availability.

### File List

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

## Change Log

- 2026-05-08: Created Story 5.4 ready-for-dev.
- 2026-05-08: Started implementation.
- 2026-05-08: Completed receipt failure recovery/manual fallback flow and marked Story 5.4 done after verification.
