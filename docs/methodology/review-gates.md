# Review Gates Guide

## Purpose

Every completed task passes through two review stages before moving on. This catches issues early, before they compound across multiple tasks.

## Gate 1: Spec Compliance Review

**Goal:** Does the code do what the directive asked?

### Checklist

- [ ] Read the directive's acceptance criteria line by line.
- [ ] For each criterion, read the actual code that implements it.
- [ ] For each criterion, run the verification command and confirm it passes.
- [ ] Check for missing requirements - things the directive asked for that were not implemented.
- [ ] Check for extra additions - things that were implemented but were not asked for.
- [ ] Check for misinterpretations - things that were implemented but do not match the spec's intent.

### Adversarial Posture

Assume the self-report is optimistic. Do NOT trust claims like:
- "All tests pass" - Run them yourself.
- "Implemented as specified" - Read the code and compare to the spec.
- "No issues found" - Look for issues anyway.

### Outcome

- **Pass:** Proceed to Gate 2.
- **Issues Found:** Fix issues, then re-review from the beginning.

## Gate 2: Code Quality Review

**Goal:** Is the code well-built?

Only run this AFTER Gate 1 passes.

### Checklist

- [ ] **Architecture:** Does it follow ARCH.md patterns and directory structure?
- [ ] **Domain Language:** Are ARCH.md Dictionary terms used correctly and consistently?
- [ ] **Testing:** Are tests testing real behavior, not just mock existence?
- [ ] **Error Handling:** Are failure modes covered with appropriate error codes from ARCH.md?
- [ ] **DRY:** Is there duplication that should be extracted?
- [ ] **Security:** Does it follow ARCH.md Security Considerations?

### Issue Categorization

| Category | Definition | Action |
|----------|------------|--------|
| **Critical** | Breaks functionality, security vulnerability, or violates ARCH.md contract | Must fix before proceeding |
| **Important** | Tech debt, poor patterns, insufficient tests | Should fix; creates compound problems if skipped |
| **Minor** | Style, naming, documentation | Fix if time allows |

### Outcome

- **Pass:** Task is complete. Move to next task.
- **Critical/Important issues:** Fix, then re-review from Gate 1.

## Batch Checkpoints

After every 3 completed tasks, pause and report:

```markdown
## Checkpoint Report

### Completed
- Task 1: [description] - Done
- Task 2: [description] - Done
- Task 3: [description] - Done

### Up Next
- Task 4: [description]
- Task 5: [description]

### Concerns
- [Any architectural questions, blockers, or scope issues]

### Request
[Ask for human feedback before continuing]
```
