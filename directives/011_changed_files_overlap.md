# Directive 011: Changed Files and File Overlap Warnings

## Objective

Track changed files for task worktrees, show counts and file lists in task/session/review surfaces, and warn when active tasks in the same repo touch the same paths.

## Prerequisites

- [ ] Directive 010: Task Session Launch With Worktree Isolation Complete

## References

**PRD:**
- User Story: [US-014] Changed Files Tracking; [US-015] File Overlap Warning
- Functional Requirements: [FR-37], [FR-38], [FR-39], [FR-40], [FR-41], [FR-54], [FR-55]
- Feature Specification: [Section 6] Diff and Review Gate; [Section 6] Warning Engine; [Section 11] Phase 3 Task Board and Worktree Launch; [Section 11] Phase 5 Required Warnings and Redaction

**ARCH.md:**
- Data Models: `ChangedFile`
- API Contracts: `refresh_changed_files`
- Directory Structure: `src/features/tasks/`, `src/features/review/`, `src/features/warnings/`, `src-tauri/src/adapters/git.rs`, `src-tauri/src/services/changed_file_service.rs`, `src-tauri/src/services/warning_service.rs`, `src-tauri/src/commands/tasks.rs`, `src-tauri/migrations/`
- Error Codes: `TASK_NOT_FOUND`, `WORKTREE_MISSING`, `GIT_COMMAND_FAILED`

**RESEARCH.md:**
- Patterns: Pattern 4: Machine-Readable Git Parsing; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 4: Ad Hoc Parsing of Human Git Output
- Libraries: local `git`, `rusqlite`

## Scope

### In Scope
- Add migration and model/repository code for `ChangedFile`.
- Implement changed-file refresh using git status/diff metadata for task worktrees.
- Implement `refresh_changed_files`.
- Persist latest changed-file list and task changed-file count.
- Show changed-file count on task cards and session detail.
- Show changed-file list in task detail and review panel shell.
- Detect file overlap across active tasks in the same repo.
- Create, coalesce, and resolve `file_overlap` warnings.

### Out of Scope
- Raw diff viewing.
- Test/build validation commands.
- Merge conflict resolution.
- Inline code comments.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `changed_files` with all fields defined in ARCH.md.
- [ ] `refresh_changed_files` returns updated task, changed files, and warning changes.
- [ ] Changed-file refresh distinguishes staged, unstaged, untracked, deleted, renamed, and mixed states where practical.
- [ ] Refresh failure shows an error without clearing the last known file list.
- [ ] Task card and session detail show changed-file count.
- [ ] Task detail lists changed file paths and statuses.
- [ ] Empty changed-file state says no changes detected.
- [ ] Active tasks in the same repo are compared for normalized repo-relative path overlap.
- [ ] Overlap warning includes repo, file path, affected task ids/titles, and severity.
- [ ] Overlap warning appears on affected task cards and in warning list.
- [ ] Overlap warning resolves when overlap no longer exists.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers changed-file display and overlap warning display using fixture repos where practical.

## Implementation Notes

- Prefer `git status --porcelain -z` for paths with spaces and renames.
- Do not clear changed-file records until a successful replacement refresh has been computed.
- Only compare active tasks in the same repo to reduce warning noise.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

