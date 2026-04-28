# Directive 016: Runtime and Token Metadata

## Objective

Complete session observability by showing runtime, last activity, changed-file counts, and direct token usage when available while making unknown token usage non-blocking and honest.

## Prerequisites

- [ ] Directive 015: Stuck Session and Risky Command Warnings Complete

## References

**PRD:**
- User Story: [US-021] Runtime and Token Metadata
- Functional Requirements: [FR-33], [FR-34], [FR-35], [FR-36], [FR-38], [FR-56]
- Feature Specification: [Section 6] Logs, Redaction, and Telemetry; [Section 11] Phase 2 Session Dashboard; [Section 11] Phase 5 Required Warnings and Redaction

**ARCH.md:**
- Data Models: Uses `Session`, `Task`, `ChangedFile`
- API Contracts: No new API contracts; extends existing session/task DTOs
- Directory Structure: `src/features/sessions/`, `src/features/tasks/`, `src/lib/`, `src-tauri/src/services/session_service.rs`, `src-tauri/src/services/task_service.rs`
- Error Codes: No new error codes; preserve existing session and task errors

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events; Pattern 7: Process Bridge as Future Codex Optimization
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep
- Libraries: React, `rusqlite`

## Scope

### In Scope
- Ensure every session has runtime duration derived from start/end/current time.
- Ensure running sessions update and display last activity.
- Show changed-file count for task sessions when a worktree exists.
- Preserve token fields: input tokens, output tokens, total tokens, source, and confidence.
- Store token usage only when a provider or CLI exposes direct metadata through an explicit parser/hook.
- Display unavailable/unknown token state when direct metadata is absent.
- Add startup reconciliation so missing live process handles are not shown as running after app restart.

### Out of Scope
- Estimating tokens from logs.
- Full token burn dashboard.
- Billing-grade cost tracking.
- Provider-specific structured app-server bridge as a hard v1 dependency.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Session pane and detail show runtime for running and historical sessions.
- [ ] Session pane and detail show last activity when available.
- [ ] Task cards and session detail show changed-file count for task sessions with worktrees.
- [ ] Token usage fields support input, output, total, source, and confidence.
- [ ] Direct token usage metadata can be stored through an explicit tested service path.
- [ ] When no direct token metadata exists, UI shows unavailable/unknown without warning styling.
- [ ] Tests assert logs are not parsed to estimate token usage.
- [ ] Token usage unknown state does not block session launch, task launch, diff review, validation, or review outcome actions.
- [ ] App restart reconciliation marks sessions without live handles as stopped or unknown rather than running.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers runtime display, unknown token state, and restart reconciliation state where practical.

## Implementation Notes

- Treat token data as optional telemetry, not a required workflow field.
- Do not add provider coupling beyond a narrow direct metadata ingestion hook.
- Keep display copy honest and quiet: "Unavailable" or "Unknown" is enough.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

