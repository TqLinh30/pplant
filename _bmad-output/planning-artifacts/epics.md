---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
lastStep: 4
status: complete
completedAt: "2026-05-07T22:25:43+08:00"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: epics-and-stories
projectName: Pplant
created: 2026-05-07
documentOutputLanguage: English
---

# Pplant - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Pplant, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Users can use a single-user Pplant workspace for personal student-life planning.
- FR2: Users can configure currency, locale, monthly budget reset day, and hourly wage defaults.
- FR3: Users can create, edit, delete, and reorder categories and topics, including when existing records use them.
- FR4: Users can set total monthly budget rules, including over-budget handling and rollover/no-rollover behavior.
- FR5: Users can create and edit savings goals with target amount and optional target date.
- FR6: Users can view privacy-relevant settings for receipt image retention, notifications, analytics/AI parsing, and local data.
- FR7: Users can view today's money, tasks, reminders, budget status, savings progress, and work-income context in one overview.
- FR8: Users can start expense capture, task creation, work-entry logging, and reminder setup from the daily overview in no more than two taps after the overview loads.
- FR9: Users can review end-of-day activity across spending, tasks, reminders, and work-income entries.
- FR10: Users can save drafts or recover unsaved expense, receipt, task, reminder, and work-entry forms.
- FR11: Users can manually create, edit, and delete expense records.
- FR12: Users can manually create, edit, and delete income records.
- FR13: Users can assign amount, date, category, topic, merchant/source, and notes to money records.
- FR14: Users can create, edit, pause, skip one occurrence, stop, and delete daily, weekly, or monthly recurring expenses and recurring income.
- FR15: Users can view spending and income by category, topic, merchant/source, and day/week/month.
- FR16: Users can view updated budget remaining and savings progress after money records are added, edited, or deleted.
- FR17: Users can search, filter, and sort money history by date, category, topic, merchant/source, and amount.
- FR18: Users can capture a receipt photo for expense entry.
- FR19: Pplant can extract and propose merchant, date, total amount, line items, category, topic, and unknown/low-confidence fields from a receipt.
- FR20: Users can see receipt parsing states, including pending, failed, reviewed, and saved.
- FR21: Users can manually create an expense when receipt parsing is unavailable, failed, incomplete, or wrong.
- FR22: Users can correct merchant, date, total, category, topic, and line items before saving a receipt-based expense.
- FR23: Users can add, edit, delete, or ignore line items and save a total-only expense when line-item review is not useful.
- FR24: Pplant can warn about possible duplicate receipt or expense entries.
- FR25: Users can view and choose receipt image retention behavior and delete stored receipt images while keeping expense records.
- FR26: Users can create, edit, and delete direct work-hour entries.
- FR27: Users can create, edit, and delete work shifts with start time, end time, break time, paid/unpaid status, and wage used for that entry.
- FR28: Users can view earned income calculated from work hours or shifts while historical wage snapshots are preserved for past entries.
- FR29: Users can override wage per work entry.
- FR30: Users can view work hours and earned income by day, week, and month.
- FR31: Users can see expense equivalents in work time based on the relevant wage context.
- FR32: Users can search, filter, and review work history.
- FR33: Users can create, edit, delete, and review daily tasks.
- FR34: Users can assign To Do, Doing, or Done state and high or low priority to tasks.
- FR35: Users can create, edit, pause, skip one occurrence, stop, and delete daily, weekly, or monthly recurring tasks or habits and mark completion by day.
- FR36: Users can set deadlines for tasks.
- FR37: Users can create one-time and repeat reminders with daily, weekly, monthly, optional end-date, and skip-occurrence rules.
- FR38: Users can grant, deny, or change notification permission for reminders.
- FR39: Users can snooze, reschedule, pause, disable, or delete reminders.
- FR40: Pplant can show reminder delivery and task recovery states, including scheduled, sent, missed, disabled, complete, reschedule, and dismiss.
- FR41: Users can see missed tasks and reminders with neutral status language and recovery actions.
- FR42: Users can view weekly and monthly summaries for spending, income, work hours, budget, savings, completed tasks, missed tasks, and reminders.
- FR43: Users can view reflection-only relationships between money/time, work income/savings, tasks/reminders, receipts/spending, and reflections/weekly or monthly summaries using existing records without causal, predictive, optimization, or financial-advice claims.
- FR44: Users can answer, skip, and save weekly or monthly reflection prompts containing up to 3 non-shaming prompts that can be completed in 60 seconds or less without manual calculation.
- FR45: Users can view past reflections.
- FR46: Users can dismiss or mute neutral pattern insights.
- FR47: Users can delete individual records, records by type, records by date range, receipt images, drafts, or all personal data.
- FR48: Users can use core capture capabilities for expenses, income, work entries, tasks, reminders, and receipt drafts when network-dependent services are unavailable.
- FR49: Users can view records that are pending network-dependent processing and retry, edit, or discard them.
- FR50: Users can keep manual corrections as the source of truth when derived summaries, receipt data, or future sync/backup behavior updates records.

### NonFunctional Requirements

- NFR-PERF-01: Manual creation or update of an expense, income entry, task, reminder, or work entry should persist locally at P95 under 300ms on MVP-supported mid-range mobile devices, defined as devices within the supported OS version window with at least 4 GB RAM and non-low-power mode enabled. Verification: device performance benchmark.
- NFR-PERF-02: The daily overview should load from local data at P95 under 1 second using the standard MVP dataset. Verification: device performance benchmark.
- NFR-PERF-03: Budget remaining, savings progress, and work-time equivalents should recalculate at P95 under 500ms after relevant record changes using the standard MVP dataset. Verification: integration benchmark.
- NFR-PERF-04: Weekly and monthly summaries should load at P95 under 2 seconds using the standard MVP dataset. Verification: integration benchmark.
- NFR-PERF-05: Receipt parsing must run asynchronously and must not block navigation, manual entry, or draft saving while parsing is pending. Verification: device and integration tests.
- NFR-PERF-06: The standard MVP dataset for performance testing should include at least two academic years of personal records: 1,500 expenses, 150 receipt-based expenses, 250 income entries, 250 work shifts, 1,000 tasks, 300 reminders, 50 savings-goal events, and 100 reflections. Verification: benchmark fixture review.
- NFR-REL-01: Draft data for expense, receipt, task, reminder, and work-entry forms must survive app backgrounding, interruption, camera cancellation, temporary network loss, and app restart. Verification: device interruption tests.
- NFR-REL-02: User-created records must not be lost during ordinary offline use, app close, app backgrounding, or app restart. Verification: device persistence tests.
- NFR-REL-03: User corrections must take precedence over parsed receipt data and derived calculations. Verification: integration tests.
- NFR-REL-04: Derived summaries must produce deterministic results from the same source dataset after add, edit, delete, restart, and migration events. Verification: unit and integration tests.
- NFR-REL-05: Calendar calculations must define and consistently apply local timezone, week-start rules, month transitions, leap days, and work shifts that cross midnight. Verification: date-boundary test suite.
- NFR-REL-06: Deleting a record must remove or update associated drafts, stored receipt images, OCR text, pending jobs, reminders, cached summaries, and derived references as appropriate. Verification: deletion lifecycle tests.
- NFR-REL-07: App updates and data model migrations must preserve historical records, user corrections, and derived summary consistency. Verification: migration tests.
- NFR-REL-08: Network-dependent processing must expose retry, edit, discard, and manual-entry recovery options when unavailable, timed out, or failed. Verification: offline and timeout tests.
- NFR-SEC-01: Pplant must treat receipt photos, spending history, income records, work hours, tasks, reminders, and reflections as sensitive personal data. Verification: privacy review.
- NFR-SEC-02: Sensitive local data and stored receipt images must be protected at rest using OS-provided protected storage or equivalent app-level encryption; security review must find no raw sensitive records, receipt text, or receipt images persisted outside protected app storage. Verification: security review and device storage inspection.
- NFR-SEC-03: Receipt images must not be sent to third-party OCR or AI services without prior user-facing disclosure of affected data categories. Verification: consent flow review.
- NFR-SEC-04: Analytics, diagnostics, and crash logs must not include raw receipt images, receipt text, spending details, income values, reflections, or task contents. Verification: log redaction tests.
- NFR-SEC-05: Users must be able to delete sensitive local data through user-facing controls, and local deletion should complete without requiring network connectivity. Verification: privacy and device tests.
- NFR-SEC-06: The product must disclose receipt image retention behavior before or during receipt save. Verification: UX/privacy review.
- NFR-SEC-07: Pplant must avoid financial-advice positioning and frame insights as personal planning and reflection. Verification: content review.
- NFR-A11Y-01: Core flows should meet WCAG 2.2 AA where applicable for mobile experiences. Verification: accessibility audit.
- NFR-A11Y-02: Core flows must support dynamic type or text scaling without truncating primary actions or hiding required fields. Verification: accessibility device tests.
- NFR-A11Y-03: Primary controls must have screen-reader labels, logical focus order, and touch targets of at least 44x44 px or platform equivalent. Verification: accessibility audit.
- NFR-A11Y-04: Task state, budget status, reminder state, and receipt parsing confidence must not rely on color alone. Verification: visual accessibility review.
- NFR-UX-01: Empty, loading, offline, failed, permission-denied, low-confidence, and low-progress states must provide a clear next action. Verification: UX review.
- NFR-UX-02: Copy for missed tasks, overspending, reminders, and habit feedback must use neutral, non-shaming language. Verification: content review.
- NFR-UX-03: Permission requests for camera, notifications, or photos must appear in relevant context and must provide manual alternatives when denied. Verification: permission flow tests.
- NFR-UX-04: Automatically generated values should indicate whether they are manual, parsed, estimated, or low-confidence where relevant. Verification: UX and integration tests.
- NFR-MOB-01: Local reminders should be scheduled, updated, and canceled using platform-supported mechanisms and presented as best-effort within iOS/Android limits. Verification: device notification tests.
- NFR-MOB-02: If notification delivery is missed, disabled, or unavailable, Pplant must show an in-app recovery state when the user returns. Verification: device notification tests.
- NFR-MOB-03: Denied camera, photo, or notification permissions must not block manual expense, task, reminder, or work-entry capture. Verification: permission denial tests.
- NFR-MOB-04: Receipt image handling must keep total retained receipt images and abandoned receipt drafts under 500 MB for the standard MVP dataset after cleanup, with user-visible retention settings and automatic cleanup for abandoned receipt drafts older than 30 days. Verification: storage tests.
- NFR-MOB-05: OCR retry behavior must perform no more than 3 automatic retries per receipt parsing job within 24 hours, stop automatic retries after the final failure, and require user action to retry again. Verification: device/network tests.
- NFR-MOB-06: OCR/parsing results must be normalized before display or save into merchant, date, total amount, line items, category, topic, confidence/unknown states, duplicate indicators, errors, and timeout states. Verification: integration contract tests.
- NFR-MOB-07: The MVP must avoid hard dependency on bank, payment, investment, debt, or regulated-finance integrations. Verification: architecture review.
- NFR-MAINT-01: Expense, income, work-income, task, reminder, summary, receipt, and OCR/parsing concerns must have documented ownership boundaries and automated tests for core behavior; summary calculation, recurrence generation, receipt parsing normalization, and reminder scheduling must be testable without mobile UI interaction. Verification: architecture review and test review.
- NFR-MAINT-02: Summary calculations should be testable independently from mobile UI flows. Verification: unit test review.
- NFR-OBS-01: Pplant must record non-sensitive diagnostic events for receipt parsing failures, reminder scheduling failures, migration failures, summary recalculation errors, and receipt retry exhaustion, with event names, timestamps, non-sensitive error categories, and app version. Verification: observability review and log redaction tests.
- NFR-OBS-02: Diagnostic and crash reporting must redact sensitive personal data before storage or transmission. Verification: log redaction tests.

### Additional Requirements

- ARCH-REQ1: Initialize the project with Expo React Native, TypeScript, Expo Router, and the documented `create-expo-app` starter command as the first implementation story.
- ARCH-REQ2: Implement a local-first architecture with SQLite as the source of truth through `expo-sqlite`.
- ARCH-REQ3: Use Drizzle ORM for typed SQLite schema ownership, repository queries, and migrations.
- ARCH-REQ4: Use Zod for runtime validation at capture, parsing, import, repository, diagnostics, and external-data boundaries.
- ARCH-REQ5: Organize implementation into `src/app`, `src/features`, `src/domain`, `src/data`, `src/services`, `src/diagnostics`, `src/ui`, and `src/test`.
- ARCH-REQ6: Keep Expo Router route files thin; feature orchestration must live outside `src/app`.
- ARCH-REQ7: Use repositories for all SQLite access; UI components must not import SQLite clients, Drizzle tables, or migration utilities.
- ARCH-REQ8: Implement typed `AppResult` and `AppError` formats for expected failures and recovery paths.
- ARCH-REQ9: Store money values as integer minor units with currency codes, not floating-point numbers.
- ARCH-REQ10: Store local dates and timestamps consistently enough to support timezone, week-start, month-transition, leap-day, and cross-midnight work-shift calculations.
- ARCH-REQ11: Implement source/provenance fields for parsed, estimated, manual, low-confidence, and user-corrected values.
- ARCH-REQ12: Implement receipt parsing through a `ReceiptParsingPort` adapter and normalized parse results; parser output must not directly create final expense records.
- ARCH-REQ13: Provide a noop/manual fallback parser path so the app remains usable without OCR credentials.
- ARCH-REQ14: Enforce OCR retry policy of no more than 3 automatic retries within 24 hours, with user action required after final failure.
- ARCH-REQ15: Store receipt images in app-private file storage with SQLite references and retention metadata.
- ARCH-REQ16: Use local notifications for MVP reminder scheduling and expose missed/disabled/unavailable recovery states in-app.
- ARCH-REQ17: Implement redacted diagnostic events only; do not record raw receipt images, OCR text, spending details, income values, task contents, reminder text, or reflections.
- ARCH-REQ18: Provide privacy and deletion workflows that delete records, drafts, receipt files, OCR text, parse jobs, cached summaries, diagnostics, and derived references as appropriate.
- ARCH-REQ19: Add benchmark fixtures for the standard MVP dataset and keep summary, recurrence, parsing normalization, migration, and repository logic testable outside UI.
- ARCH-REQ20: Defer account authentication, cloud sync, server-side reminders, bank/payment integrations, and complex recurrence until post-MVP unless architecture is explicitly updated.

### UX Design Requirements

- UX-DR1: Implement a token-led mobile design system based on `DESIGN.md`, including color, typography, spacing, radius, and component state tokens.
- UX-DR2: Implement the Today Overview Stack with date header, week context, task/reminder section, budget/savings section, recent activity, and primary capture action.
- UX-DR3: Implement the Capture Launcher Sheet with actions for expense, receipt, task, work entry, income, and reminder, including draft and permission-denied states.
- UX-DR4: Implement Impact Summary Card variants for calculated, estimated, low-confidence, updated-after-edit, and unavailable contexts.
- UX-DR5: Implement Receipt Review Desk with receipt image reference, parsed field list, confidence labels, editable fields, duplicate warning, save/manual/draft actions, and low-confidence recovery.
- UX-DR6: Implement Reminder Recovery Row with scheduled, sent, missed, snoozed, paused, disabled, dismissed, and complete states.
- UX-DR7: Implement Reflection Prompt Card with period summary, neutral relationship statement, optional prompt, skip/save/mute actions, and no-data/partial-data states.
- UX-DR8: Implement source and confidence labels for manual, parsed, estimated, low-confidence, failed, offline, and user-corrected values.
- UX-DR9: Implement bottom navigation only for major zones: Today, Capture, History, Review, and Settings.
- UX-DR10: Use bottom sheets for quick capture and recovery flows, and full detail screens for receipt correction, recurrence editing, privacy controls, and weekly review when content needs more space.
- UX-DR11: Implement neutral, non-shaming copy for overspending, missed tasks, reminder fatigue, failed parsing, low confidence, and reflection states.
- UX-DR12: Implement empty, loading, offline, failed, permission-denied, low-confidence, and low-progress states with one clear next action.
- UX-DR13: Implement forms that ask for required information first and reveal optional metadata such as topic, recurrence, wage override, notes, and line items only when relevant.
- UX-DR14: Preserve drafts before risky transitions including camera launch, app backgrounding, network parsing, and navigation away from a form.
- UX-DR15: Implement recurrence controls that consistently support edit, pause, skip one occurrence, stop, and delete for daily, weekly, and monthly schedules.
- UX-DR16: Implement history search/filter/sort across money, work, tasks, reminders, and reflections using category, topic, date, amount, merchant/source, and status where applicable.
- UX-DR17: Implement weekly/monthly review surfaces that show relationships as reflection-only context, without causal, predictive, optimization, or financial-advice wording.
- UX-DR18: Meet WCAG 2.2 AA for core mobile flows, including 44x44 touch targets, logical focus order, screen-reader labels, contrast, and dynamic text support.
- UX-DR19: Ensure task state, budget status, reminder state, receipt confidence, and savings progress are never communicated by color alone.
- UX-DR20: Implement contextual permission flows for camera and notifications with manual alternatives when denied.
- UX-DR21: Implement mobile-first layouts for 320px-767px, tablet adaptations for 768px-1023px, and optional desktop/web review/settings surfaces at 1024px+.
- UX-DR22: Keep visual style aligned with white canvas, dark ink, hairline borders, restrained controls, modest typography, and sparse signature color moments.

### FR Coverage Map

FR1: Epic 1 - Single-user workspace.
FR2: Epic 1 - Currency, locale, budget reset day, and wage defaults.
FR3: Epic 1 - Category and topic management.
FR4: Epic 1 - Monthly budget rules.
FR5: Epic 1 - Savings goal setup.
FR6: Epic 1 - Privacy-relevant settings.
FR7: Epic 4 - Today overview.
FR8: Epic 4 - Quick capture entry points.
FR9: Epic 4 - End-of-day activity review.
FR10: Epic 4 - Draft save and recovery.
FR11: Epic 2 - Expense record CRUD.
FR12: Epic 2 - Income record CRUD.
FR13: Epic 2 - Money record metadata.
FR14: Epic 2 - Recurring expenses and income.
FR15: Epic 2 - Spending and income views.
FR16: Epic 2 - Budget remaining and savings recalculation.
FR17: Epic 2 - Money history search/filter/sort.
FR18: Epic 5 - Receipt photo capture.
FR19: Epic 5 - Receipt parsing proposals and confidence.
FR20: Epic 5 - Receipt parsing states.
FR21: Epic 5 - Manual expense fallback.
FR22: Epic 5 - Receipt field correction.
FR23: Epic 5 - Line item handling and total-only save.
FR24: Epic 5 - Duplicate receipt warning.
FR25: Epic 5 - Receipt image retention and deletion.
FR26: Epic 2 - Direct work-hour entry CRUD.
FR27: Epic 2 - Shift entry CRUD.
FR28: Epic 2 - Earned income calculation and wage snapshots.
FR29: Epic 2 - Wage override per work entry.
FR30: Epic 2 - Work history by day/week/month.
FR31: Epic 2 - Expense equivalents in work time.
FR32: Epic 2 - Work history search/filter/review.
FR33: Epic 3 - Daily task CRUD and review.
FR34: Epic 3 - Task state and priority.
FR35: Epic 3 - Recurring tasks/habits and completion by day.
FR36: Epic 3 - Task deadlines.
FR37: Epic 3 - One-time and repeat reminders.
FR38: Epic 3 - Notification permission control.
FR39: Epic 3 - Reminder snooze/reschedule/pause/disable/delete.
FR40: Epic 3 - Reminder delivery and recovery states.
FR41: Epic 3 - Missed task/reminder recovery language and actions.
FR42: Epic 6 - Weekly/monthly summaries.
FR43: Epic 6 - Reflection-only relationships.
FR44: Epic 6 - Short reflection prompts.
FR45: Epic 6 - Past reflections.
FR46: Epic 6 - Dismiss/mute neutral insights.
FR47: Epic 7 - Delete records, images, drafts, and personal data.
FR48: Epic 7 - Offline core capture.
FR49: Epic 7 - Pending network-dependent records with retry/edit/discard.
FR50: Epic 7 - Manual corrections as source of truth.

## Epic List

### Epic 1: Personal Workspace, Preferences & Planning Setup

Users can start a single-user Pplant workspace, configure locale/currency/wage defaults, categories/topics, budgets, savings goals, and privacy-relevant settings.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Epic 2: Money, Budget, Savings & Work-Time Tracking

Users can manually track expenses, income, work entries, budgets, savings progress, history, and work-time equivalents.

**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR26, FR27, FR28, FR29, FR30, FR31, FR32

### Epic 3: Tasks, Habits, Recurrence & Reminder Control

Users can plan tasks, manage task states, configure recurrence, receive local reminders, and recover from missed or noisy reminders.

**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41

### Epic 4: Unified Today Overview & Quick Capture Loop

Users can open Today, understand money/time/attention context, launch capture flows quickly, recover drafts, and review end-of-day activity.

**FRs covered:** FR7, FR8, FR9, FR10

### Epic 5: Receipt Capture, Parsing & Trust-Preserving Correction

Users can capture receipts, review parsing results, correct low-confidence fields, handle failures/duplicates, and control receipt image retention.

**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25

### Epic 6: Weekly/Monthly Reflection & Neutral Insights

Users can view weekly/monthly summaries, answer short reflection prompts, review past reflections, and dismiss/mute neutral insights without advice or judgment.

**FRs covered:** FR42, FR43, FR44, FR45, FR46

### Epic 7: Privacy, Offline Resilience & Data Control

Users can delete personal data, keep working offline, recover pending network-dependent records, and preserve manual corrections as source of truth.

**FRs covered:** FR47, FR48, FR49, FR50

## Epic 1: Personal Workspace, Preferences & Planning Setup

Users can start a single-user Pplant workspace, configure locale/currency/wage defaults, categories/topics, budgets, savings goals, and privacy-relevant settings.

### Story 1.1: Initialize Mobile App Foundation

As a developer implementing Pplant,
I want the Expo React Native foundation initialized with the documented architecture structure,
So that all future stories share one consistent mobile app baseline.

**Acceptance Criteria:**

**Given** the repository has no app scaffold
**When** the starter initialization is performed
**Then** the project uses Expo React Native, TypeScript, and Expo Router
**And** the command and SDK assumptions are documented for future verification.

**Given** the app foundation exists
**When** the source tree is organized
**Then** it includes `src/app`, `src/features`, `src/domain`, `src/data`, `src/services`, `src/diagnostics`, `src/ui`, and `src/test`
**And** route files remain thin composition layers.

**Given** the app foundation exists
**When** CI or local verification runs
**Then** typecheck, lint, and unit test scripts are available
**And** future agents have a consistent baseline for implementation.

### Story 1.2: Create Single-User Local Workspace

As a student,
I want Pplant to create a personal local workspace,
So that I can start planning without account signup or cloud setup.

**Acceptance Criteria:**

**Given** I open Pplant for the first time
**When** the app initializes
**Then** a single-user local workspace is created
**And** no login, cloud sync, or account setup is required.

**Given** the workspace exists
**When** I close and reopen the app
**Then** the same workspace is loaded from local persistence
**And** user-created records are not lost.

**Given** the workspace exists
**When** app data migrations are run
**Then** migration state is tracked
**And** existing workspace data is preserved.

### Story 1.3: Configure Locale, Currency, Budget Reset, And Wage Defaults

As a student,
I want to configure my currency, locale, monthly reset day, and default wage,
So that Pplant calculates money, dates, and work-time context correctly for me.

**Acceptance Criteria:**

**Given** I open preferences
**When** I set currency, locale, monthly budget reset day, and hourly wage
**Then** the preferences are saved locally
**And** invalid values are rejected with a clear correction path.

**Given** I have saved preferences
**When** money or work-entry data uses defaults
**Then** the saved currency, locale, and default wage are available through the local preferences model
**And** the data model preserves support for entry-level wage overrides without requiring work-entry UI in this story.

**Given** my month reset day changes
**When** budget or summary calculations run
**Then** calendar grouping uses the updated reset rule
**And** date calculations remain deterministic.

### Story 1.4: Manage Categories And Topics

As a student,
I want to create, edit, delete, and reorder categories and topics,
So that I can organize records around school, spending, work, and life contexts.

**Acceptance Criteria:**

**Given** I open category/topic settings
**When** I create a category or topic
**Then** it is saved locally
**And** it can be selected by relevant money, work, task, or reflection flows.

**Given** existing records use a category or topic
**When** I edit or reorder it
**Then** existing records remain linked correctly
**And** reports and filters use the updated label/order.

**Given** existing records use a category or topic
**When** I try to delete it
**Then** Pplant explains the impact
**And** provides a safe path to reassign, keep historical usage, or cancel.

### Story 1.5: Set Monthly Budget Rules And Savings Goals

As a student,
I want to set a monthly budget and basic savings goals,
So that I can see whether my spending supports my plans.

**Acceptance Criteria:**

**Given** I open budget setup
**When** I set monthly budget amount, reset day behavior, and rollover/no-rollover preference
**Then** the rules are saved locally
**And** invalid budget values are handled with inline validation.

**Given** I open savings goals
**When** I create or edit a goal with target amount and optional target date
**Then** the goal is saved locally
**And** it is available to budget, savings, and summary inputs for later Today and Review surfaces.

**Given** budget or savings data changes
**When** dependent summaries recalculate
**Then** the app uses deterministic calculations
**And** no floating-point money storage is introduced.

### Story 1.6: View Privacy-Relevant Settings

As a student,
I want to see privacy settings for receipts, notifications, parsing, analytics, and local data,
So that I understand how sensitive information is handled.

**Acceptance Criteria:**

**Given** I open privacy settings
**When** settings load
**Then** Pplant shows receipt image retention, notification, analytics/diagnostics, OCR/parsing, and local data controls
**And** wording is clear and non-alarmist.

**Given** OCR or analytics behavior may involve external services
**When** I view the setting
**Then** affected data categories are disclosed before enablement
**And** manual alternatives remain visible where relevant.

**Given** I use screen reader or dynamic text
**When** privacy settings are displayed
**Then** all controls have labels, logical order, and usable touch targets
**And** no required action is hidden by text scaling.

## Epic 2: Money, Budget, Savings & Work-Time Tracking

Users can manually track expenses, income, work entries, budgets, savings progress, history, and work-time equivalents.

### Story 2.1: Create Manual Expense And Income Records

As a student,
I want to manually create expense and income records with useful metadata,
So that I can track money quickly without bank integrations.

**Acceptance Criteria:**

**Given** I start manual money capture
**When** I enter amount, date, category, topic, merchant/source, and notes
**Then** the record is saved locally
**And** amount is stored as integer minor units with a currency code.

**Given** required fields are missing or invalid
**When** I try to save
**Then** inline validation identifies the problem
**And** no partial final record is created.

**Given** I save a valid record
**When** the save completes
**Then** the record is persisted locally and the money feature exposes the saved result
**And** the record is available to budget, savings, history, and summary inputs for later Today and Review surfaces.

### Story 2.2: Edit And Delete Money Records With Summary Recalculation

As a student,
I want to edit and delete expense or income records,
So that my summaries stay accurate when I correct my history.

**Acceptance Criteria:**

**Given** a money record exists
**When** I edit amount, date, category, topic, merchant/source, or note
**Then** changes are persisted locally
**And** budget remaining and savings progress recalculate.

**Given** a money record exists
**When** I delete it
**Then** it is removed or marked according to repository rules
**And** related summaries, filters, and cached values update deterministically.

**Given** the record came from receipt parsing
**When** I manually edit it
**Then** manual correction is stored as source of truth
**And** later derived updates do not overwrite the correction.

### Story 2.3: Search, Filter, Sort, And Review Money History

As a student,
I want to search, filter, sort, and review money history,
So that I can understand spending and income by time, category, topic, source, and amount.

**Acceptance Criteria:**

**Given** money records exist
**When** I open history
**Then** I can view spending and income by day, week, and month
**And** category, topic, merchant/source, and amount are visible where relevant.

**Given** I apply filters or sorting
**When** I filter by date, category, topic, merchant/source, or amount
**Then** matching records are shown
**And** the filter state is understandable and removable.

**Given** the standard MVP dataset is present
**When** history loads or filters change
**Then** interaction remains responsive
**And** long lists use pagination or virtualization where needed.

### Story 2.4: Manage Recurring Expenses And Income

As a student,
I want to create and manage recurring expenses and income,
So that predictable money events do not need to be rebuilt manually.

**Acceptance Criteria:**

**Given** I create a recurring money item
**When** I choose daily, weekly, or monthly recurrence
**Then** Pplant saves a recurrence rule
**And** future occurrences can be generated consistently.

**Given** a recurring money item exists
**When** I edit, pause, skip one occurrence, stop, or delete it
**Then** the selected action affects the correct occurrence or series
**And** history and summaries remain consistent.

**Given** a recurrence crosses timezone, week-start, or month-boundary conditions
**When** occurrences are generated
**Then** date rules are deterministic
**And** test coverage verifies boundary behavior.

### Story 2.5: Create Work-Hour And Shift Entries

As a part-time-working student,
I want to record direct work hours and detailed shifts,
So that Pplant can calculate earned income and work-time context.

**Acceptance Criteria:**

**Given** I start work entry capture
**When** I enter direct hours or shift start/end/break values
**Then** the work entry is saved locally
**And** paid/unpaid status and wage used for the entry are recorded.

**Given** I override the default wage for one entry
**When** the entry is saved
**Then** the override applies only to that entry
**And** historical wage snapshots are preserved.

**Given** a shift crosses midnight
**When** earned income and work duration are calculated
**Then** local timezone and date-boundary rules are applied correctly
**And** the result is testable outside UI.

### Story 2.6: Review Work History And Earned Income

As a part-time-working student,
I want to review work hours and income by day, week, and month,
So that I can understand how much effort produced my money.

**Acceptance Criteria:**

**Given** work entries exist
**When** I open work history
**Then** I can view hours and earned income by day, week, and month
**And** wage snapshots are preserved in historical records.

**Given** I search or filter work history
**When** I filter by date range or relevant work fields
**Then** matching entries are shown
**And** totals update consistently.

**Given** work entries are edited or deleted
**When** work totals and summary inputs recalculate
**Then** earned income, hours, and derived work summary inputs update deterministically.

### Story 2.7: Show Expense Impact As Work-Time Context

As a student,
I want to see expenses translated into approximate work time,
So that spending feels understandable without shame or financial advice.

**Acceptance Criteria:**

**Given** I save or review an expense
**When** Pplant has a relevant wage context
**Then** it shows an approximate work-time equivalent
**And** the value is labeled as contextual, not advice.

**Given** no wage context exists
**When** an expense impact summary is displayed
**Then** Pplant explains that work-time context needs a wage
**And** offers a path to set wage without blocking expense capture.

**Given** expense or wage data changes
**When** work-time equivalent recalculates
**Then** recalculation is deterministic
**And** estimated values are labeled clearly.

## Epic 3: Tasks, Habits, Recurrence & Reminder Control

Users can plan tasks, manage task states, configure recurrence, receive local reminders, and recover from missed or noisy reminders.

### Story 3.1: Create And Manage Daily Tasks

As a student,
I want to create, edit, delete, and review daily tasks,
So that I can plan school and personal work in Pplant.

**Acceptance Criteria:**

**Given** I create a task
**When** I enter title, optional notes, state, priority, and deadline
**Then** the task is saved locally
**And** To Do, Doing, Done, high priority, and low priority are supported.

**Given** a task exists
**When** I edit, delete, or change state
**Then** the update persists locally
**And** task summary inputs and derived task state update for later Today and Review surfaces.

**Given** required task fields are invalid
**When** I try to save
**Then** validation explains the issue
**And** no invalid final task is stored.

### Story 3.2: Manage Recurring Tasks And Habits

As a student,
I want recurring tasks and habits with completion by day,
So that routine planning does not need to be rebuilt manually.

**Acceptance Criteria:**

**Given** I create a recurring task or habit
**When** I choose daily, weekly, or monthly recurrence
**Then** a recurrence rule is saved
**And** generated occurrences can be marked complete by day.

**Given** a recurring task or habit exists
**When** I edit, pause, skip one occurrence, stop, or delete it
**Then** the selected action affects the correct occurrence or series
**And** recovery language remains neutral.

**Given** recurrence calculations hit week starts, month transitions, or leap days
**When** occurrences are generated
**Then** local calendar rules are applied consistently
**And** tests cover the boundary cases.

### Story 3.3: Create Deadline And Repeat Reminders

As a student,
I want to create one-time and repeat reminders,
So that Pplant can help me remember tasks without demanding attention at the wrong time.

**Acceptance Criteria:**

**Given** I create a task or reminder
**When** I add a deadline or repeat schedule
**Then** local reminder scheduling is configured
**And** daily, weekly, monthly, optional end-date, and skip-occurrence rules are supported.

**Given** notification permission has not been granted
**When** I enable a reminder
**Then** Pplant asks for notification permission in context
**And** provides a manual alternative if permission is denied.

**Given** reminder scheduling fails or is unavailable
**When** the app detects the failure
**Then** it records a redacted diagnostic event
**And** shows an in-app recovery state.

### Story 3.4: Control Reminder Timing And Reminder Fatigue

As a student,
I want to snooze, reschedule, pause, disable, or delete reminders,
So that reminders stay useful instead of noisy.

**Acceptance Criteria:**

**Given** a reminder exists
**When** I choose snooze, reschedule, pause, disable, or delete
**Then** the reminder state and schedule update correctly
**And** the action is reversible where appropriate.

**Given** a repeat reminder is paused or disabled
**When** I return to the task or reminder detail
**Then** Pplant shows the current state clearly
**And** important task data is not deleted.

**Given** I use assistive technology
**When** reminder controls are displayed
**Then** each action has a descriptive label and logical focus order
**And** state is not communicated by color alone.

### Story 3.5: Recover From Missed Tasks And Reminders

As a student,
I want missed tasks and reminders to show recovery actions,
So that I can continue without feeling punished.

**Acceptance Criteria:**

**Given** a task or reminder is missed
**When** I return to Pplant
**Then** the item appears with neutral status language
**And** recovery actions such as complete, snooze, reschedule, pause, dismiss, or edit are available.

**Given** a reminder delivery is missed, disabled, or unavailable
**When** Pplant opens
**Then** in-app recovery state is shown
**And** user action is recorded without shame-based copy.

**Given** recovery state is displayed
**When** I choose a recovery action
**Then** task/reminder state updates locally
**And** recovery outcome data is available to later Today and Review surfaces.

## Epic 4: Unified Today Overview & Quick Capture Loop

Users can open Today, understand money/time/attention context, launch capture flows quickly, recover drafts, and review end-of-day activity.

### Story 4.1: Build The Today Overview Stack

As a student,
I want one Today overview for money, tasks, reminders, savings, and work context,
So that I can understand my day without switching between separate dashboards.

**Acceptance Criteria:**

**Given** I open Pplant
**When** Today loads
**Then** I see today's money, tasks, reminders, budget status, savings progress, and work-income context
**And** information is grouped with calm visual hierarchy.

**Given** Today has no records yet
**When** the screen loads
**Then** it shows useful empty states
**And** each empty state offers one clear next action.

**Given** the standard MVP dataset exists
**When** Today loads from local data
**Then** load performance meets the P95 target
**And** long computations do not block interaction.

### Story 4.2: Launch Quick Capture Within Two Taps

As a student,
I want to start common capture flows from Today quickly,
So that recording life events fits into short daily sessions.

**Acceptance Criteria:**

**Given** Today has loaded
**When** I open the capture launcher
**Then** expense, task, work entry, income, and reminder capture actions are available
**And** each supported capture flow starts within no more than two taps after overview load.

**Given** receipt capture has not yet been implemented
**When** the capture launcher renders during Epic 4
**Then** receipt capture is either absent or clearly unavailable
**And** no broken receipt flow is exposed to users.

**Given** an action requires permission such as camera or notifications
**When** I select that action
**Then** the permission request appears in context
**And** manual alternatives remain available when permission is denied.

**Given** I use screen reader or dynamic text
**When** the capture launcher opens
**Then** each action has an accessible label
**And** text scaling does not hide required actions.

### Story 4.3: Save And Recover Drafts Across Capture Forms

As a student,
I want interrupted capture forms to become recoverable drafts,
So that I do not lose work when the app closes, backgrounding happens, camera is canceled, or network is poor.

**Acceptance Criteria:**

**Given** I begin an expense, task, reminder, income, or work-entry form
**When** the app backgrounds, closes, loses network, or the form is interrupted
**Then** the draft is persisted locally
**And** I can recover it when returning.

**Given** a draft exists
**When** I open Today or Capture
**Then** Pplant shows the draft with actions to resume, edit, discard, or keep
**And** the draft state is clear.

**Given** a draft is recovered and saved
**When** the final record is created
**Then** the draft is removed or linked appropriately
**And** dependent summaries update.

### Story 4.4: Review End-Of-Day Activity

As a student,
I want to review end-of-day activity across spending, tasks, reminders, and work,
So that I can understand how the day went in one loop.

**Acceptance Criteria:**

**Given** I open the end-of-day review
**When** activity exists for the day
**Then** Pplant shows spending, tasks, reminders, and work-income entries together
**And** the review uses neutral, non-shaming language.

**Given** some categories have no data
**When** the review renders
**Then** Pplant shows partial-data states
**And** no section implies failure or blame.

**Given** I mark a task done or adjust an entry from review
**When** I save the change
**Then** Today and summaries update
**And** I return to relevant updated context.

### Story 4.5: Implement Today UX States And Accessibility

As a student,
I want Today to be readable, accessible, and recoverable in every state,
So that the app feels calm even when data is missing, stale, offline, or failed.

**Acceptance Criteria:**

**Given** Today is empty, loading, offline, failed, stale, estimated, or showing missed items from implemented features
**When** the state appears
**Then** it provides a clear next action
**And** state is not communicated by color alone.

**Given** dynamic text is enabled
**When** Today is displayed
**Then** required fields, labels, and primary actions remain visible
**And** touch targets remain at least 44x44 px.

**Given** Today uses signature colors
**When** the screen renders
**Then** colors are sparse and meaningful
**And** the visual system follows `DESIGN.md`.

## Epic 5: Receipt Capture, Parsing & Trust-Preserving Correction

Users can capture receipts, review parsing results, correct low-confidence fields, handle failures/duplicates, and control receipt image retention.

### Story 5.1: Capture Receipt Photo And Save Draft

As a student,
I want to capture a receipt photo for expense entry,
So that I can create an expense faster while keeping control of the data.

**Acceptance Criteria:**

**Given** I start receipt capture
**When** camera permission is needed
**Then** Pplant asks in context
**And** manual expense entry remains available if permission is denied.

**Given** I take or select a receipt photo
**When** capture completes
**Then** a receipt draft is saved locally with file reference and retention metadata
**And** navigation away does not lose the draft.

**Given** capture is canceled or interrupted
**When** I return to Pplant
**Then** I can continue manually or discard the partial draft
**And** no final expense is created without user confirmation.

**Given** the Capture Launcher exists
**When** receipt capture is implemented
**Then** receipt capture is available from the launcher within the two-tap capture pattern
**And** denied camera permission still leaves manual expense entry available.

### Story 5.2: Parse Receipt Asynchronously With Visible States

As a student,
I want receipt parsing to run in the background with clear states,
So that I can keep control while automation helps.

**Acceptance Criteria:**

**Given** a receipt draft exists
**When** parsing starts
**Then** a receipt parse job is created with pending state
**And** manual entry and navigation remain available.

**Given** parsing succeeds
**When** results are normalized
**Then** Pplant proposes merchant, date, total, line items, category, topic, unknown fields, confidence, and duplicate indicators
**And** no final expense is saved automatically.

**Given** parsing fails or times out
**When** retry policy applies
**Then** automatic retries are capped at 3 within 24 hours
**And** final failure requires user action for further retry.

### Story 5.3: Review And Correct Parsed Receipt Fields

As a student,
I want to review and correct parsed receipt fields,
So that imperfect OCR still feels trustworthy and recoverable.

**Acceptance Criteria:**

**Given** parsed receipt results are available
**When** I open Receipt Review Desk
**Then** merchant, date, total, line items, category, topic, and confidence labels are visible
**And** low-confidence fields are highlighted with text labels, not color alone.

**Given** a parsed field is wrong
**When** I edit merchant, date, total, category, topic, or line items
**Then** my correction is saved as source of truth
**And** the receipt photo/draft context is preserved.

**Given** line-item review is not useful
**When** I ignore line items or save total-only
**Then** Pplant creates a valid total-only expense
**And** discarded line-item details do not block saving.

### Story 5.4: Provide Manual Fallback And Recovery For Receipt Failures

As a student,
I want receipt failures to offer manual fallback and recovery actions,
So that a failed scan does not block expense tracking.

**Acceptance Criteria:**

**Given** parsing is unavailable, failed, incomplete, or wrong
**When** I view the receipt state
**Then** Pplant offers retry, edit draft, manual expense entry, discard, or keep draft actions
**And** the next action is clear.

**Given** network-dependent parsing is unavailable
**When** I create a manual expense from the receipt flow
**Then** manual entry works offline
**And** the draft can be linked, discarded, or retained according to user choice.

**Given** a recovery action fails
**When** the failure is handled
**Then** Pplant records only redacted diagnostic data
**And** no receipt image, OCR text, or spending detail is logged.

### Story 5.5: Warn About Duplicates And Manage Receipt Retention

As a student,
I want duplicate warnings and receipt retention controls,
So that I avoid accidental duplicate expenses and control receipt image storage.

**Acceptance Criteria:**

**Given** Pplant detects a possible duplicate receipt or expense
**When** I review the receipt
**Then** it shows a duplicate warning
**And** I can continue, edit, or discard with context.

**Given** a receipt image is stored
**When** I view retention settings or receipt detail
**Then** I can choose retention behavior and delete stored receipt images while keeping expense records
**And** deletion updates file references and metadata.

**Given** abandoned receipt drafts are older than the cleanup threshold
**When** cleanup runs
**Then** abandoned draft storage is cleaned according to policy
**And** total retained receipt images stay within the MVP storage threshold.

## Epic 6: Weekly/Monthly Reflection & Neutral Insights

Users can view weekly/monthly summaries, answer short reflection prompts, review past reflections, and dismiss/mute neutral insights without advice or judgment.

### Story 6.1: Generate Weekly And Monthly Summaries

As a student,
I want weekly and monthly summaries across money, work, tasks, reminders, budget, and savings,
So that I can understand where my time and money went.

**Acceptance Criteria:**

**Given** records exist for a week or month
**When** I open the review
**Then** Pplant shows spending, income, work hours, budget, savings, completed tasks, missed tasks, and reminders
**And** summary calculations are deterministic.

**Given** the standard MVP dataset exists
**When** weekly or monthly summaries load
**Then** load performance meets the P95 target
**And** summary logic is testable without mobile UI.

**Given** records are added, edited, deleted, or migrated
**When** summaries recalculate
**Then** results are consistent from the same source dataset
**And** stale cached summaries are invalidated.

### Story 6.2: Show Reflection-Only Relationships

As a student,
I want to see neutral relationships between money, time, work, tasks, reminders, receipts, and reflections,
So that I can write my own interpretation without receiving advice or blame.

**Acceptance Criteria:**

**Given** review data exists
**When** Pplant displays relationships
**Then** it shows existing records side by side
**And** it avoids causal, predictive, optimization, and financial-advice claims.

**Given** relationship data is partial or missing
**When** the review renders
**Then** Pplant uses partial/no-data states
**And** it does not imply the user failed.

**Given** relationship copy is displayed
**When** content is reviewed
**Then** it frames insights as personal planning and reflection
**And** it follows non-shaming copy guidelines.

### Story 6.3: Answer, Skip, And Save Reflection Prompts

As a student,
I want short optional reflection prompts,
So that I can capture what I noticed without doing manual calculations.

**Acceptance Criteria:**

**Given** I open a weekly or monthly review
**When** prompts are shown
**Then** there are up to 3 non-shaming prompts
**And** they can be completed in 60 seconds or less without manual calculation.

**Given** I answer a prompt
**When** I save the reflection
**Then** it is persisted locally
**And** it is available in past reflections.

**Given** I do not want to answer
**When** I skip the prompt
**Then** Pplant records the skip state if needed
**And** the user is not blocked from finishing review.

### Story 6.4: Review Past Reflections And Mute Insights

As a student,
I want to review past reflections and dismiss or mute neutral insights,
So that reflection remains useful and adjustable.

**Acceptance Criteria:**

**Given** past reflections exist
**When** I open reflection history
**Then** I can view saved reflections by period
**And** sensitive content is not logged to diagnostics.

**Given** a neutral insight appears
**When** I dismiss or mute it
**Then** the preference is saved locally
**And** future display respects the mute/dismiss state.

**Given** I delete related records or all personal data
**When** reflection history is updated
**Then** linked summaries and reflections update or delete according to privacy rules
**And** no orphaned derived references remain.

### Story 6.5: Make Reviews Accessible And Visually Calm

As a student,
I want review screens to be accessible and visually calm,
So that reflection feels clear rather than like a dense finance report.

**Acceptance Criteria:**

**Given** review screens render
**When** dynamic text or screen reader is used
**Then** prompts, summaries, actions, and relationship labels remain accessible
**And** focus order is logical.

**Given** summary status uses color accents
**When** status is displayed
**Then** text or icon labels also communicate meaning
**And** color is not the only indicator.

**Given** review content uses signature surfaces
**When** the screen displays
**Then** the visual style follows the token-led design system
**And** avoids shame, advice, prediction, and over-dense charts.

## Epic 7: Privacy, Offline Resilience & Data Control

Users can delete personal data, keep working offline, recover pending network-dependent records, and preserve manual corrections as source of truth.

### Story 7.1: Delete Records, Receipt Images, Drafts, And Personal Data

As a student,
I want to delete individual records, receipt images, drafts, ranges, or all personal data,
So that I can control sensitive local information.

**Acceptance Criteria:**

**Given** I open data controls
**When** I choose to delete a record, type, date range, receipt image, draft, or all personal data
**Then** Pplant explains the impact
**And** asks for confirmation when data loss is possible.

**Given** deletion is confirmed
**When** the deletion service runs
**Then** associated drafts, stored receipt images, OCR text, pending jobs, reminders, cached summaries, and derived references are removed or updated as appropriate
**And** local deletion does not require network connectivity.

**Given** deletion completes
**When** I return to Today, history, review, or settings
**Then** the deleted data is no longer visible
**And** summaries and diagnostics contain no sensitive deleted content.

### Story 7.2: Support Offline Core Capture

As a student,
I want core capture to work offline or during poor network conditions,
So that I can keep recording daily life when services are unavailable.

**Acceptance Criteria:**

**Given** network-dependent services are unavailable
**When** I create expenses, income entries, work entries, tasks, reminders, or receipt drafts
**Then** the core capture flow persists data locally
**And** manual alternatives remain available.

**Given** OCR is unavailable offline
**When** I capture a receipt
**Then** the receipt photo or draft can be saved for later parsing
**And** manual expense entry remains available immediately.

**Given** offline-created records exist
**When** the app restarts
**Then** records and drafts remain available
**And** pending network-dependent work is clearly labeled.

### Story 7.3: Manage Pending Network-Dependent Records

As a student,
I want to view pending network-dependent records and choose retry, edit, or discard,
So that failed services never leave my data stuck.

**Acceptance Criteria:**

**Given** receipt parsing or another network-dependent job is pending
**When** I open recovery or Today
**Then** Pplant shows the pending state
**And** retry, edit, discard, or manual-entry actions are available as appropriate.

**Given** retry is available
**When** I trigger retry
**Then** the retry follows the documented policy
**And** retry exhaustion requires another user action.

**Given** I edit or discard a pending record
**When** the action completes
**Then** related jobs, drafts, summaries, files, and diagnostics update consistently
**And** no stuck pending item remains.

### Story 7.4: Preserve Manual Corrections As Source Of Truth

As a student,
I want my manual corrections to override parsed or derived values,
So that Pplant respects what I actually fixed.

**Acceptance Criteria:**

**Given** I manually correct a parsed receipt, money record, or derived field
**When** the correction is saved
**Then** source/provenance fields record the manual correction
**And** the corrected value becomes source of truth.

**Given** summaries, parsing results, app restart, migration, or future sync/backup behavior touches the same record
**When** updates run
**Then** manual corrections are preserved
**And** derived calculations use the corrected value.

**Given** a migration or recalculation changes related data
**When** verification tests run
**Then** user corrections remain intact
**And** no parsed value silently overwrites them.

### Story 7.5: Add Redacted Diagnostics And Standard Test Fixtures

As a student,
I want Pplant's diagnostics and reliability checks to protect sensitive data,
So that the app can be tested and improved without exposing my personal information.

**Acceptance Criteria:**

**Given** receipt parsing, reminder scheduling, migration, summary recalculation, or retry exhaustion fails
**When** diagnostics are recorded
**Then** events include name, timestamp, app version, non-sensitive error category, and relevant retry/job state
**And** no raw receipt images, OCR text, spending details, income values, task contents, reminder text, or reflections are stored.

**Given** the benchmark fixture is generated
**When** tests load the standard MVP dataset
**Then** it includes at least 1,500 expenses, 150 receipt-based expenses, 250 income entries, 250 work shifts, 1,000 tasks, 300 reminders, 50 savings-goal events, and 100 reflections
**And** fixture data is non-sensitive.

**Given** CI or local tests run
**When** domain, repository, migration, recurrence, parsing normalization, and summary tests execute
**Then** they can run without mobile UI interaction
**And** failures point to the owning module.
