# Directive 008: Task Board and Task Detail CRUD

## Objective

Create the task source of truth: a workspace-scoped board, task CRUD, structured acceptance criteria, prompt fields, launch validation states, and archive behavior.

## Prerequisites

- [ ] Directive 004: Repo Registration and Runtime Context Complete
- [ ] Directive 005: Agent Profile YAML Management Complete

## References

**PRD:**
- User Story: [US-009] Task Board; [US-010] Task Detail and Prompt Definition
- Functional Requirements: [FR-11], [FR-12], [FR-13], [FR-14]
- Feature Specification: [Section 6] Task Board and Task Detail; [Section 11] Phase 3 Task Board and Worktree Launch

**ARCH.md:**
- Data Models: `Task`, `AcceptanceCriterion`
- API Contracts: `create_task`, `update_task`, `archive_task`
- Directory Structure: `src/features/tasks/`, `src/components/`, `src-tauri/src/models/`, `src-tauri/src/services/task_service.rs`, `src-tauri/src/commands/tasks.rs`, `src-tauri/migrations/`
- Error Codes: `WORKSPACE_NOT_FOUND`, `REPO_NOT_FOUND`, `PROFILE_NOT_FOUND`, `VALIDATION_ERROR`, `TASK_NOT_FOUND`, `TASK_STATUS_INVALID`, `TASK_HAS_RUNNING_SESSION`

**RESEARCH.md:**
- Patterns: Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep
- Libraries: `rusqlite`, `zod`, React Testing Library

## Scope

### In Scope
- Add migrations and model/repository code for `Task` and `AcceptanceCriterion`.
- Implement `create_task`, `update_task`, and `archive_task`.
- Implement task statuses: Backlog, Ready, Running, Blocked, Needs Review, Rework, Done, Archived.
- Persist title, description, repo, profile, priority, prompt, acceptance criteria, status, branch/worktree metadata placeholders, session links, and review state fields.
- Add workspace-filtered board columns and task cards.
- Add task detail form for prompt, acceptance criteria, repo/profile assignment, priority, and status.
- Add launch-readiness validation messages for missing repo, coding profile, or prompt.

### Out of Scope
- Launching task sessions.
- Creating branches or worktrees.
- Changed-file refresh, diff review, validation commands, and review actions.
- Drag-and-drop polish beyond basic status movement if it slows correctness.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migrations create `tasks` and `acceptance_criteria` with all fields defined in ARCH.md.
- [ ] `create_task` persists initial acceptance criteria as structured rows in order.
- [ ] `update_task` can edit title, description, repo, profile, prompt, priority, status, and replacement acceptance criteria.
- [ ] `archive_task` sets status `archived` and `archived_at` without deleting the task.
- [ ] Board columns include Backlog, Ready, Running, Blocked, Needs Review, Rework, Done, and Archived.
- [ ] Task cards show title, repo, priority, assigned profile, status, active session placeholder, changed-file count, runtime placeholder, and warning placeholder.
- [ ] Task detail supports adding, editing, checking, reordering where practical, and removing acceptance criteria.
- [ ] Task board filters to the selected workspace.
- [ ] Empty columns show short actionable empty states.
- [ ] UI prevents launch attempts for coding tasks that lack repo, coding profile, or prompt.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers create/edit/move/archive task and acceptance criteria editing.

## Implementation Notes

- Acceptance criteria are structured records, not a newline-delimited text blob.
- Keep status transition validation conservative but do not block manual operator movement between normal board states unless ARCH.md requires it.
- One active task session is allowed in v1; enforce that when launch is implemented in Directive 010.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

