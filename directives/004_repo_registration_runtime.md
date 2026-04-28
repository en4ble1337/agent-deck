# Directive 004: Repo Registration and Runtime Context

## Objective

Allow the operator to register and edit Windows-local or WSL repos inside a workspace, validate that each path is a git repository in its runtime context, and show repo details needed for task and session launch.

## Prerequisites

- [ ] Directive 003: Workspace Bootstrap and Persistence Complete

## References

**PRD:**
- User Story: [US-003] Repo Registration
- Functional Requirements: [FR-3], [FR-4], [FR-5], [FR-6]
- Feature Specification: [Section 6] Repo Management and WSL Runtime Context; [Section 11] Phase 1 Local Data Model and Configuration

**ARCH.md:**
- Data Models: `Repo`
- API Contracts: `register_repo`, `update_repo`
- Directory Structure: `src/features/repos/`, `src-tauri/src/adapters/wsl.rs`, `src-tauri/src/adapters/git.rs`, `src-tauri/src/models/`, `src-tauri/src/services/`, `src-tauri/src/commands/repos.rs`, `src-tauri/migrations/`
- Error Codes: `WORKSPACE_NOT_FOUND`, `VALIDATION_ERROR`, `WSL_UNAVAILABLE`, `REPO_PATH_NOT_FOUND`, `REPO_NOT_GIT`, `REPO_NOT_FOUND`, `REPO_ARCHIVED`

**RESEARCH.md:**
- Patterns: Pattern 2: Explicit WSL Runtime Adapter; Pattern 4: Machine-Readable Git Parsing; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 3: Shell Interpolation for Git and Runtime Commands; Anti-pattern 4: Ad Hoc Parsing of Human Git Output
- Libraries: `rusqlite`, `zod`, local `git`, `wsl.exe`

## Scope

### In Scope
- Add migration and model/repository code for `Repo`.
- Implement explicit runtime adapter behavior for `windows-local` and `wsl`.
- Implement git repo validation using safe command construction in the selected runtime context.
- Implement `register_repo` and `update_repo` Tauri commands.
- Add repo form, repo list, and repo detail UI scoped to the selected workspace.
- Surface WSL unavailable and non-git path errors without falling back to Windows shell.

### Out of Scope
- Dirty repo blocking before worktree creation.
- Worktree creation, branch generation, changed-file tracking, and diff viewing.
- Running test/build commands.
- Auto-discovering repos from the filesystem.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `repos` with all fields defined in ARCH.md.
- [ ] `register_repo` requires workspace id, name, path, runtime context, and default branch.
- [ ] `register_repo` accepts Linux paths such as `/home/bart/projects/example` when runtime context is `wsl`.
- [ ] `register_repo` rejects missing paths with `REPO_PATH_NOT_FOUND`.
- [ ] `register_repo` rejects non-git paths with `REPO_NOT_GIT`.
- [ ] WSL repo validation returns `WSL_UNAVAILABLE` if WSL or the requested distro is unavailable.
- [ ] `update_repo` edits path, runtime context, WSL distro, default branch, commands, default profile, and archive state.
- [ ] Repo detail shows path, runtime context, default branch, test command, build command, active task placeholder, and active session placeholder.
- [ ] Workspace selection filters visible repos.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers adding a Windows-local repo and displaying WSL validation errors where practical.

## Implementation Notes

- All git commands for WSL repos must go through the WSL adapter; do not infer WSL from string prefixes inside feature code.
- Use `git rev-parse --is-inside-work-tree` or an equivalent machine-readable check for repo validation.
- Keep default branch, test command, and build command nullable or defaulted exactly as ARCH.md specifies.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

