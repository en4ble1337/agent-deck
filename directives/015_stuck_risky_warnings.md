# Directive 015: Stuck Session and Risky Command Warnings

## Objective

Add required warning producers for no-output/stuck sessions and risky command patterns, backed by persisted pattern configuration and visible warning badges/list entries.

## Prerequisites

- [ ] Directive 011: Changed Files and File Overlap Warnings Complete

## References

**PRD:**
- User Story: [US-019] Stuck Session Warning; [US-020] Risky Command Detection
- Functional Requirements: [FR-51], [FR-52], [FR-54], [FR-55]
- Feature Specification: [Section 6] Warning Engine; [Section 11] Phase 5 Required Warnings and Redaction

**ARCH.md:**
- Data Models: `RiskyCommandPattern`
- API Contracts: No new API contracts; uses `list_warnings` from Directive 009
- Directory Structure: `src/features/warnings/`, `src/features/sessions/`, `src/features/tasks/`, `src-tauri/src/models/`, `src-tauri/src/services/warning_service.rs`, `src-tauri/src/services/session_service.rs`, `src-tauri/migrations/`
- Error Codes: Uses existing warning and session error handling; warning failures are logged and do not crash streaming

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep; Anti-pattern 3: Shell Interpolation for Git and Runtime Commands
- Libraries: `rusqlite`, `portable-pty`

## Scope

### In Scope
- Add migration and model/repository code for `RiskyCommandPattern`.
- Seed required risky command patterns.
- Detect risky command patterns in command input and observable output where the session stream exposes it.
- Create coalesced `risky_command` warnings with matched pattern, session id, task id when attached, and timestamp.
- Track no-output thresholds from workspace settings.
- Create coalesced `stuck_session` warnings based on running session `last_activity_at`.
- Resolve stuck-session warnings when new output arrives or the session stops.
- Show warning badges on affected session panes, task cards, and warning list.

### Out of Scope
- Automatically stopping or killing risky sessions.
- Config UI for editing risky command patterns.
- Secret redaction and possible-secret warnings.
- Token warning thresholds.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `risky_command_patterns` with all fields defined in ARCH.md.
- [ ] Default risky patterns include `rm -rf /`, `mkfs`, `dd if=`, `curl | bash`, `chmod -R 777`, `chown -R`, `docker system prune -a`, `kubectl delete`, and `terraform destroy`.
- [ ] Risky pattern detection creates a warning with matched pattern, session id, task id if attached, and timestamp.
- [ ] Risky command warnings do not automatically kill the session in v1.
- [ ] Running sessions use workspace `stuck_threshold_seconds` for no-output detection.
- [ ] Stuck warning includes session id, task if attached, last activity time, and threshold.
- [ ] Stuck warning appears on session pane, task card when attached, and warning list.
- [ ] Stuck warning resolves when new output arrives or the session stops.
- [ ] Duplicate risky and stuck warnings are coalesced for the same active condition.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers warning badge/list display for stuck and risky fixtures.

## Implementation Notes

- Warning producers should be best effort. They must log failures but never interrupt terminal streaming.
- Risky detection is warning-only; v1 remains operator-reviewed.
- Use persisted last activity rather than a UI-only timer so warnings survive dashboard navigation.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

