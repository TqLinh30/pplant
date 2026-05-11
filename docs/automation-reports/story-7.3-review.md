# Story 7.3 Review: Manage Pending Network-Dependent Records

## Story ID and Title

- Story 7.3: Manage Pending Network-Dependent Records

## Acceptance Criteria Result

- AC1: PASS. Recovery now loads active linked receipt parse jobs in pending, running, failed, and retry-exhausted states, exposes safe recovery actions, and Today includes a receipt-only recovery panel.
- AC2: PASS. Retry delegates to the existing receipt parse job service with `userInitiated: true`; automatic retry exhaustion remains governed by the existing retry policy and running jobs do not show retry.
- AC3: PASS. Edit and manual-entry handoffs route to existing capture flows, while discard deletes app-managed receipt image references through the retention service, discards the draft, soft-hides the parse job, and records a recovery event.

## Files Changed

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

## Database/API Changes

- No schema migration was added.
- Recovery target/action contracts now include `receipt_parse_job`, `retry`, `manual_entry`, and `discard`.
- Receipt parse job repository gained a safe `markDeleted` method that sets `deleted_at`/`updated_at` for app-owned local parse jobs.
- `listPendingOrRetryableJobs` now includes `running` and `retry_exhausted` in addition to `pending` and `failed`.

## Tests Added/Updated

- Recovery service tests cover loading active pending/running/failed/retry-exhausted receipt jobs, filtering inactive/missing drafts, retry, manual-entry handoff, edit handoff, discard cleanup, and reload visibility.
- Recovery hook tests cover receipt manual-entry handoff state.
- Recovery domain/copy tests cover new target/action values and safe neutral copy.
- Receipt parse repository and service test fakes were updated for `markDeleted` and expanded recoverable statuses.

## Commands Run

- `npm test -- --runTestsByPath src/services/recovery/recovery.service.test.ts src/features/recovery/useRecovery.test.ts src/features/recovery/recovery-copy.test.ts src/domain/recovery/recovery.test.ts src/data/repositories/receipt-parse-jobs.repository.test.ts src/services/receipt-parsing/receipt-parse-job.service.test.ts src/services/receipt-parsing/receipt-review.service.test.ts`
- `npm run typecheck -- --pretty false`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- PASS. Recovery rows use generic receipt parsing copy and do not expose image URI, OCR text, merchant, amount, notes, line items, or raw draft JSON.
- PASS. Discard only uses existing app-managed receipt retention cleanup and does not delete arbitrary external files.
- PASS. No authentication, authorization, cloud sync, external provider, or secret handling changed.
- PASS. Action failures return `AppResult` errors and keep recovery items visible instead of silently hiding stuck work.

## Architecture Consistency Review

- PASS. UI remains repository-free and calls recovery hooks/services.
- PASS. Recovery service coordinates existing local repositories and receipt parsing/retention services.
- PASS. No destructive migration, background worker, external OCR provider, or automatic expense creation was added.
- PASS. Existing task/reminder recovery behavior remains covered by the full test suite.

## Known Risks

- Manual device verification was not rerun specifically for Story 7.3; automated coverage and full gates passed.
- Receipt edit handoff records a recovery event before routing to the receipt draft, so the recovery item hides immediately after the user chooses edit. This matches the story requirement that edit completion leaves no stuck item, but a future UX pass could add a more explicit resume indicator inside the receipt route.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD can continue to Story 7.4.
