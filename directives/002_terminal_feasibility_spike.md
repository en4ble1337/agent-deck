# Directive 002: Terminal Feasibility Spike

## Objective

Prove RunDeck can render a live terminal pane, launch local and WSL shell sessions through a backend adapter, stream output, stop a running process, and save a basic log file before higher-level workflow code depends on sessions.

## Prerequisites

- [ ] Directive 001: Initial Environment Setup Complete

## References

**PRD:**
- User Story: [US-005] Launch Standalone Terminal Session; [US-006] Terminal Grid; [US-007] Stop and Archive Sessions; [US-008] Persist Session Logs and History
- Functional Requirements: [FR-25], [FR-27], [FR-30]
- Feature Specification: [Section 6] Session Dashboard and Terminal Grid; [Section 11] Phase 0 Feasibility Spike

**ARCH.md:**
- Data Models: None created in this directive
- API Contracts: None created in this directive; this is adapter and UI feasibility only
- Directory Structure: `src/features/sessions/`, `src-tauri/src/adapters/`, `src-tauri/src/logging/`, `src-tauri/tests/`, `tests/features/sessions/`
- Error Codes: `SESSION_LAUNCH_FAILED`, `SESSION_STOP_FAILED`, `WSL_UNAVAILABLE`, `LOG_READ_FAILED`, `INTERNAL_ERROR`

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events; Pattern 2: Explicit WSL Runtime Adapter; Pattern 5: xterm.js Pane Lifecycle With Addons and Backpressure
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep; Anti-pattern 5: Rendering Every Hidden Terminal at Full Cost
- Libraries: `portable-pty`, `@xterm/xterm`, `@xterm/addon-fit`

## Scope

### In Scope
- Define a `SessionBackend` adapter boundary in `src-tauri/src/adapters/`.
- Implement a minimal local shell launch and stop path behind the adapter.
- Implement a WSL shell launch path that returns `WSL_UNAVAILABLE` when WSL cannot be reached.
- Append streamed output to a basic log file under the configured or temporary app data path.
- Build a reusable `TerminalPane` component that can render streamed text with xterm.js.
- Add tests that exercise local launch, stop behavior, WSL unavailable handling, log append behavior, and terminal pane rendering with mocked output.

### Out of Scope
- Workspace, repo, profile, task, and session SQLite persistence.
- Final `launch_standalone_session` or `stop_session` command handlers.
- Multi-pane grid layout, archive controls, history, and log search.
- Redaction, risky command detection, token usage, and stuck-session warnings.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] `SessionBackend` supports launch, output subscription or callback, resize placeholder, and stop operations.
- [ ] A local shell command can be launched and stopped in a Rust integration test without blocking the app thread.
- [ ] A WSL shell launch path is implemented and reports `WSL_UNAVAILABLE` when WSL is absent or the requested distro is unavailable.
- [ ] Output received from the backend is appended to a log file in a testable file-backed writer.
- [ ] `TerminalPane` renders streamed output and cleans up xterm resources on unmount.
- [ ] Two simulated panes can render independent output in a frontend test.
- [ ] No durable Tauri command is added outside the ARCH.md API contract.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.

## Implementation Notes

- Keep process truth in Rust. The React component should render stream events, not own process lifecycle.
- Use argument arrays and explicit working directories where practical; avoid shell interpolation in the adapter.
- If WSL is unavailable on the developer machine, the test should assert the structured error rather than requiring a live distro.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

