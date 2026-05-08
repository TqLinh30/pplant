# Story 2.5 Review: Create Work-Hour And Shift Entries

## Story ID and Title

- Story 2.5: Create Work-Hour And Shift Entries

## Acceptance Criteria Result

- AC1: Passed. Direct-hour and shift work entries save locally with paid/unpaid status and wage snapshots.
- AC2: Passed. Wage overrides are stored per entry with `wageSource = "override"` and do not mutate default preferences.
- AC3: Passed. Cross-midnight shift duration is calculated from explicit local date/time fields and covered by pure domain tests.

## Files Changed

- `_bmad-output/implementation-artifacts/2-5-create-work-hour-and-shift-entries.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-2.5-review.md`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/work-entries.repository.ts`
- `src/data/repositories/work-entries.repository.test.ts`
- `src/domain/work/types.ts`
- `src/domain/work/schemas.ts`
- `src/domain/work/work-time.ts`
- `src/domain/work/work.test.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/work/WorkEntryForm.tsx`
- `src/features/work/useWorkEntryCapture.ts`
- `src/features/work/useWorkEntryCapture.test.ts`
- `src/services/work/work-entry.service.ts`
- `src/services/work/work-entry.service.test.ts`

## Database/API Changes

- Added additive migration 008 with `work_entries`, `work_entry_topics`, and work-entry indexes.
- Added Drizzle schema mappings for work entries and work entry topics.
- Added work entry repository APIs for create, update, soft delete, get, and recent list.
- Added work entry service APIs for load capture data, create, edit, and delete.
- Existing preferences, category/topic, money, recurrence, and migration APIs remain compatible.

## Tests Added/Updated

- Added domain tests for earned-income calculation, paid/unpaid behavior, cross-midnight shift duration, break validation, parsing, and invalid direct-hour shift fields.
- Updated migration tests for migration 008.
- Added repository tests for create/list, update/topic replacement, and soft delete.
- Added service tests for preferences, default wage, override wage, archived category rejection, invalid breaks, edit, and delete.
- Added hook state/validation tests for direct hours, cross-midnight shifts, field errors, load/edit/delete flows.

## Commands Run

- `npm test -- src/domain/work/work.test.ts src/data/db/migrations/migrate.test.ts src/data/repositories/work-entries.repository.test.ts src/services/work/work-entry.service.test.ts src/features/work/useWorkEntryCapture.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npx expo install --check`
- `npm run build --if-present`
- `git diff --check`

## Security/Data-Safety Review

- No secrets or credentials were added.
- Migration 008 is additive and does not drop, rewrite, or destructively transform existing data.
- Work entries treat work hours, wage, earned income, dates, categories, topics, and notes as sensitive local data.
- No diagnostics or logs include raw work-entry details.
- Work entries are soft-deleted and hidden from active recent lists.

## Architecture Consistency Review

- Domain owns work types, validation, and pure time/income calculations.
- Repository owns SQLite persistence, transactions, soft delete, and topic joins.
- Service owns migration preparation, saved preferences, workspace scoping, active category/topic validation, default wage application, and typed `AppResult` errors.
- Feature hook owns UI state and service calls.
- UI uses existing primitives and does not import SQLite, migrations, or repositories.
- Scope stayed within work-entry capture; work history, summaries, expense equivalents, recurring work, tasks, reminders, receipts, and notifications were not implemented.

## Known Risks

- Native device/emulator visual behavior was not manually exercised; automated typecheck, lint, and hook/domain/repository/service tests passed.
- Earned income is stored on `work_entries` only; later stories must decide how work income appears in review/history surfaces.
- Wage override currency uses the saved default hourly wage currency in this story.

## Final Verdict

APPROVED_WITH_MINOR_NOTES

BMAD may continue to the next story because all automated verification passed and the remaining risks are scoped manual-device/future-story notes.
