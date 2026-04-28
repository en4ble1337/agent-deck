# Directive 010: Task Session Launch With Worktree Isolation

## Objective

Implement task-based launch so coding profiles create or reuse an isolated worktree, run inside that worktree, link the session to the task, and update task state predictably.

## Prerequisites

- [ ] Directive 009: Worktree Preflight and Warning Foundation Complete

## References

**PRD:**
- User Story: [US-011] Dirty Repo Block Before Worktree Creation; [US-012] Create Worktree for Coding-Agent Task; [US-013] Launch Agent From Task
- Functional Requirements: [FR-5], [FR-6], [FR-9], [FR-13], [FR-14], [FR-15], [FR-16], [FR-17], [FR-18], [FR-19], [FR-23], [FR-24], [FR-53]
- Feature Specification: [Section 6] Task Board and Task Detail; [Section 6] Worktree Workflow; [Section 11] Phase 3 Task Board and Worktree Launch

**ARCH.md:**
- Data Models: Uses `Task`, `Session`, `Repo`, `AgentProfile`, `Warning`
- API Contracts: `launch_task_session`
- Directory Structure: `src/features/tasks/`, `src/features/sessions/`, `src-tauri/src/services/task_service.rs`, `src-tauri/src/services/session_service.rs`, `src-tauri/src/services/worktree_service.rs`, `src-tauri/src/commands/tasks.rs`
- Error Codes: `TASK_NOT_FOUND`, `PROFILE_NOT_FOUND`, `TASK_LAUNCH_FIELDS_MISSING`, `TASK_ACTIVE_SESSION_EXISTS`, `DIRTY_REPO`, `WORKTREE_CREATE_FAILED`, `WSL_UNAVAILABLE`, `SESSION_LAUNCH_FAILED`

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events; Pattern 2: Explicit WSL Runtime Adapter; Pattern 3: Worktree Creation With Dirty Preflight
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep; Anti-pattern 3: Shell Interpolation for Git and Runtime Commands
- Libraries: `portable-pty`, local `git`, `wsl.exe`, `rusqlite`

## Scope

### In Scope
- Implement `launch_task_session`.
- Enforce coding-profile launch requirements: repo, valid coding profile, prompt, clean base repo, and no active task session.
- Create branch and worktree for coding profiles when no valid worktree exists.
- Persist task branch name, base branch, worktree path, worktree state, active session id, and status changes only after successful operations.
- Launch coding sessions inside the task worktree.
- Allow non-code task sessions to run in current repo path without worktree creation.
- Update task card and detail UI with active session state and runtime.
- Display dirty repo and launch failure errors without moving the task into a misleading state.

### Out of Scope
- Changed-file tracking after launch.
- Diff review, validation commands, and review outcomes.
- Automatic worktree cleanup.
- More than one active session per task.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] `launch_task_session` returns updated `task` and launched `session`.
- [ ] Coding-profile launch fails with `TASK_LAUNCH_FIELDS_MISSING` when repo, profile, or prompt is missing.
- [ ] Launch fails with `TASK_ACTIVE_SESSION_EXISTS` when the task already has an active session.
- [ ] Dirty base repo blocks branch/worktree creation and records a dirty repo warning.
- [ ] No branch, worktree, or running session is created when dirty check fails.
- [ ] Coding-profile launch creates a branch and worktree by default.
- [ ] Worktree path and branch are saved to task metadata after git succeeds.
- [ ] Task status changes to Running after successful session launch.
- [ ] If worktree creation fails, task status and prior metadata remain predictable and the error is visible.
- [ ] WSL task launch uses the same WSL runtime context as repo git commands.
- [ ] Non-code task launch does not create a worktree.
- [ ] Launch action is available from task detail and task card when task is launch-ready.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers task launch success and dirty repo block using fixtures where practical.

## Implementation Notes

- Persist worktree metadata only after the git operation succeeds.
- Keep launch template rendering transparent; store the rendered command on the session.
- Do not add auto-merge, PR creation, or orchestration behavior.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

