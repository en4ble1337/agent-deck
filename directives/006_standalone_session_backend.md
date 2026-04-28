# Directive 006: Standalone Session Launch and Stop

## Objective

Implement persistent standalone session launch from a registered repo and selected profile, stream live output to terminal panes, save session metadata and logs, and allow the operator to stop running sessions.

## Prerequisites

- [ ] Directive 004: Repo Registration and Runtime Context Complete
- [ ] Directive 005: Agent Profile YAML Management Complete

## References

**PRD:**
- User Story: [US-005] Launch Standalone Terminal Session; [US-007] Stop and Archive Sessions; [US-008] Persist Session Logs and History
- Functional Requirements: [FR-19], [FR-22], [FR-25], [FR-27], [FR-29], [FR-30], [FR-33]
- Feature Specification: [Section 6] Session Dashboard and Terminal Grid; [Section 6] Logs, Redaction, and Telemetry; [Section 11] Phase 2 Session Dashboard

**ARCH.md:**
- Data Models: `Session`
- API Contracts: `launch_standalone_session`, `stop_session`
- Directory Structure: `src/features/sessions/`, `src-tauri/src/adapters/pty.rs`, `src-tauri/src/adapters/wsl.rs`, `src-tauri/src/logging/`, `src-tauri/src/models/`, `src-tauri/src/services/session_service.rs`, `src-tauri/src/commands/sessions.rs`, `src-tauri/migrations/`
- Error Codes: `WORKSPACE_NOT_FOUND`, `REPO_NOT_FOUND`, `PROFILE_NOT_FOUND`, `PROFILE_INVALID`, `WSL_UNAVAILABLE`, `SESSION_LAUNCH_FAILED`, `SESSION_NOT_FOUND`, `SESSION_NOT_RUNNING`, `SESSION_STOP_FAILED`

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events; Pattern 2: Explicit WSL Runtime Adapter; Pattern 5: xterm.js Pane Lifecycle With Addons and Backpressure; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 3: Shell Interpolation for Git and Runtime Commands; Anti-pattern 5: Rendering Every Hidden Terminal at Full Cost
- Libraries: `portable-pty`, `@xterm/xterm`, `@xterm/addon-fit`, `rusqlite`

## Scope

### In Scope
- Add migration and model/repository code for `Session`.
- Implement `launch_standalone_session` for registered repos and valid profiles.
- Render profile launch templates with workspace/repo/session context and optional prompt override.
- Run Windows-local sessions in the repo path and WSL sessions through the WSL adapter.
- Persist launch command, working directory, runtime context, status, timestamps, process id, log path, and last activity.
- Stream output to active terminal pane subscribers and append it to a log file.
- Implement `stop_session` and accurate status transitions for running, stopping, stopped, failed, and completed sessions.
- Add launch UI from repo context with profile selection and clear launch failure display.

### Out of Scope
- Task sessions and worktrees.
- Multi-pane grid management and session archive/history UI.
- Log redaction, log search, risky command detection, and stuck-session warnings.
- Token usage parsing.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `sessions` with all fields defined in ARCH.md.
- [ ] `launch_standalone_session` creates a session record linked to workspace, repo, and profile.
- [ ] Non-code and shell profiles run in the current repo path without creating a worktree.
- [ ] WSL repo sessions execute through `wsl.exe` and do not silently fall back to Windows shell.
- [ ] Launch failures return `SESSION_LAUNCH_FAILED` or `WSL_UNAVAILABLE` and do not create a misleading running session.
- [ ] Terminal output appears live in a pane for an active launched session.
- [ ] Each launched session gets a log file path and appends output to that file.
- [ ] `last_activity_at` and `last_output_preview` update when output is received.
- [ ] `stop_session` terminates a running process and returns status `stopped` on success.
- [ ] Stopping a non-running session returns `SESSION_NOT_RUNNING`.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers launching and stopping a mockable local session.

## Implementation Notes

- Use the adapter from Directive 002 rather than embedding process handling in Tauri command handlers.
- Session command rendering should be auditable and unit-tested for quoting/path behavior.
- The backend owns live process handles; SQLite owns durable metadata.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

