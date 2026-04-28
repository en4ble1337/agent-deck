# Directive 009: Worktree Preflight and Warning Foundation

## Objective

Build the shared warning persistence/listing foundation and the git worktree preflight services needed to block dirty repos, generate branch/worktree paths, and prepare coding tasks for isolated launch.

## Prerequisites

- [ ] Directive 007: Terminal Grid, Session History, and Log Reader Complete
- [ ] Directive 008: Task Board and Task Detail CRUD Complete

## References

**PRD:**
- User Story: [US-011] Dirty Repo Block Before Worktree Creation; [US-012] Create Worktree for Coding-Agent Task
- Functional Requirements: [FR-15], [FR-16], [FR-17], [FR-18], [FR-20], [FR-21], [FR-53], [FR-54], [FR-55]
- Feature Specification: [Section 6] Worktree Workflow; [Section 6] Warning Engine; [Section 11] Phase 3 Task Board and Worktree Launch; [Section 11] Phase 5 Required Warnings and Redaction

**ARCH.md:**
- Data Models: `Warning`
- API Contracts: `list_warnings`
- Directory Structure: `src/features/warnings/`, `src-tauri/src/adapters/git.rs`, `src-tauri/src/services/warning_service.rs`, `src-tauri/src/services/worktree_service.rs`, `src-tauri/src/models/`, `src-tauri/src/commands/warnings.rs`, `src-tauri/migrations/`
- Error Codes: `WORKSPACE_NOT_FOUND`, `DIRTY_REPO`, `GIT_COMMAND_FAILED`, `WORKTREE_CREATE_FAILED`, `WORKTREE_MISSING`

**RESEARCH.md:**
- Patterns: Pattern 3: Worktree Creation With Dirty Preflight; Pattern 4: Machine-Readable Git Parsing; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 3: Shell Interpolation for Git and Runtime Commands; Anti-pattern 4: Ad Hoc Parsing of Human Git Output; Anti-pattern 6: Unsafe Worktree Cleanup
- Libraries: local `git`, `rusqlite`

## Scope

### In Scope
- Add migration and model/repository code for `Warning`.
- Implement `list_warnings`.
- Implement warning coalescing for duplicate active conditions.
- Implement dirty repo check service using machine-readable git status.
- Implement dirty repo warning creation and resolution hooks.
- Implement branch name generation from task title and workspace branch prefix.
- Implement branch/worktree collision handling with short task id suffixes.
- Implement worktree path derivation from workspace/repo config plus task slug.
- Add warning list UI and warning badges on task cards/session panes where backing data exists.

### Out of Scope
- The final `launch_task_session` command.
- Changed-file overlap warnings.
- Stuck-session, risky-command, and possible-secret warning producers.
- Manual worktree cleanup command.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `warnings` with all fields defined in ARCH.md.
- [ ] `list_warnings` returns warnings for a workspace filtered by active, resolved, dismissed, or all.
- [ ] Warning service coalesces duplicate active warnings for the same type and related ids.
- [ ] Dirty repo check uses `git status --porcelain -z` or an equivalent machine-readable format.
- [ ] Dirty repo check lists affected files when practical.
- [ ] Dirty repo failure creates or updates a `dirty_repo` warning.
- [ ] Clean repo recheck resolves the corresponding dirty repo warning.
- [ ] Branch names are generated from task titles with workspace `branch_prefix`.
- [ ] Branch and worktree collisions resolve predictably by adding a short suffix.
- [ ] Worktree paths are derived from workspace/repo config and task slug.
- [ ] Worktree service does not create a branch or worktree when dirty check fails.
- [ ] Warning badges appear on affected task cards and session panes when warnings are present.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers warning list display and dirty repo warning display using a controlled fixture where practical.

## Implementation Notes

- Run dirty checks immediately before worktree creation in Directive 010; this directive supplies the tested service.
- Do not parse human-oriented git status output.
- Warning creation must not block terminal streaming or crash the app.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

