# Story 5.1: Capture Receipt Photo And Save Draft

Status: ready-for-dev

## Story

As a student,
I want to capture a receipt photo for expense entry,
so that I can create an expense faster while keeping control of the data.

## Acceptance Criteria

1. Given I start receipt capture, when camera permission is needed, then Pplant asks in context, and manual expense entry remains available if permission is denied.
2. Given I take or select a receipt photo, when capture completes, then a receipt draft is saved locally with file reference and retention metadata, and navigation away does not lose the draft.
3. Given capture is canceled or interrupted, when I return to Pplant, then I can continue manually or discard the partial draft, and no final expense is created without user confirmation.
4. Given the Capture Launcher exists, when receipt capture is implemented, then receipt capture is available from the launcher within the two-tap capture pattern, and denied camera permission still leaves manual expense entry available.

## Tasks / Subtasks

- [ ] Add receipt draft payload contracts using the existing draft system. (AC: 2, 3)
  - [ ] Extend feature-level draft payload helpers to support a receipt expense draft payload stored in `capture_drafts`.
  - [ ] Keep the approved MVP one-active-draft-per-form rule: receipt capture uses the existing `expense` draft kind with a receipt-specific payload shape; do not add a new `receipt` draft kind in this story.
  - [ ] Include receipt file reference, original captured URI only where needed for immediate persistence, retained file URI, captured timestamp, retention policy/source metadata, and capture state.
  - [ ] Add Zod/domain validation for receipt draft payload fields where the payload crosses feature/service boundaries.
  - [ ] Ensure saved receipt drafts do not create final `money_records` in Story 5.1.

- [ ] Implement safe receipt image persistence in app-private storage. (AC: 2)
  - [ ] Replace the placeholder `persistReceiptImageReference` with a service that copies a selected/captured image into an app-private receipt directory.
  - [ ] Use Expo first-party file APIs and avoid storing runtime receipt images under repository assets.
  - [ ] Return typed `AppResult` values with redacted errors; never include raw image URIs in error messages.
  - [ ] Store only the retained app-private URI/reference and metadata in the receipt draft payload.
  - [ ] Do not implement cleanup, duplicate detection, or retention settings management beyond a safe default metadata value; those belong to later stories.

- [ ] Add a receipt capture feature flow. (AC: 1, 2, 3, 4)
  - [ ] Add a feature hook/screen under `src/features/receipts` for starting camera capture and image-library selection.
  - [ ] Request camera or photo-library permission only in context when the user chooses that action.
  - [ ] If permission is denied/unavailable, show neutral copy and keep a visible manual expense fallback.
  - [ ] If the user cancels capture/picker, keep manual entry and discard options available without creating a final expense.
  - [ ] After a file is persisted, save/update the active `expense` capture draft with receipt metadata and route to a receipt draft screen or keep the receipt state visible.
  - [ ] Preserve route files as thin wrappers; orchestration belongs in `src/features/receipts`.

- [ ] Wire receipt capture into the existing two-tap capture launcher. (AC: 1, 4)
  - [ ] Add a `receipt` quick capture action and route.
  - [ ] Update launcher copy so receipt capture is no longer described as unavailable.
  - [ ] Keep manual expense capture available from the same launcher.
  - [ ] Update quick-capture tests for the new receipt action and route.

- [ ] Preserve privacy, architecture, and scope boundaries. (AC: 1, 2, 3, 4)
  - [ ] Do not add OCR parsing, parse jobs, duplicate detection, receipt review correction, line-item editing, or final expense creation.
  - [ ] Do not send receipt images to any external service.
  - [ ] Do not log raw receipt image URIs, OCR text, spending details, income values, task contents, reminder text, or draft payloads.
  - [ ] Do not create a new receipt database table unless implementation proves impossible with the approved shared draft model; if that happens, stop before migration.
  - [ ] Do not change auth, cloud sync, public APIs, or unrelated capture forms.

- [ ] Add focused tests and verification. (AC: 1, 2, 3, 4)
  - [ ] Add tests for receipt draft payload validation/normalization.
  - [ ] Add tests for receipt file persistence success/failure with redacted errors using injected file adapters.
  - [ ] Add hook/helper tests for permission denied, cancel, successful capture, manual fallback, and draft save behavior where practical.
  - [ ] Add quick-capture route/action tests for receipt.
  - [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### User-Approved Decisions

- Use the existing shared `capture_drafts` table with JSON payloads.
- MVP keeps one active draft per form kind: `expense`, `income`, `task`, `reminder`, and `work`.
- For Story 5.1, a receipt draft is an `expense` draft whose payload identifies receipt capture mode and includes receipt file metadata.
- Drafts remain until user save/discard. Story 5.1 must not create a final expense without explicit later user confirmation.
- When future stories save the receipt as a real record, the existing draft lifecycle should soft-mark the active expense draft as saved with saved-record linkage.

### Scope Boundaries

- Story 5.1 starts Epic 5 by adding local receipt image capture and draft persistence only.
- Parsing states, parse jobs, OCR retries, review correction, duplicate warning, line-item editing, retention cleanup, and final expense save belong to Stories 5.2-5.5.
- Receipt image cleanup and all-personal-data deletion belong to later privacy/data-control stories.
- No backend, auth, bank, payment, OCR provider, or third-party AI integration is needed.

### Current Repository State

- Story 4.3 already added `capture_drafts`, migration `013_create_capture_drafts`, one-active-draft-per-kind enforcement, Today/Capture recovery surfaces, and save/discard/keep lifecycle behavior.
- `capture_drafts.kind` currently supports `expense`, `income`, `task`, `reminder`, and `work`; do not add `receipt` unless explicitly approved.
- Existing receipt-related placeholders:
  - `src/features/receipts/ReceiptRouteScreen.tsx`
  - `src/app/receipt/[receiptDraftId].tsx`
  - `src/services/files/receipt-file-store.ts`
  - `src/services/files/receipt-file-store.test.ts`
  - `src/services/receipt-parsing/*`
  - `src/domain/receipts/*`
- Existing quick capture currently excludes receipt and says receipt arrives later:
  - `src/features/today/quick-capture.ts`
  - `src/features/today/quick-capture.test.ts`
  - `src/features/today/QuickCaptureLauncher.tsx`
- Existing manual fallback route is `/(tabs)/capture?quick=expense`.

### Recommended Implementation Shape

- Add receipt capture orchestration under `src/features/receipts`, for example:
  - `receipt-capture.ts` for state helpers, payload builders, permission/cancel state helpers.
  - `useReceiptCapture.ts` for feature orchestration with injectable camera/image-picker/file/draft dependencies.
  - `ReceiptCaptureScreen.tsx` or update `ReceiptRouteScreen.tsx` to render the capture state and actions.
  - Focus tests around helper/hook behavior rather than fragile UI snapshots.
- Add `src/services/camera/camera.service.ts` as a thin adapter over Expo image picker APIs, with an injectable port type for tests.
- Install only clearly required Expo first-party modules if missing, preferably using `npx expo install expo-image-picker expo-file-system`.
- Update `persistReceiptImageReference` to accept injected file-system dependencies in tests and to copy files into an app-private receipts directory in production.
- Use `captureDrafts` service `saveActiveCaptureDraft({ kind: 'expense', payload })` after the receipt file is persisted.
- Store receipt payload data as structured JSON, for example:
  - `captureMode: 'receipt'`
  - `moneyKind: 'expense'`
  - `receipt: { retainedImageUri, originalFileName?, contentType?, capturedAt, retentionPolicy, retentionAnchor, parsingState: 'draft' }`
  - `manualFallback: { amount?, localDate?, merchantOrSource?, note? }` only if the UI collects it.
- Avoid raw diagnostic logging. Tests may use fake URIs but should assert service errors do not echo them.

### UX Guidance

- The receipt capture surface should feel like a calm bridge into manual expense entry, not a magical OCR promise.
- Use clear actions:
  - `Take photo`
  - `Choose photo`
  - `Manual expense`
  - `Discard draft`
  - `Keep draft`
- Permission denied copy should explain that manual expense entry still works.
- Cancel copy should be neutral: "No receipt photo was saved. You can try again or enter the expense manually."
- Do not show parsing confidence yet except as a future-state placeholder; Story 5.2 owns parsing states.
- Use existing `Button`, `ListRow`, `StatusBanner`, and token styles. Keep touch targets at least 44x44.

### Architecture Compliance

- Feature screens may call hooks/services but must not import SQLite clients, Drizzle tables, or migration utilities.
- Repositories remain the only SQLite access layer.
- Receipt file persistence belongs in `src/services/files`; camera/image picker belongs in `src/services/camera`.
- Parser output must not create final expenses and is out of scope for this story.
- No raw receipt image, OCR text, or spending data may be written to diagnostics or error messages.
- Runtime receipt images belong in app-private file storage, not `assets/`.

### Previous Story Intelligence

- Story 4.3 established generic capture draft persistence and route-based recovery. Reuse its service and payload-helper patterns.
- Story 4.5 added Today UX-state hardening; keep new receipt states text-first with visible next actions.
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

- Receipt draft payload builder/validator stores receipt capture metadata under an expense draft payload.
- File-store success copies to an app-private receipt path and returns retained metadata.
- File-store failure returns a redacted `AppError` without raw image URI.
- Permission denied/unavailable keeps manual expense fallback visible.
- Cancel/interruption does not create a final expense.
- Successful capture saves an active `expense` draft and exposes resume/manual/discard paths.
- Quick capture includes receipt and routes it safely.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 5.1 acceptance criteria and Epic 5 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR18, FR21, FR25, FR48, NFR-REL-01, NFR-SEC-01 through NFR-SEC-04, NFR-UX-03, NFR-MOB-03, NFR-MOB-04]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Expo mobile architecture, local-first persistence, receipt file storage, receipt parsing adapter boundary, diagnostics privacy]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - receipt capture journey, permission-denied fallback, draft recovery, Receipt Review Desk future context]
- [Source: `_bmad-output/implementation-artifacts/4-3-save-and-recover-drafts-across-capture-forms.md` - approved `capture_drafts` decisions and implementation context]
- [Source: `_bmad-output/implementation-artifacts/4-5-implement-today-ux-states-and-accessibility.md` - text-first state and accessibility patterns]
- [Source: user decision on 2026-05-08 - shared `capture_drafts` table, JSON payload, one active draft per form kind]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 5.1 ready-for-dev from Epic 5, PRD, architecture, UX, existing receipt placeholders, and user-approved `capture_drafts` decisions.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/5-1-capture-receipt-photo-and-save-draft.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-08: Created Story 5.1 ready-for-dev.
