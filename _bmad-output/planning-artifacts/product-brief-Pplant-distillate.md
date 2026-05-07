---
title: "Product Brief Distillate: Pplant"
type: llm-distillate
source: "product-brief-Pplant.md"
created: "2026-05-07T15:05:30.8465350+08:00"
purpose: "Token-efficient context for downstream PRD creation"
---

# Product Brief Distillate: Pplant

## Product Intent

- Pplant is a student-focused personal planner that combines expense tracking, work-income awareness, daily task planning, reminders, and habit reflection.
- The core product promise is to help students understand money and time together: what they earn, how many hours they worked, where money goes, how free time affects spending, and whether daily plans are being followed.
- The desired product personality is a gentle assistant, not a strict or shame-based finance coach.

## Target Users

- Primary user: students who want to control personal spending, manage daily work/study tasks, and build better discipline.
- Likely early users: students with allowance, part-time income, or both, especially those who feel they overspend, forget tasks, or lose track of time.
- User pain points: not knowing where money goes, overspending before noticing patterns, forgetting or delaying work, and lacking a single view of money plus productivity.

## Core Insight

- Spending and time are connected student behaviors; students may spend more when they have free time, feel stressed, procrastinate, or do not have a clear daily plan.
- A powerful "aha moment" is when a student sees money translated into time: hourly wage, hours worked, spending by category, remaining budget, and savings progress in one view.
- The home screen should prioritize a combined overview of money, tasks, reminders, budget status, and savings rather than separating finance and productivity into disconnected tabs.

## MVP Scope

- Include income and expense recording.
- Include manual transaction entry.
- Include receipt photo capture with automatic receipt parsing in the MVP.
- Include spending categories and topics.
- Include monthly budget tracking.
- Include spending statistics by category, topic, day, week, and month.
- Include remaining budget summary.
- Include savings summary.
- Include work-income tracking through direct entry of hours worked and hourly wage.
- Include shift-based work entry where a student can enter work time and apply a configured hourly wage.
- Include daily task planner.
- Include task states: To Do, Doing, Done.
- Include task priority: high and low.
- Include deadlines.
- Include repeat reminders.
- Include combined home overview for money, tasks, reminders, budget status, and savings progress.

## Explicitly Out Of Scope For MVP

- No bank account linking in the first version.
- No investment tracking in the first version.
- No debt management in the first version.
- No full family or group budgeting in the first version.
- No complex financial forecasting in the first version.

## Requirements Hints

- Receipt parsing should extract enough fields to speed up expense entry, but PRD should define exact fields such as merchant, total amount, date, line items, and category suggestion.
- Manual correction must be available after receipt parsing because OCR/receipt recognition may be imperfect.
- Work-income features should support both quick entry and structured shift entry.
- Task reminders should support deadlines and repeat reminders.
- Statistics should distinguish category and topic if both concepts remain in the product model.
- The app should make weekly and monthly review easy because success depends on repeated habit formation.

## Success Signals

- Expenses recorded per active user per week.
- Planned tasks completed per active user per week.
- Percentage of users who set a monthly budget.
- Percentage of users who review weekly or monthly summaries.
- Number of users who record work hours and hourly income.
- User-reported clarity: the student understands where money and time went during the week.
- User-reported behavior change: the student spends less impulsively or plans the day better.

## Open Questions For PRD

- Which platforms are required first: mobile app, web app, or both?
- Does receipt parsing need to support Vietnamese receipts, English receipts, or both?
- Which currency and locale should the first version default to?
- What is the exact difference between "category" and "topic" in spending classification?
- Should reminders be local device notifications only in MVP, or should server-side scheduling be required?
- Is account/login required in MVP, or can the first version work locally?
- Should data sync or backup be included early if the app is intended for long-term personal use?

## Competitive Context

- Established expense trackers such as Money Lover already cover common finance features like expense tracking, budgets, reports, and bill reminders; Pplant should not compete only as another category-and-budget tracker.
- Mint's shutdown in 2024 shows personal finance users may need alternatives, but Pplant's strongest positioning is narrower and clearer: student life, not broad household finance.
- The differentiator to preserve is the combination of planner, student work-income tracking, spending behavior, and gentle reminders.
