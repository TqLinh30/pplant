# Story 4.3: Save And Recover Drafts Across Capture Forms

Status: ready-for-dev

## Story

As a student,
I want interrupted capture forms to become recoverable drafts,
so that I do not lose work when the app closes, backgrounding happens, camera is canceled, or network is poor.

## Acceptance Criteria

1. Given I begin an expense, task, reminder, income, or work-entry form, when the app backgrounds, closes, loses network, or the form is interrupted, then the draft is persisted locally, and I can recover it when returning.
2. Given a draft exists, when I open Today or Capture, then Pplant shows the draft with actions to resume, edit, discard, or keep, and the draft state is clear.
3. Given a draft is recovered and saved, when the final record is created, then the draft is linked appropriately and hidden from active draft recovery, and dependent summaries update.

## Tasks / Subtasks

- [ ] Add capture draft domain model, validation, and persistence. (AC: 1, 2, 3)
  - [ ] Add `capture_drafts` to `src/data/db/schema.ts` using a single shared table with JSON payload text.
  - [ ] Add migration `013_create_capture_drafts` without destructive changes and preserve all existing data.
  - [ ] Enforce MVP cardinality with one active draft per kind: expense, income, task, reminder, work.
  - [ ] Store soft lifecycle fields: `status`, `createdAt`, `updatedAt`, `lastSavedAt`, optional `savedRecordKind`, optional `savedRecordId`, optional `discardedAt`.
  - [ ] Add Zod validation for draft kind, status, payload shape, and saved-record linkage.
  - [ ] Add repository methods for upsert active draft, list active drafts, get active draft by kind, discard, keep/touch, and mark saved.

- [ ] Add capture draft service/hook behavior for current capture forms. (AC: 1, 3)
  - [ ] Add feature/service helpers that debounce or explicitly persist draft payloads from expense, income, task, reminder, and work-entry capture forms.
  - [ ] Persist drafts when meaningful user input exists; avoid creating empty drafts from untouched forms.
  - [ ] Save drafts before app backgrounding and normal navigation interruption where React Native app lifecycle hooks are available.
  - [ ] When a recovered draft is saved as a final record, mark the draft `saved` with `savedRecordKind` and `savedRecordId` and hide it from active draft UI.
  - [ ] Do not alter existing final record schemas solely to store source draft IDs in this story; draft linkage lives in `capture_drafts`.

- [ ] Add Today and Capture draft recovery surfaces. (AC: 2)
  - [ ] Show active drafts on Today with clear kind, updated time/state, and actions for resume/edit, discard, and keep.
  - [ ] Show the same active draft recovery state on Capture.
  - [ ] Resume/edit must route to the existing capture surface for the draft kind and prefill from draft payload where reasonable.
  - [ ] Discard must soft-mark the draft as discarded and remove it from active UI.
  - [ ] Keep must leave the draft active and update its timestamp so the user can return later.
  - [ ] Use neutral copy and accessible labels; do not rely on color alone.

- [ ] Preserve scope boundaries and sensitive-data safety. (AC: 1, 2, 3)
  - [ ] Do not implement receipt photo capture, OCR parsing, receipt image retention, or receipt cleanup in Story 4.3.
  - [ ] Do not change authentication, authorization, cloud sync, server APIs, or public record APIs.
  - [ ] Do not log raw draft payloads, spending details, income values, task/reminder text, or work notes in diagnostics or tests.
  - [ ] Do not add large dependencies or a new UI kit.

- [ ] Add focused tests and verification. (AC: 1, 2, 3)
  - [ ] Add migration tests proving existing records survive and `capture_drafts` is created.
  - [ ] Add domain validation tests for draft kind/status/payload/linkage.
  - [ ] Add repository tests for one-active-draft-per-kind, list active, discard, keep, and mark saved.
  - [ ] Add hook/service tests for form draft save, recovered save linking, and empty-form no-op behavior where practical.
  - [ ] Add UI/helper tests for Today/Capture draft recovery action routing and labels where practical.
  - [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### User-Approved Decisions

- Use one shared SQLite table named `capture_drafts` with a JSON payload column.
- MVP supports one active draft per kind: `expense`, `income`, `task`, `reminder`, and `work`.
- Drafts are kept until the user saves or discards them.
- When a draft is saved as a final record, soft-mark it `saved`, store `savedRecordKind` and `savedRecordId`, and hide it from active draft recovery.
- Today and Capture must both show draft recovery with resume/edit, discard, and keep.

### Scope Boundaries

- Implement only generic capture draft persistence and recovery for current manual capture forms.
- Receipt drafts in Epic 5 may later reuse or extend this system, but this story must not implement receipt camera, OCR, parse jobs, or receipt image cleanup.
- Future deletion/privacy stories own bulk data deletion and retention cleanup. This story only needs soft discard/save lifecycle behavior.
- Do not change final record table schemas unless absolutely required; the approved linkage is stored on `capture_drafts`.
- Do not implement multi-draft lists per kind in the MVP.

### Current Repository State

- Story 4.1 completed Today overview and summary service.
- Story 4.2 completed quick capture launcher and routes:
  - expense/income -> existing Capture tab with `quick=expense|income`
  - task -> `/task/new`
  - reminder -> `/reminder/new`
  - work -> `/work/new`
- Current forms/hooks to integrate:
  - `src/features/capture/CaptureScreen.tsx`
  - `src/features/capture/useManualMoneyCapture.ts`
  - `src/features/tasks/useTaskCapture.ts`
  - `src/features/reminders/useReminderCapture.ts`
  - `src/features/work/useWorkEntryCapture.ts`
  - route wrappers under `src/features/tasks`, `src/features/reminders`, and `src/features/work`
- Current data patterns:
  - SQLite/Drizzle schema in `src/data/db/schema.ts`
  - explicit migrations in `src/data/db/migrations/migrate.ts`
  - repository tests under `src/data/repositories/*.test.ts`
  - domain validation through Zod schemas under `src/domain/*/schemas.ts`

### Recommended Implementation Shape

- Add `src/domain/capture-drafts/types.ts`, `schemas.ts`, and `capture-drafts.test.ts`.
- Add `src/data/repositories/capture-drafts.repository.ts` and `.test.ts`.
- Add migration `013_create_capture_drafts` in the existing migration runner style.
- Table fields should be explicit enough for future deletion/recovery work:
  - `id text primary key`
  - `kind text not null`
  - `status text not null`
  - `payloadJson text not null`
  - `createdAt text not null`
  - `updatedAt text not null`
  - `lastSavedAt text not null`
  - `savedAt text`
  - `savedRecordKind text`
  - `savedRecordId text`
  - `discardedAt text`
- Add a partial/ordinary index strategy that supports active lookup by kind. SQLite partial indexes are acceptable if current migration style already uses raw SQL; otherwise enforce one-active-per-kind in repository transaction logic.
- Define active statuses narrowly. Recommended:
  - `active`
  - `saved`
  - `discarded`
- Treat `keep` as a timestamp touch on an active draft, not a new status.
- Use JSON serialization through repository helpers, not ad hoc parsing inside UI components.

### Draft Payload Guidance

- Payloads should contain only current form fields needed to refill the existing form.
- Store IDs for category/topic references when available. Do not denormalize sensitive names unless an existing form already requires them.
- Money payloads should keep amount text/input state plus parsed minor units if already available, kind, merchant/source, category/topic IDs, date, notes.
- Task payloads should keep title, due date, priority/status-like fields, recurrence selections, and notes as applicable to existing hook state.
- Reminder payloads should keep title, due date/time, repeat selections, notification preferences, and notes as applicable to existing hook state.
- Work payloads should keep date/start/end/duration/wage/notes fields as applicable to existing hook state.
- Empty/untouched payloads should not create active drafts.

### UI Guidance

- Draft recovery should be calm and direct, not alarm-like.
- Today should show a compact draft section near the top or before recent activity, with accessible buttons:
  - Resume
  - Discard
  - Keep
- Capture should show the same active draft state before the manual forms.
- Resume/edit should reuse existing capture surfaces and apply draft payload through feature-level handoff, not by duplicating form logic.
- Keep text neutral:
  - "Draft saved"
  - "You have an unfinished expense."
  - "Resume when ready, discard it, or keep it for later."
- Discard must be clear that the draft, not final records, is being removed from recovery.

### Architecture Compliance

- Repositories are the only layer that should read/write `capture_drafts`.
- Domain draft validation must be pure and independent of React Native UI.
- React components may call feature hooks/services but must not import SQLite clients, Drizzle tables, or migration utilities.
- Summary updates should happen through existing final-record save flows. Marking a draft saved must not bypass existing money/task/reminder/work repositories.
- No network requirement is allowed for draft persistence.

### Previous Story Intelligence

- Story 4.2 introduced `quickSeq` so repeated quick-capture handoffs to the same route are handled. Reuse that pattern for draft resume route params if needed.
- Story 4.2 deliberately avoided draft persistence and database changes; Story 4.3 now owns that scope.
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

- Migration creates `capture_drafts` and preserves existing records.
- Repository enforces one active draft per kind.
- Saved/discarded drafts no longer appear in active draft listings.
- Mark-saved persists `savedRecordKind` and `savedRecordId`.
- Empty form state does not write a draft.
- Today/Capture recovery helpers expose resume, discard, and keep actions with accessible labels.
- Final save paths for at least one representative money draft and one non-money draft mark the draft saved.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 4.3 acceptance criteria and Epic 4 context]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR10, FR48, NFR-REL-01, NFR-REL-02, NFR-REL-07]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - local-first SQLite/Drizzle, Zod validation, repository boundaries, draft recovery]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - draft recovery, Today/Capture pending draft states, neutral recovery actions]
- [Source: `_bmad-output/implementation-artifacts/4-2-launch-quick-capture-within-two-taps.md` - current Today quick capture routing]
- [Source: user decision on 2026-05-08 - shared `capture_drafts` JSON table, one active draft per kind, soft saved linkage, Today/Capture recovery surfaces]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex.

### Debug Log References

- 2026-05-08: Created Story 4.3 ready-for-dev using user-approved draft persistence decisions.

### Completion Notes List

- Pending implementation.

### File List

- `_bmad-output/implementation-artifacts/4-3-save-and-recover-drafts-across-capture-forms.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-05-08: Created Story 4.3 ready-for-dev.
