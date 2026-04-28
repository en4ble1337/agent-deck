# Directive 007: Terminal Grid, Session History, and Log Reader

## Objective

Turn standalone sessions into an operator dashboard by showing multiple active terminal panes, enabling archive behavior, listing historical sessions, and reading saved logs in chunks.

## Prerequisites

- [ ] Directive 006: Standalone Session Launch and Stop Complete

## References

**PRD:**
- User Story: [US-006] Terminal Grid; [US-007] Stop and Archive Sessions; [US-008] Persist Session Logs and History
- Functional Requirements: [FR-26], [FR-28], [FR-30], [FR-32], [FR-33]
- Feature Specification: [Section 6] Session Dashboard and Terminal Grid; [Section 6] Logs, Redaction, and Telemetry; [Section 11] Phase 2 Session Dashboard

**ARCH.md:**
- Data Models: Uses `Session`
- API Contracts: `archive_session`, `read_log`
- Directory Structure: `src/features/sessions/`, `src/components/`, `src-tauri/src/logging/`, `src-tauri/src/services/session_service.rs`, `src-tauri/src/commands/sessions.rs`
- Error Codes: `SESSION_NOT_FOUND`, `SESSION_RUNNING`, `SESSION_ARCHIVE_FAILED`, `LOG_NOT_FOUND`, `LOG_READ_FAILED`

**RESEARCH.md:**
- Patterns: Pattern 5: xterm.js Pane Lifecycle With Addons and Backpressure; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 5: Rendering Every Hidden Terminal at Full Cost
- Libraries: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-search`, `@xterm/addon-web-links`

## Scope

### In Scope
- Implement `archive_session`.
- Implement `read_log` with offset, limit, truncation, and simple query support.
- Add active terminal grid that supports at least four running sessions.
- Add pane focus/selection behavior and session detail panel.
- Add archive controls for completed, failed, and stopped sessions.
- Add session history view with filters by workspace, repo, task, profile, status, and date range.
- Add read-only log viewer for historical sessions.
- Reconcile startup display so archived sessions are hidden from active grid but visible in history.

### Out of Scope
- Task board and task-linked sessions.
- Log redaction and possible secret warnings.
- Stuck-session and risky-command warnings.
- Advanced indexed log search or SQLite FTS.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Terminal grid can show at least four active sessions at once.
- [ ] Each pane header shows profile/tool, repo, task placeholder when absent, status, runtime, and warning badge placeholder.
- [ ] User can focus/select a pane and see session details.
- [ ] User can close or hide a pane without deleting the session record.
- [ ] `archive_session` rejects running sessions with `SESSION_RUNNING`.
- [ ] Completed, failed, and stopped sessions can be archived and disappear from active grid by default.
- [ ] Archived sessions remain visible in session history.
- [ ] `read_log` reads by offset/limit, returns `next_offset`, and marks truncated content.
- [ ] Log viewer can open a saved log after app restart.
- [ ] Layout remains usable at 1280x720 with no overlapping pane controls.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers four panes at 1280x720, archive behavior, history filtering, and log viewer.

## Implementation Notes

- Hidden panes should not keep rendering at full cost. Keep log persistence independent from xterm rendering.
- Log reader must avoid loading very large logs into memory all at once.
- Runtime display can be derived in UI, but persisted timestamps remain the source of truth.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

