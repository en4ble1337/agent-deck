# AGENTS.md - System Kernel

## Project Context

**Name:** RunDeck Agent Mission Control MVP
**Purpose:** RunDeck is a local-first desktop control surface for managing multiple CLI-based AI agent sessions across workspaces, repositories, tasks, git worktrees, terminal panes, logs, and review states.
**Stack:** Tauri 2.x, Rust Stable, pinned in `rust-toolchain.toml`, Node.js Active LTS, pinned in `.nvmrc` or Volta, React 18+, TypeScript 5.x, Vite 5+, xterm.js 5.x, SQLite 3.44+, serde_yaml 0.9+, Zod plus Rust validation Zod 3+, Vitest, React Testing Library, Rust tests Current stable, Playwright or dev-browser skill Current stable

## Core Domain Entities

- Workspace
- AppSetting
- Repo
- AgentProfile
- Task
- AcceptanceCriterion
- Session
- ChangedFile
- Warning
- ReviewRecord
- ValidationRun
- RiskyCommandPattern

---

## 1. The Prime Directive

You are an agent operating on the RunDeck Agent Mission Control MVP codebase.

**Before writing ANY code:**
1. Read `docs/PRD.md` to understand WHAT we are building.
2. Read `docs/ARCH.md` to understand HOW we structure it.
3. Consult `docs/RESEARCH.md` for proven patterns to follow.
4. Check `directives/` for your current assignment.

**Core Rules:**
- Use ONLY the technologies defined in ARCH.md Tech Stack.
- Use ONLY the terms defined in ARCH.md Dictionary.
- Follow ONLY the API contracts defined in ARCH.md.
- Place code ONLY in the directories specified in ARCH.md.
- Preserve the local-first, operator-reviewed workflow. Do not add cloud sync, multi-user auth, browser automation, or auto-merge in v1.

---

## 2. The 3-Layer Workflow

### Layer 1: Directives (Orders)
- Location: `directives/`
- Purpose: Task assignments with specific acceptance criteria.
- Action: Read the lowest-numbered incomplete directive.

### Layer 2: Orchestration (Planning)
- Location: `docs/plans/`
- Purpose: Granular implementation plans for each directive.
- Action: Before coding, break the directive into tasks following `docs/methodology/implementation-planning.md`.

### Layer 3: Execution (Automation)
- Location: `execution/`
- Purpose: Reusable scripts for repetitive tasks.
- Examples: `verify_setup.py`, `run_migrations.py`, `seed_data.py`, `run_tests.py`.

---

## 3. The TDD Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

### The Mandatory Cycle

For every piece of functionality:

1. **RED:** Write a test in `tests/` or `src-tauri/tests/` that describes the expected behavior. Run it. Confirm it **fails** and fails for the right reason.
2. **GREEN:** Write the **minimum** code in `src/` or `src-tauri/src/` to make the test pass. Run all relevant tests. Confirm they pass.
3. **REFACTOR:** Clean up the code while keeping tests green. Run all tests again. Confirm they still pass.
4. **COMMIT:** Only after all tests pass.

### The Nuclear Rule

If you write production code before writing its test:
- **Delete it.** Not "keep as reference." Not "adapt it while writing tests." Delete means delete.
- Write the test first.
- Implement fresh, guided by the failing test.

### Test File Locations

Mirror the source structure where practical:
- `src/features/tasks/TaskCard.tsx` -> `tests/features/tasks/TaskCard.test.tsx`
- `src/lib/tauriClient.ts` -> `tests/lib/tauriClient.test.ts`
- `src-tauri/src/services/task_service.rs` -> `src-tauri/tests/task_service_test.rs`
- `src-tauri/src/adapters/git.rs` -> `src-tauri/tests/git_adapter_test.rs`

### TDD Rationalizations Table

If you catch yourself thinking any of these, **STOP**:

| Excuse | Reality |
|--------|---------|
| "This is too simple to test" | Simple code breaks. The test takes 30 seconds to write. |
| "I'll write tests after" | Tests that pass immediately prove nothing. They describe what the code does, not what it should do. |
| "I already tested it manually" | Manual testing has no record and cannot be re-run. |
| "Deleting my work is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt with interest. |
| "I'll keep it as reference and write tests first" | You'll adapt it. That's tests-after with extra steps. Delete means delete. |
| "I need to explore first" | Explore freely. Then throw away the exploration and start with TDD. |
| "The test is hard to write; the design isn't clear yet" | Listen to the test. Hard to test means hard to use. Redesign. |
| "TDD will slow me down" | TDD is faster than debugging. Every shortcut becomes a debugging session. |
| "TDD is dogmatic; I'm being pragmatic" | TDD is pragmatic. "Pragmatic" shortcuts become production debugging. |
| "This is different because..." | It's not. Delete the code. Start with the test. |

### Red Flags - Stop and Start Over

- You wrote code before its test.
- A new test passes immediately.
- You cannot explain why a test failed.
- You are rationalizing "just this once."

---

## 4. Implementation Planning

**Before coding any directive, create an implementation plan.**

See `docs/methodology/implementation-planning.md` for the full template.

**The rule:** Write every plan as if the implementer is an enthusiastic junior engineer with no project context and an aversion to testing. This forces you to be completely explicit:

- **Exact file paths** - not "the config file" but `src-tauri/src/adapters/git.rs`.
- **Complete code** - not "add validation" but the actual validation code.
- **Exact commands** - not "run the tests" but `npm test -- tests/features/tasks/TaskCard.test.tsx`.
- **Expected output** - what success and failure look like.

**Granularity:** Each task should take 2-5 minutes. Each step within a task is exactly ONE action.

Plans are saved to `docs/plans/YYYY-MM-DD-<feature-name>.md`.

---

## 5. Review Gates

**Every completed task goes through two review stages before moving on.**

See `docs/methodology/review-gates.md` for checklists.

### Gate 1: Spec Compliance Review

After completing a task, review against the directive's acceptance criteria:
- Does the code implement exactly what was specified?
- Is anything **missing** from the spec?
- Is anything **extra** that was not requested? Remove it.
- **Do not trust self-reports.** Read the actual code. Run the actual tests.

### Gate 2: Code Quality Review

Only after spec compliance passes:
- Architecture: Does it follow ARCH.md patterns?
- Testing: Are tests meaningful and not just asserting mock behavior?
- DRY: Is there duplication that should be consolidated?
- Error handling: Are failure modes covered?
- Security: Does it preserve log redaction, runtime isolation, and filesystem safety?

Issues are categorized:
- **Critical** - Must fix before proceeding. Blocks progress.
- **Important** - Should fix. Creates tech debt if skipped.
- **Minor** - Nice to have. Fix if time allows.

### Batch Checkpoints

After every 3 completed tasks, pause and produce a progress report:
- What's been completed.
- What's next.
- Any concerns or architectural questions.
- Request human feedback before continuing.

---

## 6. Verification Before Completion

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

Before marking any task, directive, or feature as "done":
1. **Run the verification command**: test suite, linter, type checker, Rust tests, or browser verification.
2. **Read the actual output**: not from memory, not assumed.
3. **Include the evidence** in your completion report.

### Verification Red Flags - Stop Immediately

If you catch yourself using these words before running verification:
- "Should work now"
- "That should fix it"
- "Seems correct"
- "I'm confident this works"
- "Great! Done!"

These are emotional signals, not evidence. **Run the command. Read the output. Then speak.**

### Verification Rationalizations Table

| Excuse | Reality |
|--------|---------|
| "It should work now" | Run the verification. |
| "I'm confident in this change" | Confidence is not evidence. |
| "The linter passed" | Linter passing is not the same as tests passing or correct behavior. |
| "I checked it mentally" | Mental checks miss edge cases. Run the actual command. |
| "Just this once we can skip verification" | No exceptions. |
| "Partial verification is enough" | Partial evidence proves nothing about what you did not check. |

---

## 7. Systematic Debugging

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

When something breaks, follow the 4-phase process. See `docs/methodology/debugging-guide.md` for details.

### Phase 1: Root Cause Investigation
- Read the error carefully. Reproduce it consistently.
- Check what recently changed.
- Trace the data flow backward from the symptom to the source.

### Phase 2: Pattern Analysis
- Find working examples of similar code in the codebase.
- Compare the broken code against working references.
- Identify all differences.

### Phase 3: Hypothesis and Testing
- Form ONE hypothesis: "I think X happens because Y."
- Test with the smallest possible change.
- If wrong, form a NEW hypothesis. Do not stack fixes.

### Phase 4: Implementation
- Write a failing test that reproduces the bug.
- Fix with a single, targeted change.
- Verify all tests pass, existing and new.

### The 3-Strikes Rule

If 3 consecutive fix attempts fail: **STOP.**
- Question whether the approach or architecture is fundamentally sound.
- Discuss with the team before attempting more fixes.
- Consider whether you're fixing a symptom instead of the cause.

---

## 8. Anti-Rationalization Rules

AI agents, including you, will try to bypass the processes above. This section preemptively blocks the most common escape routes.

**The principle: The ritual IS the spirit.** Violating the letter of these rules is violating the spirit. There are no clever workarounds.

### Universal Red Flags

If any of these thoughts arise, treat them as a signal to **slow down**, not speed up:

- "I need more context before I can start" - You have PRD, ARCH, RESEARCH, and the directive. Start with the test.
- "Let me explore the codebase first" - Read the plan. If there's no plan, write one. Do not explore aimlessly.
- "I'll clean this up later" - Clean it up now or do not touch it.
- "This does not apply to this situation" - It does. Follow the process.
- "I already know the answer" - Prove it. Write the test. Run the verification.
- "I'll be more careful next time" - Be careful this time. Follow the process this time.

---

## 9. Definition of Done

A task is complete when:
- [ ] Implementation plan was written before coding.
- [ ] Code exists in the appropriate `src/` or `src-tauri/src/` subdirectory.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] Tests were written BEFORE implementation.
- [ ] All tests pass after a fresh run.
- [ ] Type checking passes with `npm run lint`.
- [ ] Rust tests pass when backend code changed.
- [ ] Browser verification passes for UI stories using Playwright or dev-browser skill.
- [ ] Spec compliance review passed.
- [ ] Code quality review passed with no Critical or Important issues.
- [ ] Related PRD User Story acceptance criteria are met.
- [ ] Directive file is marked as Complete.

---

## 10. File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React components | PascalCase | `TaskCard.tsx` |
| TypeScript utilities | camelCase | `tauriClient.ts` |
| TypeScript tests | `.test.ts` or `.test.tsx` suffix | `TaskCard.test.tsx` |
| Rust modules | snake_case | `task_service.rs` |
| Rust tests | descriptive snake_case | `task_service_test.rs` |
| Directives | `NNN_description.md` | `001_initial_setup.md` |
| Implementation plans | `YYYY-MM-DD-feature.md` | `2026-04-28-session-backend.md` |
| Tauri commands | snake_case verbs | `launch_task_session` |

---

## 11. Commit Message Format

```text
type(scope): description

[optional body]

Refs: directive-NNN
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

Example:

```text
feat(sessions): add PTY session backend interface

Adds the initial SessionBackend trait and tests for launch failure mapping.
Refs: directive-002
```
