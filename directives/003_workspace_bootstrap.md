# Directive 003: Workspace Bootstrap and Persistence

## Objective

Create the persistent workspace foundation so the app can start from local SQLite state, show first-run setup when needed, create/select/archive workspaces, and restore the last selected workspace on launch.

## Prerequisites

- [ ] Directive 002: Terminal Feasibility Spike Complete

## References

**PRD:**
- User Story: [US-001] First Launch Workspace Entry; [US-002] Workspace Management
- Functional Requirements: [FR-1], [FR-2]
- Feature Specification: [Section 6] App Shell and Workspace Navigation; [Section 11] Phase 1 Local Data Model and Configuration

**ARCH.md:**
- Data Models: `Workspace`, `AppSetting`
- API Contracts: `get_bootstrap_state`, `create_workspace`, `update_workspace`, `select_workspace`
- Directory Structure: `src/features/workspaces/`, `src/app/`, `src/lib/`, `src/types/`, `src-tauri/src/db/`, `src-tauri/src/models/`, `src-tauri/src/services/`, `src-tauri/src/commands/`, `src-tauri/migrations/`
- Error Codes: `DATABASE_UNAVAILABLE`, `APP_DATA_DIR_UNAVAILABLE`, `VALIDATION_ERROR`, `WORKSPACE_NOT_FOUND`, `WORKSPACE_ARCHIVED`, `WORKSPACE_SLUG_CONFLICT`

**RESEARCH.md:**
- Patterns: Pattern 6: Typed Frontend Tauri Client Wrapper
- Anti-patterns: Anti-pattern 3: Shell Interpolation for Git and Runtime Commands
- Libraries: `rusqlite`, `zod`, `@tauri-apps/api`

## Scope

### In Scope
- Add SQLite connection, migration runner, and app data directory resolution.
- Create migrations for `workspaces` and `app_settings`.
- Expand backend error envelope to match ARCH.md with code, message, details, request id, and retryable.
- Implement workspace service methods for create, update/archive, select, and bootstrap load.
- Implement Tauri commands `get_bootstrap_state`, `create_workspace`, `update_workspace`, and `select_workspace`.
- Add frontend Tauri client wrappers and shared TypeScript DTOs for workspace commands.
- Implement first-run empty state, workspace creation form, active workspace sidebar, and last-selected workspace restore behavior.

### Out of Scope
- Repo registration, profiles, tasks, sessions, warnings, and review data.
- Import/export workspace flows.
- Cloud sync, auth, or multi-user behavior.

## Acceptance Criteria

- [ ] Implementation plan exists in `docs/plans/` before production code changes.
- [ ] SQLite migrations create `workspaces` and `app_settings` with fields defined in ARCH.md.
- [ ] `get_bootstrap_state` returns app data directory, active workspaces, last selected workspace id, and profile presence flag.
- [ ] If no workspace exists, the UI shows a first-run empty state with a create workspace action.
- [ ] `create_workspace` rejects blank names and slug conflicts with `VALIDATION_ERROR` or `WORKSPACE_SLUG_CONFLICT`.
- [ ] Successful workspace creation persists the workspace and selects it.
- [ ] `update_workspace` can rename, edit notes/default paths, and archive a workspace without deleting history.
- [ ] `select_workspace` persists `last_selected_workspace_id` and rejects archived workspaces.
- [ ] On app load, an archived last-selected workspace falls back to the first active workspace.
- [ ] Sidebar shows active workspaces and visually indicates the selected workspace.
- [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] Browser verification with `npm run e2e` or dev-browser skill covers first-run creation and workspace selection.

## Implementation Notes

- Keep frontend validation and backend validation aligned, but do not trust frontend validation alone.
- Store timestamps in UTC and keep archived workspaces hidden from the default sidebar.
- Use a typed frontend client wrapper; do not call `invoke()` directly from components.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made during implementation]

