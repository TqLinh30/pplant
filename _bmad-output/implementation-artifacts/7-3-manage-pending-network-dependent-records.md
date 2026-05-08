# Story 7.3: Manage Pending Network-Dependent Records

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want to view pending network-dependent records and choose retry, edit, or discard,
so that failed services never leave my data stuck.

## Acceptance Criteria

1. Given receipt parsing or another network-dependent job is pending, when I open recovery or Today, then Pplant shows the pending state and retry, edit, discard, or manual-entry actions are available as appropriate.
2. Given retry is available, when I trigger retry, then the retry follows the documented policy and retry exhaustion requires another user action.
3. Given I edit or discard a pending record, when the action completes, then related jobs, drafts, summaries, files, and diagnostics update consistently and no stuck pending item remains.

## Tasks / Subtasks

- [x] Extend recovery contracts for receipt parsing jobs. (AC: 1, 2, 3)
  - [x] Add a `receipt_parse_job` recovery target kind and receipt-specific recovery reasons for parsing queued, running, failed, and retry exhausted states.
  - [x] Add recovery actions needed for network-dependent jobs: retry, manual entry, edit, and discard, while preserving existing task/reminder recovery actions.
  - [x] Keep recovery copy neutral, text-first, and free of receipt image URI, OCR text, merchant, amount, note, or raw draft payload content.

- [x] Load pending receipt parsing jobs into Recovery and Today. (AC: 1)
  - [x] Extend recovery data loading to include active receipt drafts whose latest local parse job is pending, running, failed, or retry exhausted.
  - [x] Join jobs to active receipt drafts safely so discarded/saved drafts and soft-deleted jobs do not appear.
  - [x] Show receipt parse job recovery in the existing `RecoveryPanel` and add a Today recovery surface limited to pending network-dependent records.
  - [x] Do not include parsed/low-confidence/reviewed receipt jobs as network-pending unless they are still blocked by network-dependent processing.

- [x] Implement receipt recovery actions. (AC: 1, 2, 3)
  - [x] Retry should call existing receipt parse job execution with an explicit user action and respect the 3 automatic retries per 24 hours policy.
  - [x] Retry-exhausted jobs must not retry automatically; recovery retry is allowed only because the user chose it.
  - [x] Edit should record a recovery event and route to the receipt draft/review screen.
  - [x] Manual entry should route to manual expense capture while keeping existing receipt draft linkage behavior.
  - [x] Discard should soft-discard the draft, soft-hide or delete the related parse job, remove retained receipt image references through existing safe file cleanup, and record a recovery event.
  - [x] Action failures must leave the recovery item visible and must not log sensitive payloads.

- [x] Preserve data and architecture boundaries. (AC: 1, 2, 3)
  - [x] Do not add a new queue, background worker, cloud sync, OCR provider, auth, or external service dependency.
  - [x] Do not create expenses automatically from parser output.
  - [x] Do not delete arbitrary external files; only app-managed receipt image references may be deleted through existing receipt file services.
  - [x] Preserve existing task/reminder recovery behavior and tests.

- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Add domain/feature copy tests for receipt recovery item reasons and action labels.
  - [x] Add recovery service tests for loading pending receipt jobs, retry action, edit/manual handoff recording, discard cleanup, retry exhaustion, and failure visibility.
  - [x] Add hook/UI reducer tests where reasonable for new receipt recovery actions.
  - [x] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement Story 7.3 only. Do not implement manual correction source-of-truth changes from Story 7.4 or diagnostics/benchmark fixtures from Story 7.5.
- Do not introduce real OCR credentials or change parser provider selection. The noop parser remains a valid unavailable/offline parser.
- Do not add remote APIs, cloud sync, account auth, service workers, background workers, or network monitoring.
- Do not add destructive database migrations. If a repository needs to hide parse jobs, add a soft-delete/update method using existing `deleted_at`.
- Do not change receipt review save semantics or automatically save a final money record from a recovery action.

### Current Repository State

- Story 7.2 is done and self-reviewed with `APPROVED_WITH_MINOR_NOTES`.
- `CaptureDraftRecoveryPanel` labels active receipt drafts with latest parse-job context but only exposes resume, keep, and discard draft actions.
- Existing `RecoveryPanel` loads task/reminder recovery items from `src/services/recovery/recovery.service.ts` and is currently used on task/reminder routes.
- Today currently shows `CaptureDraftRecoveryPanel`; it does not yet show `RecoveryPanel`.
- Receipt route already supports start/retry parsing, edit review/draft, manual expense, keep draft, discard draft, duplicate-warning actions, and redacted recovery diagnostics.
- `receipt_parse_jobs.repository.ts` already has `listPendingOrRetryableJobs`, but it currently lists only `pending` and `failed`; Story 7.3 should include all recovery-relevant pending network states.
- `receipt-retention.service.ts` safely deletes app-managed retained receipt images and updates draft payload references.
- `capture-drafts.repository.ts` can discard drafts and load active drafts; add narrow methods only if needed.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Extend `src/domain/recovery/types.ts` conservatively:
  - add target kind `receipt_parse_job`
  - add actions `retry`, `manual_entry`, `discard`
  - keep existing task/reminder actions unchanged
- Extend `RecoveryItem` in `src/services/recovery/recovery.service.ts` with optional `relatedDraftId?: EntityId` for receipt routing. Keep existing item fields compatible.
- Add receipt job loading in `loadRecoveryData`:
  - list recoverable receipt parse jobs
  - verify the related capture draft exists, is active, and is a receipt draft
  - skip targets that already have recovery resolution events
  - create recovery item titles from safe generic copy such as "Receipt parsing" rather than merchant/amount/OCR data
- Add receipt action service functions under `recovery.service.ts` or a narrow receipt recovery service if the file becomes too large:
  - `retryRecoveryReceiptParseJob`
  - `discardRecoveryReceiptParseJob`
  - `recordRecoveryManualEntry`
  - reuse existing `recordRecoveryHandoff` for edit if practical
- Update `useRecovery` to dispatch the new actions and preserve current error behavior.
- Update `RecoveryPanel` to route receipt edit/manual-entry actions directly:
  - edit -> `/receipt/{relatedDraftId}`
  - manual entry -> `/(tabs)/capture?draft=expense&draftSeq=...`
- Add `<RecoveryPanel targetKinds={['receipt_parse_job']} />` to Today near draft recovery so pending network-dependent work appears from Today without showing all task/reminder recovery there.

### UX Guidance

- Use calm copy:
  - "Receipt parsing is queued"
  - "Parsing did not finish"
  - "Automatic parsing is paused"
  - "Manual entry works now"
- For running jobs, retry should not be shown, but edit/manual/discard can remain available.
- For retry-exhausted jobs, retry label should make clear it is user-triggered, not automatic.
- Discard copy should be clear that no expense is created and receipt draft/image/job recovery is removed.
- Do not expose raw receipt filenames, URIs, parsed merchant/source, amount, OCR text, line items, or draft JSON in recovery rows.

### Architecture Compliance

- UI components must not import SQLite repositories or migration utilities.
- Recovery services coordinate local repositories and existing receipt parse/retention services.
- Expected retry exhaustion, unavailable parser, missing draft, and discard failures must be represented as `AppResult` errors or UI states, not thrown exceptions.
- No sensitive data may be added to diagnostics. Existing receipt recovery diagnostics can be reused for action failures if needed.
- Summary consistency is preserved by not creating or deleting final money records in this story; discard only affects drafts/jobs/images.

### Previous Story Intelligence

- Story 7.2 added `CaptureDraftRecoveryItem` and parse-state labels; Story 7.3 should reuse that copy model where useful but add actionable recovery.
- Story 5.4 already added receipt-route action copy and redacted recovery diagnostics; Story 7.3 should avoid duplicating that logic more than necessary.
- Story 7.1 deletion service already soft-cleans parse jobs and receipt draft/image data; use similar safe cleanup principles for discard.
- Recent branch review fixed fire-and-forget draft saved linkage; Story 7.3 actions must await job/draft/image updates before reporting success.

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

- `loadRecoveryData` includes active receipt parse jobs in `pending`, `running`, `failed`, and `retry_exhausted` states.
- Inactive/discarded/saved receipt drafts and soft-deleted parse jobs do not appear.
- Running receipt parse jobs do not offer retry, while pending/failed/retry-exhausted jobs do.
- Retry uses `runReceiptParseJob` with user-initiated behavior and does not bypass retry exhaustion policy.
- Discard updates the draft, soft-hides the parse job, deletes app-managed retained image references where available, records a recovery event, and removes the item on reload.
- Edit/manual actions record safe recovery events and route without exposing sensitive receipt data.
- Existing task/reminder recovery tests continue to pass.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 7 and Story 7.3 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR49, NFR-REL-08, NFR-MOB-05, NFR-OBS-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - receipt retry boundaries, recovery actions, redacted diagnostics, local-first repository boundaries]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - recovery states with retry/edit/discard/manual entry]
- [Source: `_bmad-output/implementation-artifacts/7-2-support-offline-core-capture.md` - previous story state and pending parse labels]
- [Source: `_bmad-output/implementation-artifacts/5-4-provide-manual-fallback-and-recovery-for-receipt-failures.md` - receipt-route recovery/manual fallback behavior]
- [Source: `src/services/recovery/recovery.service.ts` - current task/reminder recovery service]
- [Source: `src/features/recovery/RecoveryPanel.tsx` - current recovery UI surface]
- [Source: `src/services/receipt-parsing/receipt-parse-job.service.ts` - receipt retry execution]
- [Source: `src/data/repositories/receipt-parse-jobs.repository.ts` - local parse job repository]
- [Source: `src/services/files/receipt-retention.service.ts` - safe retained image deletion]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-09: Created Story 7.3 ready-for-dev from Epic 7, PRD, architecture, UX recovery guidance, Story 7.2 results, and current recovery/receipt services.
- 2026-05-09: Started implementation. Plan: extend recovery types/actions for receipt parse jobs, load recoverable parse jobs, wire retry/edit/manual/discard actions, surface receipt recovery on Today, then verify with focused and full gates.
- 2026-05-09: Completed implementation and verification. Focused receipt recovery tests, full test suite, typecheck, lint, Expo dependency check, build-if-present, and whitespace check passed.

### Completion Notes List

- Added receipt parse job recovery target/actions with neutral copy and no raw receipt payload exposure.
- Recovery now surfaces active pending, running, failed, and retry-exhausted receipt parse jobs when a linked active receipt draft exists.
- Today shows a receipt-only recovery surface next to capture draft recovery.
- Retry uses the existing receipt parse execution path with `userInitiated: true`; running jobs do not expose retry.
- Edit routes to the receipt draft, manual entry routes to expense capture, and discard safely deletes app-managed receipt image references, discards the draft, soft-hides the parse job, and records a recovery event.
- Full verification passed: typecheck, lint, Jest, Expo install check, build-if-present, and `git diff --check`.

### File List

- `_bmad-output/implementation-artifacts/7-3-manage-pending-network-dependent-records.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-7.3-review.md`
- `src/data/repositories/receipt-parse-jobs.repository.test.ts`
- `src/data/repositories/receipt-parse-jobs.repository.ts`
- `src/domain/recovery/recovery.test.ts`
- `src/domain/recovery/schemas.ts`
- `src/domain/recovery/types.ts`
- `src/features/recovery/RecoveryPanel.tsx`
- `src/features/recovery/recovery-copy.test.ts`
- `src/features/recovery/recovery-copy.ts`
- `src/features/recovery/useRecovery.test.ts`
- `src/features/recovery/useRecovery.ts`
- `src/features/today/TodayScreen.tsx`
- `src/services/receipt-parsing/receipt-parse-job.service.test.ts`
- `src/services/receipt-parsing/receipt-review.service.test.ts`
- `src/services/recovery/recovery.service.test.ts`
- `src/services/recovery/recovery.service.ts`

## Change Log

- 2026-05-09: Created Story 7.3 ready-for-dev.
- 2026-05-09: Started implementation.
- 2026-05-09: Completed pending network-dependent receipt recovery and marked story done.
