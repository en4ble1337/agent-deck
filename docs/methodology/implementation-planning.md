# Implementation Planning Guide

## Purpose

Before coding any directive, break it into a detailed implementation plan. This prevents context drift and ensures each step is small enough to verify independently.

## Plan Template

Save plans to `docs/plans/YYYY-MM-DD-<feature-name>.md`.

```markdown
# [Feature Name] Implementation Plan

**Directive:** [NNN]
**Date:** [YYYY-MM-DD]
**Goal:** [One sentence - what this achieves]
**Architecture Notes:** [2-3 sentences - key patterns from ARCH.md that apply]

---

### Task 1: [Component Name]

**Files:**
- Create: `src/features/tasks/TaskCard.tsx`
- Create: `tests/features/tasks/TaskCard.test.tsx`

**Step 1:** Write failing test
- File: `tests/features/tasks/TaskCard.test.tsx`
- Code: [complete test code]
- Run: `npm test -- tests/features/tasks/TaskCard.test.tsx`
- Expected: 1 failed test for the expected missing behavior

**Step 2:** Implement minimum code
- File: `src/features/tasks/TaskCard.tsx`
- Code: [complete implementation code]
- Run: `npm test -- tests/features/tasks/TaskCard.test.tsx`
- Expected: 1 passed test

**Step 3:** Refactor if needed
- [Describe what to clean up]
- Run: `npm test`
- Expected: All tests passed

**Step 4:** Commit
- `git add src/features/tasks/TaskCard.tsx tests/features/tasks/TaskCard.test.tsx`
- `git commit -m "feat(tasks): add task card component"`
```

## Task Decomposition Rules

1. **2-5 minutes per task.** If a task takes longer, break it down further.
2. **One action per step.** "Write the test" is one step. "Run the test" is a separate step.
3. **Exact file paths.** Never say "the config file"; say `src-tauri/src/db/connection.rs`.
4. **Complete code.** Never say "add validation"; write the actual validation code.
5. **Exact commands with expected output.** Never say "run tests"; say `npm test -- tests/features/tasks/TaskCard.test.tsx` and describe what success looks like.
6. **Write for someone with no context.** Assume the implementer cannot infer anything.

## Plan Execution

Execute tasks sequentially. After each task:
1. Run the spec compliance review.
2. Run the code quality review.
3. Move to the next task only when both reviews pass.

After every 3 tasks, produce a checkpoint report.
