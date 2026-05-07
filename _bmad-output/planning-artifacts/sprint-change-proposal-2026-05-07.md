---
workflowType: correct-course
projectName: Pplant
created: 2026-05-07
status: approved-and-applied
mode: batch
triggerSource: "_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-07.md"
changeScope: moderate
recommendedApproach: direct-adjustment
approvedAt: "2026-05-07T22:46:42+08:00"
appliedAt: "2026-05-07T22:46:42+08:00"
appliedArtifacts:
  - "_bmad-output/planning-artifacts/epics.md"
---

# Sprint Change Proposal - Pplant

**Date:** 2026-05-07
**Author:** Codex using `bmad-correct-course`

## 1. Issue Summary

### Trigger

The implementation readiness assessment marked the project as **NEEDS WORK** because several story acceptance criteria create forward dependencies across epics.

This was discovered before Sprint Planning, during readiness review of:

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-07.md`

### Core Problem

The PRD, UX, Architecture, and Epics are broadly aligned, but some story acceptance criteria ask implementation agents to verify UI surfaces or receipt flows before the epic that owns those surfaces has been implemented.

Issue category: **Planning/story dependency correction**.

This is not a product strategy change, not a technical limitation, and not a scope reduction. It is a backlog sequencing and story-readiness correction.

### Evidence

The readiness report identified these major issues:

- **MQ-1:** Epic 4 references receipt capture/draft behavior before Epic 5 implements receipt capture and parsing.
- **MQ-2:** Earlier epics reference visible Today/Review updates before Epic 4 Today and Epic 6 Review surfaces exist.

Examples:

- Story 4.2 currently requires the Capture Launcher to expose a `receipt` action before Epic 5 implements receipt capture.
- Story 4.3 currently requires draft recovery across `receipt` forms before receipt drafts are implemented by Epic 5.
- Story 1.5, Story 2.1, Story 2.6, Story 3.1, and Story 3.5 reference visible Today or Review behavior before those surfaces are implemented.

## 2. Checklist Findings

| Checklist Item | Status | Finding |
| -------------- | ------ | ------- |
| 1.1 Triggering story | Done | No implementation story triggered the issue; readiness review found it before sprint execution. Primary affected stories: 4.2, 4.3, 4.5, 1.5, 2.1, 2.6, 3.1, 3.5. |
| 1.2 Core problem | Done | Acceptance criteria contain forward dependencies and future-surface references. |
| 1.3 Supporting evidence | Done | Evidence documented in readiness report MQ-1 and MQ-2. |
| 2.1 Current epic impact | Done | Epic 4 needs wording changes around receipt capture. |
| 2.2 Epic-level changes | Done | No new epic needed; existing stories should be adjusted. |
| 2.3 Remaining epics | Done | Epic 5 should own receipt launcher/draft integration. Epic 6 should own visible Review rendering. |
| 2.4 Future epic validity | Done | No planned epic becomes obsolete. |
| 2.5 Epic order | Done | Epic order can remain unchanged if receipt-specific Epic 4 criteria are moved to Epic 5. |
| 3.1 PRD conflicts | Done | No PRD change required. FR coverage remains intact. |
| 3.2 Architecture conflicts | Done | No architecture change required. Existing boundaries support the proposed sequencing. |
| 3.3 UX conflicts | Done | No UX change required. UX remains target behavior; epics simply stage implementation more cleanly. |
| 3.4 Other artifacts | Action-needed | `epics.md` should be updated. `workflow-status.yaml` may note this Correct Course proposal after approval. |
| 4.1 Direct adjustment | Viable | Low effort, low risk. Modify story wording and acceptance criteria only. |
| 4.2 Potential rollback | Not viable | No implementation has happened yet; rollback does not apply. |
| 4.3 PRD MVP review | Not viable | MVP remains achievable; scope does not need reduction. |
| 4.4 Recommended path | Done | Select Option 1: Direct Adjustment. |
| 5.1 Issue summary | Done | Included in this proposal. |
| 5.2 Epic/artifact impact | Done | Included below. |
| 5.3 Recommended path | Done | Direct Adjustment. |
| 5.4 MVP impact | Done | No MVP scope reduction. |
| 5.5 Agent handoff | Done | Product/backlog edit first; then Sprint Planning. |
| 6.1 Checklist review | Done | Applicable sections addressed. |
| 6.2 Proposal accuracy | Done | Proposal aligns with readiness findings. |
| 6.3 User approval | Action-needed | Awaiting user approval. |
| 6.4 sprint-status update | N/A | Sprint Planning has not started, so no sprint-status artifact exists yet. |
| 6.5 Handoff plan | Action-needed | Finalize after user approval. |

## 3. Impact Analysis

### Epic Impact

#### Epic 1: Personal Workspace, Preferences & Planning Setup

Impact: Minor wording adjustment.

Story 1.3 and Story 1.5 should avoid implying that work-entry UI, Today UI, or Review UI must exist during Epic 1.

#### Epic 2: Money, Budget, Savings & Work-Time Tracking

Impact: Minor wording adjustment.

Stories should verify persisted domain state, repository outputs, and summary inputs rather than visible Today/Review rendering.

#### Epic 3: Tasks, Habits, Recurrence & Reminder Control

Impact: Minor wording adjustment.

Stories should verify task/reminder state and summary inputs. Visible Today/Review rendering should stay in Epic 4 and Epic 6.

#### Epic 4: Unified Today Overview & Quick Capture Loop

Impact: Moderate story adjustment.

Epic 4 should build Today and the common capture launcher for flows already implemented by Epics 1-3: expense, income, task, work entry, and reminder. Receipt capture should not be required as a working launcher flow until Epic 5.

#### Epic 5: Receipt Capture, Parsing & Trust-Preserving Correction

Impact: Minor addition.

Story 5.1 should explicitly integrate receipt capture into the existing Capture Launcher once receipt capture is implemented.

#### Epic 6: Weekly/Monthly Reflection & Neutral Insights

Impact: None.

Epic 6 remains the correct owner for visible weekly/monthly Review rendering.

#### Epic 7: Privacy, Offline Resilience & Data Control

Impact: Minor wording adjustment.

Story 7.5 can be reframed around student privacy and reliability while preserving its technical acceptance criteria.

### Story Impact

Stories requiring updates:

- Story 1.3
- Story 1.5
- Story 2.1
- Story 2.6
- Story 3.1
- Story 3.5
- Story 4.2
- Story 4.3
- Story 4.5
- Story 5.1
- Story 7.5

### Artifact Conflicts

No PRD, Architecture, or UX conflicts were found.

Artifact needing direct update after approval:

- `_bmad-output/planning-artifacts/epics.md`

Optional metadata update after approval:

- `_bmad-output/workflow-status.yaml`

### Technical Impact

No code exists yet, so there is no code migration, rollback, or infrastructure impact.

The proposed changes reduce implementation risk by clarifying:

- Which story owns visible UI integration.
- Which story owns domain-state readiness.
- Which epic owns receipt-specific capture and draft behavior.

## 4. Recommended Approach

### Selected Approach: Direct Adjustment

Modify the affected story text and acceptance criteria in the existing epics document.

### Rationale

Direct adjustment is the best path because:

- The product scope is correct.
- FR coverage is already complete.
- Architecture and UX already support the intended behavior.
- No implementation has started, so story text can be corrected cheaply.
- Reordering entire epics is unnecessary if receipt-specific criteria move from Epic 4 to Epic 5.

### Effort Estimate

Low.

The work is a planning artifact edit only.

### Risk Assessment

Low.

The changes preserve scope and improve implementation sequencing. The main risk is accidentally removing FR coverage, so the update should preserve references to receipt capture in Epic 5 and Today/Review rendering in Epic 4 and Epic 6.

### Timeline Impact

Minimal.

This should be completed before Sprint Planning.

## 5. Detailed Change Proposals

### Story Change 1: Story 1.3 - Remove Future Work-Flow Wording

**Story:** 1.3 Configure Locale, Currency, Budget Reset, And Wage Defaults

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** I have saved preferences
**When** I create money or work entries
**Then** the saved currency, locale, and default wage are applied by default
**And** entry-level wage override remains possible in later work flows.
```

**NEW:**

```markdown
**Given** I have saved preferences
**When** money or work-entry data uses defaults
**Then** the saved currency, locale, and default wage are available through the local preferences model
**And** the data model preserves support for entry-level wage overrides without requiring work-entry UI in this story.
```

**Rationale:** Preserves future capability without requiring Epic 2 work-entry UI during Epic 1.

### Story Change 2: Story 1.5 - Move Today/Review Rendering Out Of Epic 1

**Story:** 1.5 Set Monthly Budget Rules And Savings Goals

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** I open savings goals
**When** I create or edit a goal with target amount and optional target date
**Then** the goal is saved locally
**And** it can be reflected in Today and review summaries.
```

**NEW:**

```markdown
**Given** I open savings goals
**When** I create or edit a goal with target amount and optional target date
**Then** the goal is saved locally
**And** it is available to budget, savings, and summary inputs for later Today and Review surfaces.
```

**Rationale:** Epic 1 should provide persisted state and summary inputs. Epic 4 and Epic 6 should verify visible Today/Review rendering.

### Story Change 3: Story 2.1 - Reword Updated Context Dependency

**Story:** 2.1 Create Manual Expense And Income Records

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** I save a valid record
**When** the save completes
**Then** Pplant returns me to updated context
**And** the record is available to budget, savings, history, and summary calculations.
```

**NEW:**

```markdown
**Given** I save a valid record
**When** the save completes
**Then** the record is persisted locally and the money feature exposes the saved result
**And** the record is available to budget, savings, history, and summary inputs for later Today and Review surfaces.
```

**Rationale:** Avoids requiring Epic 4 Today UI or Epic 6 Review UI during Epic 2.

### Story Change 4: Story 2.6 - Move Review UI Dependency To Summary Inputs

**Story:** 2.6 Review Work History And Earned Income

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** work entries are edited or deleted
**When** summaries recalculate
**Then** earned income, hours, and dependent review data update deterministically.
```

**NEW:**

```markdown
**Given** work entries are edited or deleted
**When** work totals and summary inputs recalculate
**Then** earned income, hours, and derived work summary inputs update deterministically.
```

**Rationale:** Keeps Epic 2 focused on work history and deterministic data, not visible Review surfaces.

### Story Change 5: Story 3.1 - Move Today/Review Rendering Out Of Task CRUD

**Story:** 3.1 Create And Manage Daily Tasks

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** a task exists
**When** I edit, delete, or change state
**Then** the update persists locally
**And** Today and review summaries update.
```

**NEW:**

```markdown
**Given** a task exists
**When** I edit, delete, or change state
**Then** the update persists locally
**And** task summary inputs and derived task state update for later Today and Review surfaces.
```

**Rationale:** Removes forward dependency on Epic 4 and Epic 6 UI.

### Story Change 6: Story 3.5 - Reword Recovery Summary Dependency

**Story:** 3.5 Recover From Missed Tasks And Reminders

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** recovery state is displayed
**When** I choose a recovery action
**Then** task/reminder state updates locally
**And** Today and review summaries reflect the outcome.
```

**NEW:**

```markdown
**Given** recovery state is displayed
**When** I choose a recovery action
**Then** task/reminder state updates locally
**And** recovery outcome data is available to later Today and Review surfaces.
```

**Rationale:** Keeps Epic 3 completable before Today and Review surfaces are implemented.

### Story Change 7: Story 4.2 - Remove Working Receipt Launcher Requirement From Epic 4

**Story:** 4.2 Launch Quick Capture Within Two Taps

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** Today has loaded
**When** I open the capture launcher
**Then** expense, receipt, task, work entry, income, and reminder capture actions are available
**And** each supported capture flow starts within no more than two taps after overview load.
```

**NEW:**

```markdown
**Given** Today has loaded
**When** I open the capture launcher
**Then** expense, task, work entry, income, and reminder capture actions are available
**And** each supported capture flow starts within no more than two taps after overview load.

**Given** receipt capture has not yet been implemented
**When** the capture launcher renders during Epic 4
**Then** receipt capture is either absent or clearly unavailable
**And** no broken receipt flow is exposed to users.
```

**Rationale:** Prevents Epic 4 from requiring Epic 5 functionality.

### Story Change 8: Story 4.3 - Remove Receipt Draft Requirement From Epic 4

**Story:** 4.3 Save And Recover Drafts Across Capture Forms

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** I begin an expense, receipt, task, reminder, or work-entry form
**When** the app backgrounds, closes, loses network, or camera is canceled
**Then** the draft is persisted locally
**And** I can recover it when returning.
```

**NEW:**

```markdown
**Given** I begin an expense, task, reminder, income, or work-entry form
**When** the app backgrounds, closes, loses network, or the form is interrupted
**Then** the draft is persisted locally
**And** I can recover it when returning.
```

**Rationale:** Receipt-specific draft behavior remains in Epic 5, where receipt photos and parse jobs are introduced.

### Story Change 9: Story 4.5 - Scope Low-Confidence Today State To Implemented Features

**Story:** 4.5 Implement Today UX States And Accessibility

**Section:** Acceptance Criteria

**OLD:**

```markdown
**Given** Today is empty, loading, offline, failed, stale, low-confidence, or showing missed items
**When** the state appears
**Then** it provides a clear next action
**And** state is not communicated by color alone.
```

**NEW:**

```markdown
**Given** Today is empty, loading, offline, failed, stale, estimated, or showing missed items from implemented features
**When** the state appears
**Then** it provides a clear next action
**And** state is not communicated by color alone.
```

**Rationale:** Keeps Epic 4 from depending on receipt-specific low-confidence parsing states.

### Story Change 10: Story 5.1 - Add Receipt Launcher Integration

**Story:** 5.1 Capture Receipt Photo And Save Draft

**Section:** Acceptance Criteria

**ADD:**

```markdown
**Given** the Capture Launcher exists
**When** receipt capture is implemented
**Then** receipt capture is available from the launcher within the two-tap capture pattern
**And** denied camera permission still leaves manual expense entry available.
```

**Rationale:** Preserves the intended UX requirement that receipt capture is accessible from the capture launcher, but places implementation ownership in the receipt epic.

### Story Change 11: Story 7.5 - Reframe Developer-Centric Story Around Student Privacy

**Story:** 7.5 Add Redacted Diagnostics And Standard Test Fixtures

**Section:** Story statement

**OLD:**

```markdown
As a developer supporting Pplant,
I want redacted diagnostics and standard fixtures,
So that reliability can be tested without exposing sensitive student data.
```

**NEW:**

```markdown
As a student,
I want Pplant's diagnostics and reliability checks to protect sensitive data,
So that the app can be tested and improved without exposing my personal information.
```

**Rationale:** Keeps the technical NFR coverage while making the story value user-centered.

## 6. PRD, Architecture, and UX Changes

### PRD

No PRD changes recommended.

The MVP scope remains unchanged and all 50 FRs remain covered.

### Architecture

No architecture changes recommended.

The architecture already supports the corrected sequencing through:

- Feature ownership boundaries.
- Repositories and domain summary inputs.
- Capture Launcher component ownership.
- ReceiptParsingPort and receipt-specific services.
- Today and Review surfaces as separate feature areas.

### UX Design

No UX design changes recommended.

The UX remains the target behavior. The epics should stage implementation in a way that reaches the UX without creating forward dependencies.

## 7. Implementation Handoff

### Scope Classification

**Moderate**

Reason: The change affects backlog/story organization but not PRD scope, architecture decisions, UX design, or code.

### Handoff Recipients

- Product Owner / planning maintainer: approve and apply edits to `epics.md`.
- Developer agent: use updated `epics.md` during Sprint Planning and story execution.

### Success Criteria

The correction is successful when:

- Epic 4 no longer requires working receipt capture before Epic 5.
- Epic 5 explicitly owns receipt launcher integration and receipt draft behavior.
- Epics 1-3 verify persisted state and summary inputs instead of visible Today/Review surfaces.
- Story 7.5 is user-value framed while retaining diagnostic and fixture acceptance criteria.
- FR coverage remains 50/50 after edits.
- A follow-up readiness check can mark the project READY or identify only non-blocking issues.

## 8. Recommended Next Steps

1. Approve this Sprint Change Proposal.
2. Apply the proposed edits to `_bmad-output/planning-artifacts/epics.md`.
3. Re-run `[IR] Check Implementation Readiness`.
4. If readiness passes, run `[SP] Sprint Planning`.

## 9. Approval And Handoff Log

### User Approval

Approved by user with response: `y`

### Applied Changes

The approved story edits were applied to:

- `_bmad-output/planning-artifacts/epics.md`

### Handoff

Change scope: **Moderate**

Routed to:

- Product/backlog owner: Use the updated epics document as the source for Sprint Planning.
- Developer agent: Begin implementation only after follow-up readiness check confirms the plan is clean.

### Completion Summary

Correct Course addressed the readiness dependency issues by applying direct adjustments to the epics/stories plan. No PRD, Architecture, or UX document changes were required.
