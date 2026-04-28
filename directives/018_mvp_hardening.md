# Directive 018: MVP Hardening and Browser Verification

## Objective

Harden the MVP into a daily-use workflow by tightening errors, empty states, accessibility, restart behavior, performance with multiple sessions, and documentation for local data paths and known limitations.

## Prerequisites

- [ ] Directive 014: Review Outcomes and Worktree Cleanup Complete
- [ ] Directive 017: Log Redaction and Possible Secret Warnings Complete

## References

**PRD:**
- User Story: [US-001] through [US-022] end-to-end verification
- Functional Requirements: [FR-1] through [FR-56] end-to-end verification
- Feature Specification: [Section 6] All feature specifications; [Section 11] Phase 6 Hardening and Daily Workflow Polish

**ARCH.md:**
- Data Models: No new data models; verifies all existing entities
- API Contracts: No new API contracts; verifies all existing commands
- Directory Structure: `src/`, `src-tauri/`, `tests/`, `src-tauri/tests/`, `e2e/`, `docs/`, `execution/`
- Error Codes: All ARCH.md error codes must be covered by tests or explicit documented gaps

**RESEARCH.md:**
- Patterns: Pattern 5: xterm.js Pane Lifecycle With Addons and Backpressure; Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep; Anti-pattern 5: Rendering Every Hidden Terminal at Full Cost; Anti-pattern 6: Unsafe Worktree Cleanup
- Libraries: Playwright or dev-browser skill, Vitest, React Testing Library, Rust tests

## Scope

### In Scope
- Clean up error copy and empty states across workspace, repo, profile, session, task, review, warning, and log views.
- Verify keyboard reachability and visible focus states for all interactive controls.
- Add accessible labels and tooltips for icon-only controls.
- Verify warning colors use label/icon plus color and meet contrast expectations.
- Add or update Playwright/dev-browser scenarios for the full task to worktree to agent to diff to validation to review flow.
- Verify four simultaneous sessions remain usable at 1280x720.
- Verify app restart does not show dead processes as running.
- Document local data paths, WSL assumptions, YAML profile format, log redaction behavior, worktree cleanup, and known limitations.
- Add execution helper updates if needed for one-command local verification.

### Out of Scope
- New product features.
- Visual redesign beyond hardening existing UI.
- Mobile optimization.
- Cloud sync, auth, PR creation, auto-merge, orchestrator agents, or browser automation.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Operator can complete workspace creation, repo registration, profile reload, task creation, worktree launch, terminal monitoring, changed-file refresh, diff review, validation command, and review outcome in one app.
- [ ] Four simultaneous sessions remain usable at 1280x720 with no overlapping pane controls.
- [ ] App restart reconciles stale running sessions to stopped or unknown.
- [ ] Every interactive control is keyboard reachable.
- [ ] Icon-only controls have accessible labels and tooltips.
- [ ] Empty states are short, actionable, and not marketing copy.
- [ ] No v1 workflow introduces cloud sync, auth, orchestrator behavior, GitHub PR creation, browser automation, or auto-merge.
- [ ] Documentation covers local data paths, WSL assumptions, profile YAML, log redaction, worktree cleanup, and known limitations.
- [ ] Coverage matrix in `directives/000_sequence_and_coverage.md` remains accurate.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] `npm run e2e` passes, or dev-browser verification evidence is recorded in the directive notes if Playwright cannot cover a desktop-only path.

## Implementation Notes

- This directive is for hardening and verification, not broad refactors.
- Prefer small, targeted fixes where e2e or browser verification exposes layout or workflow issues.
- Keep the UI operational and dense; do not turn the first screen into a landing page.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

