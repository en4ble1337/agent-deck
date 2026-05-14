# Legacy AgentDeck Archive

This directory contains the archived AgentDeck implementation. It is reference-only: do not import from it, build new features inside it, or treat it as the live product surface.

The live app in the repository root is now Terminal Board, a lightweight terminal-first desktop app for multiple local workspaces.

High-value legacy reference files:

- `src-tauri/src/terminal.rs` - portable-pty session mechanics.
- `src-tauri/src/backend/events.rs` - terminal output and exit event shapes.
- `src-tauri/src/event_sink.rs` - Tauri event bridge pattern.
- `src/features/terminal/hooks/useTerminalSession.ts` - frontend xterm session lessons.
- `src/features/terminal/hooks/useTerminalController.ts` - terminal control flow reference.
- `src/features/terminal/hooks/useTerminalTabs.ts` - terminal tab/session concepts.
- `src-tauri/src/shared/local_usage_core.rs` - local Codex usage scanner.
- `src/features/home/components/HomeUsageSection.tsx` - usage UI reference.
- `src/features/home/homeUsageViewModel.ts` - usage view-model reference.
- `src/utils/workspaceAccent.ts` - workspace accent-color idea.

Keep any extraction small and intentional. The clean app should preserve lessons, not inherit the legacy product shape.
