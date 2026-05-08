# Story 7.2: Support Offline Core Capture

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want core capture to work offline or during poor network conditions,
so that I can keep recording daily life when services are unavailable.

## Acceptance Criteria

1. Given network-dependent services are unavailable, when I create expenses, income entries, work entries, tasks, reminders, or receipt drafts, then the core capture flow persists data locally and manual alternatives remain available.
2. Given OCR is unavailable offline, when I capture a receipt, then the receipt photo or draft can be saved for later parsing and manual expense entry remains available immediately.
3. Given offline-created records exist, when the app restarts, then records and drafts remain available and pending network-dependent work is clearly labeled.

## Tasks / Subtasks

- [ ] Add local/offline capture status helpers. (AC: 1, 2, 3)
  - [ ] Add pure helper logic that describes locally saved records and drafts without requiring a network detector.
  - [ ] Add receipt-specific pending network-dependent labels for parsing not started, queued, running, failed, retry exhausted, parsed, low confidence, reviewed, and saved states.
  - [ ] Keep labels text-first and accessible; do not rely on color alone.

- [ ] Surface pending receipt parsing state in draft recovery. (AC: 2, 3)
  - [ ] Extend the capture draft recovery service/hook so Today and Capture can show active drafts with any latest receipt parse job context.
  - [ ] Label active receipt drafts as locally saved and clearly identify whether parsing is not started, pending, running, failed, paused after retries, ready for review, or complete.
  - [ ] Preserve current resume, keep, and discard behavior; do not implement the centralized retry/edit/discard queue from Story 7.3.
  - [ ] Ensure receipt drafts remain resumable after app restart using existing `capture_drafts` and `receipt_parse_jobs` local tables.

- [ ] Confirm core capture flows remain local-first with manual alternatives. (AC: 1, 2)
  - [ ] Keep expense and income save paths local-only through existing money services and repository behavior.
  - [ ] Keep task and work-entry save paths local-only through existing services and repository behavior.
  - [ ] Keep reminders usable when notification scheduling is denied, unavailable, or local-only; user data must still save locally.
  - [ ] Keep receipt capture saving the image reference/draft locally before any parsing attempt and keep manual expense entry visible immediately.
  - [ ] Update user-facing copy where needed so saved records/drafts communicate local persistence and offline-safe manual alternatives.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add helper tests for local saved labels and receipt pending network-dependent labels.
  - [ ] Add service/hook tests proving active receipt drafts include latest parse-job labels and ordinary drafts remain labeled as locally saved.
  - [ ] Add receipt capture tests proving draft save/manual fallback copy does not require OCR.
  - [ ] Add or update capture form tests where reasonable to assert local-save and local-only fallback behavior.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement Story 7.2 only. Do not implement Story 7.3's centralized pending-job recovery queue with retry, edit, discard, and manual-entry actions beyond existing receipt-screen actions.
- Do not implement cloud sync, account auth, remote APIs, background workers, service workers, online/offline network monitors, or conflict resolution.
- Do not add destructive database changes. This story should use existing local SQLite tables: `capture_drafts`, `receipt_parse_jobs`, money records, work entries, tasks, and reminders.
- Do not change receipt parser provider configuration or add OCR credentials. The existing noop parser remains the safe unavailable/offline default.
- Do not change manual-correction source-of-truth semantics from Story 7.4 or diagnostics fixture scope from Story 7.5.

### Current Repository State

- Story 7.1 is done. Privacy deletion now handles local records, drafts, receipt images, parse jobs, reminders, recovery events, diagnostics, and all-personal-data cleanup.
- Manual money capture already persists through local services and marks active drafts saved only after final records are created.
- Task, reminder, and work capture hooks already persist meaningful drafts locally and await `markActiveCaptureDraftSaved` before clearing forms.
- `ReminderForm` already exposes local-only save behavior and labels denied/unavailable scheduling states as saved locally.
- Receipt capture currently saves an active `expense` draft with receipt payload and app-private image metadata before any parser job is started.
- Receipt parsing defaults to `noopReceiptParser`, which returns an `unavailable` error and keeps manual expense entry available.
- `CaptureDraftRecoveryPanel` currently lists active drafts on Today and Capture but only displays generic draft labels; it does not show latest receipt parse-job context.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add a small pure helper under `src/features/capture-drafts`, for example `offline-capture-recovery.ts`, to derive:
  - local status label for each active draft kind
  - receipt parsing status label from latest `ReceiptParseJob | null`
  - description/accessibility copy for the recovery panel
- Extend `src/services/capture-drafts/capture-draft.service.ts` with a read-only recovery listing such as `listCaptureDraftRecoveryItems()` that opens/migrates the local database once and joins active drafts with latest receipt parse jobs for receipt drafts.
- Update `useCaptureDraftRecovery` and `CaptureDraftRecoveryPanel` to render recovery items instead of raw drafts, while keeping existing action methods unchanged.
- Avoid importing SQLite repositories in React components. Components should consume hook/service output only.
- Use existing receipt helper `isReceiptCaptureDraftPayload` to distinguish receipt drafts from ordinary expense drafts.
- Use existing `receipt_parse_jobs` statuses and current retry policy semantics. Story 7.2 should label retry-exhausted states but not add new retry behavior.

### UX Guidance

- Copy should reassure without hiding state:
  - "Saved locally"
  - "Manual entry works now"
  - "Receipt parsing can wait"
  - "Parsing needs attention"
- Pending/offline labels must be visible as text, not only tone/color.
- Receipt draft recovery should make it clear that no expense was created automatically.
- Manual alternatives must stay visible on receipt capture and receipt review routes when camera/photo/OCR/parsing is unavailable.
- Keep Today/Capture draft recovery compact; no new landing or explanatory screen.

### Architecture Compliance

- Follow local-first SQLite and repository boundaries from the architecture document.
- Expected offline/unavailable states should return `AppResult` errors or neutral UI states, not throw.
- Services coordinate repositories; domain/feature helpers stay pure and testable.
- No sensitive receipt image URI, OCR text, spending details, income values, task titles, reminder text, work notes, or raw draft payloads may be logged to diagnostics.
- Do not store money values as floating point. Existing minor-unit patterns must remain untouched.

### Previous Story Intelligence

- Story 7.1 self-review verdict was `APPROVED_WITH_MINOR_NOTES`; residual risk was limited to no manual physical-device pass for broad data controls/native notification cleanup.
- Story 7.1 expanded privacy deletion around linked reminders and scheduled notification ids; Story 7.2 should not alter that cleanup path.
- Recent branch review fixed draft-save linkage failures by awaiting `markDraftSaved`; do not reintroduce fire-and-forget draft save or draft saved marking.
- Story 5.4 already added receipt recovery/manual fallback actions on the receipt route; Story 7.2 should reuse those capabilities and add restart-visible labels in Today/Capture.

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

- Ordinary active expense, income, task, reminder, and work drafts are described as locally saved and resumable.
- Active receipt drafts with no parse job are labeled as locally saved with parsing not started and manual expense available.
- Active receipt drafts with `pending`, `running`, `failed`, `retry_exhausted`, `parsed`, `low_confidence`, `reviewed`, and `saved` jobs get clear text labels.
- Today/Capture recovery surfaces preserve resume, keep, and discard actions after the service returns enriched recovery items.
- Receipt capture draft-saved and permission-denied/unavailable copy confirms manual expense entry remains available without OCR.
- Reminder local-only/permission-denied scheduling states still save user data locally.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 7 and Story 7.2 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR48, NFR-REL-01, NFR-REL-02, NFR-REL-08, NFR-UX-01, NFR-UX-03, NFR-MOB-03, NFR-MOB-05]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite, draft recovery, receipt parsing adapter, no throwing for offline/unavailable expected states]
- [Source: `_bmad-output/implementation-artifacts/7-1-delete-records-receipt-images-drafts-and-personal-data.md` - previous story state and data safety constraints]
- [Source: `_bmad-output/implementation-artifacts/5-4-provide-manual-fallback-and-recovery-for-receipt-failures.md` - existing receipt recovery/manual fallback actions]
- [Source: `_bmad-output/implementation-artifacts/4-3-save-and-recover-drafts-across-capture-forms.md` - existing shared `capture_drafts` persistence and recovery surfaces]
- [Source: `src/services/capture-drafts/capture-draft.service.ts` - current active draft service]
- [Source: `src/features/capture-drafts/CaptureDraftRecoveryPanel.tsx` - current Today/Capture draft recovery UI]
- [Source: `src/services/receipt-parsing/receipt-parse-job.service.ts` - current local receipt parse job orchestration]
- [Source: `src/features/receipts/receipt-capture.ts` - current receipt draft save/manual fallback copy]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-09: Created Story 7.2 ready-for-dev from Epic 7, PRD, architecture, Story 7.1, Story 5.4, Story 4.3, and current local-first capture/receipt recovery code.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/7-2-support-offline-core-capture.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-09: Created Story 7.2 ready-for-dev.
