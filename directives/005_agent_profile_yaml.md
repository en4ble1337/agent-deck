# Directive 005: Agent Profile YAML Management

## Objective

Load built-in and user-editable YAML agent profiles from the local profile directory, validate them safely, and make valid and invalid profiles visible to the UI without crashing the app.

## Prerequisites

- [ ] Directive 003: Workspace Bootstrap and Persistence Complete

## References

**PRD:**
- User Story: [US-004] User-Editable YAML Agent Profiles
- Functional Requirements: [FR-7], [FR-8], [FR-9], [FR-10]
- Feature Specification: [Section 6] Agent Profiles; [Section 11] Phase 1 Local Data Model and Configuration

**ARCH.md:**
- Data Models: `AgentProfile`
- API Contracts: `reload_profiles`
- Directory Structure: `src/features/profiles/`, `src-tauri/src/profiles/`, `src-tauri/src/models/`, `src-tauri/src/services/`, `src-tauri/src/commands/profiles.rs`, `src-tauri/migrations/`
- Error Codes: `PROFILE_DIR_UNAVAILABLE`, `PROFILE_PARSE_ERROR`, `PROFILE_INVALID`, `VALIDATION_ERROR`

**RESEARCH.md:**
- Patterns: Pattern 6: Typed Frontend Tauri Client Wrapper; Pattern 7: Process Bridge as Future Codex Optimization
- Anti-patterns: Anti-pattern 2: Autonomous Orchestration and Auto-Merge Creep
- Libraries: `serde_yaml`, `zod`, `rusqlite`

## Scope

### In Scope
- Add migration and model/repository code for `AgentProfile`.
- Create or document the local profile directory under app data.
- Seed built-in default profiles for Builder, Reviewer, Tester, and Docs Writer.
- Parse user YAML profiles with `serde_yaml`.
- Validate required fields, duplicate ids, profile type, launch template, sandbox mode, max runtime, and token warning threshold.
- Implement `reload_profiles`.
- Add profile list UI with reload action and validation error display.

### Out of Scope
- Editing YAML profile files from inside RunDeck.
- Launching agent sessions.
- Provider-specific structured Codex, Claude, or Gemini bridges.
- Token usage extraction from provider output.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] Migration creates `agent_profiles` with all fields defined in ARCH.md.
- [ ] Built-in Builder, Reviewer, Tester, and Docs Writer profiles are available when no user YAML exists.
- [ ] `reload_profiles` returns valid and invalid profile records plus `error_count`.
- [ ] Profile YAML parse errors include filename and line/field context where practical.
- [ ] Duplicate profile ids are marked invalid and do not crash app startup.
- [ ] Missing `launch_template` blocks use of the profile and sets validation state to invalid.
- [ ] Profile type supports exactly `coding` and `non-code` for v1.
- [ ] Profiles list shows name, provider/tool, profile type, sandbox mode, launch template, source, and validation state.
- [ ] Invalid profiles are visible in an error state but cannot be selected for launch.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers reload and invalid YAML display.

## Implementation Notes

- YAML files remain the source of truth. SQLite is a cache for fast startup and UI state.
- Do not invent plugin behavior; v1 profiles only render launch templates and metadata.
- Keep launch template variables explicit so Directive 006 and Directive 010 can audit command construction.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

