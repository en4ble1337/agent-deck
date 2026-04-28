# Directive 017: Log Redaction and Possible Secret Warnings

## Objective

Make redacted logs the default retained and displayed format, cover common secret patterns, and create possible-secret warnings without exposing raw secret values in the UI.

## Prerequisites

- [ ] Directive 016: Runtime and Token Metadata Complete

## References

**PRD:**
- User Story: [US-022] Log Redaction
- Functional Requirements: [FR-30], [FR-31], [FR-54], [FR-56]
- Feature Specification: [Section 6] Logs, Redaction, and Telemetry; [Section 11] Phase 5 Required Warnings and Redaction

**ARCH.md:**
- Data Models: Uses `Session`, `Warning`
- API Contracts: No new API contracts; hardens `read_log` from Directive 007 and session log writers from Directive 006
- Directory Structure: `src-tauri/src/logging/`, `src-tauri/src/services/warning_service.rs`, `src/features/sessions/`, `src/features/warnings/`, `src-tauri/tests/`, `tests/features/sessions/`
- Error Codes: `LOG_NOT_FOUND`, `LOG_READ_FAILED`, `INTERNAL_ERROR`

**RESEARCH.md:**
- Patterns: Pattern 1: Session Backend Adapter With Output Events
- Anti-patterns: Anti-pattern 3: Shell Interpolation for Git and Runtime Commands
- Libraries: Rust regex implementation if added, otherwise standard Rust string/pattern handling

## Scope

### In Scope
- Implement default log redaction before logs are saved.
- Ensure `read_log` returns redacted content.
- Cover required patterns: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `password=`, and `Authorization: Bearer`.
- Preserve enough surrounding context for debugging.
- Create coalesced `possible_secret` warnings when redaction occurs.
- Ensure terminal display output is redacted where it is retained or replayed from logs.
- Add tests that prove raw secret values are absent from saved and displayed paths.

### Out of Scope
- Retaining raw unredacted logs.
- User-configurable redaction pattern UI.
- App-level encryption or password/PIN.
- Billing or token extraction from redacted logs.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Redacted logs are the default saved log format for sessions and validation runs.
- [ ] Required secret patterns are redacted in saved logs.
- [ ] Required secret patterns are redacted in `read_log` output.
- [ ] Redaction preserves useful non-secret context around the match.
- [ ] Possible secret detection creates a warning with related session/task ids when available.
- [ ] UI does not display raw secret values after redaction.
- [ ] Tests cover API-key, bearer-token, password, and AWS token examples.
- [ ] Tests prefer false positives over leaking obvious secrets.
- [ ] Existing session, validation, and history workflows still work when redaction occurs.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers redacted log viewer and possible-secret warning display.

## Implementation Notes

- Redact before default log retention. Do not write raw logs and redact only at read time.
- Error details may include paths and sanitized stderr, but never token values or bearer values.
- Keep the redactor isolated and heavily tested.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

