---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
lastStep: 8
status: complete
completedAt: "2026-05-07T22:00:08+08:00"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/product-brief-Pplant.md
  - _bmad-output/planning-artifacts/product-brief-Pplant-distillate.md
workflowType: architecture
projectName: Pplant
project_name: Pplant
user_name: Tqlin
created: 2026-05-07
date: 2026-05-07
documentOutputLanguage: English
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Pplant has 50 functional requirements across setup/preferences, daily loop, money tracking, receipt capture, work-income tracking, tasks/habits/reminders, reflection/insights, and data control. Architecturally, this is not just a CRUD planner: the system needs connected domain models so money records, work shifts, tasks, reminders, budgets, savings goals, receipt drafts, and reflections can update the same Today overview and weekly/monthly summaries.

**Non-Functional Requirements:**

The architecture is strongly shaped by offline resilience, local persistence, receipt parsing trust, privacy, accessibility, local notifications, deterministic summary calculations, date/time correctness, and redacted observability. Key NFRs include local persistence under interruption, draft recovery, protected storage for sensitive data, manual corrections as source of truth, non-blocking asynchronous receipt parsing, WCAG 2.2 AA, and measurable performance thresholds.

**Scale & Complexity:**

- Primary domain: Mobile-first student-life planning with personal finance awareness, task planning, local notifications, receipt capture, and reflection.
- Complexity level: Medium.
- Estimated architectural components: 9 major areas: app shell/navigation, local data layer, domain model, capture flows, receipt parsing adapter, notification scheduler, summary/calculation engine, privacy/data-control layer, and diagnostics/observability.
- Dataset assumptions: benchmark fixtures include two academic years of records: expenses, receipt-based expenses, income entries, work shifts, tasks, reminders, savings events, and reflections.

### Technical Constraints & Dependencies

The MVP should support mobile app behavior for short daily sessions, camera receipt capture, local notifications, and offline/poor-network capture. It should not depend on bank linking, payments, investment systems, debt tooling, regulated-finance integrations, account login, cloud backup, or multi-device sync for MVP.

Receipt parsing may depend on camera access, image storage, OCR/document-recognition services, and category suggestion logic. Parsing must run asynchronously and cannot block manual entry, navigation, or draft saving.

Notification behavior should use reliable device-supported scheduling for MVP unless future sync requirements force server-side scheduling. Camera and notification permissions must be requested in context and must have manual alternatives when denied.

### Cross-Cutting Concerns Identified

- Offline-first capture and draft recovery across expenses, receipts, tasks, reminders, and work entries.
- Sensitive local data protection for receipt images, spending history, income records, work hours, tasks, reminders, and reflections.
- Manual correction precedence over parsed receipt data and derived calculations.
- Deterministic summary calculations after add, edit, delete, restart, migration, and later sync/backup behavior.
- Receipt parsing state management: pending, failed, reviewed, saved, low-confidence, duplicate suspected, retry exhausted.
- Local notification reliability, missed reminder recovery, and user-controlled pause/edit/disable behavior.
- Calendar correctness for local timezone, week starts, month transitions, leap days, and work shifts crossing midnight.
- Accessibility and usability requirements across core flows, dynamic text, touch targets, focus order, and non-color-only state.
- Non-shaming product language and reflection-only insights without causal, predictive, optimization, or financial-advice claims.
- Redacted diagnostics for parsing failures, reminder failures, migration failures, summary errors, and retry exhaustion.

## Starter Template Evaluation

### Primary Technology Domain

The primary technology domain is a cross-platform mobile application. Pplant's MVP requires mobile-first daily use, camera receipt capture, local notifications, offline/poor-network capture, local persistence, and app-store-ready privacy controls.

### Starter Options Considered

**Expo React Native default template**

Expo's current `create-expo-app` default template is designed for multi-screen apps and includes Expo CLI, Expo Router, and TypeScript configuration. Expo Router supports bottom-tab navigation and platform-specific tab implementations, which maps well to Pplant's Today, Capture, History, and Review zones. Expo also provides first-party modules for camera, notifications, SQLite, and secure local key-value storage.

This option best fits Pplant because it keeps the MVP mobile-native while preserving a shared TypeScript codebase across iOS and Android. It also leaves room for later web/admin surfaces without making web the MVP center of gravity.

**React Native CLI**

React Native CLI is viable and TypeScript-first for new projects, but it creates more native setup and dependency ownership early. It is better if Pplant needs deep native customization immediately. For this MVP, the PRD emphasizes validation speed, camera, local notifications, and offline capture rather than custom native UI infrastructure.

**Flutter**

Flutter is viable for cross-platform mobile apps and has official project creation tooling. It is less aligned with the rest of the current planning artifacts, which lean toward a token-led UI implementation that can map naturally to React Native components and TypeScript domain logic. Flutter remains a fallback if the implementation team strongly prefers Dart and Flutter's rendering model.

### Selected Starter: Expo React Native Default Template

**Rationale for Selection:**

Use Expo React Native with TypeScript and Expo Router. It is the best default foundation for Pplant's mobile-first MVP because it supports iOS/Android delivery, native camera access, local notification scheduling, local SQLite storage, secure local key-value storage, and file-based navigation while keeping implementation approachable for AI agents and a small product team.

**Initialization Command:**

```bash
npx create-expo-app@latest Pplant --template default@sdk-55 --yes
```

The SDK-specific template flag is included because Expo documentation currently notes an SDK 55 transition period. If this command changes by implementation time, the implementation story should re-check the official Expo create-expo-app documentation before scaffolding.

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

TypeScript and React Native through Expo. This supports shared domain types for money records, tasks, reminders, receipt parsing states, summaries, and recurrence rules.

**Navigation:**

Expo Router should define the app shell with route groups for major zones such as Today, Capture, History, Review, and Settings. Bottom navigation should be used only for major app zones, matching the UX specification.

**Styling Solution:**

Start with React Native styling and a local token module derived from `DESIGN.md`. Do not select a heavy UI kit at the starter layer. Pplant needs a custom token-led mobile design system, not a generic finance dashboard look.

**Build Tooling:**

Use Expo CLI and Expo Application Services when native builds are needed. Native prebuild should be introduced only when a dependency or app-store configuration requires it.

**Testing Framework:**

The starter should be extended with unit tests for domain logic and integration-style tests for persistence, summary calculation, receipt parsing normalization, recurrence, and reminder scheduling. UI test tooling can be selected after architectural decisions define the final app structure.

**Code Organization:**

The starter should be reorganized into clear layers after initialization:

- `src/app` for Expo Router screens and route groups.
- `src/features` for feature flows such as daily overview, money, receipt, work, tasks, reminders, reflection, history, and settings.
- `src/domain` for entities, value objects, recurrence logic, date rules, summary calculations, and validation.
- `src/data` for local persistence, migrations, repositories, and OCR job state.
- `src/services` for camera, receipt parsing adapter, notification scheduler, diagnostics, and privacy/delete workflows.
- `src/ui` for tokens, primitives, and Pplant-specific components.

**Development Experience:**

The starter provides a current Expo/React Native baseline with TypeScript and routing already configured. It should be the first implementation story so all later stories can share the same folder structure, scripts, linting, and agent context.

**Source Verification:**

Verified against official Expo and React Native documentation on 2026-05-07:

- Expo `create-expo-app` command and templates.
- Expo Router navigation layouts.
- Expo Camera, Notifications, SQLite, and SecureStore SDK documentation.
- React Native TypeScript documentation.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Use a local-first mobile architecture for MVP.
- Use Expo React Native with TypeScript and Expo Router.
- Use SQLite as the primary local database through `expo-sqlite`.
- Use Drizzle ORM for typed SQLite access, schema ownership, and migrations.
- Use Zod for runtime validation at capture, parsing, import, and repository boundaries.
- Use local notifications for MVP reminder scheduling.
- Treat receipt parsing as an asynchronous adapter, not as a trusted source of truth.
- Exclude account login, cloud sync, bank linking, payment integrations, investment/debt features, and regulated-finance APIs from MVP.

**Important Decisions (Shape Architecture):**

- Separate UI, feature orchestration, domain logic, data repositories, and platform services.
- Store manual corrections and provenance flags so user edits override parsed and derived values.
- Keep receipt images and OCR text behind retention/deletion controls.
- Use redacted diagnostic events only; never log raw receipts, spending details, income values, reflections, or task content.
- Keep summaries deterministic and testable outside the mobile UI.

**Deferred Decisions (Post-MVP):**

- Account authentication and cloud backup.
- Multi-device sync and conflict resolution.
- Server-side reminder scheduling.
- Rich AI personalization or spending optimization.
- Complex recurrence rules beyond daily, weekly, and monthly.

### Data Architecture

**Decision: Local-first SQLite with typed repositories**

Pplant should use SQLite as the primary local database through `expo-sqlite`, with Drizzle ORM providing typed schema definitions, query access, and migration structure. This matches the MVP's offline requirements and avoids making the daily loop dependent on network availability.

**Rationale:**

- Manual capture, task updates, reminder edits, work entries, and receipt drafts must persist locally.
- The standard MVP dataset is large enough to need structured querying, indexes, migrations, and deterministic summaries.
- SQLite supports local history, filtering, and aggregation without requiring a server.
- Drizzle supports an Expo SQLite driver and migration tooling, which gives AI agents a concrete schema ownership pattern.

**Data modeling approach:**

Use explicit domain tables for:

- `money_records`
- `receipt_drafts`
- `receipt_parse_jobs`
- `receipt_line_items`
- `work_entries`
- `tasks`
- `reminders`
- `recurrence_rules`
- `budgets`
- `savings_goals`
- `categories`
- `topics`
- `record_topics`
- `reflections`
- `summary_snapshots`
- `diagnostic_events`

Every record that may come from automation should include source/provenance fields such as `source`, `confidence`, `user_corrected_at`, and `source_of_truth`. Manual edits must override parsed values and derived summaries.

**Validation strategy:**

Use Zod schemas for runtime validation of capture forms, receipt parsing results, repository inputs, import/export payloads, and diagnostic event payloads. Domain invariants that require database lookups should live in domain services rather than inside pure schemas.

**Migration strategy:**

Use explicit SQLite migrations generated and tracked with Drizzle Kit. Migration tests must prove preservation of historical records, user corrections, receipt image references, reminders, cached summaries, and derived references.

**Caching strategy:**

Use SQLite as the source of truth. Keep UI-level caches ephemeral. Summary values may be cached as `summary_snapshots` only when they can be deterministically invalidated after add, edit, delete, migration, or timezone boundary events.

### Authentication & Security

**Decision: No account authentication for MVP**

Pplant's MVP should be a single-user local workspace. This preserves the PRD boundary that account login, cloud backup, and multi-device sync are post-MVP unless explicitly added later.

**Authorization pattern:**

No multi-user authorization is needed in MVP. Privacy boundaries are local-data boundaries: users must be able to delete records, drafts, receipt images, OCR text, diagnostic data, and all personal data through user-facing controls.

**Data protection approach:**

Use OS-provided protected app storage for local database and files. Use `expo-secure-store` for small sensitive secrets, user privacy flags if appropriate, and any future encryption keys or service tokens. Receipt images should be stored in the app's private documents/cache area and referenced from SQLite with retention metadata.

**Receipt image and OCR privacy:**

If OCR uses a third-party or cloud service, Pplant must disclose affected data categories before upload. The architecture must allow local manual entry when OCR is unavailable, denied, failed, or disabled.

**Diagnostics security:**

Diagnostics must use event names, timestamps, app version, non-sensitive error categories, retry counts, and job states only. Raw receipt images, OCR text, spending details, income values, task contents, reminder text, and reflections must be excluded.

### API & Communication Patterns

**Decision: Adapter-based service ports, no general backend API for MVP**

MVP should not introduce a general backend API. External communication should be isolated behind service ports, especially receipt parsing.

**Primary service port: `ReceiptParsingPort`**

The OCR/parser integration should expose a typed interface that accepts a receipt draft reference and returns normalized parsed data:

- merchant
- date
- total amount
- line items
- category/topic suggestions
- confidence per field
- unknown fields
- duplicate indicators
- timeout/failure states

The parser must never directly save final expenses. It may write parse job results, but user review and correction create the final money record.

**Error handling standard:**

All service ports should return typed result objects, not uncaught transport errors. Result states should map to UX states: pending, failed, low-confidence, reviewed, saved, retry exhausted, manual fallback, and discarded.

**Retry strategy:**

Receipt parsing jobs should follow the PRD retry boundary: no more than 3 automatic retries per receipt parsing job within 24 hours. After final failure, further retry requires user action.

**Future sync boundary:**

Repositories should be designed so later cloud sync can be added behind the data layer without rewriting UI flows. Future conflict resolution must preserve user corrections as source of truth.

### Frontend Architecture

**Decision: Feature-based Expo Router app with domain-driven modules**

Use Expo Router for app navigation. Organize routes by major UX zones and keep feature logic outside route files.

**State management:**

Use React local state for transient form and UI state. Use repositories/domain services for persisted state. Avoid a broad global store for domain data in MVP. If cross-screen state becomes necessary, introduce small focused stores for UI-only concerns such as draft banners or selected filters.

**Forms and validation:**

Forms should use Zod-backed validation and feature-level form controllers. Every capture form must draft-save before risky transitions such as camera launch, app backgrounding, network parsing, or navigation away.

**Component architecture:**

Use `src/ui` for tokens, primitives, and Pplant-specific components. Use `src/features/*/components` for feature-specific composition. Shared components must expose explicit states for empty, offline, pending, failed, low-confidence, draft, and recovered.

**Performance optimization:**

The Today overview should load from local data and derived selectors. Expensive summaries should run in testable domain functions and may be cached or snapshotted. Long histories should be paginated or virtualized. Receipt parsing must run asynchronously and not block navigation or manual entry.

### Infrastructure & Deployment

**Decision: Expo-managed mobile delivery with EAS-ready configuration**

Use Expo CLI for development and Expo Application Services for native builds when needed. The first implementation story should scaffold the app, then add CI scripts for typecheck, lint, unit tests, and architecture boundary checks.

**Environment configuration:**

Use typed environment access for OCR provider configuration, diagnostics endpoint configuration if any, and privacy toggles. Sensitive values must not be committed. MVP should function without OCR credentials through manual receipt entry and draft recovery.

**Monitoring and logging:**

Use a redacted diagnostics layer inside the app. External crash/diagnostics tools may be added only if they can meet the PRD's no-sensitive-logs requirements.

**Scaling strategy:**

No server scaling decision is required for MVP because the core product is local-first. If OCR is cloud-based, scale belongs to the OCR provider/service adapter and should be isolated from core app architecture.

### Decision Impact Analysis

**Implementation Sequence:**

1. Scaffold Expo React Native TypeScript app.
2. Establish folder structure, tokens, lint/typecheck/test scripts, and route groups.
3. Implement SQLite/Drizzle schema, migrations, repositories, and seed/fixture support.
4. Implement domain models and deterministic summary calculations.
5. Implement Today overview and capture flows with local draft persistence.
6. Implement receipt draft storage and asynchronous parsing adapter.
7. Implement local notification scheduling and reminder recovery states.
8. Implement privacy/deletion workflows and redacted diagnostics.
9. Add benchmark fixtures and device-focused tests for NFR gates.

**Cross-Component Dependencies:**

- Today overview depends on repositories, summaries, reminder state, and draft state.
- Receipt correction depends on receipt drafts, parse jobs, money records, file retention, and diagnostics.
- Reminder recovery depends on tasks, recurrence rules, notification scheduler, and local timezone rules.
- Reflection depends on summaries, tasks, spending, work entries, and non-advice content rules.
- Privacy deletion depends on every domain table, receipt files, parse jobs, cached summaries, diagnostics, and future sync boundaries.

**Version Verification:**

Verified on 2026-05-07 using official documentation:

- Expo SDK 55 current SDK listing and SDK 55 changelog.
- Expo SQLite, SecureStore, Notifications, Camera, and FileSystem SDK docs.
- Drizzle ORM Expo SQLite driver docs.
- Zod official documentation.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**

The architecture has 10 major areas where AI agents could otherwise make incompatible choices: database naming, TypeScript naming, route naming, repository contracts, result/error formats, date/time handling, receipt parsing states, reminder/recurrence behavior, diagnostics payloads, and test placement.

### Naming Patterns

**Database Naming Conventions:**

- Table names use plural `snake_case`: `money_records`, `receipt_parse_jobs`, `recurrence_rules`.
- Column names use `snake_case`: `created_at`, `updated_at`, `user_corrected_at`, `source_of_truth`.
- Primary keys use `id`.
- Foreign keys use `{singular_table}_id`: `money_record_id`, `receipt_draft_id`, `category_id`.
- Indexes use `idx_{table}_{columns}`: `idx_money_records_date`, `idx_tasks_state_due_at`.
- Unique constraints use `uniq_{table}_{columns}`.
- Enum-like values are stored as lowercase strings: `pending`, `failed`, `reviewed`, `saved`.

**API Naming Conventions:**

MVP has no general backend API. Service-port method names use camelCase verbs:

- `parseReceiptDraft`
- `scheduleReminder`
- `cancelReminder`
- `recordDiagnosticEvent`
- `deletePersonalData`

Service result objects should use camelCase TypeScript fields. Database rows may be mapped from `snake_case` to camelCase at repository boundaries.

**Code Naming Conventions:**

- React components use PascalCase: `TodayOverviewStack`, `ReceiptReviewDesk`.
- Component files use PascalCase when the file exports one component: `ReceiptReviewDesk.tsx`.
- Non-component files use kebab-case or descriptive camelCase consistently by folder convention. Prefer `repository.ts`, `schema.ts`, `types.ts`, `service.ts`, `selectors.ts`, and `*.test.ts`.
- TypeScript variables and functions use camelCase.
- TypeScript types, interfaces, and Zod schemas use PascalCase: `MoneyRecord`, `MoneyRecordSchema`.
- Domain enum unions use explicit string unions and exported constants when shared across modules.

### Structure Patterns

**Project Organization:**

All implementation should preserve this high-level structure:

```text
src/
  app/
  features/
  domain/
  data/
  services/
  ui/
  diagnostics/
  test/
```

Agents should put feature orchestration in `src/features`, not in route files. Route files should compose feature screens and navigation metadata only.

**File Structure Patterns:**

- Domain logic goes in `src/domain/{area}`.
- SQLite schema and migrations go in `src/data/db`.
- Repositories go in `src/data/repositories`.
- Platform adapters go in `src/services`.
- Shared visual primitives and tokens go in `src/ui`.
- Redacted diagnostic event definitions go in `src/diagnostics`.
- Tests should be co-located for focused units (`*.test.ts`) and placed in `src/test` only for cross-module fixtures and integration helpers.

### Format Patterns

**Service Result Formats:**

Use typed result objects for fallible operations:

```ts
type AppResult<T, E extends AppError = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

Do not throw for expected states such as validation failure, permission denied, offline, low-confidence parsing, duplicate suspicion, retry exhausted, or missing draft. Throwing is reserved for programmer errors and should be caught by boundary-level diagnostics.

**Error Format:**

```ts
type AppError = {
  code: string;
  message: string;
  recovery: "retry" | "edit" | "manual_entry" | "discard" | "settings" | "none";
  causeCategory?: string;
};
```

User-facing copy should be mapped outside the low-level error. Low-level errors must not include sensitive data.

**Data Exchange Formats:**

- TypeScript/domain objects use camelCase.
- SQLite rows use snake_case.
- Dates stored in SQLite use ISO 8601 strings plus explicit local-date fields where calendar grouping is required.
- Money amounts should be stored as integer minor units with a currency code.
- Durations should be stored in minutes unless a more precise domain reason exists.
- Nullable fields should be intentionally modeled; use `null` for intentionally absent persisted values and `undefined` only for optional in-memory fields.

### Communication Patterns

**Event System Patterns:**

Pplant should not introduce a general event bus in MVP. Use explicit service calls and repository writes. Diagnostic events are the exception and should use dotted lowercase names:

- `receipt.parse.failed`
- `receipt.retry.exhausted`
- `reminder.schedule.failed`
- `summary.recalculate.failed`
- `migration.failed`

Diagnostic payloads must include only non-sensitive metadata:

```ts
type DiagnosticEvent = {
  name: string;
  occurredAt: string;
  appVersion: string;
  category: string;
  retryCount?: number;
};
```

**State Management Patterns:**

- Persisted state belongs in SQLite and repositories.
- Transient screen state belongs in React local state.
- Cross-screen UI state may use small focused stores only when needed.
- Derived summary state should come from domain selectors/services and must be testable without React.
- Components should receive explicit state variants rather than infer domain states from loosely shaped props.

### Process Patterns

**Error Handling Patterns:**

- Expected failures return `AppResult`.
- Repository methods validate inputs before writes.
- Service adapters normalize platform/vendor errors into `AppError`.
- UI flows convert errors into recovery actions: retry, edit, manual entry, discard, settings, or none.
- Sensitive data must be stripped before diagnostics.

**Loading State Patterns:**

- Use explicit domain states, not generic booleans, for long-running jobs.
- Receipt parsing states: `draft`, `pending`, `parsed`, `low_confidence`, `failed`, `reviewed`, `saved`, `retry_exhausted`, `discarded`.
- Reminder states: `scheduled`, `sent`, `missed`, `snoozed`, `paused`, `disabled`, `dismissed`, `complete`.
- UI should distinguish loading from blocked. Manual entry should remain available while parsing is pending or failed.

**Retry Patterns:**

- Automatic OCR retry count is capped by the PRD: 3 automatic retries within 24 hours.
- User-initiated retry should create a new user action timestamp.
- Retry jobs must be idempotent by `receipt_parse_job.id`.
- Final retry failure must surface manual entry and keep/discard draft options.

### Enforcement Guidelines

**All AI Agents MUST:**

- Use the documented folder structure and naming conventions.
- Keep route files thin and feature/domain logic outside `src/app`.
- Use repositories for persistence access; do not query SQLite directly from UI components.
- Use typed `AppResult` for expected failures.
- Use Zod at boundaries where untrusted or external data enters the app.
- Preserve manual corrections as source of truth.
- Avoid logging raw receipt, spending, income, task, reminder, or reflection data.
- Add or update tests for domain logic, repository migrations, recurrence rules, summary calculations, and parsing normalization when touched.

**Pattern Enforcement:**

- Pull requests should be reviewed against this architecture document.
- New shared patterns must be added here before multiple agents rely on them.
- Pattern violations should be fixed in the story that introduced them unless the user explicitly accepts a follow-up story.

### Pattern Examples

**Good Examples:**

```ts
const result = await receiptParsingService.parseReceiptDraft(receiptDraftId);
if (!result.ok) {
  return showReceiptRecovery(result.error.recovery);
}
```

```ts
export const moneyRecords = sqliteTable("money_records", {
  id: text("id").primaryKey(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull(),
  sourceOfTruth: text("source_of_truth").notNull(),
});
```

**Anti-Patterns:**

- Querying SQLite directly from a React component.
- Storing money as floating-point numbers.
- Saving parsed receipt values as final without review.
- Logging OCR text or receipt image paths to diagnostics.
- Creating a broad global store for all domain data.
- Using color alone to communicate receipt confidence, task state, or budget status.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
Pplant/
  README.md
  package.json
  app.json
  eas.json
  tsconfig.json
  babel.config.js
  metro.config.js
  eslint.config.js
  prettier.config.js
  drizzle.config.ts
  .env.example
  .gitignore
  .github/
    workflows/
      ci.yml
  assets/
    fonts/
    images/
    icons/
  src/
    app/
      _layout.tsx
      +not-found.tsx
      (tabs)/
        _layout.tsx
        index.tsx
        capture.tsx
        history.tsx
        review.tsx
        settings.tsx
      receipt/
        [receiptDraftId].tsx
      reminder/
        [reminderId].tsx
      task/
        [taskId].tsx
      money/
        [moneyRecordId].tsx
    features/
      today/
        TodayScreen.tsx
        components/
          TodayOverviewStack.tsx
          WeekContextSummary.tsx
          RecentActivityList.tsx
        hooks/
          useTodayOverview.ts
      capture/
        CaptureLauncherSheet.tsx
        draft-banner.tsx
        capture-actions.ts
      money/
        MoneyRecordForm.tsx
        ImpactSummaryCard.tsx
        money-copy.ts
      receipts/
        ReceiptCaptureScreen.tsx
        ReceiptReviewDesk.tsx
        receipt-recovery.ts
      work/
        WorkEntryForm.tsx
        WorkTimeLens.tsx
      tasks/
        TaskForm.tsx
        TaskStateControls.tsx
      reminders/
        ReminderForm.tsx
        ReminderRecoveryRow.tsx
        ReminderSettingsScreen.tsx
      recurrence/
        RecurrenceControl.tsx
        recurrence-copy.ts
      review/
        WeeklyReviewScreen.tsx
        ReflectionPromptCard.tsx
      history/
        HistoryScreen.tsx
        HistoryFilters.tsx
      settings/
        PrivacySettingsScreen.tsx
        DataDeletionScreen.tsx
    domain/
      common/
        result.ts
        app-error.ts
        ids.ts
        money.ts
        date-rules.ts
      money/
        types.ts
        schemas.ts
        calculations.ts
      receipts/
        types.ts
        schemas.ts
        normalize-parse-result.ts
      work/
        types.ts
        schemas.ts
        work-time.ts
      tasks/
        types.ts
        schemas.ts
      reminders/
        types.ts
        schemas.ts
      recurrence/
        types.ts
        schemas.ts
        generate-occurrences.ts
      summaries/
        today-summary.ts
        weekly-summary.ts
        monthly-summary.ts
      privacy/
        deletion-plan.ts
    data/
      db/
        client.ts
        schema.ts
        migrations/
        migrate.ts
      repositories/
        money-records.repository.ts
        receipt-drafts.repository.ts
        receipt-parse-jobs.repository.ts
        work-entries.repository.ts
        tasks.repository.ts
        reminders.repository.ts
        recurrence-rules.repository.ts
        budgets.repository.ts
        savings-goals.repository.ts
        categories.repository.ts
        topics.repository.ts
        reflections.repository.ts
        summaries.repository.ts
        diagnostics.repository.ts
      fixtures/
        standard-mvp-dataset.ts
    services/
      camera/
        camera.service.ts
      files/
        receipt-file-store.ts
        retention-cleanup.service.ts
      notifications/
        notification-scheduler.port.ts
        expo-notification-scheduler.ts
      receipt-parsing/
        receipt-parsing.port.ts
        noop-receipt-parser.ts
        ocr-receipt-parser.ts
        retry-policy.ts
      privacy/
        data-deletion.service.ts
      environment/
        env.ts
    diagnostics/
      events.ts
      redact.ts
      diagnostics.service.ts
    ui/
      tokens/
        colors.ts
        typography.ts
        spacing.ts
        radius.ts
      primitives/
        Button.tsx
        IconButton.tsx
        TextField.tsx
        BottomSheet.tsx
        ListRow.tsx
        Chip.tsx
        SegmentedControl.tsx
        EmptyState.tsx
        StatusBanner.tsx
      components/
        SourceLabel.tsx
        ConfidenceLabel.tsx
        RecoveryActions.tsx
      accessibility/
        labels.ts
        focus.ts
    test/
      factories/
      fixtures/
      repository-test-utils.ts
      device-scenarios.md
```

### Architectural Boundaries

**API Boundaries:**

There is no general backend API in MVP. External communication is limited to explicit service ports, primarily `ReceiptParsingPort`. UI code must not call OCR providers directly. If future sync is added, it must sit behind repositories or sync adapters without changing feature screens.

**Component Boundaries:**

Route files in `src/app` compose screens only. Feature screens live in `src/features`. Shared primitives live in `src/ui/primitives`; product-specific reusable UI lives in `src/ui/components`; feature-specific UI remains inside the owning feature folder.

**Service Boundaries:**

Platform services such as camera, files, notifications, receipt parsing, environment access, privacy deletion, and diagnostics live in `src/services` or `src/diagnostics`. Services return typed results and do not own UI copy.

**Data Boundaries:**

Only repositories access SQLite. Domain functions must be pure or receive explicit inputs. Feature code may call repositories and services through feature hooks/orchestrators, but React components should not import SQLite clients, Drizzle tables, or migration utilities.

### Requirements to Structure Mapping

**Feature/FR Mapping:**

- FR1-FR6 Setup & Preferences: `src/features/settings`, `src/domain/privacy`, `src/services/privacy`, category/topic repositories.
- FR7-FR10 Daily Loop & Quick Capture: `src/features/today`, `src/features/capture`, repositories, summary domain services.
- FR11-FR17 Money Tracking: `src/features/money`, `src/domain/money`, money/category/topic repositories.
- FR18-FR25 Receipt Capture & Correction: `src/features/receipts`, `src/domain/receipts`, receipt repositories, camera/file/parsing services.
- FR26-FR32 Work-Income Tracking: `src/features/work`, `src/domain/work`, work repositories.
- FR33-FR41 Tasks, Habits & Reminders: `src/features/tasks`, `src/features/reminders`, `src/features/recurrence`, recurrence/reminder domain services, notification scheduler.
- FR42-FR46 Reflection & Insights: `src/features/review`, `src/domain/summaries`, `src/domain/privacy`, reflections repository.
- FR47-FR50 Data Control & Resilience: `src/features/settings`, `src/services/privacy`, all repositories, diagnostics, receipt file store.

**Cross-Cutting Concerns:**

- Date/time rules: `src/domain/common/date-rules.ts`.
- Result/error format: `src/domain/common/result.ts` and `src/domain/common/app-error.ts`.
- Diagnostics: `src/diagnostics`.
- Accessibility labels: `src/ui/accessibility`.
- Privacy deletion: `src/domain/privacy` and `src/services/privacy`.
- Standard benchmark dataset: `src/data/fixtures/standard-mvp-dataset.ts`.

### Integration Points

**Internal Communication:**

Screens call feature hooks or feature-level orchestrators. Feature orchestration coordinates repositories, domain calculations, and platform services. Domain functions do not import React, Expo, SQLite clients, or service adapters.

**External Integrations:**

- Camera: `src/services/camera/camera.service.ts`.
- Receipt image/file handling: `src/services/files`.
- OCR/document parsing: `src/services/receipt-parsing`.
- Local notifications: `src/services/notifications`.
- Optional diagnostics export: `src/diagnostics/diagnostics.service.ts`.

**Data Flow:**

1. User starts from Today or Capture.
2. Feature form validates with Zod and saves a draft locally.
3. Repository writes to SQLite.
4. Domain services recalculate affected summaries.
5. UI returns to Today, History, Review, or recovery state.
6. Diagnostics record only redacted non-sensitive events for failures.

### File Organization Patterns

**Configuration Files:**

Root config files own build, TypeScript, linting, formatting, Expo, EAS, and Drizzle setup. Environment defaults live in `.env.example`; typed environment access lives in `src/services/environment/env.ts`.

**Source Organization:**

Source code is grouped by responsibility: routes, features, domain, data, services, diagnostics, UI, and tests. Shared code must move upward only when at least two features need it.

**Test Organization:**

Co-locate focused unit tests next to domain/service files when possible. Use `src/test` for factories, fixtures, device scenarios, repository test utilities, and integration helpers. Domain tests should not require React Native runtime.

**Asset Organization:**

Static assets live in `assets`. Receipt images captured at runtime do not live in repository assets; they live in app-private storage managed by `receipt-file-store`.

### Development Workflow Integration

**Development Server Structure:**

Expo CLI runs the app. Development should support manual receipt entry even when OCR environment variables are missing.

**Build Process Structure:**

Build and CI should run typecheck, lint, unit tests, migration checks, and architecture boundary checks before native build submission.

**Deployment Structure:**

EAS configuration should separate development, preview, and production profiles. App-store privacy declarations must align with receipt photos, spending history, income/work-hour records, task/reminder data, diagnostics, and any OCR provider usage.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**

The architectural decisions are compatible. Expo React Native, Expo Router, SQLite, Drizzle ORM, Zod, local notifications, and adapter-based OCR all support a local-first mobile MVP. No decision requires account login, cloud sync, a general backend API, bank integrations, or regulated-finance infrastructure.

**Pattern Consistency:**

The naming, result/error, state, retry, diagnostics, repository, and service-port patterns support the core decisions. The patterns prevent common agent conflicts such as direct SQLite access from UI, inconsistent parse states, floating-point money storage, raw diagnostic logs, or competing folder structures.

**Structure Alignment:**

The project structure supports the chosen architecture. Route files remain thin, features own user flows, domain code owns calculations and invariants, repositories own SQLite access, services own platform/OCR/notification boundaries, and UI primitives own reusable visual components.

### Requirements Coverage Validation

**Epic/Feature Coverage:**

No epics are available yet, so coverage is validated against PRD functional requirement categories. Each major feature area has an explicit owning directory and supporting domain/data/service layer.

**Functional Requirements Coverage:**

All 50 functional requirements are architecturally supported:

- Setup/preferences map to settings, privacy, category/topic repositories, and local workspace configuration.
- Daily loop and quick capture map to Today, Capture, repositories, drafts, and summary services.
- Money tracking maps to money feature, money domain, and money/category/topic repositories.
- Receipt capture/correction maps to receipts feature, receipt drafts, parse jobs, camera/files/OCR services, and correction provenance.
- Work-income tracking maps to work feature, work domain, and work repositories.
- Tasks/habits/reminders map to tasks, reminders, recurrence, notification scheduler, and recovery states.
- Reflection/insights map to review feature, summary domain, reflections repository, and no-advice content rules.
- Data control/resilience maps to privacy deletion service, all repositories, receipt file cleanup, draft recovery, and diagnostics.

**Non-Functional Requirements Coverage:**

NFRs are addressed architecturally:

- Performance: local SQLite, deterministic summaries, benchmark fixture support, and non-blocking parsing.
- Reliability: local draft persistence, migrations, repository tests, retry boundaries, and manual correction precedence.
- Privacy/security: local-first data, private app storage, SecureStore for small secrets, retention controls, redacted diagnostics, and disclosure before OCR upload.
- Accessibility/usability: UI primitives, explicit state variants, non-color-only labels, and WCAG 2.2 AA alignment.
- Mobile integration: Expo camera, local notifications, offline capture, receipt file handling, and permission-denied alternatives.
- Maintainability/observability: clear boundaries, testable summary/recurrence/parsing logic, and non-sensitive diagnostic events.

### Implementation Readiness Validation

**Decision Completeness:**

Critical implementation decisions are documented: starter, app framework, routing, local database, ORM, validation, local-first persistence, OCR adapter, notifications, privacy model, diagnostics, and deferred post-MVP scope. Versions and commands are tied to official documentation and should be re-checked by the first implementation story before scaffolding.

**Structure Completeness:**

The project tree defines root config, assets, routes, features, domain modules, repositories, services, diagnostics, UI primitives, fixtures, and tests. Each PRD requirement category maps to concrete folders.

**Pattern Completeness:**

Implementation patterns cover naming, folder ownership, result/error shape, data formats, event/diagnostic naming, state management, error handling, loading states, retry behavior, and enforcement guidelines.

### Gap Analysis Results

**Critical Gaps:** None.

**Important Gaps:** None blocking. Exact OCR provider selection is intentionally deferred because the architecture provides `ReceiptParsingPort`, `noop-receipt-parser`, manual fallback, retry policy, and disclosure requirements.

**Nice-to-Have Gaps:**

- UI test framework selection can be made after initial scaffolding.
- Cloud backup/sync strategy can be designed post-MVP without changing core repository boundaries.
- App lock or biometric unlock may be considered later if user testing shows a strong privacy need.

### Validation Issues Addressed

The main validation risk was whether a cloud OCR provider or auth system was required before MVP. The architecture resolves this by isolating OCR behind a port and keeping account/auth/cloud sync out of MVP. The app remains useful through manual entry, draft recovery, and local-first data even when OCR is unavailable.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Strong local-first fit for MVP requirements.
- Clear data/domain/service/UI boundaries for AI-agent consistency.
- Receipt parsing trust and manual correction are explicitly protected.
- Offline, retry, privacy, diagnostics, and deletion concerns are built into the architecture rather than deferred as UI polish.
- Project structure maps every PRD requirement category to an owner.

**Areas for Future Enhancement:**

- Select production OCR provider after implementation constraints are clearer.
- Add cloud backup or sync after local MVP behavior is validated.
- Add deeper test architecture workflows for benchmark fixtures, device permissions, notification delivery, and receipt parsing failure modes.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries.
- Refer to this document for all architectural questions.
- Do not introduce cloud sync, account auth, bank integrations, or a backend API unless the PRD/architecture is explicitly updated.

**First Implementation Priority:**

Scaffold the Expo React Native app with:

```bash
npx create-expo-app@latest Pplant --template default@sdk-55 --yes
```

Then establish the documented folder structure, lint/typecheck/test scripts, route groups, token module, SQLite/Drizzle setup, and initial domain/repository boundaries.
