# Codex Review Checklist

Codex must review each BMAD story before the project can continue to the next story.

## 1. Story Readiness

- [ ] Story acceptance criteria are fully satisfied.
- [ ] Implementation matches the PRD.
- [ ] Implementation matches the architecture document.
- [ ] No future story was implemented unnecessarily.
- [ ] No unrelated files were modified.
- [ ] Story notes and sprint status are accurate.

## 2. Code Quality

- [ ] Code follows the existing project structure.
- [ ] Naming is consistent.
- [ ] No duplicated business logic.
- [ ] Components, services, hooks, and utilities are reused where possible.
- [ ] Error handling is present.
- [ ] Loading, empty, success, and error states are handled where applicable.
- [ ] The implementation is easy to review and does not include unrelated refactors.

## 3. API and Database

- [ ] API contracts are not broken.
- [ ] Database changes are safe.
- [ ] No destructive migration was added without approval.
- [ ] Input validation is implemented.
- [ ] Authorization checks are not bypassed.
- [ ] Existing seed, migration, and config data are not damaged.

## 4. Testing

- [ ] Type check passes.
- [ ] Lint passes.
- [ ] Tests pass.
- [ ] Build passes if a build script exists.
- [ ] Important edge cases are covered.
- [ ] Manual verification notes are clear if automated tests are unavailable.

## 5. Security

- [ ] No secrets are committed.
- [ ] No unsafe direct object access.
- [ ] No broken authentication or authorization behavior.
- [ ] User input is validated.
- [ ] File upload, receipt, map, location, and local storage logic are safe if relevant.

## 6. Review Prompt

Use this review shape for each story:

```text
Review the current story implementation as an independent BMAD readiness checker.

Read:
- The current story file
- PRD
- Architecture documents
- CLAUDE.md
- BMAD_AUTOMATION_RULES.md
- CODEX_REVIEW_CHECKLIST.md
- git diff against main

Check:
1. Acceptance criteria completion
2. PRD and architecture alignment
3. Code quality
4. API/database safety
5. Authentication/authorization safety
6. Input validation
7. Error handling
8. Test coverage
9. Build/lint/typecheck/test readiness

Return one verdict:
- APPROVED
- APPROVED_WITH_MINOR_NOTES
- CHANGES_REQUESTED
- BLOCKED

Also explain whether BMAD can continue to the next story.
```

## 7. Final Verdict

Codex must choose one:

- APPROVED
- APPROVED_WITH_MINOR_NOTES
- CHANGES_REQUESTED
- BLOCKED
