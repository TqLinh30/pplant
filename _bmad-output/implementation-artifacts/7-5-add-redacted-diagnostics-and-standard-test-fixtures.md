# Story 7.5: Add Redacted Diagnostics And Standard Test Fixtures

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a student,
I want Pplant's diagnostics and reliability checks to protect sensitive data,
so that the app can be tested and improved without exposing my personal information.

## Acceptance Criteria

1. Given receipt parsing, reminder scheduling, migration, summary recalculation, or retry exhaustion fails, when diagnostics are recorded, then events include name, timestamp, app version, non-sensitive error category, and relevant retry/job state, and no raw receipt images, OCR text, spending details, income values, task contents, reminder text, or reflections are stored.
2. Given the benchmark fixture is generated, when tests load the standard MVP dataset, then it includes at least 1,500 expenses, 150 receipt-based expenses, 250 income entries, 250 work shifts, 1,000 tasks, 300 reminders, 50 savings-goal events, and 100 reflections, and fixture data is non-sensitive.
3. Given CI or local tests run, when domain, repository, migration, recurrence, parsing normalization, and summary tests execute, then they can run without mobile UI interaction, and failures point to the owning module.

## Tasks / Subtasks

- [ ] Formalize safe diagnostic event contracts. (AC: 1)
  - [ ] Keep the existing diagnostic event names for receipt parsing failure, receipt recovery failure, reminder scheduling failure, migration failure, summary recalculation failure, and receipt retry exhaustion.
  - [ ] Add or tighten Zod validation for diagnostic events and allowlisted metadata values.
  - [ ] Ensure every diagnostic event shape includes `name`, `occurredAt`, `appVersion`, and `errorCategory`.
  - [ ] Preserve explicit allowlisted metadata keys only: retry/job state, delivery/permission state, migration step, summary period, offline/timed-out flags, retry limits, and action id.

- [ ] Add reusable diagnostic recording helpers for required failure classes. (AC: 1, 3)
  - [ ] Keep receipt recovery diagnostics working and add helpers where missing for receipt parsing failures/retry exhaustion, reminder scheduling failures, migration failures, and summary recalculation failures.
  - [ ] Helpers must accept domain errors/states and emit only safe categories/states, not source payloads.
  - [ ] Repository persistence must continue to store redacted metadata JSON only.
  - [ ] If a recording attempt fails, return a typed `AppResult` without throwing and without adding sensitive cause text to the saved event.

- [ ] Strengthen redaction and persistence tests. (AC: 1, 3)
  - [ ] Test all required diagnostic event names with malicious metadata containing receipt image URI, OCR text, merchant/source, amount, income, task title, reminder title, reflection text, payload JSON, path-like values, and raw error messages.
  - [ ] Test diagnostics repository persistence stores only redacted metadata.
  - [ ] Test diagnostic event validation rejects invalid event names, invalid timestamps, unsupported metadata keys, oversized strings, and unsafe values.

- [ ] Generate a non-sensitive standard MVP dataset fixture. (AC: 2, 3)
  - [ ] Extend `src/data/fixtures/standard-mvp-dataset.ts` beyond counts with deterministic fixture generation functions.
  - [ ] Generate at least the required counts for expenses, receipt-based expenses, income entries, work shifts, tasks, reminders, savings goal events, and reflections.
  - [ ] Use synthetic labels/ids only, not realistic personal names, real merchants, free-form personal notes, raw receipt text, image URIs, or reflection content that could look user-derived.
  - [ ] Keep the fixture lightweight enough for normal Jest execution; prefer deterministic generated arrays over checked-in large JSON files.

- [ ] Add fixture ownership and smoke tests. (AC: 2, 3)
  - [ ] Add tests proving fixture counts meet or exceed PRD requirements.
  - [ ] Add tests proving generated fixture values are non-sensitive and do not include paths, URIs, OCR text, spending details in diagnostics, personal task/reminder text, or reflection answers.
  - [ ] Add smoke tests that run summary, recurrence, parsing normalization, migration, and repository-oriented logic without mobile UI dependencies.

- [ ] Preserve privacy, architecture, and story boundaries. (AC: 1, 2, 3)
  - [ ] Do not add external crash reporting, analytics SDKs, backend APIs, cloud sync, auth, or OCR providers.
  - [ ] Do not collect or export diagnostics outside local app storage.
  - [ ] Do not modify user-facing privacy deletion behavior except tests/fakes if needed.
  - [ ] Do not add a large static fixture file.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add diagnostics event/redaction/repository tests.
  - [ ] Add standard fixture generator/count/sensitivity tests.
  - [ ] Add no-mobile-UI smoke tests for the fixture-backed domain paths where reasonable.
  - [ ] Run `npm run typecheck -- --pretty false`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement Story 7.5 only. This is a local diagnostics/test-fixture story, not a production telemetry integration.
- Do not add external analytics, crash reporting, cloud sync, auth, backend APIs, real OCR credentials, or external services.
- Do not add large checked-in JSON fixtures. The standard dataset should be generated deterministically in TypeScript.
- Do not weaken existing diagnostic redaction to satisfy tests.
- Do not store raw source payloads, receipt images, OCR text, money details, task/reminder contents, or reflections in diagnostics.

### Current Repository State

- `src/diagnostics/events.ts` defines event names and a narrow metadata allowlist.
- `src/diagnostics/redact.ts` drops unsupported metadata keys and unsafe/path-like string values.
- `src/diagnostics/diagnostics.service.ts` returns a redacted event in memory.
- `src/data/repositories/diagnostics.repository.ts` persists redacted metadata JSON into `diagnostic_events`.
- `src/services/receipt-parsing/receipt-recovery-diagnostics.service.ts` records safe receipt recovery failures.
- Story 1.1 already hardened diagnostic redaction after review.
- Story 5.4 added receipt recovery diagnostic coverage.
- `src/data/fixtures/standard-mvp-dataset.ts` currently exposes only required counts.
- Story 6.1 uses `standardMvpDatasetCounts` for a pure summary performance guard.
- `.claude/worktrees/` remains untracked and must not be committed.

### Recommended Implementation Shape

- Add diagnostic event schema validation near `src/diagnostics/events.ts` or a focused `schemas.ts` if that keeps types clearer.
- Add small recording helper functions in `src/diagnostics/diagnostics.service.ts`, for example:
  - `recordReceiptParsingDiagnostic`
  - `recordReminderSchedulingDiagnostic`
  - `recordMigrationDiagnostic`
  - `recordSummaryRecalculationDiagnostic`
- Keep receipt recovery helper as-is unless it can reuse the shared helper without broad churn.
- Add repository tests with a fake SQLite client to assert persisted `metadata_json` is redacted.
- Extend `standard-mvp-dataset.ts` with deterministic generators such as `createStandardMvpDatasetFixture()` and `assertStandardMvpDatasetCounts()`.
- Fixture records can be lightweight plain objects suited to tests, not full repository seed rows, if that keeps ownership clear and avoids schema coupling.
- Add a smoke test file under `src/data/fixtures` or `src/test/fixtures` that proves core pure functions can consume generated data without React Native UI.

### UX Guidance

- No user-facing UI changes are expected.
- If any copy is touched indirectly, keep it neutral and avoid implying user fault.

### Architecture Compliance

- Diagnostics must be local, redacted, and typed.
- Zod should validate diagnostic boundaries.
- Fixture generation must be deterministic and testable without mobile UI.
- Summary, recurrence, parsing normalization, migration, and repository tests should continue to run in Jest.
- No SQLite access from UI components.
- No external network, telemetry, OCR, cloud, auth, or backend dependency.

### Previous Story Intelligence

- Story 7.4 self-review verdict was `APPROVED_WITH_MINOR_NOTES`; the known minor note was that record-level provenance remains the MVP model. Story 7.5 does not need to change provenance.
- Story 7.3 added receipt parse job recovery and safe generic copy; diagnostics must not include the job's linked draft payload or receipt image URI.
- Story 7.1 deletion can clear diagnostics. Do not break data deletion tests.
- Existing redaction tests already include receipt URI, OCR text, merchant, amount, income, task/reminder text, reflection-like sensitive fields, and path-like values; extend rather than replace.

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

- All required diagnostic event names pass validation with safe metadata.
- Unsupported event names, bad timestamps, unsupported metadata keys, path/URI-like metadata values, and oversized strings are rejected or redacted.
- Diagnostics repository persists only redacted metadata JSON.
- Receipt parsing, retry exhaustion, reminder scheduling, migration, and summary recalculation helpers emit only safe categories/states.
- Standard MVP dataset fixture includes at least:
  - 1,500 expenses
  - 150 receipt-based expenses
  - 250 income entries
  - 250 work shifts
  - 1,000 tasks
  - 300 reminders
  - 50 savings-goal events
  - 100 reflections
- Fixture strings are deterministic synthetic labels and contain no URI/path/OCR/reflection-answer style sensitive content.
- Fixture-backed smoke tests run pure summary, recurrence, parsing normalization, migration, and repository-oriented checks without React Native UI.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 7.5 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - NFR-PERF-02, NFR-PERF-03, NFR-PERF-04, NFR-PERF-06, NFR-SEC-04, NFR-OBS-01, NFR-OBS-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - redacted diagnostic events, fixture requirements, testability outside UI, repository boundaries]
- [Source: `_bmad-output/implementation-artifacts/1-1-initialize-mobile-app-foundation.md` - diagnostic redaction review fix]
- [Source: `_bmad-output/implementation-artifacts/5-4-provide-manual-fallback-and-recovery-for-receipt-failures.md` - receipt recovery diagnostics]
- [Source: `_bmad-output/implementation-artifacts/6-1-generate-weekly-and-monthly-summaries.md` - standard dataset scale guard]
- [Source: `_bmad-output/implementation-artifacts/7-1-delete-records-receipt-images-drafts-and-personal-data.md` - diagnostics deletion behavior]
- [Source: `_bmad-output/implementation-artifacts/7-4-preserve-manual-corrections-as-source-of-truth.md` - latest completed story state]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-09: Created Story 7.5 ready-for-dev from Epic 7, PRD observability/performance requirements, architecture diagnostics/fixture guidance, and current diagnostics/fixture implementation.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/7-5-add-redacted-diagnostics-and-standard-test-fixtures.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-09: Created Story 7.5 ready-for-dev.
