# Terminal Board Clean Slate Specification

## Purpose

Terminal Board is a lightweight desktop app for working across multiple local projects from one clean interface. The app is terminal-first. It does not try to become a full agent platform, Git client, IDE, usage dashboard, or account manager. It provides a beautiful multi-workspace board where every useful unit of work is a real terminal session.

The product exists to remove the bottleneck of jumping between many IDE windows, terminals, and project folders. A user can keep several projects visible, start several terminal sessions in each project, and quickly move between live sessions without losing context.

The current AgentDeck codebase is treated as a legacy reference implementation. It contains useful pieces that can be mined later, but the clean app should not inherit the current product shape by default.

## Core Concept

The main experience is:

- A left sidebar of workspaces.
- Nested recent sessions under each workspace.
- A main tile board of live terminal sessions.
- Workspace accent colors that visually connect sidebar rows to session tiles.
- A focused session view when a tile is opened.
- Session history that remains under a workspace until the workspace or session is explicitly closed, archived, or deleted.

Each tile is a terminal-backed session. A session may run a plain shell, Codex, Claude, Hermes, a dev server, a test runner, or any custom command preset. Authentication belongs inside the terminal session itself. If Codex needs sign-in, the user runs Codex and authenticates in that terminal. The app does not own AI provider auth.

## Product Decisions

These decisions define the clean-slate direction.

| Area | Decision |
| --- | --- |
| Primary workflow | Multi-workspace terminal board |
| Primary unit | Terminal session tile |
| Main target platform | Windows first |
| Secondary platforms | macOS and Linux |
| App windows | One app window |
| Auth model | Auth happens inside terminal sessions |
| Git features | Not core for MVP |
| Workspace colors | Core visual affordance |
| Terminal previews | Live real output, not fake cards |
| Session history | Persist under workspace, show recent sessions first |
| Session archive | Hide old sessions without deleting transcripts |
| Tile layout | Automatic grid first, drag-and-drop later |
| Workspace click behavior | Filter or spotlight workspace tiles first, detailed overview later if needed |
| Usage snapshot | Optional compact feature, not a main dashboard |

## Non-Goals

The clean app should intentionally avoid these features in the MVP:

- Git panels, GitHub PR views, branch management, review flows.
- App-owned OpenAI, Claude, or Codex account management.
- Orchestrator side panel.
- Multi-agent abstractions outside terminals.
- Worktree, clone, and workspace group complexity.
- Mobile, remote backend, daemon sync, Tailscale, or server mode.
- Heavy settings.
- Fake session tiles.
- Notification machinery beyond minimal error reporting.
- Complex command approval systems.
- Release/update infrastructure during the first prototype.

These features are not banned forever. They must earn their way back by serving the terminal-board workflow.

## MVP Product Shape

The first usable version should include only this:

1. Workspace sidebar.
2. Add workspace from local folder.
3. Remove or close workspace.
4. Rename workspace display name.
5. Assign workspace color.
6. Main live terminal tile grid.
7. Start new session under a workspace.
8. Select session type from presets.
9. Plain terminal preset as the default.
10. Codex terminal preset that runs `codex`.
11. Claude terminal preset that runs `claude`.
12. Custom command preset.
13. Click tile to focus terminal.
14. Type and paste in focused terminal.
15. Paste screenshots into focused session as file attachments and insert usable file paths.
16. Persist workspaces, sessions, tile layout, and transcripts.
17. Show top five recent sessions under each workspace.
18. Show more sessions under a workspace.
19. Archive and delete closed sessions.
20. Compact usage snapshot behind a disclosure or top-right utility surface.

## Main Layout

The app has one window and three primary zones.

### Workspace Sidebar

The left sidebar shows workspaces and their recent sessions.

Each workspace row includes:

- Accent color.
- Workspace name.
- Path hint on hover or secondary line.
- Count of live sessions.
- Add session button.
- Overflow menu for rename, color, close, remove, archive closed sessions.

Each workspace can expand to show sessions:

- Top five recent sessions are visible by default.
- "Show more" reveals additional sessions.
- Archived sessions are hidden by default.
- A workspace-level archive view can reveal archived sessions.

Session rows under a workspace include:

- Session title.
- Preset icon or label.
- Status dot.
- Last activity time.
- Optional unread or needs-attention indicator if detected.
- Close/archive action.

### Tile Board

The main area shows a responsive grid of session tiles.

Each tile includes:

- Workspace accent strip or border.
- Workspace name.
- Session title.
- Preset label: Terminal, Codex, Claude, Hermes, Custom.
- Live output tail.
- Status: starting, running, waiting, exited, failed, archived.
- Last output time.
- Controls for focus, restart, stop, archive, close.

Tile output must be real output from the terminal session. Empty or fake examples are not allowed in the running app.

Tile previews should be live but lightweight. The recommended MVP approach is a read-only output tail rendered from the session ring buffer. A full interactive terminal renderer is used in focused view. Rendering a full xterm instance in every tile can be evaluated later if performance remains good.

### Focused Session View

Clicking a tile opens the focused session view.

The focused view includes:

- Full interactive terminal.
- Session title and rename.
- Workspace name and color.
- Current command preset.
- Started time and last activity.
- Controls: back to board, stop, restart, archive, delete.
- Attachment tray for pasted screenshots/files.
- Optional transcript drawer.

The focused terminal is the source of truth for interaction. Tiles are for monitoring and fast navigation.

## Workspace Behavior

Workspaces are local project folders. A workspace can be open, closed, or removed.

### Open Workspace

An open workspace appears in the sidebar and can own live or closed sessions.

### Closed Workspace

A closed workspace is hidden from the default sidebar view but its metadata and session history can remain in storage. This is useful when the user temporarily wants a project out of the way.

### Removed Workspace

Removing a workspace deletes the app's workspace entry. It should not delete project files. Session transcripts may be retained in an archive until the user explicitly deletes them, or removed with confirmation if the user chooses "Remove workspace and session history."

### Workspace Color

Workspace color is a first-class identity marker. The same color appears in:

- Sidebar workspace row.
- Nested session rows.
- Session tile border or accent strip.
- Focused session header.
- Usage snapshot workspace filter chips.

Color assignment should be deterministic by default but editable by the user.

## Session Model

A session is a terminal process plus metadata and history.

Session lifecycle:

1. Created.
2. Starting.
3. Running.
4. Exited or failed.
5. Archived or deleted.

Closing a live session stops the terminal process but does not delete transcript history. Archiving hides the session from the normal sidebar and board. Deleting removes metadata and transcript files after confirmation.

### Session History

Session history must survive app restart. The MVP should guarantee that transcripts and session metadata survive. Live OS processes surviving app close is a separate feature.

Recommended MVP behavior:

- When the app closes, live PTY processes are stopped.
- Session metadata and transcripts remain.
- On app restart, previous live sessions appear as interrupted or exited.
- The user can restart a session in the same workspace with the same preset.

Future behavior:

- Use a process broker or tmux-style backend to keep sessions alive after app close.
- Reattach terminal views to live processes when the app opens again.

This split avoids overbuilding the first version while preserving the user's history.

### Sidebar Session Retention

Each workspace shows:

- Live sessions first.
- Then recently active closed sessions.
- Default visible count: five.
- "Show more" reveals additional unarchived sessions.
- Archive action hides old sessions.
- Delete action removes session history.

Automatic archival can be added later:

- Archive closed sessions older than 30 days.
- Keep pinned sessions unarchived.
- Keep sessions with manual title edits unarchived.

## Command Presets

Starting a session means choosing a preset. The app does not need native AI provider integration; it starts terminal commands.

Default presets:

| Preset | Command | Notes |
| --- | --- | --- |
| Terminal | platform default shell | Default action |
| Codex | `codex` | Auth and provider selection happen inside terminal |
| Claude | `claude` | Requires user-installed CLI |
| Hermes | user-configured | Optional custom preset |
| Dev server | user-configured | Example: `npm run dev` |
| Tests | user-configured | Example: `npm test` |
| Custom | user input | Saved per workspace or global |

Presets should support:

- Display name.
- Icon.
- Command.
- Arguments.
- Environment variables.
- Working directory.
- Whether to start in interactive mode.
- Whether to auto-run on workspace open.
- Global default plus workspace override.

The app should not hide the actual command. Users should always be able to inspect and edit what will run.

## Authentication Policy

No provider authentication should be managed by the app in the MVP.

For Codex:

- User opens a Codex session tile.
- The app starts `codex` in the workspace.
- If Codex asks for auth, the terminal displays it.
- The user completes auth through Codex CLI's normal flow.

For Claude, Hermes, or other CLIs:

- The same rule applies.
- The app only provides the terminal process and workspace cwd.

Optional future helper:

- Detect common auth prompts and offer copy/open-link affordances.
- Keep this as terminal assistance, not app-owned account state.

## Screenshot and Clipboard Support

Pasting screenshots into terminal sessions is important.

Terminals cannot reliably receive raw image clipboard data as terminal input. The app should support screenshot paste by converting images into files and making those files easy to reference from the terminal.

Recommended MVP behavior:

1. User focuses a session.
2. User pastes an image from clipboard.
3. App saves the image to the session attachment folder.
4. App displays the attachment in a tray.
5. App inserts or offers to insert the file path into the terminal input.

Attachment storage:

```text
app-data/
  workspaces/
    <workspace-id>/
      sessions/
        <session-id>/
          attachments/
            2026-05-03-130512-screenshot.png
```

The inserted path should be quoted correctly for the active shell.

Future behavior:

- Drag files onto a tile or focused terminal.
- Attach multiple screenshots.
- Copy a markdown image reference.
- Command-preset-specific image handling if a CLI supports richer attach commands.

## Usage Snapshot

The current app's usage snapshot is valuable but should become a compact optional surface. It should not dominate the main screen.

MVP placement options:

- Collapsible strip above or below tile board.
- Top-right popover.
- Workspace sidebar footer.
- Focused workspace/session details drawer.

Recommended initial placement:

- A small top-right "Usage" button.
- Opens a popover or drawer.
- Defaults to current selected workspace if one is selected.
- Supports "All workspaces."

Useful metrics:

- Tokens in last 7 days.
- Tokens in last 30 days.
- Average daily tokens.
- Agent time.
- Agent runs.
- Cache hit rate.
- Peak day.
- Top models.

Current implementation references worth mining:

| Feature | Current path |
| --- | --- |
| Usage scanner core | `src-tauri/src/shared/local_usage_core.rs` |
| Tauri command wrapper | `src-tauri/src/local_usage.rs` |
| Rust types | `src-tauri/src/types.rs` |
| Frontend types | `src/types.ts` |
| Usage hook | `src/features/home/hooks/useLocalUsage.ts` |
| View model | `src/features/home/homeUsageViewModel.ts` |
| UI component | `src/features/home/components/HomeUsageSection.tsx` |
| Formatters | `src/features/home/homeFormatters.ts` |

The scanner currently reads local Codex session JSONL data, aggregates daily token usage, computes agent time, top models, and totals. This should be extracted as an optional feature after the terminal board MVP is stable.

## Terminal Engine

The app should be built around a robust terminal engine.

Recommended baseline:

- Frontend terminal renderer: `@xterm/xterm` with fit addon.
- Backend PTY: Rust `portable-pty`.
- App shell: Tauri.
- Frontend: React.
- Storage: local JSON or SQLite. SQLite is preferred once transcripts/search/archive are needed.

Current implementation references worth mining:

| Feature | Current path |
| --- | --- |
| Rust PTY session | `src-tauri/src/terminal.rs` |
| Terminal output and exit event types | `src-tauri/src/backend/events.rs` |
| Tauri event sink | `src-tauri/src/event_sink.rs` |
| Tauri command registration | `src-tauri/src/lib.rs` |
| Frontend IPC wrappers | `src/services/tauri.ts` |
| Frontend terminal events | `src/services/events.ts` |
| Terminal controller | `src/features/terminal/hooks/useTerminalController.ts` |
| Terminal session hook | `src/features/terminal/hooks/useTerminalSession.ts` |
| Terminal tab model | `src/features/terminal/hooks/useTerminalTabs.ts` |
| Terminal styles | `src/styles/terminal.css` |

The clean app should not copy the old controller shape wholesale. It should extract the PTY and event lessons and build a session-tile model from scratch.

## Terminal Requirements

Backend requirements:

- Open PTY in workspace cwd.
- Start platform default shell.
- Start custom command preset.
- Write input.
- Resize terminal.
- Stop process.
- Detect process exit.
- Emit output chunks tagged by session id.
- Maintain bounded output ring buffer in memory.
- Append transcript to disk.
- Handle UTF-8 partial chunks.
- Handle Windows shell quirks.
- Kill process tree safely on close.

Frontend requirements:

- Render live output tail in tiles.
- Render full xterm in focused view.
- Focus terminal reliably.
- Support paste text.
- Support paste image attachments.
- Resize terminal on container resize.
- Keep keyboard shortcuts from stealing terminal input.
- Avoid fake output.

## Storage Model

SQLite is recommended for the clean app once beyond a spike. JSON files are acceptable for a very early prototype, but session history, archive state, transcript search, and ordering become easier with SQLite.

Suggested storage layout:

```text
app-data/
  terminal-board.db
  transcripts/
    <workspace-id>/
      <session-id>.log
  attachments/
    <workspace-id>/
      <session-id>/
        <files>
```

Suggested tables:

```sql
workspaces(
  id text primary key,
  name text not null,
  path text not null,
  accent text not null,
  is_open integer not null,
  sort_index integer not null,
  created_at integer not null,
  updated_at integer not null,
  last_active_at integer not null
);

command_presets(
  id text primary key,
  name text not null,
  command text not null,
  args_json text not null,
  env_json text not null,
  icon text,
  scope text not null,
  workspace_id text,
  created_at integer not null,
  updated_at integer not null
);

sessions(
  id text primary key,
  workspace_id text not null,
  preset_id text,
  title text not null,
  command text not null,
  args_json text not null,
  cwd text not null,
  status text not null,
  tile_index integer not null,
  tile_size text not null,
  is_archived integer not null,
  is_pinned integer not null,
  transcript_path text not null,
  created_at integer not null,
  started_at integer,
  last_active_at integer not null,
  exited_at integer,
  exit_code integer
);

attachments(
  id text primary key,
  session_id text not null,
  path text not null,
  mime_type text not null,
  created_at integer not null
);
```

## Frontend State Model

Suggested TypeScript domain types:

```ts
type Workspace = {
  id: string;
  name: string;
  path: string;
  accent: string;
  isOpen: boolean;
  sortIndex: number;
  lastActiveAt: number;
};

type SessionStatus =
  | "created"
  | "starting"
  | "running"
  | "waiting"
  | "exited"
  | "failed"
  | "archived";

type SessionKind =
  | "terminal"
  | "codex"
  | "claude"
  | "hermes"
  | "custom";

type CommandPreset = {
  id: string;
  name: string;
  kind: SessionKind;
  command: string;
  args: string[];
  env: Record<string, string>;
  icon: string;
  workspaceId: string | null;
};

type TerminalSession = {
  id: string;
  workspaceId: string;
  presetId: string | null;
  kind: SessionKind;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: SessionStatus;
  tileIndex: number;
  tileSize: "small" | "medium" | "large";
  isArchived: boolean;
  isPinned: boolean;
  transcriptPath: string;
  createdAt: number;
  startedAt: number | null;
  lastActiveAt: number;
  exitedAt: number | null;
  exitCode: number | null;
};

type TerminalRuntime = {
  sessionId: string;
  outputTail: string;
  hasProcess: boolean;
  cols: number;
  rows: number;
};
```

Keep the domain model independent from React component state. The session store should be usable by tiles, sidebar, focused view, and usage surfaces without duplicating state.

## IPC Contract

Suggested Tauri commands:

```text
workspace_list()
workspace_add(path)
workspace_update(id, patch)
workspace_close(id)
workspace_remove(id, removeHistory)

preset_list(workspaceId?)
preset_create(input)
preset_update(id, patch)
preset_delete(id)

session_list(workspaceId?, includeArchived)
session_create(workspaceId, presetId?, commandOverride?)
session_start(sessionId, cols, rows)
session_write(sessionId, data)
session_resize(sessionId, cols, rows)
session_stop(sessionId)
session_restart(sessionId)
session_archive(sessionId)
session_unarchive(sessionId)
session_delete(sessionId, deleteTranscript)
session_read_transcript(sessionId, cursor?, limit?)
session_search(query, workspaceId?)

attachment_create_from_clipboard(sessionId)
attachment_list(sessionId)
attachment_delete(id)

usage_snapshot(workspaceId?, days?)
```

Suggested events:

```text
session/output
session/status
session/exit
session/titleChanged
workspace/changed
usage/changed
```

Events should use session ids as the primary routing key. Workspace ids are secondary context.

## Tile Board Behavior

Automatic grid first:

- Tiles flow in CSS grid.
- Default tile size is medium.
- User can mark important sessions as large.
- Pinned sessions sort before unpinned sessions.
- Live sessions sort before closed sessions.
- Recent activity sorts within each group.

Drag-and-drop can be added after the MVP:

- Reorder tiles.
- Resize tiles.
- Move session to another workspace only if the process can be restarted safely in the new cwd. Do not move live process cwd.

Tile status detection:

- `running`: process alive and output recently changed.
- `waiting`: process alive, no output recently.
- `exited`: process ended with exit code 0.
- `failed`: process ended nonzero or start failed.
- `archived`: hidden from normal board.

Do not infer too much from terminal text in the MVP. Keep status simple and reliable.

## Workspace Selection Behavior

Clicking a workspace in the sidebar should initially filter or spotlight tiles for that workspace.

Recommended MVP behavior:

- Single click workspace: filter board to that workspace.
- "All workspaces" remains available at top of board.
- If a session is focused, clicking another workspace returns to board filtered to that workspace.
- The sidebar keeps all workspaces visible.

Future behavior:

- Workspace overview panel with recent sessions, presets, usage, and quick actions.
- Cross-workspace command starter.

The MVP should avoid building a separate workspace overview until the terminal board proves stable.

## Search

Transcript search is useful but not MVP-critical.

MVP:

- Search workspace/session titles.
- Search visible output tail in memory.

Phase 2:

- Search transcript files.
- Filter by workspace.
- Filter by session preset.
- Open focused session at matching transcript line.

SQLite full-text search is a good fit if transcripts are indexed.

## Visual Design Direction

The app should feel clean, focused, and premium. It should not feel like an admin dashboard.

Design principles:

- Terminal board first.
- Minimal chrome.
- High contrast and readable terminal output.
- Workspace colors used consistently but not overwhelmingly.
- No fake content.
- No oversized marketing-style hero sections.
- Compact controls.
- Icons for obvious actions.
- Labels only where clarity needs them.
- Cards are tiles, not nested dashboard panels.
- Smooth focus transitions between board and terminal view.

Main screens:

- Empty state: add first workspace.
- All workspaces board.
- Workspace-filtered board.
- Focused terminal.
- Session archive.
- Usage popover or drawer.
- Lightweight settings.

## Settings

Settings should be short and boring.

MVP settings:

- Theme.
- Font size.
- Terminal font family.
- Default shell.
- Default tile size.
- Screenshot attachment folder policy.
- Command presets.

Avoid settings for provider auth, Git, daemons, remote servers, mobile, or orchestration.

## Platform Notes

Windows is the primary target. The app should still be designed for macOS and Linux.

Windows requirements:

- Default shell should prefer PowerShell or user-configured shell.
- Handle `cmd.exe`, PowerShell, and `pwsh`.
- Quote pasted file paths correctly.
- Kill process trees safely.
- Avoid shell command composition for destructive filesystem operations.

macOS/Linux requirements:

- Default shell from `SHELL`.
- Interactive shell args.
- UTF-8 locale.
- PTY resize behavior.

Cross-platform terminal behavior must be tested early. Terminal handling is the product core.

## Architecture

Recommended clean architecture:

```text
src/
  app/
    App.tsx
    routes.ts
  domain/
    workspaces.ts
    sessions.ts
    presets.ts
    usage.ts
  features/
    workspace-sidebar/
    tile-board/
    focused-session/
    usage-snapshot/
    settings/
  services/
    ipc.ts
    events.ts
    clipboard.ts
  styles/
    tokens.css
    layout.css
    terminal.css
src-tauri/
  src/
    main.rs
    commands/
      workspaces.rs
      sessions.rs
      presets.rs
      usage.rs
      attachments.rs
    core/
      storage.rs
      terminal.rs
      transcripts.rs
      usage.rs
      process.rs
```

Rules:

- Domain types live outside components.
- IPC wrappers live in one frontend service module.
- Tauri command names stay stable.
- Terminal process logic stays in Rust core.
- UI components do not know about PTY internals.
- Storage layer owns migrations.
- No feature imports from archived legacy code.

## Extraction Map From Legacy App

The legacy codebase should be archived and used as a reference library only.

Useful pieces to extract or study:

| Need | Legacy reference |
| --- | --- |
| PTY backend | `src-tauri/src/terminal.rs` |
| Terminal event shapes | `src-tauri/src/backend/events.rs` |
| Event emit bridge | `src-tauri/src/event_sink.rs` |
| Terminal frontend session hook | `src/features/terminal/hooks/useTerminalSession.ts` |
| Terminal tab concepts | `src/features/terminal/hooks/useTerminalTabs.ts` |
| Tauri terminal IPC | `src/services/tauri.ts` |
| Tauri terminal events | `src/services/events.ts` |
| Local usage scanner | `src-tauri/src/shared/local_usage_core.rs` |
| Usage frontend model | `src/features/home/homeUsageViewModel.ts` |
| Usage component patterns | `src/features/home/components/HomeUsageSection.tsx` |
| Workspace type/storage ideas | `src-tauri/src/types.rs`, `src/types.ts`, `src-tauri/src/storage.rs` |
| Workspace accent idea | `src/utils/workspaceAccent.ts` |
| File picker workspace add flow | `src/features/workspaces/hooks/useWorkspaceCrud.ts` |

Pieces not to extract for MVP:

| Avoid | Reason |
| --- | --- |
| Orchestrator panel | Not terminal-first |
| Git UI | Not core |
| Worktree/clone UI | Adds complexity before board is stable |
| Account settings/auth flows | Auth belongs inside terminals |
| Remote daemon/mobile backend | Not needed for single local desktop app |
| Large settings sections | Product distraction |
| Notification/toast system | Too much machinery for MVP |
| Current home dashboard | Mixed goals and fake/demo state history |

## Archive Strategy

Do not physically archive the current app until the clean-slate spec is accepted.

When ready, use this strategy:

1. Create a safety branch or tag for the current app.
2. Create `archive/legacy-agent-deck/`.
3. Move legacy implementation into the archive folder.
4. Keep `.git/` at repo root.
5. Keep the clean-slate spec available at root docs.
6. Scaffold the new app at repo root.
7. Add `archive/legacy-agent-deck/README.md` explaining that legacy code is reference-only.

Suggested archive contents:

```text
archive/
  legacy-agent-deck/
    src/
    src-tauri/
    docs/
    scripts/
    design-system/
    package.json
    package-lock.json
    README.md
    AGENTS.md
    TODO.md
```

Root after clean scaffold:

```text
.
  src/
  src-tauri/
  docs/
    terminal-board-clean-slate-spec.md
  archive/
    legacy-agent-deck/
  package.json
  package-lock.json
  README.md
  AGENTS.md
```

Alternative safer strategy:

- Create a new sibling repo or folder named `terminal-board`.
- Keep AgentDeck untouched as a reference.
- Copy only specific files when needed.

The sibling-folder strategy is safer. The archive-in-place strategy is cleaner if this repository should become the new app.

## Implementation Phases

### Phase 0: Freeze and Archive

Goal: preserve current app as reference.

Tasks:

- Confirm clean-slate spec.
- Decide in-place archive or sibling project.
- Freeze current app changes.
- Archive legacy code.
- Create a minimal new README focused on Terminal Board.

### Phase 1: Terminal Spike

Goal: prove multiple live terminals in one Tauri window.

Tasks:

- Scaffold minimal Tauri + React app.
- Add Rust PTY command to open a terminal in cwd.
- Add output event stream.
- Add write and resize commands.
- Render one xterm focused terminal.
- Open two terminal sessions in different workspaces.
- Confirm Windows behavior.

Acceptance:

- Two sessions run at the same time.
- Input goes to correct session.
- Resize works.
- Process exit is detected.
- Output is not mixed between sessions.

### Phase 2: Workspace Sidebar and Tile Board

Goal: build the actual product surface.

Tasks:

- Workspace add/remove/rename/color.
- Session create from selected workspace.
- Tile grid with live output tail.
- Focus tile to full terminal.
- Back to board.
- Stop/restart session.

Acceptance:

- User can add two workspaces.
- User can start three sessions across them.
- Tiles show real live output.
- Workspace color correlation is obvious.
- Focused terminal is usable.

### Phase 3: Presets

Goal: make session creation fast.

Tasks:

- Add preset menu.
- Add Terminal, Codex, Claude, Custom presets.
- Store global presets.
- Store workspace overrides.
- Add quick "new Codex here" action.

Acceptance:

- User can start plain shell.
- User can start Codex in workspace.
- User can start Claude in workspace.
- User can add/edit custom command.

### Phase 4: Persistence and Archive

Goal: make the app trustworthy across restarts.

Tasks:

- Persist workspaces.
- Persist sessions.
- Persist transcripts.
- Persist tile order.
- Show recent five sessions under each workspace.
- Add show more.
- Add archive/unarchive.
- Add delete.

Acceptance:

- App restart keeps workspace/session history.
- Closed sessions remain visible under workspace.
- Archived sessions are hidden from default view.
- Transcript can be opened after process exit.

### Phase 5: Screenshot Paste

Goal: support visual debugging workflows.

Tasks:

- Detect image paste in focused terminal.
- Save image attachment.
- Show attachment tray.
- Insert quoted file path into terminal input.
- Support remove attachment.

Acceptance:

- User can paste screenshot.
- File is saved under session.
- Terminal gets usable path.

### Phase 6: Usage Snapshot

Goal: bring back the useful usage feature in compact form.

Tasks:

- Extract usage scanner core.
- Add `usage_snapshot` command.
- Add compact usage popover.
- Support all workspaces and selected workspace.
- Show tokens/time toggle.

Acceptance:

- Usage opens on demand.
- It does not clutter the board.
- Per-workspace and all-workspaces views work.

### Phase 7: Search and Polish

Goal: improve daily use.

Tasks:

- Search workspace/session titles.
- Search visible output tails.
- Optional transcript search.
- Keyboard shortcuts.
- Command palette.
- Tile resize and reorder.

Acceptance:

- User can navigate without hunting.
- App feels fast and calm.

## Testing Strategy

Prioritize tests around terminal correctness and persistence.

Backend tests:

- Open PTY with valid workspace path.
- Reject unknown workspace.
- Write to correct session.
- Resize correct session.
- Close removes session.
- Process exit emits event.
- Transcript append works.
- Attachment save path is safe.

Frontend tests:

- Workspace color appears in sidebar and tile.
- Adding workspace updates sidebar.
- Creating session adds tile.
- Output event updates correct tile.
- Clicking tile opens focused view.
- Closed session remains in sidebar history.
- Archive hides session.
- Preset menu launches correct command request.

Manual validation:

- Windows PowerShell.
- Windows cmd.
- Windows pwsh.
- macOS zsh.
- Linux bash.
- Codex CLI auth inside terminal.
- Claude CLI auth inside terminal.
- Screenshot paste.

## MVP Acceptance Criteria

The first version is successful when:

- User can add multiple workspaces.
- User can start multiple live terminal sessions in one app.
- Tiles show real live output.
- Clicking a tile opens a full terminal.
- Workspace colors make ownership obvious.
- Sessions remain as history after they exit.
- The sidebar shows recent sessions under workspaces.
- User can archive old sessions.
- User can start Codex/Claude through terminal presets.
- Authentication works naturally in the terminal.
- App has no fake session content.
- App feels cleaner than juggling multiple IDE terminals.

## Open Questions

These remain intentionally undecided:

- Should live processes survive app close in phase 1, or should only history survive?
- Should workspace click filter, spotlight, or show an overview? MVP recommendation: filter.
- Should tile previews become fully interactive, or remain read-only live tails? MVP recommendation: read-only live tails.
- Should transcript storage be raw ANSI, plain text, or both?
- Should usage snapshot read only Codex logs, or eventually support Claude/Hermes logs too?
- Should archive be automatic after a threshold, manual only, or both?

## Guiding Principle

Every feature should answer one question:

Does this help the user manage multiple real project terminals from one calm, beautiful interface?

If the answer is no, it stays out.
