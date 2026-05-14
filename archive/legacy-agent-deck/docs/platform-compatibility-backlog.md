# Platform Compatibility Backlog

AgentDeck targets macOS, Windows, and Linux desktop builds.

## Current State

- CI runs Rust tests and Tauri debug builds on macOS, Linux, and Windows.
- Release workflow builds macOS artifacts, Linux AppImage/RPM bundles, and Windows NSIS/MSI installers.
- macOS has the richest native integration: overlay title bar, vibrancy, tray behavior, app icon lookup, `open -a` app launching, and microphone permission handling for dictation.
- Windows has explicit support for command resolution, `.cmd`/`.bat` launch wrapping, hidden child-process consoles, Windows path namespace normalization, Explorer defaults, and Windows-specific Tauri config.
- Linux has WebKitGTK rendering workarounds, AppImage/RPM release paths, Nix dev-shell/package support, and Linux package dependency coverage in CI/release workflows.
- Dictation is implemented on macOS/Linux and stubbed on Windows.

## Backlog

1. Fix daemon source path/name drift.
   - `src-tauri/src/bin/codex_monitor_daemon.rs` currently references `agent_deck_daemon/rpc.rs` and `agent_deck_daemon/transport.rs`.
   - Existing files live under `src-tauri/src/bin/codex_monitor_daemon/`.
   - `cargo check` fails on Windows with `couldn't read src\bin\agent_deck_daemon\rpc.rs`.

2. Decide and wire the Linux Tauri config.
   - `src-tauri/tauri.linux.conf.json` exists and uses conservative Linux window settings.
   - Current npm scripts, CI debug build, and Linux release build appear to use the default config instead.
   - If this config is canonical, route Linux dev/build/release commands through it.

3. Clarify Windows dictation status.
   - README lists LLVM/Clang as required on Windows for dictation dependencies.
   - Current Rust module selection stubs dictation on Windows.
   - Update docs or implementation so Windows dictation expectations are unambiguous.

4. Keep platform-specific launch behavior covered by tests.
   - Continue covering Windows namespace paths, `.cmd`/`.bat` quoting, app open targets, and file-manager labels.
   - Add targeted coverage when Linux config routing or daemon naming changes.

## Validation Snapshot

- `npm run typecheck`: passes.
- `cd src-tauri && cargo check`: fails because the daemon module path references `agent_deck_daemon/*` while files exist under `codex_monitor_daemon/*`.
