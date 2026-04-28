# Directive 013: Validation Commands

## Objective

Allow the operator to run configured test and build commands from the review panel inside a task worktree, stream or capture output, and persist validation results.

## Prerequisites

- [ ] Directive 012: Diff Review Panel Complete

## References

**PRD:**
- User Story: [US-017] Run Test and Build Commands
- Functional Requirements: [FR-5], [FR-44], [FR-45], [FR-46]
- Feature Specification: [Section 6] Diff and Review Gate; [Section 11] Phase 4 Diff Review Gate

**ARCH.md:**
- Data Models: `ValidationRun`
- API Contracts: `run_validation_command`
- Directory Structure: `src/features/review/`, `src/features/sessions/`, `src-tauri/src/models/`, `src-tauri/src/services/validation_service.rs`, `src-tauri/src/services/session_service.rs`, `src-tauri/src/commands/review.rs`, `src-tauri/migrations/`
- Error Codes: `TASK_NOT_FOUND`, `REPO_COMMAND_MISSING`, `WORKTREE_MISSING`, `VALIDATION_LAUNCH_FAILED`, `WSL_UNAVAILABLE`

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events; Pattern 2: Explicit WSL Runtime Adapter; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 3: Shell Interpolation for Git and Runtime Commands
- Libraries: `portable-pty`, local shell/runtime adapters, `rusqlite`

## Scope

### In Scope
- Add migration and model/repository code for `ValidationRun`.
- Implement `run_validation_command` for `test` and `build`.
- Run commands inside the task worktree and same runtime context as the task repo.
- Create a validation session or log channel that appears in terminal grid and review panel.
- Persist command, command type, status, exit code, started/ended timestamps, duration, output log path, and related ids.
- Show Run Test and Run Build controls only when repo commands are configured.
- Show validation pass/fail results in review panel.

### Out of Scope
- Review outcome actions.
- Custom ad hoc validation commands beyond repo test/build command fields.
- Blocking Rework or Done based on validation failure.
- CI integration.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `validation_runs` with all fields defined in ARCH.md.
- [ ] `run_validation_command` rejects missing repo command with `REPO_COMMAND_MISSING`.
- [ ] Test command runs inside task worktree when `command_type` is `test`.
- [ ] Build command runs inside task worktree when `command_type` is `build`.
- [ ] WSL task validation runs through the WSL runtime context.
- [ ] Validation output appears in a validation log view and a terminal-grid session where practical.
- [ ] Exit code is recorded and mapped to passed or failed.
- [ ] Failed validation remains visible but does not block marking Rework later.
- [ ] Review panel hides Run Test or Run Build when the corresponding repo command is not configured.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers command availability and pass/fail result display with a fixture command.

## Implementation Notes

- Validation sessions use `launch_kind=validation`.
- Use the same adapter boundary as normal sessions; do not add a second process execution path.
- Command output logs must use the same log safety path that Directive 017 will redact.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

