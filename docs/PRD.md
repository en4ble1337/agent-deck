# PRD: RunDeck Agent Mission Control MVP

## 1. Executive Summary

RunDeck is a local-first desktop control surface for managing multiple CLI-based AI agent sessions across workspaces, repositories, tasks, git worktrees, terminal panes, logs, and review states. The MVP exists to replace the current manual workflow where agent sessions, branches, terminal output, and diffs are scattered across separate terminals and repos. The first shippable version must let the operator create a task, spawn an isolated worktree for coding agents, launch an agent inside that worktree, monitor live terminal output, inspect changed files and raw diffs, run validation commands, and mark the work as approved, rework, or done. It is designed first for a single technical operator on a Windows desktop who needs to control local and WSL-based agent workflows without adding cloud, multi-user, browser automation, or auto-merge complexity.

## 2. Mission and Core Principles

**Mission Statement:** Give a technical operator one reliable local command center for launching, supervising, isolating, and reviewing many AI agent runs without losing control of repos, tasks, logs, or diffs.

**Core Principles:**
1. **Task-driven execution**  Coding agent work should be tied to a task with a repo, prompt, profile, session, worktree, status, and review outcome.
2. **Worktree isolation by default**  Coding agents should run in dedicated git worktrees so parallel work does not corrupt the base repo or other active tasks.
3. **Session reliability before polish**  Live terminal streaming, start/stop controls, status tracking, and log persistence must be dependable before advanced dashboards or visual polish.
4. **Human review gate**  RunDeck may help inspect diffs and run validation commands, but v1 must not auto-merge or bypass human review.
5. **Local-first and transparent**  State, profiles, logs, and config should live locally in inspectable formats where practical, with clear fallbacks when telemetry such as token usage is unavailable.

## 3. Target Users

**Primary: Technical Operator Owner**
- **Who they are:** The project owner running multiple Codex, Claude, Gemini, shell, and future local agent workflows across several personal or client repositories.
- **Technical comfort level:** High. Comfortable with Windows, WSL, Linux, Git, terminals, CLI tools, branches, worktrees, logs, and agent prompts.
- **Key needs:** Fast switching between projects, reliable session control, safe parallel repo work, visible task state, inspectable logs, changed-file visibility, and a review flow that reduces terminal and branch chaos.

**Secondary: Technical Solo Developer**
- **Who they are:** A developer who runs one or more coding agents locally and wants a structured way to manage sessions and review output.
- **Technical comfort level:** Medium to high.
- **Key needs:** Low setup friction, understandable defaults, clear task/session mapping, and safe worktree handling without learning every internal detail.

**Secondary: Future Research or Campaign Operator**
- **Who they are:** A user running non-code agents for research, lead scoring, notes, or content drafting.
- **Technical comfort level:** Medium.
- **Key needs:** Session organization, logs, task status, and profiles, but not necessarily git worktrees or diffs.

**Persona Conflict Rule:** When user needs conflict in v1, prioritize the primary technical operator. Do not simplify the product so much that it loses worktree, diff, and terminal control needed for the owner's real workflow.

## 4. Scope

### In Scope

- [ ] Local desktop application shell for Windows-first use.
- [ ] Support launching and managing WSL-based sessions and WSL-path worktrees.
- [ ] Workspace management for grouping repos, tasks, profiles, and sessions.
- [ ] Repo registration with path, default branch, test command, build command, and runtime context.
- [ ] User-editable YAML agent profiles stored locally.
- [ ] Built-in default agent profile templates for common coding roles.
- [ ] Task board with statuses: Backlog, Ready, Running, Blocked, Needs Review, Rework, Done, Archived.
- [ ] Task detail fields for title, description, repo, profile, prompt, priority, acceptance criteria, branch/worktree metadata, and review state.
- [ ] Launch and stop terminal sessions.
- [ ] Stream live terminal output into terminal panes.
- [ ] Multi-pane terminal grid with basic focus and session selection.
- [ ] Session metadata persistence in SQLite.
- [ ] Session log persistence to local files with redaction enabled by default.
- [ ] Worktree creation by default for coding-agent profiles.
- [ ] Current workspace path execution for shell, research, or other non-code sessions.
- [ ] Dirty repo blocking before creating a worktree.
- [ ] Branch name generation for task worktrees.
- [ ] Launch coding agent sessions inside the created worktree.
- [ ] Detect changed files for active task worktrees.
- [ ] Detect file overlap between active tasks.
- [ ] Diff review panel showing changed files and raw `git diff`.
- [ ] Run configured test/build commands from the review panel.
- [ ] Mark review result as Approve, Rework, or Done.
- [ ] Required v1 warnings: no output/stuck session, risky command detection, dirty repo before task/worktree execution, file overlap between active tasks.
- [ ] Track runtime, last activity, tool-call/event counts where practical, changed-file counts, and session status.
- [ ] Store token usage only when provider or CLI exposes it directly.
- [ ] Display token usage as unavailable/unknown when not directly exposed.
- [ ] TypeScript types, validation, and error states for core data objects.
- [ ] Browser verification for UI stories using the dev-browser skill.

### Out of Scope

- [ ] Browser automation.
- [ ] Remote Linux daemon.
- [ ] SSH-based remote session control.
- [ ] Orchestrator agent that creates or coordinates subtasks automatically.
- [ ] Auto-merge to main or fully autonomous merge workflow.
- [ ] Cloud sync or SaaS backend.
- [ ] Multi-user auth, teams, RBAC, or tenant management.
- [ ] App-level password/PIN protection.
- [ ] Token estimation from logs.
- [ ] Billing-grade cost tracking.
- [ ] Full token burn dashboard.
- [ ] Inline code comments in the diff viewer.
- [ ] GitHub PR creation or GitHub issue sync.
- [ ] Full code editor or VS Code replacement.
- [ ] Plugin marketplace.
- [ ] Mobile app.

## 5. User Stories

### US-001: First Launch Workspace Entry

**Description:** As the technical operator, I want the app to open into my workspaces or a fast setup path so that I can see active work immediately or create the first workspace without friction.

**Example:** Bart opens RunDeck. If a workspace named "GPU Autopilot" already exists, the app opens to that workspace and shows active sessions and tasks. If no workspace exists, the app shows an empty state with a "Create Workspace" action and a minimal form for name and default worktree root.

**Acceptance Criteria:**
- [ ] If at least one workspace exists, the app opens to the last selected workspace.
- [ ] If no workspace exists, the app shows a first-run empty state with a create workspace action.
- [ ] Workspace creation requires a name and optional default worktree root.
- [ ] Validation prevents blank workspace names.
- [ ] Successful workspace creation lands on the main workspace view.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-002: Workspace Management

**Description:** As the technical operator, I want to create, edit, select, and archive workspaces so that separate projects do not blur together.

**Example:** Bart creates workspaces named "Chainsavvy", "GPU Autopilot", and "Hermes". He switches from "GPU Autopilot" to "Chainsavvy" in the sidebar and sees only that workspace's repos, tasks, sessions, and warnings.

**Acceptance Criteria:**
- [ ] User can create a workspace with name, slug, notes, and default worktree root.
- [ ] User can rename a workspace.
- [ ] User can archive a workspace without deleting its historical sessions or logs.
- [ ] Sidebar shows active workspaces and visually indicates the selected workspace.
- [ ] Selecting a workspace filters visible repos, tasks, sessions, and warnings.
- [ ] Archived workspaces are hidden from the default sidebar list.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Repo Registration

**Description:** As the technical operator, I want to register local or WSL repos with commands and runtime metadata so that tasks and sessions launch in the right place.

**Example:** Bart registers `/home/bart/projects/gpu-autopilot` as a WSL repo with default branch `main`, test command `pytest`, and build command `npm run build`. Later, when he creates a task for that repo, RunDeck knows how to create a worktree and run validation commands.

**Acceptance Criteria:**
- [ ] User can add a repo to a workspace with name, path, runtime context, default branch, test command, and build command.
- [ ] Runtime context supports at least `windows-local` and `wsl`.
- [ ] WSL repo paths are accepted as Linux paths, such as `/home/bart/projects/example`.
- [ ] Repo add flow validates that required fields are present.
- [ ] The app detects whether the path appears to be a git repo and shows an error if it is not.
- [ ] Repo details page shows path, default branch, commands, active tasks, and active sessions.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: User-Editable YAML Agent Profiles

**Description:** As the technical operator, I want agent profiles stored as local YAML so that I can customize launch behavior and prompts without relying only on UI forms.

**Example:** Bart edits `codex-builder.yaml` to change the launch template from `codex` to `codex --model gpt-5.4`, sets sandbox mode to `workspace-write`, and changes the default system prompt. RunDeck reloads or imports the edited profile and uses it for future task launches.

**Acceptance Criteria:**
- [ ] Profiles are persisted as YAML files in a documented local profiles directory.
- [ ] Built-in defaults are available for Builder, Reviewer, Tester, and Docs Writer.
- [ ] Each profile includes id, name, provider/tool, launch template, profile type, default prompt, sandbox mode, max runtime, and token warning threshold.
- [ ] Profile type distinguishes coding profiles from non-code profiles.
- [ ] YAML parse errors are shown with filename and line/field context where practical.
- [ ] Invalid profiles do not crash the app.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-005: Launch Standalone Terminal Session

**Description:** As the technical operator, I want to launch a standalone shell or agent session from a repo path so that non-task exploration remains possible.

**Example:** Bart selects the "Chainsavvy" repo and launches a shell session in its current workspace path. A terminal pane opens, runs the configured shell, streams output, and persists a session record even though no task or worktree is attached.

**Acceptance Criteria:**
- [ ] User can launch a standalone session from a selected repo.
- [ ] User can choose an agent profile or plain shell profile before launch.
- [ ] Non-code sessions may run in the current repo/workspace path without creating a worktree.
- [ ] Session record stores workspace id, repo id, profile id, launch command, working directory, runtime context, status, and timestamps.
- [ ] Terminal output appears live in a pane.
- [ ] Launch failures show a clear error state and do not create a misleading running session.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Terminal Grid

**Description:** As the technical operator, I want a terminal grid that shows multiple active sessions at once so that I can supervise parallel agents without separate terminal windows.

**Example:** Bart starts four sessions: two Codex builders, one reviewer, and one shell. The session grid shows four panes with title bars containing profile, repo, task if any, status, runtime, and warning badges. He can focus one pane without losing the others.

**Acceptance Criteria:**
- [ ] Grid can show at least four active sessions at once.
- [ ] Each pane shows session title, profile/tool, repo, status, runtime, and task link when attached.
- [ ] User can focus/select a pane and see its details in the side or bottom panel.
- [ ] User can close/hide a pane without deleting the session record.
- [ ] Terminal content does not overlap pane controls at common desktop sizes.
- [ ] Layout remains usable at 1280x720 minimum window size.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Stop and Archive Sessions

**Description:** As the technical operator, I want to stop and archive sessions so that stale or completed runs do not clutter the active grid.

**Example:** A Codex builder finishes its task. Bart clicks Stop if the process is still running, then Archive. The pane disappears from the active grid, but the session remains available in history with logs and metadata.

**Acceptance Criteria:**
- [ ] Running sessions expose a Stop action.
- [ ] Stop attempts to terminate the underlying process and updates status to Stopped on success.
- [ ] Completed, failed, or stopped sessions expose an Archive action.
- [ ] Archived sessions are hidden from the active grid by default.
- [ ] Archived sessions remain visible in session history.
- [ ] Errors while stopping a process are shown clearly and logged.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-008: Persist Session Logs and History

**Description:** As the technical operator, I want every session's output and metadata saved locally so that I can debug failures and revisit prior agent runs.

**Example:** Bart runs a Codex session that fails after 20 minutes. The next day he opens session history, searches for the session, and reads the saved log path, command, working directory, timestamps, status, and last output.

**Acceptance Criteria:**
- [ ] Terminal output is appended to a local log file for each session.
- [ ] Session metadata is stored in SQLite.
- [ ] Session history view lists active, completed, failed, stopped, and archived sessions.
- [ ] User can filter history by workspace, repo, task, profile, status, and date range.
- [ ] User can open a read-only log viewer for a historical session.
- [ ] Logs remain accessible after app restart.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-009: Task Board

**Description:** As the technical operator, I want a Kanban-style task board so that agent work has an operational source of truth.

**Example:** Bart creates a task titled "Fix Vast constant-duration repricing logic" in Backlog, moves it to Ready, launches a Codex Builder, sees it move to Running, and later moves it to Needs Review when the session finishes.

**Acceptance Criteria:**
- [ ] Board columns include Backlog, Ready, Running, Blocked, Needs Review, Rework, Done, and Archived.
- [ ] Task cards show title, repo, priority, assigned profile, status, active session state, changed-file count, runtime, and warning badges when available.
- [ ] User can create, edit, and archive tasks.
- [ ] User can move tasks between statuses.
- [ ] Task board is filtered to the selected workspace.
- [ ] Empty columns show a restrained empty state.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-010: Task Detail and Prompt Definition

**Description:** As the technical operator, I want each task to include prompt and acceptance criteria so that agent execution is spec-driven instead of ad hoc.

**Example:** Bart opens a task and enters a prompt explaining the pricing bug, then adds acceptance criteria: "Preserve constant duration", "Avoid invalid duration/end_date combinations", and "Run tests if practical". When launching the agent, RunDeck uses this task context.

**Acceptance Criteria:**
- [ ] Task detail includes title, description, repo, profile, priority, status, prompt, and acceptance criteria.
- [ ] Acceptance criteria can be added, edited, checked, and removed.
- [ ] Task detail shows branch name, worktree path, session id, changed files, and review state when available.
- [ ] User cannot launch a coding-agent task without selecting a repo and coding profile.
- [ ] User receives clear validation errors for missing launch-critical fields.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-011: Dirty Repo Block Before Worktree Creation

**Description:** As the technical operator, I want RunDeck to block worktree creation when the base repo is dirty so that changes are not misattributed or mixed with agent work.

**Example:** Bart tries to launch a Builder task from the `gpu-autopilot` repo, but the base repo has uncommitted changes in `pricing.py`. RunDeck blocks launch and tells him to commit, stash, or clean the repo before continuing.

**Acceptance Criteria:**
- [ ] Before creating a task worktree, the app checks the selected base repo for uncommitted changes.
- [ ] If the repo is dirty, the app blocks worktree creation.
- [ ] Dirty-state error lists the affected files when practical.
- [ ] Error text instructs the user to commit, stash, or clean changes before retrying.
- [ ] No branch or worktree is created when the dirty check fails.
- [ ] A dirty repo warning is recorded for the task or repo.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-012: Create Worktree for Coding-Agent Task

**Description:** As the technical operator, I want RunDeck to create a dedicated branch and worktree for coding-agent tasks so that each agent works in isolation.

**Example:** Bart launches a Codex Builder task named "Add priority filter". RunDeck generates branch `task/add-priority-filter`, creates a worktree under `/home/bart/agent-worktrees/agent-deck/task-add-priority-filter`, and launches Codex from that directory.

**Acceptance Criteria:**
- [ ] Coding-agent profiles create a git worktree by default.
- [ ] Worktree path is derived from workspace/repo config plus task slug.
- [ ] Branch name is generated from task title with a configurable prefix.
- [ ] Branch name collisions are resolved by adding a short suffix.
- [ ] Created worktree path and branch are saved to task metadata.
- [ ] Task status changes to Running after successful session launch.
- [ ] If worktree creation fails, the task remains in its prior status and shows an error.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-013: Launch Agent From Task

**Description:** As the technical operator, I want to launch a selected agent profile from a task so that the session starts with the correct prompt, directory, and metadata.

**Example:** Bart opens a Ready task, selects "Codex Builder", and clicks Launch. The terminal opens inside the task worktree, the launch command runs, and the session is linked to the task card.

**Acceptance Criteria:**
- [ ] Launch action is available from task detail and task card when task is launch-ready.
- [ ] Coding profile launch runs inside the task worktree.
- [ ] Non-code profile launch may run inside the current repo/workspace path.
- [ ] Launch command is constructed from the selected profile and task context.
- [ ] Session metadata links to workspace, repo, task, profile, working directory, and branch/worktree when present.
- [ ] Task card shows active session state and runtime after launch.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-014: Changed Files Tracking

**Description:** As the technical operator, I want RunDeck to show changed files for each task worktree so that I can see what an agent has touched before opening the diff.

**Example:** A Builder session modifies `src/pricing.ts`, `src/pricing.test.ts`, and `README.md`. The task card shows "3 files changed", and the task detail lists those files with staged/unstaged status where available.

**Acceptance Criteria:**
- [ ] For task worktrees, the app can refresh changed files using git status/diff metadata.
- [ ] Changed-file count appears on task card and session detail.
- [ ] Task detail lists changed file paths.
- [ ] File list distinguishes staged, unstaged, untracked, and deleted files where practical.
- [ ] Empty changed-file state says no changes detected.
- [ ] Refresh failure shows an error without clearing the last known file list.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-015: File Overlap Warning

**Description:** As the technical operator, I want warnings when active task worktrees touch the same files so that I can catch likely merge conflicts early.

**Example:** Two active Builder tasks in `agent-deck` both modify `src/App.tsx`. RunDeck shows a warning on both task cards and a warning detail listing the overlapping file and the other task.

**Acceptance Criteria:**
- [ ] The app compares changed-file lists across active tasks in the same repo.
- [ ] If two or more active tasks touch the same file path, a file overlap warning is created.
- [ ] Warning includes repo, file path, task ids/titles, and severity.
- [ ] Warning appears on affected task cards and in the warning list.
- [ ] Warning clears or resolves when overlap no longer exists.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-016: Diff Review Panel

**Description:** As the technical operator, I want a review panel with changed files and raw git diff so that I can inspect agent work inside RunDeck.

**Example:** Bart selects a task in Needs Review. The review panel shows changed files on the left and raw `git diff` on the right. He selects `src/pricing.ts` and sees only that file's diff.

**Acceptance Criteria:**
- [ ] Review panel is accessible from task card, task detail, and session detail.
- [ ] Panel shows changed-file list for the task worktree.
- [ ] Panel shows raw `git diff` for all changed files by default.
- [ ] User can select a file to view that file's diff.
- [ ] Empty diff state says no changes detected.
- [ ] Diff command errors are visible and include enough context to troubleshoot.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-017: Run Test and Build Commands

**Description:** As the technical operator, I want to run configured test/build commands from the review panel so that validation is part of the review gate.

**Example:** In review for `agent-deck`, Bart clicks "Run Tests". RunDeck runs `npm test` inside the task worktree, streams output to a validation log, and records pass/fail status on the task.

**Acceptance Criteria:**
- [ ] Review panel shows Run Test when the repo has a configured test command.
- [ ] Review panel shows Run Build when the repo has a configured build command.
- [ ] Commands execute inside the task worktree for coding tasks.
- [ ] Output is streamed or captured in a validation log view.
- [ ] Exit code is recorded as passed or failed.
- [ ] Failed commands do not block the user from marking Rework, but the failure remains visible.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-018: Mark Review Outcome

**Description:** As the technical operator, I want to mark review outcome as Approve, Rework, or Done so that task state reflects human review decisions.

**Example:** Bart reviews a diff and sees tests pass. He clicks Approve, adds a note "Looks good, manually merge later", and then marks Done. For another task, he clicks Rework and writes "Test missing for invalid duration case".

**Acceptance Criteria:**
- [ ] Review panel exposes Approve, Rework, and Done actions.
- [ ] Approve records review status and optional note without merging code.
- [ ] Rework moves task to Rework and records optional note.
- [ ] Done moves task to Done and records completion timestamp.
- [ ] Actions are persisted and visible in task detail.
- [ ] The app never merges to main automatically in v1.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-019: Stuck Session Warning

**Description:** As the technical operator, I want warnings for sessions with no output so that stuck agents do not run unnoticed.

**Example:** A Codex session has not emitted output for 12 minutes. RunDeck marks it as possibly stuck and shows a warning on the session pane and task card.

**Acceptance Criteria:**
- [ ] Each running session tracks last output/activity timestamp.
- [ ] A configurable threshold determines when no-output warning appears.
- [ ] Warning includes session id, task if attached, last activity time, and threshold.
- [ ] Warning appears in session pane, task card when attached, and warning list.
- [ ] Warning clears when new output arrives or the session stops.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-020: Risky Command Detection

**Description:** As the technical operator, I want risky command warnings so that destructive shell operations are visible before or during agent execution.

**Example:** A session output or command log includes `docker system prune -a`. RunDeck creates a risky command warning that shows the command, session, task, and reason.

**Acceptance Criteria:**
- [ ] The app maintains a configurable list of risky command patterns.
- [ ] Required defaults include patterns for `rm -rf /`, `mkfs`, `dd if=`, `curl | bash`, `chmod -R 777`, `chown -R`, `docker system prune -a`, `kubectl delete`, and `terraform destroy`.
- [ ] When a risky pattern is detected in command input or observable output, a warning is created.
- [ ] Warning includes matched pattern, session id, task if attached, and timestamp.
- [ ] Warning does not automatically kill the session in v1.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-021: Runtime and Token Metadata

**Description:** As the technical operator, I want runtime and direct token usage metadata saved when available so that I can evaluate agent effort without depending on perfect telemetry.

**Example:** A Claude session exposes token usage in its output metadata, so RunDeck stores input, output, and total tokens. A Codex CLI session does not expose usage, so RunDeck shows token usage as "unavailable" while still showing runtime, status, activity, and changed files.

**Acceptance Criteria:**
- [ ] Every session tracks runtime duration.
- [ ] Every running session tracks last activity.
- [ ] Every task session tracks changed-file count when a worktree exists.
- [ ] Token usage fields support input tokens, output tokens, total tokens, source, and confidence.
- [ ] If provider/CLI exposes token usage directly, the app stores it.
- [ ] If token usage is not directly exposed, UI shows unavailable/unknown.
- [ ] The app does not estimate tokens from logs in v1.
- [ ] Typecheck/lint passes.
- [ ] Verify in browser using dev-browser skill.

### US-022: Log Redaction

**Description:** As the technical operator, I want common secrets redacted from saved logs by default so that session history is safer to keep locally.

**Example:** A session prints `OPENAI_API_KEY=sk-...`. The saved default log replaces the value with `[REDACTED]`, and the session receives a warning that a possible secret was detected.

**Acceptance Criteria:**
- [ ] Redacted logs are the default saved log format.
- [ ] Redaction covers common patterns including `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `password=`, and `Authorization: Bearer`.
- [ ] Redaction preserves enough context to debug surrounding output.
- [ ] Possible secret detection creates a warning.
- [ ] The app does not display raw secret values in the UI after redaction.
- [ ] Typecheck/lint passes.

## 6. Feature Specifications

### App Shell and Workspace Navigation

**Route or location:** Main desktop window, default workspace route.

The app opens directly into an operational dashboard, not a landing page. The left sidebar lists active workspaces and shows lightweight counts for active sessions, tasks needing review, and warnings. The main content area uses a work-focused layout with task board, session grid, and review/detail surfaces. If no workspace exists, the first-run empty state offers only the actions needed to create/import a workspace and add the first repo.

**UI behavior:**
- Desktop-first layout optimized for 1280x720 and larger.
- Sidebar remains visible on normal desktop widths.
- Main view should support switching between Board, Sessions, Review, and History without losing selected workspace context.
- Empty states must be actionable and short.

**State management:**
- Selected workspace persists locally.
- Workspace, repo, task, session, and warning state persists in SQLite.
- UI selection state, such as selected pane or selected task, can remain client-side.

**Edge cases and errors:**
- If the last selected workspace was archived or deleted, select the first active workspace.
- If no workspaces exist, show first-run setup.
- If database load fails, show a blocking error with local DB path and retry option.

### Repo Management and WSL Runtime Context

**Route or location:** Workspace repo list, repo detail panel, task launch flow.

Repos are registered per workspace. A repo can be Windows-local or WSL-based. For v1, WSL support is required because the Windows desktop UI must launch WSL sessions and create/manage worktrees inside WSL paths. SSH and remote daemon support are future work.

**UI behavior:**
- Repo form includes runtime context, repo path, default branch, test command, build command, and default profile.
- Runtime context field should make it clear whether commands execute in Windows shell or WSL.
- Repo detail shows active tasks, active sessions, dirty-state warnings, and configured commands.

**State management:**
- Repo config persists in SQLite.
- WSL distro can be stored globally or per repo if implementation needs it.
- Last dirty check result can be cached but must be refreshed before worktree creation.

**Edge cases and errors:**
- Invalid path or non-git path blocks repo registration or launch.
- WSL unavailable should show a specific error and not fall back silently to Windows shell.
- Dirty repo blocks task worktree creation.

### Agent Profiles

**Route or location:** Profiles settings view, task launch selector, standalone session launch selector.

Agent profiles define how sessions launch and whether they are coding profiles. Coding profiles create worktrees by default when launched from a task. Non-code profiles can run in the current repo/workspace path.

**UI behavior:**
- Profiles list shows name, tool/provider, type, sandbox mode, and launch template.
- User can reload profiles after editing YAML files.
- Invalid YAML appears in an error state and does not crash the app.

**State management:**
- YAML files are the source of truth for user-editable profiles.
- Parsed profile metadata can be cached in SQLite or app state.
- Built-in default profiles can be generated on first run if no profile directory exists.

**Edge cases and errors:**
- Duplicate profile ids are invalid.
- Missing launch template blocks profile use.
- Profile marked as coding but missing expected settings should show validation warnings.

### Session Dashboard and Terminal Grid

**Route or location:** Sessions view and shared dashboard surface.

The terminal grid is the supervision surface for active sessions. It must reliably launch sessions, stream output, allow stopping, and save logs. Visual polish is secondary to correctness.

**UI behavior:**
- Each pane has a compact header with profile, repo, task, status, runtime, and warning badges.
- User can focus a pane to inspect session details.
- Archived sessions disappear from the active grid but remain in history.
- The grid should avoid nested cards and keep controls compact.

**State management:**
- Process id, status, start/end time, last output, and log path persist.
- Terminal scrollback can be in memory while active.
- Full output persists to log file.

**Edge cases and errors:**
- Launch failure creates a failed session record only if useful for debugging, clearly marked failed.
- App restart should not claim dead processes are still running.
- Stop failure should be visible and leave status accurate.

### Task Board and Task Detail

**Route or location:** Board view, task detail drawer/panel.

Tasks are the source of truth for coding-agent work. Each task may have a repo, profile, prompt, acceptance criteria, branch, worktree, session, changed files, warnings, and review status.

**UI behavior:**
- Board columns represent operational states.
- Task cards are dense and scannable.
- Task detail provides the full launch/review context.
- Launch actions are disabled until required fields are present.

**State management:**
- Task content and status persist in SQLite.
- Acceptance criteria persist as structured items, not a single unparsed blob.
- Task and session are linked when a session is launched from a task.

**Edge cases and errors:**
- Task without repo can exist in Backlog but cannot launch coding profile.
- Task with archived repo cannot launch.
- Failed launch should keep task status predictable and display the failure.

### Worktree Workflow

**Route or location:** Task launch flow, task detail, repo detail.

Coding-agent profiles create a dedicated worktree by default. Before creation, RunDeck checks the base repo for uncommitted changes and blocks if dirty. This is required to prevent bad attribution and confusing diffs.

**UI behavior:**
- Launch flow previews branch name and worktree path.
- Dirty-state block explains exactly what must be fixed.
- Worktree path is visible on task detail and session detail.

**State management:**
- Branch, worktree path, base branch, and creation timestamp persist on the task.
- Worktree lifecycle state should distinguish created, failed, missing, and archived where practical.

**Edge cases and errors:**
- Branch collision adds suffix.
- Worktree path collision blocks or adds suffix consistently.
- Deleted worktree should show missing-worktree error and prevent diff/test actions.
- Worktree creation failure should not leave task stuck in Running.

### Diff and Review Gate

**Route or location:** Review view, task detail review tab, session detail.

The review gate makes agent output inspectable. It does not merge code. It shows changed files, raw diff, and validation command output, then lets the operator mark Approve, Rework, or Done.

**UI behavior:**
- File list and diff viewer should be side-by-side on desktop.
- Raw diff should be monospaced and scrollable.
- Test/build results should be visible near review actions.
- Review buttons should be explicit and require no modal unless adding a note.

**State management:**
- Review status, note, reviewer action time, validation command status, and validation log path persist.
- Diff itself can be generated on demand rather than stored.

**Edge cases and errors:**
- No changes state is valid and must be clear.
- Git command failure displays stderr.
- Test/build command failure is recorded and does not crash review panel.

### Warning Engine

**Route or location:** Warning list, task cards, session panes, repo detail.

Warnings surface operational risks without turning v1 into a full security enforcement platform. Required warnings are no-output/stuck session, risky command detection, dirty repo before task/worktree execution, and file overlap between active tasks.

**UI behavior:**
- Warning badges appear near affected tasks/sessions.
- Warning list groups by severity and affected object.
- Warning details explain the trigger and recommended action.

**State management:**
- Warning records persist with type, severity, message, related ids, created timestamp, and resolved timestamp.
- Some warnings auto-resolve when the condition clears.
- Dirty repo warnings can resolve after a clean check.

**Edge cases and errors:**
- Warning creation must not block terminal streaming.
- Duplicate warnings for the same condition should be coalesced.
- Warning engine failures should be logged, not crash the app.

### Logs, Redaction, and Telemetry

**Route or location:** Session log viewer, session history, task/session detail.

Logs are central to debugging agent work. Redaction should happen by default before logs are displayed or stored as the default retained log. Runtime and activity tracking are required. Token usage is stored only when directly exposed by the provider or CLI; no log-based token estimation in v1.

**UI behavior:**
- Session detail shows runtime, status, last activity, log path, changed files, and token usage if available.
- Token usage unavailable state should be honest and non-alarming.
- Log viewer should be searchable enough for v1 debugging.

**State management:**
- Logs are file-backed.
- Metadata is stored in SQLite.
- Redaction rules are configurable later; defaults required in v1.

**Edge cases and errors:**
- Very large logs should not freeze the UI.
- Redaction should prefer false positives over leaking obvious secrets.
- Unknown token usage must not block any workflow.

## 7. Functional Requirements

- FR-1: The system must allow the user to create, edit, select, and archive workspaces.
- FR-2: The system must persist the last selected workspace and reopen it on app launch.
- FR-3: The system must allow the user to register repos within a workspace.
- FR-4: The system must store repo path, runtime context, default branch, test command, and build command.
- FR-5: The system must support a WSL runtime context for repo commands and session launch.
- FR-6: The system must clearly fail when WSL is unavailable for a WSL repo.
- FR-7: The system must load user-editable agent profiles from local YAML files.
- FR-8: The system must validate agent profile YAML and report parse/validation errors.
- FR-9: The system must distinguish coding profiles from non-code profiles.
- FR-10: The system must provide default profiles for Builder, Reviewer, Tester, and Docs Writer.
- FR-11: The system must allow the user to create, edit, archive, and move tasks.
- FR-12: The system must support task statuses Backlog, Ready, Running, Blocked, Needs Review, Rework, Done, and Archived.
- FR-13: The system must persist task title, description, repo, profile, priority, prompt, acceptance criteria, status, branch, worktree path, session links, and review state.
- FR-14: The system must prevent coding-agent launch when required task fields are missing.
- FR-15: The system must check base repo dirty state before creating a coding task worktree.
- FR-16: The system must block worktree creation when the base repo has uncommitted changes.
- FR-17: The system must show the user which files make the repo dirty when practical.
- FR-18: The system must create a branch and worktree by default for task launches using coding profiles.
- FR-19: The system must allow non-code sessions to run without creating a worktree.
- FR-20: The system must generate branch names from task titles with a configurable prefix.
- FR-21: The system must handle branch or worktree name collisions predictably.
- FR-22: The system must launch a terminal session from a standalone repo context.
- FR-23: The system must launch a terminal session from a task context.
- FR-24: The system must run task coding sessions inside the task worktree.
- FR-25: The system must stream terminal output live into a terminal pane.
- FR-26: The system must show multiple active terminal panes in one grid.
- FR-27: The system must allow the user to stop a running session.
- FR-28: The system must allow the user to archive completed, failed, or stopped sessions.
- FR-29: The system must persist session metadata in SQLite.
- FR-30: The system must persist session output logs to local files.
- FR-31: The system must redact common secrets from saved/displayed logs by default.
- FR-32: The system must show session history after app restart.
- FR-33: The system must track session runtime and last activity.
- FR-34: The system must display token usage when directly exposed by a provider or CLI.
- FR-35: The system must display token usage as unavailable/unknown when not directly exposed.
- FR-36: The system must not estimate token usage from logs in v1.
- FR-37: The system must refresh changed files for task worktrees.
- FR-38: The system must show changed-file count on task cards and session detail.
- FR-39: The system must show changed-file list in task detail and review panel.
- FR-40: The system must detect file overlap between active tasks in the same repo.
- FR-41: The system must create a warning when active tasks touch the same file path.
- FR-42: The system must show raw `git diff` for a task worktree.
- FR-43: The system must allow per-file diff viewing.
- FR-44: The system must run configured test commands inside task worktrees.
- FR-45: The system must run configured build commands inside task worktrees.
- FR-46: The system must record validation command output and exit status.
- FR-47: The system must allow the user to mark review outcome as Approve.
- FR-48: The system must allow the user to mark review outcome as Rework.
- FR-49: The system must allow the user to mark review outcome as Done.
- FR-50: The system must never auto-merge task work into main in v1.
- FR-51: The system must create no-output/stuck-session warnings based on last activity threshold.
- FR-52: The system must detect configured risky command patterns and create warnings.
- FR-53: The system must create dirty repo warnings when dirty state blocks task launch.
- FR-54: The system must show warnings on related task cards, session panes, and warning list.
- FR-55: The system must coalesce duplicate warnings for the same active condition.
- FR-56: The system must keep core workflows usable even when token usage is unavailable.

## 8. Non-Goals (Out of Scope Detail)

- **No browser automation:** Browser profiles, screenshots, human takeover, cookies, and proxy management add sensitive state and fragile automation. They are valuable later for research agents but not needed to prove the coding-agent control plane.
- **No remote daemon or SSH control:** The v1 target is Windows UI with WSL session/worktree support. A remote Linux daemon requires authentication, networking, streaming protocol, service installation, and failure recovery that would distract from the local workflow.
- **No orchestrator agent:** Automatic task decomposition and coordination are deferred until manual task/session/worktree/review flows are stable. The system should first make human-directed work reliable.
- **No auto-merge:** Agents still make mistakes. v1 must preserve a human review gate and leave merge decisions outside the automated flow.
- **No token estimation from logs:** Runtime, file changes, activity, and direct token usage are enough for v1. Log-based token estimation can be misleading and should not delay core workflow delivery.
- **No full token burn dashboard:** Token observability is useful, but a dashboard is not required until reliable source data exists across providers.
- **No cloud sync or SaaS backend:** The product is private and local-first. Cloud introduces auth, sync conflicts, hosting, and data privacy concerns that are out of scope.
- **No multi-user auth or RBAC:** v1 is a single-user desktop tool protected by OS-level user access. Team workflows can be reconsidered after the local product is proven.
- **No app-level password/PIN:** OS-level security is sufficient for v1. Log redaction is required because logs are the more immediate privacy risk.
- **No inline code comments or PR creation:** Raw diffs, changed files, validation commands, and review status are enough for the first review gate. Inline comments and GitHub integration can come later.
- **No full code editor:** RunDeck should not replace VS Code or an IDE. It should help supervise agents and inspect output.
- **No plugin marketplace:** User-editable YAML profiles provide enough customizability for v1 without a plugin system.

## 9. Design Considerations

- The product should feel like an operational desktop tool, not a marketing site.
- First screen should be the workspace dashboard or first-run setup, never a landing page.
- Use dense but readable layouts suited to repeated daily use.
- Avoid oversized hero sections, decorative cards, and explanatory in-app marketing text.
- Use compact controls with icons where familiar, especially for stop, archive, refresh, search, and open diff actions.
- Cards should be reserved for repeated items such as task cards and session panes.
- Avoid nesting cards inside cards.
- The minimum supported app window for v1 should be 1280x720.
- At desktop widths, prefer persistent sidebar plus main split between board/session/review.
- At narrower widths, allow tabbed or stacked views, but do not require mobile-first optimization.
- Task cards must keep title, status, repo, session state, changed-file count, and warning badges legible.
- Terminal pane headers must have stable dimensions so runtime/status updates do not resize panes.
- Warning severity should be visible through label/icon plus color, not color alone.
- Diff viewer should use monospaced text, stable line wrapping behavior, and horizontal scrolling where needed.
- Forms should validate before launch actions and show errors next to the relevant field.
- Accessibility requirements:
  - All interactive controls must be keyboard reachable.
  - Visible focus states are required.
  - Icon-only controls must have accessible labels/tooltips.
  - Warning colors must meet contrast requirements.

## 10. Technical Considerations

- Recommended stack: Tauri v2, React, TypeScript, SQLite, xterm.js.
- PTY backend is intentionally open until the feasibility spike proves the cleanest approach.
- Candidate PTY approaches include a Rust PTY implementation, `node-pty` via sidecar/runtime, or another approach compatible with Tauri and WSL.
- WSL support is required for v1:
  - The UI runs on Windows.
  - Repo paths may be Linux paths inside WSL.
  - Session launch may need to call `wsl.exe` with a distro and working directory.
  - Git commands for WSL repos should run in the same WSL context as the agent session.
- SSH support and remote daemon support are future work.
- SQLite should store structured application state:
  - workspaces
  - repos
  - tasks
  - acceptance criteria
  - sessions
  - warnings
  - review records
  - validation runs
  - parsed profile metadata if useful
- Logs should be file-backed, not stored only in SQLite.
- Default local data directory should be documented, for example `%APPDATA%/RunDeck` on Windows plus configurable paths for WSL worktrees.
- YAML profiles should be human-editable and reloadable.
- Git operations can use shell `git` for v1 if command construction is safe and runtime context is explicit.
- Dangerous shell command detection should be pattern-based and configurable later.
- Dirty repo checks should run immediately before worktree creation, not only when the repo is registered.
- Token fields should allow null values and source/confidence metadata:
  - `source: direct | unknown`
  - `confidence: exact | unknown`
- Validation commands should run in the same runtime context and working directory as the task worktree.
- Log redaction should happen before logs are displayed in the UI and before default saved retained logs are written.
- Raw logs with secrets should not be retained by default.
- App-level auth is not required in v1.
- GitHub repo for project source: `https://github.com/en4ble1337/agent-deck`.

## 11. Implementation Phases

### Phase 0: Feasibility Spike

**Phase goal:** Prove that the desktop app can launch and control live terminal sessions, including WSL sessions, before building higher-level workflow.

**Deliverables:**
- [ ] Minimal Tauri + React app shell.
- [ ] xterm.js terminal pane.
- [ ] PTY/session backend chosen or narrowed with notes.
- [ ] Launch local shell session.
- [ ] Launch WSL shell session.
- [ ] Stream terminal output live.
- [ ] Stop a running session.
- [ ] Save a basic log file.

**Validation Criteria:**
- [ ] Two sessions can run at the same time.
- [ ] At least one session can run through WSL.
- [ ] Logs are persisted after session exit.
- [ ] App remains responsive while output streams.

### Phase 1: Local Data Model and Configuration

**Phase goal:** Establish persistent workspaces, repos, profiles, and session metadata.

**Deliverables:**
- [ ] SQLite schema and migrations.
- [ ] Workspace CRUD.
- [ ] Repo registration with runtime context.
- [ ] YAML profile directory and parser.
- [ ] Built-in default profiles.
- [ ] Session metadata persistence.
- [ ] Basic session history.

**Validation Criteria:**
- [ ] App restart preserves workspaces, repos, profiles, sessions, and logs.
- [ ] Invalid YAML profile reports errors without crashing.
- [ ] WSL repo config can be saved and selected.

### Phase 2: Session Dashboard

**Phase goal:** Make the app useful as a multi-session manager.

**Deliverables:**
- [ ] Standalone session launch from repo/profile.
- [ ] Multi-pane terminal grid.
- [ ] Stop/archive controls.
- [ ] Log viewer.
- [ ] Session detail panel.
- [ ] Runtime and last activity tracking.
- [ ] No-output/stuck warning.

**Validation Criteria:**
- [ ] User can run multiple sessions across repos.
- [ ] Session output streams into separate panes.
- [ ] Stop/archive behavior works reliably.
- [ ] Session history and logs remain available after restart.

### Phase 3: Task Board and Worktree Launch

**Phase goal:** Connect tasks, coding profiles, worktrees, and sessions into one workflow.

**Deliverables:**
- [ ] Task board and task detail.
- [ ] Prompt and acceptance criteria fields.
- [ ] Dirty repo block before worktree creation.
- [ ] Branch and worktree generation.
- [ ] Launch agent from task into worktree.
- [ ] Task/session linkage.
- [ ] Changed-file tracking.

**Validation Criteria:**
- [ ] User can create a task, select repo/profile, create worktree, launch agent, and see the task marked Running.
- [ ] Dirty base repo blocks worktree creation.
- [ ] Changed-file count appears after agent changes files.

### Phase 4: Diff Review Gate

**Phase goal:** Let the operator review agent work without leaving RunDeck for basic inspection.

**Deliverables:**
- [ ] Changed-file list.
- [ ] Raw all-files diff.
- [ ] Per-file diff.
- [ ] Test command execution.
- [ ] Build command execution.
- [ ] Validation logs and exit status.
- [ ] Approve/Rework/Done review actions.

**Validation Criteria:**
- [ ] User can inspect diff for a task worktree.
- [ ] User can run test/build commands inside the worktree.
- [ ] User can mark Approve, Rework, or Done.
- [ ] No merge happens automatically.

### Phase 5: Required Warnings and Redaction

**Phase goal:** Add the minimum safety and observability needed for daily use.

**Deliverables:**
- [ ] Risky command detection.
- [ ] Dirty repo warnings.
- [ ] File overlap warnings.
- [ ] Secret redaction in logs.
- [ ] Warning list and warning badges.
- [ ] Direct token usage storage when exposed.
- [ ] Unknown token fallback UI.

**Validation Criteria:**
- [ ] Required warning types appear and clear correctly.
- [ ] Common secrets are redacted from displayed/saved logs.
- [ ] Token usage unknown state does not block any workflow.

### Phase 6: Hardening and Daily Workflow Polish

**Phase goal:** Make the MVP polished enough to replace the current manual workflow.

**Deliverables:**
- [ ] Error copy and empty states cleaned up.
- [ ] Keyboard and accessibility pass.
- [ ] Basic performance checks with multiple sessions.
- [ ] Browser visual verification of all UI flows.
- [ ] Documentation for local data paths, WSL assumptions, profile YAML, and known limitations.

**Validation Criteria:**
- [ ] Operator can complete task -> worktree -> agent -> diff -> review in one app.
- [ ] Four simultaneous sessions remain usable.
- [ ] The app handles restart without misleading active-session state.

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PTY integration with Tauri and WSL is harder than expected | High | Run Phase 0 feasibility spike first and keep PTY backend open until proven. |
| WSL path and command execution differences cause inconsistent behavior | High | Store runtime context per repo and run git/session/validation commands in the same context. |
| Scope is too large for first shippable version | High | Preserve both core workflows, but cut polish, advanced warnings, and token features first. |
| Agents or commands damage repos | High | Block dirty base repos, use worktrees for coding profiles, show risky command warnings, and require human review. |
| Logs grow too large and slow the UI | Medium | Store logs as files, stream/read incrementally, and avoid loading full large logs into memory. |
| Secrets leak into logs | High | Redact common secret patterns by default and warn on possible secret detection. |
| Token usage is unavailable for subscription-backed CLIs | Low | Store direct usage only when exposed and show unavailable/unknown without blocking workflows. |
| File overlap detection produces noisy warnings | Medium | Only compare active tasks in the same repo and coalesce duplicate overlap warnings. |
| App restart leaves stale running sessions | Medium | Reconcile process state on startup and mark missing processes as stopped/unknown instead of running. |

## 13. Future Considerations

- Remote Linux daemon for sessions running on Linux boxes, LXCs, or GPU hosts.
- SSH-based session control.
- Browser automation profiles for research/campaign agents.
- Orchestrator agent that creates, assigns, and monitors subtasks.
- MCP interface exposing tasks, sessions, warnings, and usage to agents.
- Token estimation from logs.
- Full token burn dashboard by project, provider, day, task, and model.
- GitHub PR creation.
- GitHub issue sync.
- Inline diff comments.
- Merge assistance after human approval.
- Agent-to-agent messaging or mailbox.
- Prompt library and prompt versioning.
- Scheduled agents.
- Log rotation and compression controls.
- Optional encrypted local storage or app unlock PIN.
- Export workspace, tasks, logs, and usage summaries.
- CLI companion such as `rundeck task create`, `rundeck session list`, and `rundeck usage today`.

## 14. Success Metrics

- User can create a task, create a worktree, launch an agent, inspect changed files, view raw diff, run validation command, and mark review outcome without leaving RunDeck.
- User can run at least four simultaneous sessions and keep them visually distinguishable.
- User can launch at least one WSL-based session from the Windows desktop UI.
- User can relaunch the app and still see historical sessions, logs, tasks, and review state.
- Dirty base repo check blocks worktree creation 100% of the time when uncommitted changes are present.
- Session logs are saved for every launched session.
- Common secret patterns are redacted from saved/displayed logs by default.
- Token usage being unavailable never blocks session, task, worktree, or review workflows.
- The first useful workflow can replace the current manual process for at least one real repo.
- "Good enough" bar: task -> worktree -> agent -> diff -> review is reliable enough for daily private use, even if visual polish and advanced telemetry are still basic.

## 15. Open Questions

- Which PTY backend should be selected after Phase 0: Rust PTY, node-pty sidecar, or another Tauri-compatible approach?
- Which WSL distro should be used by default when multiple distros are installed?
- What should the default Windows and WSL data directories be?
- Should worktree cleanup/archive be automated in v1, or should the user manually delete old worktrees?
- Should a task be allowed to launch more than one active session in v1?
- Should task priority values be fixed to high/medium/low or allow custom labels?
- Should validation command output appear in the main terminal grid, a separate log panel, or both?
- How much log search is required for MVP: simple in-file search or indexed SQLite FTS later?
- Should risky command detection inspect only explicit command input, terminal output, or both where observable?
- Should raw unredacted logs ever be optionally retained, or should v1 only keep redacted logs?
