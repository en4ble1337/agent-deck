# Next Agent Project Objective Prompt

You are taking over a reset desktop-app project at:

```text
C:\Users\Bart\Documents\AI\Projects\agent-deck
```

The previous RunDeck implementation was archived because it drifted away from the desired product direction. Do not continue that implementation. Do not patch it. Do not revive its UI architecture. Treat it only as historical reference if absolutely necessary.

The current root is intentionally clean and contains:

```text
archived-rundeck-project/
sources/
```

Reference sources already cloned:

```text
sources/CodexMonitor
sources/agtx
```

CodexMonitor:

```text
https://github.com/Dimillian/CodexMonitor.git
commit: dd61b9abd37de5ded86e82b9fe8a83fd49d46fa5
```

agtx:

```text
https://github.com/fynnfluegge/agtx.git
commit: 875dfaf9a46f121d905055c44f8ca2fe6e6dbc86
```

## Main Direction

Use CodexMonitor as the primary foundation.

The owner likes CodexMonitor's interface: the transparent desktop feel, dark glass styling, side panel, layout density, and overall interaction model. The next project should begin from CodexMonitor rather than trying to recreate that look from scratch. The goal is to initialize the root project using CodexMonitor as the real baseline, then gradually modify it into the desired multi-agent session dashboard.

Use agtx only as the workflow reference for session tiles.

The owner likes agtx's multi-session tile concept: a dashboard where multiple agent sessions can be seen at once, scanned quickly, selected, and interacted with. The default first screen should lean toward this tile dashboard rather than a single-session-only view. Later the app may support alternate views, but the tile dashboard should be primary by default.

## Why The Previous Attempt Failed

The previous RunDeck implementation over-invested in a custom product architecture before the desired user experience was stable. It preserved too much backend/domain planning while trying to bolt a CodexMonitor-like shell onto an existing scaffold. That produced friction and drift:

- The app did not feel like CodexMonitor even after shell work.
- The first workflow gate, opening a workspace, was broken and required manual path entry.
- The implementation became process-heavy before the interface direction was proven.
- The tile/dashboard concept from agtx was not treated as the primary view.
- Too much energy went into preserving old contracts instead of starting from the interface the owner actually wants.

Do not repeat this. Start from the desired product surface.

## Product Goal

Build a local desktop control surface for managing multiple AI agent sessions.

The experience should feel like:

```text
CodexMonitor visual shell
+ agtx-style multi-session tiles
+ local operator control over agent sessions
```

The app should eventually let the user:

- Open or register local workspaces/projects.
- See multiple active agent sessions as tiles.
- Focus one session from the tile grid.
- Inspect terminal output or logs for a session.
- Start, stop, and archive sessions.
- Track warnings, activity, runtime, and rough session state.
- Keep the UI local-first and operator-controlled.

Do not add cloud sync, multi-user auth, browser automation, GitHub PR creation, auto-merge, autonomous orchestration, or remote daemon behavior unless the owner explicitly changes direction later.

## Foundation Instructions

1. Treat `sources/CodexMonitor` as the app foundation.
2. Initialize the project root from CodexMonitor, not from the archived RunDeck app.
3. Keep the CodexMonitor visual system intact at first: transparency, sidebar, layout, shell density, terminal/review surfaces, and dark desktop feel.
4. Do not immediately rename everything, restructure everything, or replace the shell.
5. First get the CodexMonitor-based app running from the root.
6. After it runs, introduce a default tile dashboard inspired by `sources/agtx`.
7. Use agtx as a behavioral and layout reference for tiles, not as a wholesale backend replacement.

## Desired Default UI

The default view should be a dashboard of interactive session tiles.

Each tile should eventually show:

- Session name or title.
- Agent/tool profile.
- Workspace/project.
- Status.
- Runtime.
- Last activity.
- Last output preview.
- Warning/attention indicators.
- Basic actions such as focus and stop.

The tile grid should feel native to the CodexMonitor shell. It should not look like a generic card board pasted into the app. Preserve CodexMonitor's visual vocabulary and adapt the tiles to it.

The app should still allow a focused session view, but it should not be the only main view. The owner wants to see multiple sessions at once.

## Implementation Strategy For The Next Agent

Work in small phases:

### Phase 1: Root Initialization

- Confirm the root only contains `archived-rundeck-project`, `sources`, and this prompt.
- Copy or scaffold from `sources/CodexMonitor` into the root.
- Preserve `sources/` as reference material.
- Do not delete `archived-rundeck-project`.
- Get the CodexMonitor-derived app install/build/dev workflow working from the root.
- Record the exact commands needed to run it.

### Phase 2: Baseline Verification

- Run the app locally.
- Confirm the transparent/glass shell appears.
- Confirm the sidebar and main layout match CodexMonitor before changing product behavior.
- Take note of the main files controlling shell layout, sidebar, terminal, and styling.

### Phase 3: Tile Dashboard Design

- Study agtx's tile/session board concepts.
- Design a CodexMonitor-native tile grid.
- Keep the first version static or fixture-backed if necessary.
- Make the tile grid the default main view.
- Ensure clicking a tile can focus/select a session.

### Phase 4: Real Session Integration

- Only after the shell and tile UI feel right, connect real local session launching/control.
- Keep the implementation local-first.
- Avoid adding large backend abstractions until the interaction model is proven.

## Important Constraints

- Do not continue the old archived app as the new app.
- Do not create a generic dashboard from scratch.
- Do not flatten CodexMonitor's visual style into a basic Vite/Tauri scaffold.
- Do not over-plan before proving the UI baseline.
- Do not add product scope beyond local multi-session control.
- Do not add auto-merge or autonomous orchestration.
- Do not add GitHub PR creation.
- Do not add cloud sync or auth.
- Do not use browser automation as a product feature.

## What Good Looks Like First

The first useful milestone is not a complete backend.

The first useful milestone is:

```text
The app launches from the root,
looks and feels like CodexMonitor,
opens to a multi-session tile dashboard,
and lets the user select/focus a tile.
```

Once that exists, deeper functionality can be added incrementally.

## Suggested First Command Sequence

Before modifying files:

```powershell
Get-ChildItem -Force
Get-ChildItem sources -Force
git -C sources/CodexMonitor status --short
git -C sources/agtx status --short
```

Then inspect CodexMonitor:

```powershell
Get-Content -Raw sources/CodexMonitor/package.json
Get-Content -Raw sources/CodexMonitor/src-tauri/tauri.conf.json
Get-ChildItem sources/CodexMonitor/src -Force
Get-ChildItem sources/CodexMonitor/src/styles -Force
```

Then inspect agtx for tile/session-board concepts:

```powershell
rg -n "tile|board|session|agent|status" sources/agtx
```

After that, initialize the root from CodexMonitor and get it running.

