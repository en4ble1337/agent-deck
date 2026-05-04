# Workspace Deck Agent Guide

All docs must describe live state only. Do not leave past commentary in docs.

## Scope

Workspace Deck is the live app in this repository. Its primary MVP view is Terminal Board. The archived AgentDeck implementation lives under `archive/legacy-agent-deck/` and is reference-only.

Canonical product spec:

- `docs/terminal-board-clean-slate-spec.md`

## Project Snapshot

Workspace Deck is a lightweight Tauri desktop app for managing multiple real terminal sessions across local workspaces.

- Frontend: React + Vite (`src/`)
- Backend: Tauri Rust process (`src-tauri/src/`)
- Terminal engine: `portable-pty` backend and `@xterm/xterm` focused renderer
- Storage: local JSON plus transcript files for the early MVP

## Architecture Rules

1. Keep domain types in `src/domain/*`.
2. Keep Tauri IPC wrappers centralized in `src/services/ipc.ts`.
3. Keep frontend event subscriptions centralized in `src/services/events.ts`.
4. Keep Rust terminal/process logic in `src-tauri/src/core/terminal.rs`.
5. Keep Rust persistence in `src-tauri/src/core/storage.rs`.
6. Keep Tauri command modules thin adapters over core logic.
7. Do not import from `archive/legacy-agent-deck/`.
8. Do not add Git, app-owned auth UI, remote daemon, mobile, worktree, clone, or orchestrator features to the MVP.

## Product Invariants

- Terminal sessions are the primary unit of work.
- Tiles must show real terminal output, never fake sample content.
- Authentication for Codex, Claude, and other CLIs happens inside terminal sessions.
- Workspace accent colors must correlate sidebar rows, session rows, tiles, and focused headers.
- Session history belongs under its workspace and should survive app restart.
- Keep the app Windows-first while avoiding platform-specific UI assumptions.

## Validation

Run validations based on touched areas:

```bash
npm run typecheck
npm run build
cd src-tauri && cargo check
```

For terminal/process changes, manually verify at least one session can start, receive input, resize, and stop on Windows.
