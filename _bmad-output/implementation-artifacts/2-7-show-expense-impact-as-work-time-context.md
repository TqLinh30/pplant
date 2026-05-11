# Story 2.7: Show Expense Impact As Work-Time Context

Status: done

## Story

As a student,
I want to see expenses translated into approximate work time,
so that spending feels understandable without shame or financial advice.

## Acceptance Criteria

1. Given I save or review an expense, when Pplant has a relevant wage context, then it shows an approximate work-time equivalent, and the value is labeled as contextual, not advice.
2. Given no wage context exists, when an expense impact summary is displayed, then Pplant explains that work-time context needs a wage, and offers a path to set wage without blocking expense capture.
3. Given expense or wage data changes, when work-time equivalent recalculates, then recalculation is deterministic, and estimated values are labeled clearly.

## Tasks / Subtasks

- [x] Define deterministic work-time equivalent domain behavior. (AC: 1, 2, 3)
  - [x] Use saved default hourly wage as the relevant wage context for expense equivalents in this story.
  - [x] Treat missing preferences, zero wage, or non-positive wage as no wage context.
  - [x] Require matching expense currency and wage currency; do not perform currency conversion.
  - [x] Calculate approximate minutes deterministically from integer minor units.
  - [x] Label results as estimated/contextual, never advice.
- [x] Add UI-facing context helpers. (AC: 1, 2, 3)
  - [x] Convert calculated minutes into compact duration text.
  - [x] Return neutral unavailable copy when no wage context exists.
  - [x] Return neutral unavailable copy when currencies do not match.
  - [x] Keep helper code free of repository, SQLite, or migration imports.
- [x] Add work-time context to expense capture and review surfaces. (AC: 1, 2)
  - [x] Show estimated work-time context after saving or updating an expense.
  - [x] Keep expense capture available when wage context is missing.
  - [x] Show work-time context for expense rows in Money History.
  - [x] Do not show work-time equivalents for income rows.
  - [x] Do not implement Today overview, receipt flows, recurring money previews, or weekly review reflections in this story.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test deterministic equivalent calculation and rounding.
  - [x] Test missing wage, currency mismatch, and invalid input behavior.
  - [x] Test UI helper copy for expense, income, available, unavailable, and mismatch cases.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Scope Boundaries

- Implement display-only work-time context for manual expense save/update feedback and money history rows.
- Use saved preferences `defaultHourlyWage` as the wage context for this story.
- A wage amount of `0` means no wage context for work-time equivalent display.
- Do not use historical work-entry wage snapshots, averages, payroll periods, tips, taxes, overtime, or inferred wage selection in this story.
- Do not mutate money records, work entries, budget rules, savings goals, preferences, or database schema for work-time equivalents.
- Do not block expense capture if wage context is missing.
- Do not add financial advice, shame, warnings, recommendations, or behavioral prescriptions.

### Current Repository State

- Story 1.3 stores preferences with `defaultHourlyWage.amountMinor` and `defaultHourlyWage.currency`.
- Stories 2.1-2.4 established manual and recurring money record capture, edit/delete, budget recalculation, and money history.
- Stories 2.5-2.6 established work-entry wage snapshots and work-history review.
- Money records store positive integer `amountMinor`, `currencyCode`, `kind`, dates, category/topics, source/source-of-truth, and soft-delete state.
- Capture and History screens already have access to saved preferences through their feature hooks/services.

### Work-Time Equivalent Semantics

- Only expense records receive work-time context; income records return no context.
- The relevant wage context is the current saved default hourly wage from preferences.
- Work-time context is available only when:
  - preferences are loaded,
  - `defaultHourlyWage.amountMinor > 0`,
  - expense `currencyCode` matches `defaultHourlyWage.currency`.
- Calculation uses integer minor units:
  - `minutes = ceil(expenseAmountMinor * 60 / wageMinorPerHour)`
  - positive expenses should show at least 1 minute.
- Labels must include "Approx" or equivalent estimated language and "context" or equivalent non-advice framing.
- Currency conversion is explicitly out of scope.

### Architecture Compliance

- Domain modules own the pure calculation and validation.
- UI-facing helper modules may own concise display copy and duration formatting.
- Feature components may call helpers using already-loaded preferences and records.
- React components must not import SQLite clients, migrations, repositories, or new service dependencies for this story.
- No migration should be added.

### UX Guidance

- Keep copy calm and contextual.
- Good examples:
  - `Approx 1h 15m work context`
  - `Set a default wage for work-time context`
  - `Work-time context needs matching wage currency`
- Avoid advice or shame:
  - Do not say "you should", "too much", "bad", "warning", "worth it", or "afford".
- Do not create card-heavy dashboard UI for this story; add concise context to existing feedback and list rows.

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

- Available equivalent from expense amount and default wage.
- Deterministic ceiling behavior.
- Missing/zero wage context.
- Currency mismatch.
- Invalid amount or wage input safety.
- Expense-only UI helper behavior.
- Income rows do not show work-time equivalents.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 2.7 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR31, NFR-PERF-03, NFR-REL-04, NFR-SEC-04, NFR-UX-02, NFR-SEC-07]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - work-income tracking ownership and domain/repository/service boundaries]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - work-time equivalent as calm context, not advice]
- [Source: `_bmad-output/planning-artifacts/product-brief-Pplant-distillate.md` - student aha moment of translating money into time]
- [Source: `_bmad-output/implementation-artifacts/2-6-review-work-history-and-earned-income.md` - work history and wage snapshot scope]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add pure work-time equivalent calculation using integer money and wage minor units.
- Add UI-facing context text helper shared by Capture and History surfaces.
- Add expense work-time context to saved expense feedback and money-history expense rows.
- Add focused domain/helper tests, then run full verification.

### Debug Log References

- 2026-05-08: Added red-phase tests for work-time equivalent calculation and UI context copy.
- 2026-05-08: Added pure work-time equivalent calculation using current default hourly wage context.
- 2026-05-08: Added shared work-time context text helper for expense-only display copy.
- 2026-05-08: Added expense work-time context to manual capture save/update feedback and money history rows.
- 2026-05-08: Ran full verification: typecheck, lint, test, expo install check, build-if-present, and diff whitespace check.

### Completion Notes List

- Expense work-time context is display-only and recalculates from current preferences plus each expense amount.
- The calculation uses integer minor units and deterministic ceiling to minutes, with no currency conversion.
- Missing or zero default wage keeps expense capture available and shows neutral Settings copy where context would appear.
- Income rows, recurring money previews, Today overview, receipt flows, and weekly review remain out of scope.

### File List

- `_bmad-output/implementation-artifacts/2-7-show-expense-impact-as-work-time-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-2.7-review.md`
- `src/domain/work/work-time-equivalent.ts`
- `src/domain/work/work-time-equivalent.test.ts`
- `src/features/capture/CaptureScreen.tsx`
- `src/features/history/HistoryScreen.tsx`
- `src/features/work/workTimeContextText.ts`
- `src/features/work/workTimeContextText.test.ts`

## Change Log

- 2026-05-08: Created Story 2.7 from Epic 2 work-time equivalent requirements.
- 2026-05-08: Implemented expense work-time equivalent calculation, context copy, Capture/History UI integration, tests, and verification.
