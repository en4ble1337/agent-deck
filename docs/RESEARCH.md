# RunDeck Implementation Research

## Research Summary

**Search Date:** 2026-04-28
**Tech Stack Context:** Tauri v2 desktop app with React/TypeScript frontend, Rust backend commands/services/adapters, SQLite local state, file-backed logs, xterm.js terminal panes, YAML profile parsing, Git CLI, and Windows/WSL runtime adapters.
**Primary Search Terms:** Tauri React xterm PTY, Tauri AI agents git worktree, Rust git worktree manager AI agents, TypeScript Codex worktree manager, Tauri React local-first SQLite.
**Repositories Evaluated:** 33
**Repositories Recommended:** 7

## Extracted Search Context

**From ARCH.md**

1. **Tech Stack:** Tauri v2, React 18+, TypeScript 5.x, Rust, SQLite, Vite, xterm.js, serde_yaml, Zod, Vitest/RTL/Rust tests, Playwright or dev-browser verification.
2. **Domain Terms:** Workspace, Repo, Runtime Context, WSL Runtime, Agent Profile, Task, Task Board, Session, Terminal Pane, Worktree, Dirty Repo, Changed File, Diff, Review Panel, Validation Run, Warning, Log File.
3. **Key Patterns Needed:** PTY/session backend abstraction, Tauri command/event bridge, WSL-aware command execution, xterm.js pane lifecycle, Git worktree creation/removal, dirty repo blocking, changed-file and diff parsing, file-backed log persistence/redaction, YAML profile validation, SQLite migrations, warning coalescing, frontend operational dashboard layout.

**From PRD.md**

4. **Core Feature Keywords:** Local-first desktop mission control, multi-pane terminal grid, live terminal streaming, task board, coding-agent worktree launch, session logs/history, changed-file tracking, diff review, validation command execution, review outcome gate, stuck/risky/dirty/overlap warnings.
5. **Integration Points:** Local Git CLI, WSL via `wsl.exe`, Codex/Claude/Gemini/shell CLIs, local filesystem, SQLite, PTY backend adapter.

## Recommended Repositories

### Repo 1: sstraus/tuicommander
- **URL:** https://github.com/sstraus/tuicommander
- **Stars:** 41 | **License:** Apache-2.0 | **Last Updated:** 2026-04
- **Relevance:** High
- **Why Relevant:** Closest match found to RunDeck's core problem: local Tauri v2 desktop app, Rust backend, xterm.js/WebGL terminal panes, AI-agent sessions, Git worktrees, and WSL path handling. It uses SolidJS rather than React, so frontend patterns should be adapted rather than copied directly.

**Applicable Patterns:**
- [x] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [ ] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] PTY/session lifecycle
- [x] Git worktree lifecycle
- [x] Terminal pane lifecycle
- [x] WSL shell/path handling

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `src-tauri/src/pty.rs` | Rust `portable-pty` session creation, Tauri event emission, resize/write/close flow, WSL shell detection, output buffering. |
| `src-tauri/src/worktree.rs` | Worktree directory strategies, create/remove/list behavior, dirty checks, branch safety checks, test coverage. |
| `src-tauri/src/git_cli.rs` | Wrapper around Git command execution with consistent error handling. |
| `src/components/Terminal/Terminal.tsx` | xterm.js addon lifecycle, fit/resize timing, hidden-pane buffering, backpressure, search overlay. |
| `src/hooks/usePty.ts` | Frontend IPC wrapper for terminal commands. |
| `docs/architecture/terminal-state-machine.md` | Terminal state-machine documentation useful for RunDeck's `Session Status` and warning rules. |

### Repo 2: max-sixty/worktrunk
- **URL:** https://github.com/max-sixty/worktrunk
- **Stars:** 4,784 | **License:** MIT OR Apache-2.0 | **Last Updated:** 2026-04
- **Relevance:** High
- **Why Relevant:** Rust CLI purpose-built for Git worktree management in parallel AI-agent workflows. It is especially useful for robust Git parsing, worktree state modeling, branch/worktree errors, and tests using temporary repositories.

**Applicable Patterns:**
- [x] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [ ] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] Worktree naming/collision handling
- [x] Git status/diff parsing

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `src/git/repository/worktrees.rs` | Worktree repository operations and state transitions. |
| `src/git/parse.rs` | Parsing `git worktree list --porcelain` and `git status --porcelain -z`. |
| `src/git/diff.rs` | Diff stat parsing and tests for Git output variants. |
| `src/git/error.rs` | Domain-specific Git/worktree error types and operator-facing hints. |
| `src/testing/mock_commands.rs` | Testable command execution abstractions. |
| `docs/content/claude-code.md` | Operational notes for agent/worktree workflows; use as context, not feature scope. |

### Repo 3: aku11i/phantom
- **URL:** https://github.com/aku11i/phantom
- **Stars:** 205 | **License:** MIT | **Last Updated:** 2026-04
- **Relevance:** High
- **Why Relevant:** TypeScript monorepo for managing AI-agent worktrees and Codex sessions. Strong fit for RunDeck's frontend/shared TypeScript side: tested Git wrappers, Codex session history mapping, and app-server process bridging.

**Applicable Patterns:**
- [x] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [ ] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] TypeScript Git command wrappers
- [x] Agent CLI bridge patterns

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `packages/git/src/executor.ts` | Safe `git` invocation through argument arrays and cwd control. |
| `packages/git/src/libs/add-worktree.ts` | Worktree add command construction. |
| `packages/git/src/libs/list-worktrees.ts` | Worktree listing and normalization. |
| `packages/git/src/libs/get-status.ts` | Clean/dirty state and changed-file parsing. |
| `packages/codex/src/bridge.ts` | Codex child process bridge and JSON message handling. |
| `packages/app/src/server/services.ts` | Service layer coordinating projects, worktrees, and Codex sessions. |
| `e2e/src/*.test.ts` | End-to-end tests around create/list/delete/attach workflows. |

### Repo 4: nwiizo/ccswarm
- **URL:** https://github.com/nwiizo/ccswarm
- **Stars:** 137 | **License:** MIT | **Last Updated:** 2026-04
- **Relevance:** Medium
- **Why Relevant:** Rust multi-agent project with a reusable `ai-session` crate that covers PTY/headless session lifecycle and persistence concepts. The orchestration features are out of scope for RunDeck v1; study only the terminal/session primitives.

**Applicable Patterns:**
- [x] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [ ] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] PTY and headless session abstraction
- [x] Session persistence concepts

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `crates/ai-session/src/core/pty.rs` | PTY handle abstraction. |
| `crates/ai-session/src/core/lifecycle.rs` | Start/stop lifecycle and status transitions. |
| `crates/ai-session/src/core/headless.rs` | Non-PTY subprocess mode for validation or non-code sessions. |
| `crates/ai-session/src/persistence/session_store.rs` | Session persistence shape and recovery considerations. |
| `crates/ccswarm/src/session/worktree_session.rs` | How worktree context is attached to an agent session. |
| `crates/ai-session/tests/*.rs` | Rust integration testing approach for session primitives. |

### Repo 5: xtermjs/xterm.js
- **URL:** https://github.com/xtermjs/xterm.js
- **Stars:** 20,391 | **License:** MIT | **Last Updated:** 2026-04
- **Relevance:** High
- **Why Relevant:** Official terminal frontend dependency. Use for xterm.js lifecycle, addons, renderer caveats, Playwright terminal tests, and buffer/search APIs.

**Applicable Patterns:**
- [ ] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [ ] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] Terminal rendering/search/fit behavior
- [x] Browser verification patterns

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `src/browser/public/Terminal.ts` | Public terminal API surface. |
| `addons/addon-fit/src/FitAddon.ts` | Fit/resize calculation behavior. |
| `addons/addon-search/src/SearchAddon.ts` | Search over terminal buffer for log/search UX. |
| `addons/addon-web-links/src/WebLinksAddon.ts` | Link detection for paths/URLs in terminal output. |
| `addons/addon-webgl/src/WebglAddon.ts` | WebGL renderer lifecycle and fallback considerations. |
| `test/playwright/*.test.ts` | Browser-level terminal verification patterns. |

### Repo 6: microsoft/node-pty
- **URL:** https://github.com/microsoft/node-pty
- **Stars:** 1,893 | **License:** MIT | **Last Updated:** 2026-04
- **Relevance:** Medium
- **Why Relevant:** Mature Node PTY implementation used by VS Code and other terminal apps. It is relevant if Phase 0 chooses a Node sidecar/runtime instead of a Rust PTY.

**Applicable Patterns:**
- [ ] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [ ] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] PTY spawn/write/resize API
- [x] Windows ConPTY behavior

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `src/terminal.ts` | Common terminal process API. |
| `src/windowsTerminal.ts` | Windows-specific ConPTY implementation details. |
| `src/unixTerminal.ts` | Unix PTY implementation details. |
| `typings/node-pty.d.ts` | TypeScript API shape if used from a sidecar. |
| `src/terminal.test.ts` | PTY test cases to mirror in RunDeck's Phase 0 spike. |
| `examples/electron/README.md` | xterm.js pairing example; adapt conceptually for Tauri. |

### Repo 7: berbicanes/apiark
- **URL:** https://github.com/berbicanes/apiark
- **Stars:** 1,029 | **License:** MIT | **Last Updated:** 2026-04
- **Relevance:** Medium
- **Why Relevant:** Local-first Tauri v2 + React + Rust desktop app with command modules, storage modules, integration tests, Git helpers, YAML parsing, and a small `portable-pty` terminal command. It is less domain-specific than the agent/worktree repos but useful for app structure.

**Applicable Patterns:**
- [x] Directory structure approach
- [ ] Authentication flow
- [x] API design patterns
- [x] Database schema design
- [x] Testing patterns
- [x] Error handling approach
- [x] File-backed YAML migration pattern
- [x] Tauri command organization

**Key Files to Study:**
| File | What to Learn |
|------|---------------|
| `apps/desktop/src-tauri/src/commands/terminal.rs` | Minimal Tauri PTY command set: create/write/resize/close. |
| `apps/desktop/src-tauri/src/commands/git.rs` | Git status/diff command handler shape. |
| `apps/desktop/src-tauri/src/storage/migration.rs` | Versioned YAML/file migration pattern with atomic writes. |
| `apps/desktop/src-tauri/src/models/error.rs` | Backend error modeling. |
| `apps/desktop/src/lib/tauri-api.ts` | Typed frontend wrapper around Tauri commands. |
| `apps/desktop/src-tauri/tests/integration_tests.rs` | Rust integration test approach for command behavior and persistence. |

## Pattern Catalog

### Pattern 1: Session Backend Adapter With Output Events
**Source:** [sstraus/tuicommander](https://github.com/sstraus/tuicommander) - `src-tauri/src/pty.rs`; [berbicanes/apiark](https://github.com/berbicanes/apiark) - `apps/desktop/src-tauri/src/commands/terminal.rs`
**Applies To:** US-005, US-006, US-007, US-008; ARCH components `Session`, `Terminal Pane`, `Log File`, `PTY Backend Adapter`.

**Code Reference:**
```rust
// Adapted pattern, not copied: keep process control behind an adapter.
trait SessionBackend {
    fn launch(&self, req: LaunchRequest) -> Result<SessionHandle, AppError>;
    fn write(&self, session_id: SessionId, bytes: &[u8]) -> Result<(), AppError>;
    fn resize(&self, session_id: SessionId, rows: u16, cols: u16) -> Result<(), AppError>;
    fn stop(&self, session_id: SessionId) -> Result<(), AppError>;
}
```

**Adaptation Notes:**
- Use ARCH names: `Session`, `Runtime Context`, `Log File`, `Session Status`.
- Emit output to the UI and append to a redacted log writer in the same read loop.
- Do not let the frontend own process truth; SQLite should persist metadata, while the backend owns live handles.
- Add stuck-session warning updates from `last_activity_at` rather than a UI-only timer.

### Pattern 2: Explicit WSL Runtime Adapter
**Source:** [sstraus/tuicommander](https://github.com/sstraus/tuicommander) - `src-tauri/src/pty.rs`
**Applies To:** US-003, US-005, US-012, US-013; ARCH components `Runtime Context`, `WSL Runtime`, `WSL Distro`.

**Code Reference:**
```rust
// Adapted pattern: make WSL explicit, not an accidental shell string side effect.
match repo.runtime_context {
    RuntimeContext::WindowsLocal => command.cwd(repo.path),
    RuntimeContext::Wsl => command
        .program("wsl.exe")
        .args(wsl_args(repo.wsl_distro, workdir_inside_wsl(&repo.path))),
}
```

**Adaptation Notes:**
- TUICommander has useful path/shell detection, but RunDeck should centralize it in `src-tauri/src/adapters/wsl.rs`.
- Every Git/session/validation command for a WSL repo must use the same adapter and effective distro.
- Return `WSL_UNAVAILABLE` and `REPO_PATH_NOT_FOUND` through the ARCH error envelope.

### Pattern 3: Worktree Creation With Dirty Preflight
**Source:** [max-sixty/worktrunk](https://github.com/max-sixty/worktrunk) - `src/git/repository/worktrees.rs`, `src/git/parse.rs`; [aku11i/phantom](https://github.com/aku11i/phantom) - `packages/git/src/libs/add-worktree.ts`
**Applies To:** US-011, US-012, US-013; ARCH components `Task`, `Dirty Repo`, `Worktree`, `Branch Name`.

**Code Reference:**
```rust
// Adapted pattern: block first, then create branch/worktree, then persist metadata.
let dirty = git.status_porcelain_z(&repo.path)?;
if !dirty.is_empty() {
    return Err(AppError::dirty_repo(repo.id, dirty));
}

let branch = branch_name_for(&task.title, workspace.branch_prefix, task.id);
let path = worktree_path_for(&workspace, &repo, &task.slug);
git.worktree_add(&repo.path, &path, &branch, &repo.default_branch)?;
```

**Adaptation Notes:**
- Use `Task.slug`, `Workspace.branch_prefix`, and short task-id suffixes per ARCH open question.
- Persist `branch_name`, `base_branch`, `worktree_path`, and `worktree_state` only after Git succeeds.
- Dirty repo blocking must run immediately before worktree creation, not only during repo registration.

### Pattern 4: Machine-Readable Git Parsing
**Source:** [max-sixty/worktrunk](https://github.com/max-sixty/worktrunk) - `src/git/parse.rs`, `src/git/diff.rs`; [aku11i/phantom](https://github.com/aku11i/phantom) - `packages/git/src/libs/get-status.ts`
**Applies To:** US-014, US-015, US-016, US-017; ARCH components `Changed File`, `File Overlap`, `Diff`, `Warning`.

**Code Reference:**
```typescript
// Adapted pattern: parse Git porcelain into typed changed files.
type ChangedFileDto = {
  path: string;
  oldPath?: string;
  status: "staged" | "unstaged" | "untracked" | "deleted" | "renamed" | "mixed";
};

const files = parseStatusPorcelainZ(stdout);
await changedFileRepo.replaceForTask(taskId, files);
```

**Adaptation Notes:**
- Prefer `git status --porcelain -z` for changed files, especially for paths with spaces.
- Use raw `git diff` for the review panel, but parse `--numstat` or `--shortstat` only for counts.
- File-overlap warnings compare normalized repo-relative paths across active tasks in the same `Repo`.

### Pattern 5: xterm.js Pane Lifecycle With Addons and Backpressure
**Source:** [sstraus/tuicommander](https://github.com/sstraus/tuicommander) - `src/components/Terminal/Terminal.tsx`; [xtermjs/xterm.js](https://github.com/xtermjs/xterm.js) - `addons/*`, `test/playwright/*`
**Applies To:** US-006, US-008; ARCH components `Terminal Pane`, `Terminal Grid`, `Log Viewer`.

**Code Reference:**
```tsx
// Adapted pattern: terminal component owns rendering, backend owns process.
useEffect(() => {
  const term = new Terminal(options);
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(container);
  const unsubscribe = subscribeSessionOutput(sessionId, chunk => term.write(chunk));
  return () => { unsubscribe(); term.dispose(); };
}, [sessionId]);
```

**Adaptation Notes:**
- Use Fit/Search/WebLinks addons for MVP; WebGL should be optional until verified on Windows.
- Hidden panes should buffer or pause rendering rather than parsing every byte into invisible xterm instances.
- Browser verification should include four active panes at 1280x720 and resize scenarios.

### Pattern 6: Typed Frontend Tauri Client Wrapper
**Source:** [berbicanes/apiark](https://github.com/berbicanes/apiark) - `apps/desktop/src/lib/tauri-api.ts`; [aku11i/phantom](https://github.com/aku11i/phantom) - `packages/app/src/server/services.ts`
**Applies To:** ARCH command contracts for workspaces, repos, tasks, sessions, review, warnings, logs.

**Code Reference:**
```typescript
// Adapted pattern: keep invoke names and DTO types centralized.
export async function launchTaskSession(input: LaunchTaskSessionInput) {
  return invoke<LaunchTaskSessionResult>("launch_task_session", input);
}
```

**Adaptation Notes:**
- Keep DTOs aligned with ARCH API contracts and `src/types/`.
- Convert backend errors into the shared error envelope at one boundary.
- Avoid direct `invoke()` calls scattered through feature components.

### Pattern 7: Process Bridge as Future Codex Optimization
**Source:** [aku11i/phantom](https://github.com/aku11i/phantom) - `packages/codex/src/bridge.ts`
**Applies To:** Future direct Codex integration; v1 `Agent CLIs` launch flow.

**Code Reference:**
```typescript
// Adapted pattern: optional future bridge for structured agent events.
const child = spawn(codexBin, ["app-server"], { cwd: worktreePath });
child.stdout.on("data", data => routeAgentEvent(parseMessage(data)));
child.on("exit", code => markSessionEnded(sessionId, code));
```

**Adaptation Notes:**
- Do not make this a v1 dependency. PRD says profiles launch CLIs transparently.
- Useful later if Codex exposes direct token usage or structured events reliably.
- Keep `token_source: unknown` unless direct metadata is available.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Copying From Incompatible or Unlicensed Repos
**Seen In:** `codexia-team/codexia` (AGPL-3.0), `gitbutlerapp/gitbutler` (Functional Source License), `marc2332/tauri-terminal` (no license file found), `Tibsfox/gsd-skill-creator` (Business Source License).
**Issue:** Several highly relevant projects are not safe for direct code reuse under the PRD's commercial-compatible license filter.
**Our Approach Instead:** Use only MIT/Apache/BSD sources for reusable implementation patterns; for excluded repos, at most use high-level product awareness without copying code.

### Anti-Pattern 2: Autonomous Orchestration and Auto-Merge Creep
**Seen In:** `composiohq/agent-orchestrator`, parts of `nwiizo/ccswarm`, parts of `standardagents/dmux`.
**Issue:** These projects include autonomous planning, CI repair, PR/merge workflows, or multi-agent coordination. That contradicts PRD v1's operator-driven workflow and explicit no-auto-merge rule.
**Our Approach Instead:** Preserve RunDeck's `Task -> Worktree -> Agent -> Diff -> Validation -> Human Review` flow. Only borrow low-level worktree/session patterns.

### Anti-Pattern 3: Shell Interpolation for Git and Runtime Commands
**Seen In:** Smaller examples and some quick scripts around worktree management.
**Issue:** Raw shell strings make path quoting, WSL execution, and risky-command detection harder to reason about.
**Our Approach Instead:** Use adapter methods that pass executable and args separately where practical. Keep launch templates auditable and runtime-context aware per ARCH Security Considerations.

### Anti-Pattern 4: Ad Hoc Parsing of Human Git Output
**Seen In:** Simple Git helper examples.
**Issue:** Parsing localized or display-oriented Git output is fragile, especially with renamed files and paths containing spaces.
**Our Approach Instead:** Use `git status --porcelain -z`, `git worktree list --porcelain`, and raw diff output only where raw display is intended.

### Anti-Pattern 5: Rendering Every Hidden Terminal at Full Cost
**Seen In:** Common xterm.js examples that assume one visible terminal.
**Issue:** Four or more active sessions can become janky if hidden tabs/panes still parse, fit, and render every output chunk.
**Our Approach Instead:** Follow TUICommander's pattern conceptually: separate PTY stream persistence from visible rendering; buffer, throttle, or pause background terminal rendering.

### Anti-Pattern 6: Unsafe Worktree Cleanup
**Seen In:** Worktree CLIs optimized for speed over GUI safety.
**Issue:** `git worktree remove --force` or recursive filesystem deletes can remove user work if path identity is wrong.
**Our Approach Instead:** Follow ARCH `delete_task_worktree`: only Done/Archived tasks, exact path confirmation, resolved path under configured worktree root, never base repo deletion.

## Dependency Discoveries

| Library | Purpose | Version | Consider Adding? |
|---------|---------|---------|------------------|
| `portable-pty` | Rust PTY management for Tauri backend | `0.8` to `0.9` observed | Yes - strongest Rust-side Phase 0 candidate. |
| `@xterm/xterm` | Terminal renderer | npm latest `6.0.0`; ARCH says `5.x` | Yes - decide whether to update ARCH from 5.x to 6.x. |
| `@xterm/addon-fit` | Fit terminal to pane dimensions | `0.11.0` | Yes - needed for terminal grid. |
| `@xterm/addon-search` | Search terminal buffer/log-like content | `0.16.0` | Yes - useful for log viewer/search. |
| `@xterm/addon-web-links` | Detect URLs/paths in output | `0.12.0` | Yes - useful for terminal panes. |
| `@xterm/addon-webgl` | Faster renderer | `0.19.0` | Maybe - verify stability on Windows before defaulting on. |
| `node-pty` | Node sidecar PTY option | `1.1.0` | Maybe - compare with `portable-pty` during Phase 0. |
| `dashmap` | Concurrent Rust session maps | `6.x` observed | Maybe - useful for live session handle registry. |
| `parking_lot` | Lower-overhead mutexes | `0.12` observed | Maybe - only if contention appears in PTY state. |
| `notify` / `notify-debouncer-mini` | Filesystem watching | `7` to `8` observed | Maybe - v1 can start with manual/poll refresh, watch later. |
| `rusqlite` | Embedded SQLite access | `0.31` observed in ApiArk | Maybe - compare with `sqlx` before scaffold. |
| `serde_yaml` | YAML profile/config parsing | `0.9` | Already in ARCH.md. |
| `zod` | Frontend/config validation | `4.3.x` observed | Maybe - ARCH says Zod 3+; update if choosing Zod 4. |

**Note:** Any additions or version changes require updating ARCH.md Tech Stack before Phase 3.

## Open Questions for Review

1. TUICommander, ApiArk, and ccswarm all use Rust `portable-pty`, while `node-pty` remains a mature Node sidecar option. Should Phase 0 choose `portable-pty` first and keep `node-pty` only as fallback?

2. xterm.js packages are now at `6.0.0`, while ARCH.md specifies xterm.js `5.x`. Should ARCH.md be updated to xterm.js 6.x before scaffolding, or should RunDeck intentionally pin 5.x for stability?

3. Worktrunk's robust Git parsing suggests implementing `git status --porcelain -z` and `git worktree list --porcelain` parsers from the start. Should this become a hard scaffold requirement rather than an implementation detail?

4. Phantom uses a direct Codex `app-server` bridge. RunDeck v1 specifies transparent CLI launch through YAML profiles. Should structured Codex bridge support be explicitly deferred to avoid coupling v1 to one agent CLI?

5. ApiArk uses `rusqlite` with bundled SQLite; silvermine's Tauri SQLite plugin uses `sqlx` but has very low stars. ARCH.md leaves `sqlx` vs `rusqlite` open. Which should Phase 3 scaffold choose?

6. Workz and several worktree tools sync or symlink dependencies into worktrees. This could reduce setup friction but is not in PRD scope. Should v1 explicitly avoid dependency sync and leave setup to repo commands?

7. WSL support needs an explicit distro default and path contract. Should RunDeck store effective WSL distro at `Workspace`, `Repo`, and `Session` levels exactly as ARCH.md models, with no shell-string inference outside the WSL adapter?

## Validation Checklist

- [x] All recommended repos have compatible licenses: MIT, Apache-2.0, or MIT/Apache dual license.
- [x] All recommended repos were active within the last 2 years.
- [x] Patterns extracted align with ARCH.md's Tauri/React/TypeScript/Rust/SQLite/xterm/Git/WSL stack.
- [x] Code snippets are attributed and adapted; no large source blocks copied.
- [x] Anti-patterns documented to prevent future mistakes.
- [x] No recommended repo is used to expand PRD scope; orchestration/auto-merge features are explicitly excluded.
- [x] Adaptation notes reference ARCH.md Dictionary terms such as `Session`, `Runtime Context`, `Task`, `Worktree`, `Dirty Repo`, `Changed File`, `Warning`, and `Log File`.
- [x] Open questions are concrete and actionable before Phase 3 scaffolding.
