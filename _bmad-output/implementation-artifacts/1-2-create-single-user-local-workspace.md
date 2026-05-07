# Story 1.2: Create Single-User Local Workspace

Status: done

## Story

As a student,
I want Pplant to create a personal local workspace,
so that I can start planning without account signup or cloud setup.

## Acceptance Criteria

1. Given I open Pplant for the first time, when the app initializes, then a single-user local workspace is created, and no login, cloud sync, or account setup is required.
2. Given the workspace exists, when I close and reopen the app, then the same workspace is loaded from local persistence, and user-created records are not lost.
3. Given the workspace exists, when app data migrations are run, then migration state is tracked, and existing workspace data is preserved.

## Tasks / Subtasks

- [x] Define the local workspace domain contract. (AC: 1, 2)
  - [x] Add a focused workspace domain module under `src/domain/workspace`.
  - [x] Define a stable single-user workspace identity, creation timestamp, update timestamp, and schema/migration version fields.
  - [x] Use Zod for runtime validation of workspace rows at repository/service boundaries.
  - [x] Keep preferences such as currency, locale, budget reset day, wage defaults, categories, topics, budgets, and savings goals out of this story; Story 1.3 and later Epic 1 stories own those.
- [x] Add the workspace table and first tracked migration. (AC: 1, 2, 3)
  - [x] Update `src/data/db/schema.ts` with a Drizzle SQLite table for the single-user workspace.
  - [x] Update `src/data/db/migrations/migrate.ts` so migrations are idempotent, tracked, and return `AppResult<MigrationReport>`.
  - [x] Ensure migration execution never drops or resets existing local tables or user-created rows.
  - [x] Record non-sensitive migration failures through the existing diagnostics path only if useful; use `migration_failed`, `migrationStep`, and redacted metadata only.
- [x] Implement a workspace repository and initialization service. (AC: 1, 2, 3)
  - [x] Add `src/data/repositories/workspace.repository.ts` and export it from `src/data/repositories/index.ts`.
  - [x] Make repositories the only code that imports Drizzle tables or touches SQLite.
  - [x] Implement an `ensureLocalWorkspace` flow that runs migrations, loads the existing workspace, creates one only when absent, and returns the same workspace on later launches.
  - [x] Use typed `AppResult` / `AppError` for expected failures; do not throw recoverable initialization or migration errors.
- [x] Connect workspace initialization to app startup without putting persistence logic in route files. (AC: 1, 2, 3)
  - [x] Add a feature-level workspace gate, hook, or orchestrator under `src/features/workspace`.
  - [x] Compose that gate from `src/app/_layout.tsx` while keeping the route file thin.
  - [x] Show loading, ready, and recoverable local failure states with neutral copy and a clear retry action.
  - [x] Do not request camera, notification, account, cloud, or sync permissions during workspace startup.
- [x] Add focused tests and verification. (AC: 1, 2, 3)
  - [x] Test first-run creation and repeat-run loading of the same workspace without duplicate rows.
  - [x] Test migration idempotence and preservation behavior.
  - [x] Test recoverable failure mapping from repository/migration errors to UI state.
  - [x] Add pure domain/service tests that do not require React Native runtime where possible; use repository test utilities or fakes if native Expo SQLite is unavailable in Jest.
  - [x] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npx expo install --check` before moving the story to review.

### Review Findings

- [x] [Review][Patch] Catch default database-open failures inside `migrateDatabase` [src/data/db/migrations/migrate.ts:56] — The function's default parameter calls `openPplantDatabase()` before entering the `try` block, so direct callers using `migrateDatabase()` can still receive a thrown Expo SQLite/open error instead of the required retryable `AppResult` error. Resolved 2026-05-08 by moving the default database open inside the migration `try` block and adding regression coverage for direct `migrateDatabase()` open failures.

## Dev Notes

### Current Repository State

- Story 1.1 is complete and marked `done`.
- The project is already an Expo React Native SDK 55 app with TypeScript, Expo Router, Jest, ESLint, Drizzle, Zod, and `expo-sqlite`.
- `package.json` currently uses Expo `~55.0.23`, Expo Router `~55.0.14`, `expo-sqlite` `~55.0.15`, `drizzle-orm` `^0.45.2`, `drizzle-kit` `^0.31.10`, and `zod` `^4.4.3`.
- `src/data/db/client.ts` already exposes `openPplantDatabase()` and database name `pplant.db`.
- `src/data/db/schema.ts` is currently an empty schema export. This story should add only the workspace and migration tracking schema needed now, not the full product database.
- `src/data/db/migrations/migrate.ts` currently returns `ok({ applied: 0 })`; replace the placeholder with real idempotent migration behavior.
- `src/app/_layout.tsx` currently composes the root stack and theme. Keep it a composition layer when adding workspace initialization.
- `src/features/today/TodayScreen.tsx` already references Story 1.2 as the next foundation; update visible placeholder copy only if needed after the workspace gate lands.
- `src/diagnostics/events.ts` and `src/diagnostics/redact.ts` were hardened after Story 1.1 review. Unknown diagnostic metadata is dropped, and path/URI-like string values are filtered.
- No git repository was detected during prior work, so rely on files in the workspace rather than commit history.

### Implementation Guidance

- Use SQLite as the local source of truth through `expo-sqlite` and Drizzle.
- Recommended schema shape:
  - `workspaces`: one row for the MVP single-user workspace.
  - `id`: stable deterministic text id such as `local-workspace`, or a generated id that is persisted exactly once. Prefer a deterministic id unless a documented future-sync reason requires generation.
  - `createdAt` and `updatedAt`: ISO 8601 text timestamps.
  - `schemaVersion` or equivalent migration version field for local data model tracking.
  - Add a separate migration tracking table if the migration runner needs it; keep it minimal and future-compatible.
- `ensureLocalWorkspace` should be idempotent:
  - open database;
  - run migrations;
  - load existing workspace;
  - create the default workspace only when none exists;
  - return the persisted workspace through `AppResult`.
- If multiple workspace rows are detected, return a recoverable local `AppError` instead of silently choosing one. The MVP invariant is one local workspace.
- Keep workspace initialization independent from network state. Airplane mode, poor network, or missing OCR variables must not block workspace creation.
- Do not add account authentication, cloud backup, multi-device sync, backend APIs, bank/payment integrations, investment/debt tooling, or regulated-finance flows.
- Do not store workspace identity in SecureStore unless this story introduces a real small secret. SecureStore is reserved for small sensitive secrets, privacy flags if appropriate, and future encryption/service tokens.
- Do not add a broad global domain store. A small feature-level provider/hook for startup state is acceptable.
- Do not put Drizzle or SQLite imports in React components, UI primitives, route files, or domain modules.
- Do not use `AsyncStorage` as the source of truth for workspace state.
- Do not write destructive migrations. No `DROP TABLE`, database deletion, or data reset behavior should be used to satisfy initialization.

### UX and Failure-State Guidance

- The startup failure state should be local and recoverable: explain that Pplant could not open local data and offer retry. Do not suggest signing in, syncing, or creating a cloud account.
- Use neutral, non-shaming copy. This is infrastructure, so the visible UI should stay quiet and minimal.
- Loading and failure UI must have accessible labels and not rely on color alone.
- Startup should not request camera or notification permissions; those remain contextual later flows.

### Testing Requirements

Required automated checks:

```bash
npm run typecheck
npm run lint
npm test
npx expo install --check
```

Minimum test coverage for this story:

- First-run path creates exactly one workspace.
- Second-run path loads the same persisted workspace.
- Migration runner reports applied migrations and is idempotent on repeat runs.
- Existing workspace rows survive migration execution.
- Initialization failures return `AppResult` errors with a retry-capable recovery path.
- Startup orchestration maps loading, ready, and failed states without importing SQLite into route or UI component code.

If Jest cannot exercise native Expo SQLite directly, cover domain/service logic with fakes and add a manual device verification note in the Dev Agent Record for real SQLite persistence after app restart.

### Project Structure Notes

Expected additions or updates:

```text
src/
  app/
    _layout.tsx                       # compose workspace gate only
  domain/
    workspace/
      schemas.ts
      types.ts
      workspace.test.ts               # or equivalent focused domain test
  data/
    db/
      schema.ts
      migrations/
        migrate.ts
    repositories/
      index.ts
      workspace.repository.ts
  services/
    workspace/
      workspace.service.ts
      workspace.service.test.ts        # if service logic is testable without native SQLite
  features/
    workspace/
      WorkspaceGate.tsx
      useWorkspaceInitialization.ts
```

These paths can be adjusted to fit implementation details, but the ownership boundaries cannot change: domain owns invariants/types, data owns SQLite access, services/feature orchestration owns initialization flow, routes compose only.

### Previous Story Learnings

- Story 1.1 established route groups and placeholder screens under `src/app` and `src/features`.
- Story 1.1 installed the required local-first stack, so this story should build on `openPplantDatabase`, existing `AppResult` / `AppError`, and the current diagnostics allowlist instead of creating alternate primitives.
- Story 1.1 review found that diagnostics redaction was too permissive. Future diagnostics must continue to use explicit allowlists and avoid raw paths, URIs, receipt text, money values, task text, reminder text, and reflections.
- Story 1.1 validation passed with `npm test`, `npm run typecheck`, `npm run lint`, and `npx expo install --check`; keep the same baseline checks.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 1.2 acceptance criteria and Epic 1 scope]
- [Source: `_bmad-output/planning-artifacts/prd.md` - FR1, NFR-REL-02, NFR-REL-07, NFR-SEC-01, NFR-SEC-04, NFR-UX-01, NFR-MOB-07]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Data Architecture, Authentication & Security, Frontend Architecture, Architectural Boundaries, Requirements to Structure Mapping]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` - error/offline recovery states, neutral copy, accessibility, navigation patterns]
- [Source: `_bmad-output/implementation-artifacts/1-1-initialize-mobile-app-foundation.md` - current baseline, review findings, validation commands, file list]
- [Source: Expo SQLite SDK 55 docs, verified 2026-05-08: `https://docs.expo.dev/versions/v55.0.0/sdk/sqlite/`]
- [Source: Drizzle Expo SQLite docs, verified 2026-05-08: `https://orm.drizzle.team/docs/connect-expo-sqlite`]
- [Source: Drizzle SQLite column types docs, verified 2026-05-08: `https://orm.drizzle.team/docs/column-types/sqlite`]
- [Source: Zod basics docs, verified 2026-05-08: `https://zod.dev/basics`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Added a deterministic local workspace domain contract with Zod row validation.
- Added Drizzle SQLite schema entries for `workspaces` and `schema_migrations`.
- Replaced the migration placeholder with an idempotent tracked migration runner.
- Added a repository/service startup path that runs migrations, creates or loads one workspace, and returns recoverable local errors.
- Added a feature-level workspace gate and hook, then composed it from the root route layout.
- Covered domain, migration, service, and startup state behavior with focused Jest tests.

### Debug Log References

- Red phase confirmed with failing targeted tests before implementation: missing workspace domain/service modules and placeholder migration behavior.
- Targeted workspace tests passed: `npm test -- --runTestsByPath src\domain\workspace\workspace.test.ts src\data\db\migrations\migrate.test.ts src\services\workspace\workspace.service.test.ts src\features\workspace\useWorkspaceInitialization.test.ts`.
- Typecheck passed: `npm run typecheck`.
- Lint passed: `npm run lint`.
- Full regression passed: `npm test` -> 7 suites, 20 tests.
- Expo dependency check passed: `npx expo install --check`.
- Review patch validation passed after open-error fix: `npm run typecheck`, `npm run lint`, `npm test` -> 7 suites, 21 tests, and `npx expo install --check`.

### Completion Notes List

- Implemented a stable single-user local workspace id, schema version, creation/update timestamps, and Zod validation.
- Added tracked, idempotent local migrations for the workspace table without destructive database reset behavior.
- Added `ensureLocalWorkspace` so startup runs migrations, loads an existing workspace, creates one only when absent, and reports recoverable local errors for open/migration/conflict failures.
- Added a startup `WorkspaceGate` with loading and retryable failure states, composed from `src/app/_layout.tsx` while keeping persistence logic out of routes and UI primitives.
- Kept Story 1.3+ scope out of this implementation: no preferences, categories, budgets, savings goals, auth, cloud sync, or account setup.
- Used fakes for service/migration tests because Jest does not exercise real native SQLite persistence; real device persistence should be spot-checked when running the Expo app.
- Resolved review finding by ensuring direct `migrateDatabase()` callers receive a retryable `AppResult` when default database opening fails.

### File List

- `_bmad-output/implementation-artifacts/1-2-create-single-user-local-workspace.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/app/_layout.tsx`
- `src/data/db/client.ts`
- `src/data/db/schema.ts`
- `src/data/db/migrations/migrate.ts`
- `src/data/db/migrations/migrate.test.ts`
- `src/data/repositories/index.ts`
- `src/data/repositories/workspace.repository.ts`
- `src/domain/workspace/schemas.ts`
- `src/domain/workspace/types.ts`
- `src/domain/workspace/workspace.test.ts`
- `src/features/workspace/WorkspaceGate.tsx`
- `src/features/workspace/useWorkspaceInitialization.ts`
- `src/features/workspace/useWorkspaceInitialization.test.ts`
- `src/services/workspace/workspace.service.ts`
- `src/services/workspace/workspace.service.test.ts`

## Change Log

- 2026-05-08: Created Story 1.2 for single-user local workspace initialization, persistence, migration tracking, startup gating, and recovery-state testing.
- 2026-05-08: Implemented Story 1.2 workspace domain, SQLite schema/migration tracking, repository/service initialization, startup gate, and focused tests.
- 2026-05-08: Resolved code review finding for direct migration database-open failures and marked Story 1.2 done.
