# Story 1.6: View Privacy-Relevant Settings

Status: done

## Story

As a student,
I want to see privacy settings for receipts, notifications, parsing, analytics, and local data,
so that I understand how sensitive information is handled.

## Acceptance Criteria

1. Given I open privacy settings, when settings load, then Pplant shows receipt image retention, notification, analytics/diagnostics, OCR/parsing, and local data controls, and wording is clear and non-alarmist.
2. Given OCR or analytics behavior may involve external services, when I view the setting, then affected data categories are disclosed before enablement, and manual alternatives remain visible where relevant.
3. Given I use screen reader or dynamic text, when privacy settings are displayed, then all controls have labels, logical order, and usable touch targets, and no required action is hidden by text scaling.

## Tasks / Subtasks

- [x] Define privacy settings domain copy and state. (AC: 1, 2)
  - [x] Add a focused domain module such as `src/domain/privacy/privacy-settings.ts`.
  - [x] Model the five required privacy areas: receipt image retention, notifications, analytics/diagnostics, OCR/parsing, and local data.
  - [x] Represent whether each area is active, off, unavailable, or future-controlled without implying behavior that does not exist yet.
  - [x] Include affected data categories for receipt images, OCR/parsing, analytics/diagnostics, notifications, and local records.
  - [x] Include manual alternatives where relevant, especially manual receipt/expense entry when OCR/parsing is unavailable, disabled, or external.
  - [x] Keep all copy neutral, clear, and non-alarmist.
- [x] Add a settings feature orchestrator for privacy display. (AC: 1, 2, 3)
  - [x] Add a hook such as `src/features/settings/usePrivacySettings.ts`.
  - [x] Derive current diagnostics and OCR display state from existing environment configuration when available.
  - [x] Use safe defaults when environment values are absent: diagnostics off unless explicitly enabled; OCR not configured unless a provider is configured.
  - [x] Do not add a database migration or persisted privacy toggles in this story unless a hard requirement is discovered.
  - [x] Do not enable upload, diagnostics export, push notifications, deletion, or receipt-retention mutation in this story.
- [x] Build the privacy settings UI surface. (AC: 1, 2, 3)
  - [x] Update `src/features/settings/SettingsScreen.tsx`; keep route files thin.
  - [x] Add a compact Privacy section to the existing settings screen without breaking Preferences, Categories/Topics, Budget, or Savings.
  - [x] Use existing primitives such as `ListRow`, `StatusBanner`, `BottomSheet`, and `Button`; do not add a UI dependency.
  - [x] Show one visible control for each required privacy area.
  - [x] Let controls open readable detail content for current behavior, affected data categories, and recovery/manual alternatives.
  - [x] Keep touch targets at least 44x44 through existing primitives and avoid relying on color alone.
  - [x] Ensure long copy wraps in detail areas and does not hide required actions under text scaling.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test domain output includes all five required privacy areas and affected data categories.
  - [x] Test safe defaults for diagnostics off and OCR not configured.
  - [x] Test configured diagnostics/OCR copy discloses affected data categories before enablement.
  - [x] Test settings feature state for selecting and closing a privacy detail.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, `npm run build --if-present`, and `git diff --check`.

## Dev Notes

### Current Repository State

- Stories 1.1 through 1.5 are complete on `auto/codex-overnight-1`.
- `src/features/settings/SettingsScreen.tsx` is the active settings control surface and already contains Preferences, Categories/Topics, Budget, and Savings.
- `src/app/(tabs)/settings.tsx` is intentionally thin and should stay thin.
- `src/domain/privacy/deletion-plan.ts` and `src/services/privacy/data-deletion.service.ts` are placeholders for future deletion workflows. Do not implement destructive deletion in Story 1.6.
- `src/services/files/retention-cleanup.service.ts` currently exposes a placeholder abandoned receipt cleanup function. Do not implement real receipt cleanup or receipt retention mutation in this story.
- `src/services/receipt-parsing/noop-receipt-parser.ts` returns a manual-entry recovery error because OCR parsing is not configured by default.
- `src/services/environment/env.ts` validates `EXPO_PUBLIC_DIAGNOSTICS_ENABLED` and optional `EXPO_PUBLIC_OCR_PROVIDER`.
- `src/diagnostics/redact.ts` uses an allowlist and path/URI filtering for diagnostic metadata. Story 1.6 may reference diagnostics behavior in UI copy, but must not add raw diagnostic logging.

### Scope Boundaries

- This story is a view/disclosure and control-surface story for FR6.
- Do not implement Story 7.1 data deletion.
- Do not implement Story 5 receipt capture/retention management or receipt image deletion.
- Do not implement Story 3 notification scheduling or permission flows.
- Do not implement OCR upload, provider selection, analytics export, crash reporting setup, or external API calls.
- Do not add secrets, `.env` files, or provider credentials.
- If implementing a persistent privacy preference becomes necessary, stop first because it would affect future business logic and privacy behavior.

### Privacy Areas To Show

Required areas:

```text
receipt_image_retention
notifications
analytics_diagnostics
ocr_parsing
local_data
```

Recommended current-behavior framing:

- Receipt image retention: receipt images are intended for app-private storage; abandoned draft cleanup and deletion controls are future receipt/privacy stories; no receipt image storage mutation in Story 1.6.
- Notifications: MVP reminder notifications should be local device notifications; notification permission and recovery flows are future reminder stories; manual app use remains available.
- Analytics/diagnostics: diagnostics are off unless environment explicitly enables them; when enabled, only redacted non-sensitive metadata is allowed.
- OCR/parsing: OCR is not configured unless an OCR provider is present in environment config; manual receipt/expense entry remains the recovery path.
- Local data: SQLite and app-private files are local-first; future deletion controls will delete records/files/drafts/diagnostics as appropriate; no deletion action in Story 1.6.

### UX and Accessibility Guidance

- Settings should feel like a calm control panel, not a warning page.
- Use neutral titles such as "Receipt images", "Notifications", "Diagnostics", "Receipt parsing", and "Local data".
- Avoid fear-based copy. Use clear behavior statements like "Currently off" or "Manual entry remains available."
- Show affected data categories in plain language before any future enablement path.
- Existing `ListRow` rows are acceptable controls if each row has a clear title/meta/description and opens more detail.
- Detail content can use `BottomSheet`; keep the close action visible and readable with dynamic text.
- Do not rely on color alone for off/on/unavailable/configured states.

### Architecture Compliance

- Domain modules own typed privacy setting definitions and copy/data-category rules.
- Feature hooks own selection state and environment-derived display state.
- React components should not read environment variables directly if the hook can derive display state.
- Route files should remain thin.
- No SQLite access is expected for this story.
- No new dependency is expected. Stop if a dependency seems necessary.

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

Minimum test coverage:

- All five required privacy areas are present exactly once.
- Diagnostics default to off unless `EXPO_PUBLIC_DIAGNOSTICS_ENABLED` is `true`.
- OCR defaults to not configured unless `EXPO_PUBLIC_OCR_PROVIDER` is provided.
- Diagnostics and OCR detail copy include affected data categories before any enablement language.
- Manual alternatives remain visible for OCR/parsing and notifications.
- Detail selection can be opened and closed through the settings feature state.

### Project Structure Notes

Expected additions or updates:

```text
src/
  domain/
    privacy/
      privacy-settings.ts
      privacy-settings.test.ts
  features/
    settings/
      SettingsScreen.tsx
      usePrivacySettings.ts
      usePrivacySettings.test.ts
```

These paths can be adjusted only when the existing architecture clearly suggests a better local pattern. Ownership boundaries cannot change.

### Previous Story Learnings

- Stories 1.3 through 1.5 keep settings feature orchestration in hooks and leave route files thin.
- Story 1.5 showed that adding compact sections to the same settings screen is acceptable when existing controls remain usable.
- Story 1.5 avoided implementing future money-record flows early; apply the same discipline here by showing privacy disclosures without implementing future deletion, retention, OCR, analytics, or notification behavior.
- Story 1.1 through 1.5 privacy rule: diagnostics must not include raw paths, URIs, receipt text, spending details, income values, task/reminder text, wage values, reflections, category/topic names, budget amounts, or savings goal details.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 1.6 acceptance criteria, FR6, Epic 1 scope]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR6, FR25, FR38, FR47, NFR-SEC-01 through NFR-SEC-07, NFR-MOB-03, NFR-MOB-04, NFR-OBS-01, NFR-OBS-02]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Authentication & Security, Receipt image and OCR privacy, Diagnostics security, Project Structure & Boundaries, Feature/FR Mapping]
- [Source: `_bmad-output/implementation-artifacts/1-5-set-monthly-budget-rules-and-savings-goals.md` - settings screen extension pattern and privacy learnings]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add a small `src/domain/privacy/privacy-settings.ts` module with typed privacy areas, environment-derived current states, affected data categories, and manual alternatives.
- Add `usePrivacySettings` reducer/hook state for opening and closing privacy details.
- Extend `SettingsScreen` with a compact Privacy section that uses existing primitives and keeps existing settings flows usable.
- Add domain and settings-state tests, then run the full verification suite.

### Debug Log References

- `npm test -- privacy-settings.test.ts usePrivacySettings.test.ts` passed: 2 suites, 9 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 21 suites, 107 tests.
- `npx expo install --check` passed.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.
- Safety scan found no destructive SQL, secrets, external network calls, upload implementation, or deletion implementation introduced by Story 1.6. Matches for "upload" were neutral disclosure copy, and matches for "token" were existing UI token imports.

### Completion Notes List

- Added typed privacy settings domain output for receipt images, notifications, diagnostics, receipt parsing, and local data.
- Added safe environment-derived display state: diagnostics default off and OCR defaults not configured.
- Added settings feature state for opening and closing privacy detail rows.
- Extended Settings with a compact Privacy section and bottom-sheet detail disclosures while preserving Preferences, Categories/Topics, Budget, and Savings.
- Added optional `accessibilityLabel` support to `ListRow` so privacy controls can use clearer screen-reader labels.
- No database migration, data deletion, receipt upload, diagnostics enablement, notification scheduling, or external API behavior was added.

### File List

- `_bmad-output/implementation-artifacts/1-6-view-privacy-relevant-settings.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-1.6-review.md`
- `src/domain/privacy/privacy-settings.test.ts`
- `src/domain/privacy/privacy-settings.ts`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/settings/usePrivacySettings.test.ts`
- `src/features/settings/usePrivacySettings.ts`
- `src/ui/primitives/ListRow.tsx`

## Change Log

- 2026-05-08: Created Story 1.6 for privacy-relevant settings disclosure and control surface.
- 2026-05-08: Started Story 1.6 implementation.
- 2026-05-08: Implemented Story 1.6 privacy settings model, settings UI, tests, verification, and self-review preparation.
