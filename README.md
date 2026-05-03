# Terminal Board

Terminal Board is a lightweight, terminal-first desktop app for working across multiple local workspaces in one calm window.

The app centers on a board of real terminal sessions. Add workspaces, start sessions from presets such as Terminal, Codex, Claude, or Custom, and jump from live output tiles into a focused interactive terminal.

## Current MVP

- Workspace sidebar with accent colors.
- Recent sessions nested under each workspace.
- Live terminal sessions backed by `portable-pty`.
- Focused interactive terminal powered by `@xterm/xterm`.
- Session tiles with real output tails.
- Local JSON persistence for workspaces and session metadata.
- Transcript files for session history.

## Development

```bash
npm install
npm run typecheck
npm run build
cd src-tauri && cargo check
```

Run the desktop app:

```bash
npm run tauri:dev
```

Run the browser preview:

```bash
npm run dev
```

Open `http://127.0.0.1:1420/`. Browser preview uses mock terminal data so the UI can be reviewed in tools like the Codex preview pane; real terminal processes still run through Tauri.

The archived AgentDeck implementation is under `archive/legacy-agent-deck/` for reference only.
