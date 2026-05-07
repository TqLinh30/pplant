# BMAD Automation Rules

## Goal

Build Pplant from the current BMAD story to the end of the project using a controlled story-by-story workflow.

## Roles

- BMAD / Claude Code: implementation agent
- Codex: independent reviewer and readiness checker
- Git branch / Pull Request: checkpoint boundary

## Branching Rules

- Do not work directly on `main`.
- Use one branch per story, for example:
  - `story/1.2`
  - `story/1.3`
  - `story/2.1`
- Merge a story branch only after Codex approves it.

## Workflow

For each story:

1. Create or switch to a story branch.
2. BMAD/Claude implements the story.
3. BMAD/Claude runs typecheck, lint, tests, and build if available.
4. BMAD/Claude commits the result.
5. Codex reviews the diff and story readiness.
6. If Codex returns `APPROVED` or `APPROVED_WITH_MINOR_NOTES`, continue to merge and start the next story.
7. If Codex returns `CHANGES_REQUESTED` or `BLOCKED`, BMAD/Claude fixes the current story.
8. Codex re-reviews.
9. Only after Codex approval can the story be merged and the next story started.

## Do Not Continue If

- Type check fails.
- Lint fails.
- Tests fail because of the current story.
- Build fails if the project has a build script.
- Acceptance criteria are not complete.
- Codex returns `CHANGES_REQUESTED`.
- Codex returns `BLOCKED`.
- There is an unresolved architecture, database, or security issue.

## Controlled Loop Prompt

Use this prompt for Claude/BMAD after a story has been approved:

```text
Continue the BMAD implementation workflow from the next pending story.

You must follow:
- CLAUDE.md
- BMAD_AUTOMATION_RULES.md
- sprint-status.yaml
- PRD
- architecture documents
- current story file

Autonomous loop:
1. Identify the next pending story.
2. Create or confirm the story branch.
3. Implement only that story.
4. Run typecheck, lint, tests, and build if available.
5. Commit the story.
6. Produce the BMAD Story Completion Report.
7. Stop and wait for Codex review.

Important:
Do not continue to the next story until Codex returns APPROVED or APPROVED_WITH_MINOR_NOTES.
If Codex returns CHANGES_REQUESTED or BLOCKED, fix the current story first and request re-review.
```
