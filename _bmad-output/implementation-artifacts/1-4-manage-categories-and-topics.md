# Story 1.4: Manage Categories And Topics

Status: done

## Story

As a student,
I want to create, edit, delete, and reorder categories and topics,
so that I can organize records around school, spending, work, and life contexts.

## Acceptance Criteria

1. Given I open category/topic settings, when I create a category or topic, then it is saved locally and it can be selected by relevant money, work, task, or reflection flows.
2. Given existing records use a category or topic, when I edit or reorder it, then existing associations remain intact and summaries use the updated label/order without losing history.
3. Given I delete a category or topic with existing usage, when I confirm deletion, then Pplant explains the impact and provides a safe path to reassign, keep historical usage, or cancel.

## Tasks / Subtasks

- [x] Define the category/topic domain contract. (AC: 1, 2, 3)
  - [x] Add a focused domain module for record organization, using names such as `src/domain/categories/*` or `src/domain/classification/*`.
  - [x] Model categories and topics with stable ids, `workspaceId`, trimmed `name`, integer `sortOrder`, `createdAt`, `updatedAt`, and nullable `archivedAt`.
  - [x] Validate names as user-entered text: trim whitespace, reject empty names, cap length at a small mobile-friendly limit, and return `AppResult` validation errors.
  - [x] Keep category/topic ids stable across edits, reorders, and archive/delete actions so future record associations can remain by id.
  - [x] Define usage-impact types that can represent zero usage, existing usage counts, reassign target, keep-history/archive, and cancel outcomes.
- [x] Add safe local persistence for categories and topics. (AC: 1, 2, 3)
  - [x] Update `src/data/db/schema.ts` with `categories` and `topics` tables.
  - [x] Add migration `003_create_categories_topics` after migrations 001 and 002 in `src/data/db/migrations/migrate.ts`.
  - [x] Migration 003 must be idempotent and non-destructive: it must not drop, recreate, or reset `schema_migrations`, `workspaces`, `user_preferences`, or future user data.
  - [x] Use static SQL for migration DDL and bound parameters for all dynamic repository writes.
  - [x] Add indexes for workspace/order lookup and active-list lookup; enforce duplicate active-name prevention in domain/service or repository tests.
  - [x] Persist deletion as a non-destructive archive (`archived_at`) rather than hard-deleting rows.
- [x] Implement repository and service access. (AC: 1, 2, 3)
  - [x] Add a repository such as `src/data/repositories/category-topic.repository.ts` and export it from `src/data/repositories/index.ts`.
  - [x] Keep Drizzle/SQLite imports inside repositories only.
  - [x] Add a service such as `src/services/categories/category-topic.service.ts` that opens the database, runs migrations, and orchestrates local workspace category/topic operations.
  - [x] Support create, update name, list active items, list archived/history items if needed for impact messaging, reorder active items, get deletion impact, archive/keep historical usage, cancel deletion, and reassign usage through an injectable future-record usage adapter.
  - [x] Default usage adapter should report zero usage while record tables do not exist; tests should inject nonzero usage to prove the impact/reassign/keep-history behavior.
  - [x] Reorder must be deterministic and preserve ids. Prefer a complete ordered-id list for the current active items, then write dense zero-based `sortOrder` values.
  - [x] Editing a label must update only the label and timestamp; it must not create a new row or break associations.
- [x] Build the settings UI flow for categories and topics. (AC: 1, 2, 3)
  - [x] Update `src/features/settings/SettingsScreen.tsx` without changing `src/app/(tabs)/settings.tsx` from a thin route.
  - [x] Add a feature hook/orchestrator such as `src/features/settings/useCategoryTopicSettings.ts`.
  - [x] Use existing primitives (`TextField`, `Button`, `StatusBanner`, `ListRow`, `SegmentedControl`, `IconButton`, `BottomSheet`) rather than adding a UI dependency.
  - [x] Provide a clear way to switch between Categories and Topics, create a new item, edit an existing item, move an item up/down, and remove/archive an item.
  - [x] Show loading, empty, validation failed, saved, retryable persistence failure, and deletion-impact states with neutral copy.
  - [x] For deletion impact, offer cancel, keep historical usage/archive, and reassign where a replacement active item is available. If there is no usage, archive after confirmation without hard delete.
  - [x] Keep preferences from Story 1.3 usable on the same settings screen; do not regress its loading/save/validation behavior.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test category/topic validation for trimmed names, empty names, duplicate active names, max length, stable ids, and archive state.
  - [x] Test migration 003 idempotence and preservation of migrations 001/002.
  - [x] Test repository/service create, edit, reorder, list, archive, deletion-impact, keep-history, cancel, and injected reassign behavior.
  - [x] Test settings feature state for loading, empty, create/edit validation, reorder, deletion impact, archive, and reassign selection.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npx expo install --check`, and `npm run build --if-present`.

## Dev Notes

### Current Repository State

- Story 1.1, Story 1.2, and Story 1.3 are complete.
- Story 1.2 established the local workspace, `workspaces` table, `schema_migrations`, `openPplantDatabase`, `migrateDatabase`, workspace repository/service, and startup `WorkspaceGate`.
- Story 1.3 added `user_preferences`, migration `002_create_user_preferences`, preferences domain schemas, preferences repository/service, deterministic budget reset helpers, and the real Preferences UI in `src/features/settings/SettingsScreen.tsx`.
- `src/app/(tabs)/settings.tsx` is a thin route export and should stay thin.
- `src/features/settings/SettingsScreen.tsx` now loads and saves preferences. Story 1.4 should compose category/topic controls into this settings area without replacing the preferences flow.
- Existing UI primitives available for this story: `TextField`, `Button`, `StatusBanner`, `ListRow`, `SegmentedControl`, `IconButton`, and `BottomSheet`.
- `src/data/repositories/preferences.repository.ts` is the current repository pattern: repositories import Drizzle tables, parse rows through domain schemas, use bound values, and map failures to retryable `AppResult` errors.
- `src/services/preferences/preferences.service.ts` is the current service pattern: injectable dependencies for tests, database open inside a recoverable boundary, migration before repository access, and typed result returns.
- `src/domain/common/ids.ts` currently only validates non-empty entity ids. If this story needs generated ids, add a small deterministic/injectable id generator rather than using random ids directly inside pure domain functions.
- Jest matches `.test.ts` files and ignores `.claude/worktrees` through `jest.config.js`.
- The branch for this autonomous run is `auto/codex-overnight-1`; do not commit directly to `main`.

### Implementation Guidance

- Scope this story to FR3 category/topic management. Do not implement money records, work entries, task CRUD, reflection CRUD, summaries, receipt parsing, budget rules, savings goals, privacy controls, auth, sync, bank linking, or payment/investment behavior.
- Records may have one category and zero or more topics in future stories. This story should make categories/topics available through repository/service lists for those flows, but it should not build the future capture forms.
- Recommended table shapes:

```text
categories
  id TEXT PRIMARY KEY NOT NULL
  workspace_id TEXT NOT NULL
  name TEXT NOT NULL
  sort_order INTEGER NOT NULL
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  archived_at TEXT

topics
  id TEXT PRIMARY KEY NOT NULL
  workspace_id TEXT NOT NULL
  name TEXT NOT NULL
  sort_order INTEGER NOT NULL
  created_at TEXT NOT NULL
  updated_at TEXT NOT NULL
  archived_at TEXT
```

- Use `workspace_id` on every row to preserve the local workspace boundary and future-proof multi-workspace schema decisions.
- Prefer active-list queries where `archived_at IS NULL`, ordered by `sort_order ASC, created_at ASC, id ASC` for deterministic display.
- Prevent duplicate active names within the same workspace and kind after trimming. A name archived in the past can remain in history; creating a new active item with the same display name is acceptable only if tests prove active duplicate prevention still holds.
- Do not hard-delete category/topic rows in this story. Archive by setting `archived_at` and `updated_at`. This preserves historical associations once record tables exist.
- Deletion terminology in UI can say "Remove" or "Archive" as long as the behavior is non-destructive and the impact copy is clear.
- Reassign is a service-level path for existing usage. Because record tables do not exist yet, implement it through an injectable usage adapter with a zero-usage default. This keeps Story 1.4 safe while giving future money/work/task/reflection stories a clear integration point.
- For impact messaging, the service should distinguish at least:
  - no existing usage: safe to archive after confirmation;
  - existing usage: explain count and allow keep historical usage/archive, reassign to another active item of the same kind, or cancel.
- If reassign is requested without a valid active replacement id, return `validation_failed` with recovery `edit`.
- Category/topic names can reveal school, work, life, or health context. Do not add diagnostics containing names, raw rows, ids tied to names, or future record text.
- No new runtime dependency is expected. If an additional dependency seems necessary, stop for approval.

### UX and Accessibility Guidance

- Settings should remain a calm in-app control surface. Avoid marketing copy, dashboard-like summaries, or visual clutter.
- Use a segmented control or similarly clear control to switch between Categories and Topics.
- Use direct inline controls for create/edit and simple up/down reorder controls. Drag-and-drop is not required.
- Every editable field and icon-only action must have an accessible label. Touch targets must remain at least 44x44.
- Empty states should be actionable and neutral, for example "No categories yet" with a create field nearby.
- Validation errors should appear near the field they affect and give one correction path.
- Deletion-impact copy should explain that removing an item hides it from new records but keeps history unless the user chooses reassign. Do not rely on color alone for warning or success states.
- Keep text sizes container-appropriate and ensure long category/topic names do not overlap action controls.

### Architecture Compliance

- Domain modules own validation, typed values, and pure reorder/impact helpers.
- Data repositories own SQLite/Drizzle table access.
- Services own database opening, migrations, workspace scoping, usage-adapter orchestration, and typed error mapping.
- Feature hooks own screen state transitions and form behavior.
- React components must not import SQLite clients, Drizzle tables, migration utilities, or repository classes.
- SQLite remains the source of truth. Do not use AsyncStorage as category/topic storage.
- Do not add a global state store for this story.

### Latest Technical Notes

- Expo SQLite SDK 55 synchronous APIs such as `execSync`, `getFirstSync`, and `runSync` are already used by the migration runner. Keep migration SQL static because `execSync` does not parameterize user input.
- Drizzle Expo SQLite is the current database abstraction. Continue through `openPplantDatabase` and existing repository patterns rather than adding another SQLite layer.
- Drizzle SQLite `text` and `integer` columns match current schema style for ids, timestamps, sort order, and nullable archive timestamps.
- Zod remains the domain validation tool. Convert parse failures to `AppResult` instead of exposing thrown validation exceptions.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
npm run build --if-present
```

Minimum test coverage:

- Domain validation accepts trimmed valid names and rejects empty, whitespace-only, and over-limit names with `validation_failed` and recovery `edit`.
- Active duplicate names are rejected per workspace and kind.
- Reorder preserves ids and writes deterministic dense sort orders.
- Archive/delete sets `archivedAt` and never removes rows from persistence.
- Deletion impact handles zero usage, nonzero usage, keep historical usage, cancel, invalid replacement, and injected successful reassign.
- Migration 003 is applied once, tracked, and does not disturb migrations 001/002 or existing workspace/preferences rows.
- Settings feature state maps loading, empty, validation failed, saved, retryable failures, reorder, impact confirmation, and reassign selection without importing persistence details into React components.
- If native Expo SQLite cannot run in Jest, use fakes as Stories 1.2 and 1.3 did and record the limitation in the Dev Agent Record.

### Project Structure Notes

Expected additions or updates:

```text
src/
  data/
    db/
      schema.ts
      migrations/
        migrate.ts
        migrate.test.ts
    repositories/
      index.ts
      category-topic.repository.ts
  domain/
    categories/
      schemas.ts
      types.ts
      categories.test.ts
  features/
    settings/
      SettingsScreen.tsx
      useCategoryTopicSettings.ts
      useCategoryTopicSettings.test.ts
  services/
    categories/
      category-topic.service.ts
      category-topic.service.test.ts
```

These paths can be adjusted only when the existing architecture clearly suggests a better local pattern. Ownership boundaries cannot change.

### Previous Story Learnings

- Story 1.3 kept preferences defaults editable in the UI but returned `not_found` from downstream service access until saved. Use the same clarity for missing category/topic data: show an empty setup state instead of inventing records.
- Story 1.3 kept migration/open errors inside recoverable `AppResult` boundaries. Keep Story 1.4 migration/service errors retryable.
- Story 1.3 used fakes for native persistence behavior in Jest. Continue fakes where Expo SQLite cannot run in Jest.
- Story 1.3 updated `TextField` for helper/error text. Reuse it for category/topic name validation.
- The self-review for Story 1.3 accepted a minor risk that native SQLite was not manually device-tested. If this story also relies on fakes, record the same limitation honestly.
- Privacy rule from Stories 1.1-1.3: diagnostics must not include raw paths, URIs, receipt text, spending details, income values, task/reminder text, wage values, reflections, or user-entered category/topic names.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Epic 1 objective, Story 1.4 acceptance criteria]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR3, FR13, FR15, FR17, FR19, FR22, FR43, NFR-REL-04, NFR-REL-07, NFR-SEC-01, NFR-UX-01]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Migration Strategy, Validation Strategy, Frontend Architecture, Architectural Boundaries, Requirements to Structure Mapping]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - category/topic selectors, settings UX, validation, accessibility, neutral copy]
- [Source: `_bmad-output/implementation-artifacts/1-3-configure-locale-currency-budget-reset-and-wage-defaults.md` - previous story implementation patterns, migration 002, settings UI, tests, validation commands]
- [Source: Expo SQLite SDK 55 docs, verified 2026-05-08: `https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/`]
- [Source: Drizzle Expo SQLite docs, verified 2026-05-08: `https://orm.drizzle.team/docs/connect-expo-sqlite`]
- [Source: Drizzle SQLite column types docs, verified 2026-05-08: `https://orm.drizzle.team/docs/column-types/sqlite`]
- [Source: Zod basics docs, verified 2026-05-08: `https://zod.dev/basics`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add category/topic domain types, validation, deterministic reorder, and deletion-impact helpers.
- Add non-destructive SQLite tables through migration `003_create_categories_topics` plus repository/service access.
- Add settings hook/UI for list, create, edit, move, and remove/archive flows while preserving Story 1.3 preferences.
- Add domain, migration, service/repository, and settings-state tests, then run the full verification suite.

### Debug Log References

- `npm test -- categories.test.ts` initially failed before domain implementation, then passed after `src/domain/categories/*`.
- `npm test -- migrate.test.ts` initially failed before migration 003, then passed after schema/migration updates.
- `npm test -- category-topic.service.test.ts` initially failed before service/repository implementation, then passed after adding category/topic service access.
- `npm test -- useCategoryTopicSettings.test.ts` initially failed before settings hook implementation, then passed after adding reducer/hook state.
- `npm test -- category-topic.repository.test.ts` passed with a fake SQLite client covering create, update, reorder, and non-destructive archive behavior.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 15 suites, 75 tests.
- `npx expo install --check` passed.
- `npm run build --if-present` completed; no build script is defined.
- `git diff --check` passed.

### Completion Notes List

- Added `categories` and `topics` persistence through idempotent migration `003_create_categories_topics`, including active/order indexes and no destructive SQL.
- Added category/topic domain validation for trimmed names, stable ids, active duplicate detection, deterministic reorder assignments, archive state, and deletion impact.
- Added repository and service access for create, edit, list, reorder, impact, archive/keep-history, cancel, and injected reassign behavior.
- Added a zero-usage default adapter so Story 1.4 is safe before future money/work/task/reflection record tables exist.
- Extended Settings with category/topic management while preserving Story 1.3 preferences behavior.
- Updated `IconButton` disabled styling for reorder/remove controls.
- Native Expo SQLite persistence was not manually device-tested in this run; repository/service behavior is covered with fakes as allowed by the story.

### File List

- `_bmad-output/implementation-artifacts/1-4-manage-categories-and-topics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/automation-reports/story-1.4-review.md`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/schema.ts`
- `src/data/repositories/category-topic.repository.test.ts`
- `src/data/repositories/category-topic.repository.ts`
- `src/data/repositories/index.ts`
- `src/domain/categories/categories.test.ts`
- `src/domain/categories/schemas.ts`
- `src/domain/categories/types.ts`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/settings/useCategoryTopicSettings.test.ts`
- `src/features/settings/useCategoryTopicSettings.ts`
- `src/services/categories/category-topic.service.test.ts`
- `src/services/categories/category-topic.service.ts`
- `src/ui/primitives/IconButton.tsx`

## Change Log

- 2026-05-08: Created Story 1.4 for safe local category/topic management.
- 2026-05-08: Implemented Story 1.4 category/topic domain, migration, repository/service, settings UI, tests, verification, and self-review preparation.
