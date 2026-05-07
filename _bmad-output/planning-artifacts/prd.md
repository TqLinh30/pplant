---
stepsCompleted:
  - step-01-init.md
  - step-02-discovery.md
  - step-02b-vision.md
  - step-02c-executive-summary.md
  - step-03-success.md
  - step-04-journeys.md
  - step-05-domain.md
  - step-06-innovation.md
  - step-07-project-type.md
  - step-08-scoping.md
  - step-09-functional.md
  - step-10-nonfunctional.md
  - step-11-polish.md
  - step-12-complete.md
  - step-e-01-discovery.md
  - step-e-02-review.md
  - step-e-03-edit.md
releaseMode: single-release
date: 2026-05-07
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-Pplant.md
  - _bmad-output/planning-artifacts/product-brief-Pplant-distillate.md
documentCounts:
  productBrief: 2
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: mobile_app
  domain: Student-life planning, combining productivity, personal finance awareness, and part-time work-income tracking
  complexity: Medium
  projectContext: greenfield
  notes: Pplant should be classified as a student-life planner first, not a finance app first. The PRD should protect the daily loop as the product core - fast capture, trustworthy correction, calm reminders, and weekly/monthly reflection that connects money, time, tasks, work hours, and habits. Treat privacy, notification quality, and OCR confidence/correction as MVP success risks, not implementation details.
workflowType: prd
workflow: edit
lastEdited: 2026-05-07
editHistory:
  - date: 2026-05-07
    changes: Tightened validation-driven measurability, MVP boundaries, FR wording, NFR thresholds, traceability, and product semantics.
---

# Product Requirements Document - Pplant

**Author:** Tqlin
**Date:** 2026-05-07

## Executive Summary

Pplant is a mobile student-life planner that helps students understand and improve how they use money and time in the same daily system. The product serves students who manage allowance, part-time income, study tasks, daily reminders, and spending decisions across disconnected tools or memory. Pplant combines expense tracking, work-income awareness, task planning, reminders, budget status, savings progress, and habit reflection into a lightweight daily loop.

The core problem is not only that students overspend or forget tasks. The deeper problem is that students lack a practical view of how their money choices, work hours, free time, procrastination, and daily plans influence one another. Pplant should help users capture activity quickly, correct imperfect receipt parsing confidently, receive calm reminders, and review whether their week reflected the life they intended to build.

### What Makes This Special

Pplant is a student-life planner first, not a finance dashboard with tasks attached. Its differentiator is the connection between money, time, part-time work, and daily discipline. The product should create an "aha moment" when a student sees that an expense is not just an amount, but also hours worked, remaining budget, savings impact, and a behavioral signal tied to the day.

Users should choose Pplant over separate expense trackers and task apps because it answers student-specific questions in one place: how much they earned, how many hours it took, where money went, what tasks moved forward, whether free time affected spending, and whether they are building better daily habits. The experience should stay gentle, fast, and non-shaming, with privacy, notification quality, and receipt-correction trust treated as MVP success risks.

## Project Classification

- Project Type: mobile_app
- Domain: Student-life planning, combining productivity, personal finance awareness, and part-time work-income tracking
- Complexity: Medium
- Project Context: Greenfield

## Success Criteria

### User Success

Pplant succeeds when students use it as a daily life planner, not only as a guilt-driven expense tracker. Users should be able to capture expenses, income, work shifts, tasks, and reminders quickly enough that the app fits into normal student routines.

Users should feel clearer about where their money and time went during the week. The key user success moment is when a student connects spending to hours worked, remaining budget, task progress, and daily behavior, then makes a better choice without feeling judged.

### Business Success

Early business success is demonstrated by repeated weekly engagement from students who manage allowance, part-time income, or both. The product should prove that students return for the combined money-time-task loop, not just one isolated feature.

Within the first MVP validation period, success should be measured by active users recording expenses, completing planned tasks, setting monthly budgets, recording work hours, and reviewing weekly or monthly summaries.

### Technical Success

The MVP must make capture and correction reliable. Manual transaction entry, receipt parsing, work-shift entry, reminders, and task state updates must be fast, understandable, and recoverable when recognition or user input is imperfect.

Technical success also requires privacy-conscious handling of receipt photos, spending history, schedule data, and income records. Notification behavior should be calm and predictable, avoiding excessive or poorly timed reminders.

### Measurable Outcomes

Unless revised during experiment design, MVP validation should measure the following over a rolling 4-week validation period among activated users. Activated users are users who create at least one money record and one task or reminder. These targets are learning hypotheses for MVP validation, not public product claims.

- Expense capture: median of at least 3 expense records per activated user per week.
- Task progress: median of at least 2 planned tasks completed per activated user per week.
- Budget setup: at least 40% of activated users set a monthly budget within 7 days of activation.
- Review engagement: at least 30% of activated users save a weekly or monthly review at least twice during the 4-week validation period.
- Work tracking: at least 25% of activated users record work hours, hourly wage, or shift income at least once; among self-identified part-time-working students, at least 50% do so.
- Receipt parsing trust: at least 80% of receipt parsing attempts reach reviewed, saved, or manual-entry recovery state; median user correction-and-save time after parsed results appear is 2 minutes or less.
- Reminder utility: at least 60% of delivered reminders lead to complete, snooze, reschedule, or deliberate dismiss actions; notification disable rate among activated users remains under 20% during the 4-week validation period.
- User-reported clarity: at least 60% of survey respondents agree with "I understand where my money and time went this week."
- User-reported behavior change: at least 40% of survey respondents agree with "I spent less impulsively" or "I planned my day better."
- Non-shaming guardrail: fewer than 10% of survey respondents agree with "Pplant made me feel judged about my spending, work, or tasks."

## Product Scope

### MVP - Minimum Viable Product

The MVP must include manual income and expense recording, receipt photo capture with automatic parsing and manual correction, categories and topics, monthly budget tracking, remaining budget summary, savings summary, basic savings goals, work-income tracking, shift-based work entry, daily task planning, recurring tasks or habits, To Do/Doing/Done task states, high/low priority, deadlines, repeat reminders, capture actions from the daily overview, history search/filtering, and a combined home overview.

The MVP must exclude bank account linking, investment tracking, debt management, family or group budgeting, and complex financial forecasting.

### MVP Boundary Clarifications

The MVP promise is that Pplant helps students see their week or month through money, time, and personal commitments. Capabilities that do not directly support that loop should remain post-MVP.

Free-time and spending relationships are reflection-only in the MVP. Pplant may show existing records side by side and ask neutral reflection prompts, but it must not make causal claims, predictions, optimization recommendations, or regulated financial advice.

Recurring expenses, recurring income, recurring tasks, and recurring habits are basic MVP capabilities. Basic recurrence means daily, weekly, or monthly schedules that users can create, edit, pause, skip for one occurrence, stop, or delete. Complex recurrence rules, holiday calendars, multi-rule schedules, and automatic optimization are post-MVP.

Categories are primary reporting groups for money, work, and tasks. Topics are optional student-defined tags that cut across categories for context such as class, project, event, habit, or life area. Records may have one category and zero or more topics.

### Growth Features (Post-MVP)

Growth features may include richer habit insights, smarter spending pattern detection, improved receipt parsing, configurable review prompts, advanced savings-goal workflows, cloud sync or backup, complex recurrence rules, and deeper personalization of reminders.

### Vision (Future)

The long-term product can become an intelligent student-life operating system that recognizes patterns, suggests better routines, warns when spending drifts from plan, and helps students connect effort, income, free time, goals, and habits before adulthood makes those lessons more expensive.

## User Journeys

### Journey 1: Mai Plans A Normal School Day

Mai is a student with classes in the morning, study tasks in the afternoon, a limited monthly allowance, and a small savings goal for school supplies. She opens Pplant before leaving home and sees one home overview: today's tasks, upcoming reminders, remaining budget, recent spending, and savings progress.

She adds two study tasks, marks one as high priority, and sets a deadline reminder for the evening. She also keeps a weekly recurring study habit so she does not rebuild the same plan every Monday. During the day, she manually records a lunch expense in a few seconds. Pplant updates her remaining budget and savings progress and keeps the feedback calm: it shows the impact without shaming her.

The value moment happens at night when Mai marks a task Done and reviews the day. She sees that she stayed within budget and completed her highest-priority task. Pplant helped her connect planning, spending, and progress in one daily loop.

### Journey 2: An Connects Spending To Hours Worked

An works part-time and wants to understand whether small purchases are worth the time he spends earning money. He sets his default hourly wage, records a recurring phone bill, and enters start time, end time, and hourly wage after a shift. Pplant calculates shift income and adds it to his weekly work-income view.

Later, An records a coffee and snack expense. Instead of only showing the amount, Pplant shows the purchase in context: category, topic, remaining budget, and approximate work time represented by the expense.

The value moment happens when An reviews the week and sees income, hours worked, recurring bills, spending by category, savings, and completed tasks together. He realizes that several impulse purchases consumed a meaningful part of one shift and decides to adjust next week's spending.

### Journey 3: Linh Corrects A Receipt Scan Without Losing Trust

Linh takes a receipt photo after buying supplies. Pplant parses the receipt and suggests merchant, date, total amount, line items, and category. One field is wrong, so Linh enters correction mode.

The correction flow shows the parsed fields clearly, lets Linh edit the wrong amount, and saves the corrected expense without making her restart. Pplant treats OCR as assistance, not truth.

The value moment is trust. Linh learns that receipt capture can save time even when imperfect because correction is fast, visible, and recoverable. This journey reveals that receipt parsing quality depends as much on manual review UX as on recognition accuracy.

### Journey 4: Minh Recovers From Reminder Fatigue

Minh wants help planning, but he ignores apps that send too many notifications. He sets repeat reminders for assignments and budget review, then notices one reminder arrives at a bad time.

Pplant lets Minh change reminder timing, pause a repeat reminder, and keep important deadlines active. The app avoids alarmist language and does not punish missed tasks.

At the end of the week, Minh answers a short optional reflection prompt that shows his recorded free-time context beside spending and task completion. Pplant does not claim why spending changed; it gives Minh a neutral mirror so he can write his own note or skip the prompt.

The value moment happens when Minh keeps reminders enabled because they feel useful and adjustable. He trusts Pplant as a gentle assistant rather than another noisy productivity app.

### Journey Requirements Summary

These journeys reveal requirements for:

- Combined home overview for tasks, reminders, budget, savings, recent spending, and work-income context
- Fast manual expense and income capture
- Shift-based work entry with hourly wage and calculated income
- Expense context that can translate spending into work-time meaning
- Basic savings goals and savings progress in the daily loop
- Basic recurring income, expense, task, and habit setup with edit, pause, skip, stop, and delete controls
- Daily task planning with To Do, Doing, Done, priority, deadlines, and reminders
- Receipt photo capture with parsed merchant, date, total, line items, and category suggestion
- Manual correction flow for receipt parsing errors
- Weekly and monthly review views that connect money, time, work hours, tasks, and habits without causal or predictive claims
- Calm reminder controls, including repeat reminders, pause/edit options, and non-shaming messaging
- Privacy-conscious handling of receipt photos, income records, spending history, and schedule data

## Domain-Specific Requirements

### Compliance & Regulatory

Pplant is not classified as a regulated fintech MVP because it does not include bank linking, payments, investment, debt management, KYC, AML, or money movement. The PRD should not introduce regulated-finance assumptions unless the product scope changes.

Because Pplant serves students and may store spending history, receipt photos, schedules, reminders, work hours, and income records, the MVP must treat privacy and user trust as domain requirements. If the product targets minors or school-managed contexts later, the team must evaluate student privacy obligations before launch in those markets.

### Technical Constraints

Pplant must support fast, recoverable capture flows for manual expenses, receipt scans, work shifts, tasks, and reminders. Receipt parsing must expose confidence-sensitive review and correction because OCR output can be incomplete or wrong.

The product must avoid implying that automatically parsed receipt data is guaranteed correct. Users must be able to review merchant, date, total amount, line items, and category suggestions before saving or after saving. Correction UX should expose likely problem fields, preserve the photo or draft while editing, and avoid forcing users to restart the expense when one field is wrong.

Reminder behavior must be configurable, calm, and reversible. Users must be able to edit, pause, or disable repeat reminders without losing core task or budget data.

### Integration Requirements

The MVP does not require bank integrations or payment-provider integrations. Receipt parsing may depend on camera access, image upload/storage, OCR or document-recognition services, and category suggestion logic.

Notification behavior may depend on local device notifications for MVP unless server-side scheduling, sync, or multi-device support is added later.

### Risk Mitigations

- Privacy risk: minimize sensitive data collection and make receipt, spending, income, and schedule handling clear to users.
- OCR trust risk: require manual correction and avoid saving parsed data as final truth without user review or edit access.
- Notification fatigue risk: support reminder frequency control, pause/edit options, and non-shaming language.
- Scope creep risk: keep MVP focused on student-life planning and exclude regulated finance, household budgeting, forecasting, causal claims, prediction, and complex recurrence automation.
- Behavior-change risk: weekly and monthly reviews must connect money, time, tasks, and work hours rather than showing disconnected charts.

## Innovation & Novel Patterns

### Detected Innovation Areas

Pplant's innovation is a product-model innovation, not a new mobile interaction technology. The novel pattern is treating student money behavior and time behavior as one daily planning system. Expense tracking, work-income awareness, task planning, reminders, budget status, savings progress, and weekly reflection are not separate modules; they are connected parts of one student-life loop.

The most important innovation area is the "money as time worked" insight. Pplant should help students understand expenses through hourly wage, work shifts, remaining budget, savings impact, and daily task behavior.

### Market Context & Competitive Landscape

Existing expense trackers commonly focus on transaction capture, categories, budgets, and reports. Planner apps commonly focus on tasks, deadlines, and reminders. Pplant should not compete only by being another budget app or another task app. Its competitive position is narrower: student-life planning that connects money, free time, work hours, tasks, and habits.

### Validation Approach

The innovation should be validated through behavior, not opinion alone. MVP validation should measure whether students return for the combined loop: recording expenses, planning tasks, tracking work hours, and reviewing weekly summaries in the same product.

Specific validation signals include whether users understand spending in work-time terms, whether weekly reviews improve clarity, whether reflection-only free-time context helps users write their own observations, and whether the combined home overview becomes the preferred entry point over isolated finance or task screens.

### Risk Mitigation

The main risk is that Pplant becomes a feature bundle instead of a coherent loop. The MVP should protect the home overview, fast capture, receipt correction, calm reminders, and weekly/monthly reflection as connected experiences.

If the combined loop is too complex, the fallback is to simplify around the strongest validated behavior: manual expense capture plus work-hour context plus basic daily tasks, then expand reflection and automation after retention is proven.

## Mobile App Specific Requirements

### Project-Type Overview

Pplant is a mobile-first student-life planner. The primary experience should be optimized for quick daily capture, short review sessions, camera-based receipt capture, reminder handling, and glanceable home overview use on a phone.

The MVP should prioritize mobile ergonomics over desktop workflows. Web or desktop surfaces may be considered later, but they should not dilute the first mobile daily loop.

### Technical Architecture Considerations

The mobile app must support fast local interactions for expense entry, task updates, reminder edits, and shift logging. Users should not feel blocked by network delay when capturing routine daily information.

The app should be designed so future sync, backup, or multi-device support can be added without redesigning the product model. The MVP assumes a single-user workspace; account login, cloud backup, and multi-device sync are post-MVP unless explicitly added to scope.

### Platform Requirements

The MVP should define one of these platform strategies before implementation:

- Cross-platform mobile app for iOS and Android if development speed and shared code are highest priority
- Single-platform mobile MVP if validating the product loop quickly is more important than broad platform reach
- PWA only if camera access, notifications, offline behavior, and app-like daily use can meet the MVP quality bar

The PRD assumes mobile app behavior is required for MVP because receipt capture, reminders, and daily check-ins are central to the product.

### Device Permissions

Pplant requires camera access for receipt photo capture. Camera permission should be requested only when the user starts receipt capture, with clear context about why it is needed.

Notification permission is required for deadlines and repeat reminders. Notification permission should be requested after the user creates or enables a reminder, not during cold start onboarding.

If receipt images are stored, the product must define whether images are retained after parsing or discarded after the expense is saved. Users should understand what happens to receipt photos.

### Offline Mode

The MVP should support offline or poor-network use for core daily capture actions: manual expenses, task updates, work-shift entries, and reminder configuration. If receipt parsing depends on a network OCR service, the app should allow the user to save the photo or create a draft expense and complete parsing later.

Weekly/monthly summaries should be available from locally stored data when possible. Any sync conflicts introduced later must protect user-entered corrections and avoid overwriting manual edits.

### Push/Local Notification Strategy

MVP reminders should use local device notifications unless server-side scheduling is required for account sync, multi-device behavior, or web support. Reminder controls must include edit, pause, disable, and repeat settings.

Notification language should remain calm and non-shaming. Notification success should be measured not only by taps, but also by whether users keep reminders enabled.

### Store Compliance

If distributed through app stores, Pplant must prepare privacy disclosures for receipt photos, spending history, income/work-hour records, schedule/task data, notification usage, and any third-party OCR or analytics services.

The app should avoid financial claims that imply professional financial advice. Pplant should frame insights as personal planning and reflection, not regulated financial guidance.

### Implementation Considerations

The product model should keep money records, work shifts, tasks, reminders, budgets, savings summaries, categories, and topics connected enough to power the combined home overview and weekly/monthly reflection.

Receipt parsing should be implemented as an assistive flow with manual correction, not an invisible automation. Reminder scheduling should be reliable and user-controlled. Any analytics should support the product differentiator: connecting money, time, tasks, work hours, and habits in a way students can understand quickly.

## Project Scoping

### Strategy & Philosophy

**Approach:** Single MVP release focused on validating the student-life daily loop.

The MVP should prove that students will use one mobile product to connect money, time, tasks, work hours, reminders, budget status, and reflection. Scope decisions should protect the combined loop rather than optimizing isolated features. The product should answer the first MVP job: "Do I still have enough money, time, and attention for this week?"

**Resource Requirements:** The MVP requires product/design coverage for mobile UX and habit loops, mobile engineering for capture/reminders/local storage, backend or service integration capability for receipt parsing if OCR is cloud-based, and QA coverage for camera, notifications, offline/poor-network behavior, and data correction flows.

### Complete Feature Set

**Core User Journeys Supported:**

- Student plans a normal day using a combined home overview
- Student records expenses and sees remaining budget/savings impact
- Student creates a basic savings goal and sees progress affected by money records
- Part-time student records work shifts and connects spending to hours worked
- Student sets basic recurring income, expense, task, or habit items and can edit, pause, skip, stop, or delete them
- Student captures a receipt, reviews parsed data, and corrects errors
- Student creates deadlines and repeat reminders without notification fatigue
- Student reviews weekly/monthly summaries connecting money, time, tasks, and habits as reflection, not prediction

**Must-Have Capabilities:**

- Manual income and expense recording
- Receipt photo capture with automatic parsing
- Manual correction for parsed receipt data
- Parsed receipt fields for merchant, date, total amount, line items, and category suggestion
- Spending categories and topics
- Recurring expenses and recurring income
- Monthly budget tracking
- Remaining budget summary
- Savings summary
- Basic savings goal setup
- Spending statistics by category, topic, day, week, and month
- Work-income tracking through hours worked and hourly wage
- Shift-based work entry with calculated income
- Daily task planner
- Recurring tasks or habits
- Task states: To Do, Doing, Done
- Task priority: high and low
- Deadlines
- Repeat reminders
- Calm reminder controls including edit, pause, disable, and repeat settings
- Combined home overview for money, tasks, reminders, budget status, savings progress, and work-income context
- Capture actions from the daily overview for expenses, tasks, work entries, and reminders
- Search, filter, and review history for money, work, tasks, and reminders
- Weekly and monthly review views connecting money, time, work hours, tasks, and habits
- Privacy-conscious handling and deletion controls for receipt photos, income records, spending history, task data, reminders, drafts, and local data

**Nice-to-Have Capabilities:**

- Cloud sync or backup
- Account login
- More advanced habit insights
- Smarter spending pattern detection
- Deeper personalization of reminders
- Goal-based savings workflows
- Configurable review prompts
- Multi-device support
- Richer receipt parsing beyond the MVP correction loop

### Risk Mitigation Strategy

**Technical Risks:** Receipt parsing may be inaccurate, notifications may behave inconsistently across devices, and offline capture may complicate later sync. Mitigation: treat OCR as assistive, require correction flows, prioritize local notification reliability, and design the data model so later sync does not overwrite user corrections.

**Market Risks:** Students may see Pplant as just another expense tracker or task app. Mitigation: make the combined home overview and weekly/monthly reflection central, and validate whether users understand spending in relation to work hours, tasks, and habits without feeling judged.

**Resource Risks:** The MVP combines several feature areas, so implementation could spread too thin. Mitigation: keep each capability simple, preserve all user-specified MVP requirements, and reduce depth before reducing the core loop. If resources tighten, simplify analytics, personalization, and recurrence depth first; do not remove capture actions, receipt correction, work-income tracking, reminders, or the combined overview.

## Functional Requirements

### Setup & Preferences

- FR1: Users can use a single-user Pplant workspace for personal student-life planning.
- FR2: Users can configure currency, locale, monthly budget reset day, and hourly wage defaults.
- FR3: Users can create, edit, delete, and reorder categories and topics, including when existing records use them.
- FR4: Users can set total monthly budget rules, including over-budget handling and rollover/no-rollover behavior.
- FR5: Users can create and edit savings goals with target amount and optional target date.
- FR6: Users can view privacy-relevant settings for receipt image retention, notifications, analytics/AI parsing, and local data.

### Daily Loop & Quick Capture

- FR7: Users can view today's money, tasks, reminders, budget status, savings progress, and work-income context in one overview.
- FR8: Users can start expense capture, task creation, work-entry logging, and reminder setup from the daily overview in no more than two taps after the overview loads.
- FR9: Users can review end-of-day activity across spending, tasks, reminders, and work-income entries.
- FR10: Users can save drafts or recover unsaved expense, receipt, task, reminder, and work-entry forms.

### Money Tracking

- FR11: Users can manually create, edit, and delete expense records.
- FR12: Users can manually create, edit, and delete income records.
- FR13: Users can assign amount, date, category, topic, merchant/source, and notes to money records.
- FR14: Users can create, edit, pause, skip one occurrence, stop, and delete daily, weekly, or monthly recurring expenses and recurring income.
- FR15: Users can view spending and income by category, topic, merchant/source, and day/week/month.
- FR16: Users can view updated budget remaining and savings progress after money records are added, edited, or deleted.
- FR17: Users can search, filter, and sort money history by date, category, topic, merchant/source, and amount.

### Receipt Capture & Correction

- FR18: Users can capture a receipt photo for expense entry.
- FR19: Pplant can extract and propose merchant, date, total amount, line items, category, topic, and unknown/low-confidence fields from a receipt.
- FR20: Users can see receipt parsing states, including pending, failed, reviewed, and saved.
- FR21: Users can manually create an expense when receipt parsing is unavailable, failed, incomplete, or wrong.
- FR22: Users can correct merchant, date, total, category, topic, and line items before saving a receipt-based expense.
- FR23: Users can add, edit, delete, or ignore line items and save a total-only expense when line-item review is not useful.
- FR24: Pplant can warn about possible duplicate receipt or expense entries.
- FR25: Users can view and choose receipt image retention behavior and delete stored receipt images while keeping expense records.

### Work-Income Tracking

- FR26: Users can create, edit, and delete direct work-hour entries.
- FR27: Users can create, edit, and delete work shifts with start time, end time, break time, paid/unpaid status, and wage used for that entry.
- FR28: Users can view earned income calculated from work hours or shifts while historical wage snapshots are preserved for past entries.
- FR29: Users can override wage per work entry.
- FR30: Users can view work hours and earned income by day, week, and month.
- FR31: Users can see expense equivalents in work time based on the relevant wage context.
- FR32: Users can search, filter, and review work history.

### Tasks, Habits & Reminders

- FR33: Users can create, edit, delete, and review daily tasks.
- FR34: Users can assign To Do, Doing, or Done state and high or low priority to tasks.
- FR35: Users can create, edit, pause, skip one occurrence, stop, and delete daily, weekly, or monthly recurring tasks or habits and mark completion by day.
- FR36: Users can set deadlines for tasks.
- FR37: Users can create one-time and repeat reminders with daily, weekly, monthly, optional end-date, and skip-occurrence rules.
- FR38: Users can grant, deny, or change notification permission for reminders.
- FR39: Users can snooze, reschedule, pause, disable, or delete reminders.
- FR40: Pplant can show reminder delivery and task recovery states, including scheduled, sent, missed, disabled, complete, reschedule, and dismiss.
- FR41: Users can see missed tasks and reminders with neutral status language and recovery actions.

### Reflection & Insights

- FR42: Users can view weekly and monthly summaries for spending, income, work hours, budget, savings, completed tasks, missed tasks, and reminders.
- FR43: Users can view reflection-only relationships between money/time, work income/savings, tasks/reminders, receipts/spending, and reflections/weekly or monthly summaries using existing records without causal, predictive, optimization, or financial-advice claims.
- FR44: Users can answer, skip, and save weekly or monthly reflection prompts containing up to 3 non-shaming prompts that can be completed in 60 seconds or less without manual calculation.
- FR45: Users can view past reflections.
- FR46: Users can dismiss or mute neutral pattern insights.

### Data Control & Resilience

- FR47: Users can delete individual records, records by type, records by date range, receipt images, drafts, or all personal data.
- FR48: Users can use core capture capabilities for expenses, income, work entries, tasks, reminders, and receipt drafts when network-dependent services are unavailable.
- FR49: Users can view records that are pending network-dependent processing and retry, edit, or discard them.
- FR50: Users can keep manual corrections as the source of truth when derived summaries, receipt data, or future sync/backup behavior updates records.

## Non-Functional Requirements

### Performance

- NFR-PERF-01: Manual creation or update of an expense, income entry, task, reminder, or work entry should persist locally at P95 under 300ms on MVP-supported mid-range mobile devices, defined as devices within the supported OS version window with at least 4 GB RAM and non-low-power mode enabled. Verification: device performance benchmark.
- NFR-PERF-02: The daily overview should load from local data at P95 under 1 second using the standard MVP dataset. Verification: device performance benchmark.
- NFR-PERF-03: Budget remaining, savings progress, and work-time equivalents should recalculate at P95 under 500ms after relevant record changes using the standard MVP dataset. Verification: integration benchmark.
- NFR-PERF-04: Weekly and monthly summaries should load at P95 under 2 seconds using the standard MVP dataset. Verification: integration benchmark.
- NFR-PERF-05: Receipt parsing must run asynchronously and must not block navigation, manual entry, or draft saving while parsing is pending. Verification: device and integration tests.
- NFR-PERF-06: The standard MVP dataset for performance testing should include at least two academic years of personal records: 1,500 expenses, 150 receipt-based expenses, 250 income entries, 250 work shifts, 1,000 tasks, 300 reminders, 50 savings-goal events, and 100 reflections. Verification: benchmark fixture review.

### Reliability & Data Integrity

- NFR-REL-01: Draft data for expense, receipt, task, reminder, and work-entry forms must survive app backgrounding, interruption, camera cancellation, temporary network loss, and app restart. Verification: device interruption tests.
- NFR-REL-02: User-created records must not be lost during ordinary offline use, app close, app backgrounding, or app restart. Verification: device persistence tests.
- NFR-REL-03: User corrections must take precedence over parsed receipt data and derived calculations. Verification: integration tests.
- NFR-REL-04: Derived summaries must produce deterministic results from the same source dataset after add, edit, delete, restart, and migration events. Verification: unit and integration tests.
- NFR-REL-05: Calendar calculations must define and consistently apply local timezone, week-start rules, month transitions, leap days, and work shifts that cross midnight. Verification: date-boundary test suite.
- NFR-REL-06: Deleting a record must remove or update associated drafts, stored receipt images, OCR text, pending jobs, reminders, cached summaries, and derived references as appropriate. Verification: deletion lifecycle tests.
- NFR-REL-07: App updates and data model migrations must preserve historical records, user corrections, and derived summary consistency. Verification: migration tests.
- NFR-REL-08: Network-dependent processing must expose retry, edit, discard, and manual-entry recovery options when unavailable, timed out, or failed. Verification: offline and timeout tests.

### Privacy & Security

- NFR-SEC-01: Pplant must treat receipt photos, spending history, income records, work hours, tasks, reminders, and reflections as sensitive personal data. Verification: privacy review.
- NFR-SEC-02: Sensitive local data and stored receipt images must be protected at rest using OS-provided protected storage or equivalent app-level encryption; security review must find no raw sensitive records, receipt text, or receipt images persisted outside protected app storage. Verification: security review and device storage inspection.
- NFR-SEC-03: Receipt images must not be sent to third-party OCR or AI services without prior user-facing disclosure of affected data categories. Verification: consent flow review.
- NFR-SEC-04: Analytics, diagnostics, and crash logs must not include raw receipt images, receipt text, spending details, income values, reflections, or task contents. Verification: log redaction tests.
- NFR-SEC-05: Users must be able to delete sensitive local data through user-facing controls, and local deletion should complete without requiring network connectivity. Verification: privacy and device tests.
- NFR-SEC-06: The product must disclose receipt image retention behavior before or during receipt save. Verification: UX/privacy review.
- NFR-SEC-07: Pplant must avoid financial-advice positioning and frame insights as personal planning and reflection. Verification: content review.

### Accessibility & Usability

- NFR-A11Y-01: Core flows should meet WCAG 2.2 AA where applicable for mobile experiences. Verification: accessibility audit.
- NFR-A11Y-02: Core flows must support dynamic type or text scaling without truncating primary actions or hiding required fields. Verification: accessibility device tests.
- NFR-A11Y-03: Primary controls must have screen-reader labels, logical focus order, and touch targets of at least 44x44 px or platform equivalent. Verification: accessibility audit.
- NFR-A11Y-04: Task state, budget status, reminder state, and receipt parsing confidence must not rely on color alone. Verification: visual accessibility review.
- NFR-UX-01: Empty, loading, offline, failed, permission-denied, low-confidence, and low-progress states must provide a clear next action. Verification: UX review.
- NFR-UX-02: Copy for missed tasks, overspending, reminders, and habit feedback must use neutral, non-shaming language. Verification: content review.
- NFR-UX-03: Permission requests for camera, notifications, or photos must appear in relevant context and must provide manual alternatives when denied. Verification: permission flow tests.
- NFR-UX-04: Automatically generated values should indicate whether they are manual, parsed, estimated, or low-confidence where relevant. Verification: UX and integration tests.

### Mobile Platform & Integration

- NFR-MOB-01: Local reminders should be scheduled, updated, and canceled using platform-supported mechanisms and presented as best-effort within iOS/Android limits. Verification: device notification tests.
- NFR-MOB-02: If notification delivery is missed, disabled, or unavailable, Pplant must show an in-app recovery state when the user returns. Verification: device notification tests.
- NFR-MOB-03: Denied camera, photo, or notification permissions must not block manual expense, task, reminder, or work-entry capture. Verification: permission denial tests.
- NFR-MOB-04: Receipt image handling must keep total retained receipt images and abandoned receipt drafts under 500 MB for the standard MVP dataset after cleanup, with user-visible retention settings and automatic cleanup for abandoned receipt drafts older than 30 days. Verification: storage tests.
- NFR-MOB-05: OCR retry behavior must perform no more than 3 automatic retries per receipt parsing job within 24 hours, stop automatic retries after the final failure, and require user action to retry again. Verification: device/network tests.
- NFR-MOB-06: OCR/parsing results must be normalized before display or save into merchant, date, total amount, line items, category, topic, confidence/unknown states, duplicate indicators, errors, and timeout states. Verification: integration contract tests.
- NFR-MOB-07: The MVP must avoid hard dependency on bank, payment, investment, debt, or regulated-finance integrations. Verification: architecture review.

### Maintainability & Observability

- NFR-MAINT-01: Expense, income, work-income, task, reminder, summary, receipt, and OCR/parsing concerns must have documented ownership boundaries and automated tests for core behavior; summary calculation, recurrence generation, receipt parsing normalization, and reminder scheduling must be testable without mobile UI interaction. Verification: architecture review and test review.
- NFR-MAINT-02: Summary calculations should be testable independently from mobile UI flows. Verification: unit test review.
- NFR-OBS-01: Pplant must record non-sensitive diagnostic events for receipt parsing failures, reminder scheduling failures, migration failures, summary recalculation errors, and receipt retry exhaustion, with event names, timestamps, non-sensitive error categories, and app version. Verification: observability review and log redaction tests.
- NFR-OBS-02: Diagnostic and crash reporting must redact sensitive personal data before storage or transmission. Verification: log redaction tests.
