# Directive 014: Review Outcomes and Worktree Cleanup

## Objective

Persist human review outcomes, update task review state and status, guarantee no auto-merge behavior exists in v1, and add safe manual cleanup for done or archived task worktrees.

## Prerequisites

- [ ] Directive 013: Validation Commands Complete

## References

**PRD:**
- User Story: [US-018] Mark Review Outcome
- Functional Requirements: [FR-47], [FR-48], [FR-49], [FR-50]
- Feature Specification: [Section 6] Diff and Review Gate; [Section 11] Phase 4 Diff Review Gate

**ARCH.md:**
- Data Models: `ReviewRecord`
- API Contracts: `mark_review_outcome`, `delete_task_worktree`
- Directory Structure: `src/features/review/`, `src/features/tasks/`, `src-tauri/src/models/`, `src-tauri/src/services/review_service.rs`, `src-tauri/src/services/worktree_service.rs`, `src-tauri/src/commands/review.rs`, `src-tauri/migrations/`
- Error Codes: `TASK_NOT_FOUND`, `VALIDATION_ERROR`, `TASK_NOT_DONE_OR_ARCHIVED`, `WORKTREE_PATH_MISMATCH`, `WORKTREE_DELETE_FAILED`

**RESEARCH.md:**
- Patterns: Pattern 3: Worktree Creation With Dirty Preflight; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep; Anti-pattern 6: Unsafe Worktree Cleanup
- Libraries: local `git`, `rusqlite`

## Scope

### In Scope
- Add migration and model/repository code for `ReviewRecord`.
- Implement `mark_review_outcome` for `approve`, `rework`, and `done`.
- Persist optional review note and review timestamp.
- Update task `review_state`, status, and `completed_at` according to ARCH.md rules.
- Add review buttons and visible latest review state in review panel and task detail.
- Implement `delete_task_worktree` with exact path confirmation and safety checks.
- Verify there is no command path that merges task work to main.

### Out of Scope
- Git merge, PR creation, GitHub sync, inline review comments, or auto-merge.
- Automated worktree cleanup.
- Review approval policy gates based on tests.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `review_records` with all fields defined in ARCH.md.
- [ ] `mark_review_outcome` with `approve` records review state and optional note without merging code.
- [ ] `mark_review_outcome` with `rework` moves task to Rework and records optional note.
- [ ] `mark_review_outcome` with `done` moves task to Done and sets `completed_at`.
- [ ] Task detail and review panel show latest review state and review note.
- [ ] Tests assert no code path invokes `git merge`, `git push`, GitHub PR creation, or auto-merge behavior as part of review outcomes.
- [ ] `delete_task_worktree` only allows Done or Archived tasks.
- [ ] `delete_task_worktree` requires `confirm_path` to exactly match stored worktree path.
- [ ] Worktree deletion verifies resolved path is under configured worktree root and never deletes base repo path.
- [ ] Successful cleanup sets worktree state to `deleted`.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers Approve, Rework, Done, and safe cleanup confirmation UI.

## Implementation Notes

- "Approve" is a human review marker, not a merge permission.
- Cleanup must use native Rust filesystem checks and `git worktree remove` carefully. Do not recursively delete arbitrary paths.
- Do not mark Done automatically when validation passes.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

