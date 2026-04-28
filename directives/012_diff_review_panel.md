# Directive 012: Diff Review Panel

## Objective

Add the review panel for changed files and raw git diff so the operator can inspect all task worktree changes or a selected file inside RunDeck.

## Prerequisites

- [ ] Directive 011: Changed Files and File Overlap Warnings Complete

## References

**PRD:**
- User Story: [US-016] Diff Review Panel
- Functional Requirements: [FR-39], [FR-42], [FR-43]
- Feature Specification: [Section 6] Diff and Review Gate; [Section 11] Phase 4 Diff Review Gate

**ARCH.md:**
- Data Models: Uses `Task`, `ChangedFile`
- API Contracts: `get_task_diff`
- Directory Structure: `src/features/review/`, `src/features/tasks/`, `src/features/sessions/`, `src-tauri/src/adapters/git.rs`, `src-tauri/src/services/review_service.rs`, `src-tauri/src/commands/review.rs`
- Error Codes: `TASK_NOT_FOUND`, `WORKTREE_MISSING`, `GIT_COMMAND_FAILED`, `DIFF_UNAVAILABLE`

**RESEARCH.md:**
- Patterns: Pattern 4: Machine-Readable Git Parsing; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 4: Ad Hoc Parsing of Human Git Output
- Libraries: local `git`, React Testing Library

## Scope

### In Scope
- Implement `get_task_diff` for all-files and per-file raw diff.
- Add review panel accessible from task card, task detail, and session detail.
- Show changed-file list for the task worktree.
- Show raw all-files diff by default.
- Support selecting one file to view its diff.
- Display no-change and diff-error states.

### Out of Scope
- Syntax highlighting beyond basic monospaced raw diff display.
- Inline comments.
- Validation command execution.
- Review outcome actions.
- GitHub PR creation.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] `get_task_diff` returns raw diff, selected file path or null, and generated timestamp.
- [ ] All-files diff uses the task worktree and correct runtime context.
- [ ] Per-file diff is restricted to the requested repo-relative path.
- [ ] Missing task returns `TASK_NOT_FOUND`.
- [ ] Missing worktree returns `WORKTREE_MISSING`.
- [ ] Git failures are visible and include enough stderr/context to troubleshoot without leaking secrets.
- [ ] Review panel is accessible from task card, task detail, and session detail.
- [ ] Review panel shows changed-file list and raw diff side-by-side at desktop widths.
- [ ] Empty diff state says no changes detected.
- [ ] Diff viewer uses monospaced text, stable wrapping, and horizontal scrolling where needed.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers all-files and per-file diff display.

## Implementation Notes

- Generate diff on demand rather than storing raw diff in SQLite.
- Use raw diff only for display. Parsed status data remains owned by `refresh_changed_files`.
- Do not add merge or PR behavior in this directive.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

