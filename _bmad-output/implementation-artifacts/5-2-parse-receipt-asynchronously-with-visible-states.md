# Story 5.2: Parse Receipt Asynchronously With Visible States

Status: ready-for-dev

## Story

As a student,
I want receipt parsing to run in the background with clear states,
so that I can keep control while automation helps.

## Acceptance Criteria

1. Given a receipt draft exists, when parsing starts, then a receipt parse job is created with pending state, and manual entry and navigation remain available.
2. Given parsing succeeds, when results are normalized, then Pplant proposes merchant, date, total, line items, category, topic, unknown fields, confidence, and duplicate indicators, and no final expense is saved automatically.
3. Given parsing fails or times out, when retry policy applies, then automatic retries are capped at 3 within 24 hours, and final failure requires user action for further retry.

## Tasks / Subtasks

- [ ] Add receipt parse job domain and persistence. (AC: 1, 2, 3)
  - [ ] Add a non-destructive migration for `receipt_parse_jobs`; do not modify or delete `capture_drafts`.
  - [ ] Add schema ownership in `src/data/db/schema.ts` and migration tests proving existing data survives.
  - [ ] Add domain types/schemas for parse job status, attempts, timestamps, error category, normalized result JSON, and retry exhaustion.
  - [ ] Add repository methods for create pending job, load active/latest job by draft, mark running, mark parsed, mark failed, and list pending/retryable jobs.
  - [ ] Keep job records local and linked to the existing receipt expense draft id.

- [ ] Implement parsing service orchestration through the existing port. (AC: 1, 2, 3)
  - [ ] Use `ReceiptParsingPort`; parser output must never create a final expense record.
  - [ ] Keep `noopReceiptParser` as the default/manual-fallback parser when OCR is not configured.
  - [ ] Normalize and validate parser output before storing it on the job.
  - [ ] Store proposed fields and confidence/unknown states as result JSON, not as final money records.
  - [ ] Return typed `AppResult` failures with recovery paths and redacted messages.

- [ ] Implement retry policy. (AC: 3)
  - [ ] Enforce no more than 3 automatic attempts within a 24-hour window per receipt parse job.
  - [ ] Mark jobs `retry_exhausted` after the final automatic failure.
  - [ ] Require explicit user action to create/run another attempt after retry exhaustion.
  - [ ] Add deterministic tests around attempt counts, 24-hour windows, and final failure.

- [ ] Surface visible receipt parsing states without blocking manual entry. (AC: 1, 2, 3)
  - [ ] Update receipt draft screen to show draft, pending/running, parsed, low-confidence, failed, and retry-exhausted states where supported.
  - [ ] Provide actions for start parsing, retry when allowed, manual expense, keep draft, and discard draft.
  - [ ] Keep navigation away safe; parse jobs should remain recoverable from the receipt draft screen.
  - [ ] Do not hide manual expense while parsing is pending, failed, or retry-exhausted.
  - [ ] Label parsed/low-confidence/unknown fields with text, not color alone.

- [ ] Preserve privacy, architecture, and scope boundaries. (AC: 1, 2, 3)
  - [ ] Do not send receipt images to external services unless an injected parser is explicitly supplied in tests.
  - [ ] Do not add real OCR credentials, environment secrets, third-party AI calls, duplicate detection, review correction save, line-item editing UI, or final expense creation.
  - [ ] Do not log receipt image URI, OCR text, spending details, parsed totals, line items, or draft payloads to diagnostics.
  - [ ] Do not change auth, cloud sync, public APIs, or unrelated capture flows.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add migration/repository tests for parse job lifecycle.
  - [ ] Add domain/retry-policy tests.
  - [ ] Add parsing service tests for noop failure, success normalization, low confidence, retry exhaustion, and manual fallback availability.
  - [ ] Add feature/UI helper tests for visible state descriptors and non-color-only labels.
  - [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Story 5.2 owns local parse job state and visible parsing states only.
- Story 5.2 must not create final expenses, save user corrections, detect duplicates, manage receipt retention cleanup, or implement a real OCR provider.
- A configured production OCR provider is not required. Use the existing `noopReceiptParser` by default so the app remains usable without secrets.
- User action remains available throughout: manual expense, keep draft, discard draft, and retry where allowed.

### Current Repository State

- Story 5.1 implemented receipt capture as an active `expense` draft with `captureMode: receipt`, app-private retained image metadata, receipt capture route `/receipt/new`, and receipt draft detail route `/receipt/[receiptDraftId]`.
- Receipt parsing placeholders already exist:
  - `src/services/receipt-parsing/receipt-parsing.port.ts`
  - `src/services/receipt-parsing/noop-receipt-parser.ts`
  - `src/services/receipt-parsing/ocr-receipt-parser.ts`
  - `src/domain/receipts/types.ts`
  - `src/domain/receipts/schemas.ts`
  - `src/domain/receipts/normalize-parse-result.ts`
- There is no `receipt_parse_jobs` table yet.
- The shared draft table must remain the draft source of truth; parse jobs should link to capture draft ids.

### Recommended Implementation Shape

- Add domain code under `src/domain/receipts`, for example:
  - `parse-jobs.ts` or extend `types.ts` with job status and retry types.
  - `parse-job-schemas.ts` for Zod validation of job rows and normalized result JSON.
  - `retry-policy.ts` for pure attempt/window decisions.
- Add data layer code:
  - migration `014_create_receipt_parse_jobs`
  - schema `receiptParseJobs`
  - repository `src/data/repositories/receipt-parse-jobs.repository.ts`
- Suggested table fields:
  - `id text primary key`
  - `workspace_id text not null`
  - `receipt_draft_id text not null`
  - `status text not null`
  - `attempt_count integer not null`
  - `retry_window_started_at text`
  - `requested_at text not null`
  - `started_at text`
  - `completed_at text`
  - `last_error_category text`
  - `result_json text`
  - `created_at text not null`
  - `updated_at text not null`
  - `deleted_at text`
- Add service code under `src/services/receipt-parsing`, for example `receipt-parse-job.service.ts`, that prepares DB access, creates jobs, invokes the parser port, stores normalized results, and enforces retry policy.
- Add feature helper/hook under `src/features/receipts` for parse-state copy and screen actions.
- Update `ReceiptRouteScreen.tsx` to show parse status and start/retry actions while preserving Story 5.1 draft/manual/discard/keep actions.

### UX Guidance

- Parsing should be framed as assistive and optional:
  - Pending: "Receipt parsing queued"
  - Failed/noop: "Parsing is not configured. Manual expense still works."
  - Retry exhausted: "Automatic tries are paused. You can retry manually or enter the expense."
  - Parsed: "Review proposed fields before saving."
  - Low confidence: "Some proposed fields need review."
- Never imply parsed values are final.
- Manual expense should remain visible in every parse state.
- Confidence, unknown, failed, and retry-exhausted states must be text-labeled, not color-only.

### Architecture Compliance

- `ReceiptParsingPort` is the only parser boundary; feature code must not call OCR providers directly.
- Parser output is proposed data only and must not create `money_records`.
- Repositories are the only layer that reads/writes SQLite.
- Diagnostics, if any are added, must be redacted and must not include raw image URI, OCR text, parsed totals, line items, merchant, spending details, or draft payloads.
- No backend, auth, sync, bank/payment, or regulated-finance behavior is in scope.

### Previous Story Intelligence

- Story 5.1 added `expo-image-picker` and `expo-file-system`, private image persistence, and receipt draft payloads. Reuse those payload helpers and avoid adding a new draft kind.
- Story 5.1 self-review noted real-device camera/photo-library behavior still needs manual testing later.
- Story 4.5 established text-first state contracts; use the same pattern for parse-state copy.
- `.claude/worktrees/` remains untracked and must not be committed.

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

- Migration creates `receipt_parse_jobs` without data loss.
- Repository can create pending jobs and transition through running, parsed, failed, and retry-exhausted states.
- Retry policy caps automatic retries at 3 within 24 hours.
- Default noop parser failure keeps manual entry available and records no sensitive details.
- Successful injected parser stores normalized proposed fields and does not save final expenses.
- Low-confidence fields are detectable and text-labeled.
- Receipt draft screen/helper exposes manual expense, retry/start parse, keep, and discard paths in relevant states.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 5.2 acceptance criteria and Epic 5 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR19, FR20, FR21, FR22, NFR-PERF-05, NFR-REL-03, NFR-REL-08, NFR-SEC-03, NFR-SEC-04, NFR-UX-04, NFR-MOB-05, NFR-MOB-06]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - `ReceiptParsingPort`, adapter-based parsing, local persistence, protected receipt data, redacted diagnostics]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - Receipt Capture and Trust-Preserving Correction journey, visible confidence/error states]
- [Source: `_bmad-output/implementation-artifacts/5-1-capture-receipt-photo-and-save-draft.md` - receipt draft payload and private file persistence context]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 5.2 ready-for-dev from Epic 5, PRD, architecture, UX, Story 5.1 implementation context, and current receipt parsing placeholders.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/5-2-parse-receipt-asynchronously-with-visible-states.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-08: Created Story 5.2 ready-for-dev.
