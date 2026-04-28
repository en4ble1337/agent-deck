# RunDeck / Agent Mission Control — Product Idea & Build Specification

**Working name:** RunDeck  
**Alternate names:** AgentDeck, SessionForge, WorktreeOps, CodexOps, TaskForge, AgentOps Desk  
**Purpose:** Private/internal desktop tool for managing multiple AI coding/research agents, terminal sessions, tasks, worktrees, and agent execution state from one native interface.

---

## 1. Executive Summary

RunDeck is a local-first native desktop application for managing many AI agent sessions across multiple projects, repositories, and campaigns.

The core idea is to combine the best patterns from:

- **BridgeSpace-style multi-pane agent workspace**
- **agtx-style Kanban + worktree + orchestrator workflow**
- **CodexMonitor-style Codex/session management**
- **Warp-style terminal command blocks**
- **Optional token-burn visibility**

The objective is not to build a commercial clone. The objective is to build a personal/private command center that solves the practical pain of running many Codex, Claude Code, Gemini CLI, OpenCode, Hermes, or local agent sessions at once.

The key pain today:

> Managing many agent sessions across repos, projects, terminals, branches, browser profiles, and notes becomes chaotic very quickly. Existing CLI-first workflows are powerful but lack a unified operational dashboard.

RunDeck should become the control plane for those sessions.

---

## 2. Product Thesis

AI coding agents are becoming less like single chatbots and more like disposable workers.

Once you run more than two or three agents in parallel, you need infrastructure around them:

- Task state
- Session state
- Branch/worktree isolation
- Terminal history
- Prompt history
- Agent role templates
- Diff/review visibility
- Token burn tracking
- Error detection
- Budget/usage awareness
- Merge/review gates
- Project grouping
- Logs and artifacts

The useful product is not “another AI chat UI.”

The useful product is:

> A local-first agent operations dashboard for launching, supervising, reviewing, and coordinating many CLI-based agents.

---

## 3. Target User

Primary user:

- Technical operator / architect
- Comfortable with Linux, Git, terminals, Docker, agents, and CLI tools
- Uses Codex, Claude Code, Gemini CLI, local Ollama agents, Hermes, or similar systems
- Manages multiple projects, repos, campaigns, and agent workflows

This is optimized for a user who wants:

- Control
- Visibility
- Local-first storage
- Practical automation
- Fast session switching
- Low friction
- Minimal vendor lock-in

---

## 4. Core Use Cases

### 4.1 Multi-Agent Coding

Example:

- One agent implements feature A
- One agent writes tests
- One agent reviews the implementation
- One agent updates docs
- All agents run in separate git worktrees
- RunDeck shows task state, terminal output, changed files, and review status

### 4.2 Multi-Project Management

Example workspace groups:

- Chainsavvy
- GPU Autopilot
- Hermes agents
- Client website campaigns
- Local second-brain project
- Infrastructure automation repos

RunDeck should allow quick switching between projects without opening separate IDEs, terminals, or desktop windows.

### 4.3 Research and Campaign Agents

Example:

- Agent researches small businesses
- Agent scores website quality
- Agent drafts outreach copy
- Agent stores prospects into a local database
- Agent logs source URLs and confidence
- Human reviews before outreach

This is useful for agentic marketing and lead-research workflows.

### 4.4 Session Supervision

Example:

- Start 8 Codex/Claude/Gemini sessions
- See which are still active
- See which are stuck
- See token burn if available
- See last output
- Stop, pause, archive, or resume sessions

### 4.5 Worktree Hygiene

Example:

- Task gets assigned to an agent
- App creates branch and worktree automatically
- Agent runs inside that isolated directory
- App tracks changed files
- App detects file overlap with other active agents
- App warns before merge conflicts happen

---

## 5. Non-Goals

RunDeck should not try to do everything in v1.

### Not v1

- Full VS Code replacement
- Cloud SaaS dashboard
- Enterprise multi-user RBAC
- Perfect billing-grade cost tracking
- Browser automation platform
- Fully autonomous merge-to-main pipeline
- Marketplace product
- Complex plugin marketplace
- Multi-tenant collaboration

The first useful version should be local, practical, and focused.

---

## 6. Inspiration Breakdown

## 6.1 BridgeSpace-Inspired Features

BridgeSpace appears to package a polished native multi-agent workspace. The features worth using as inspiration:

| Feature | Why It Matters |
|---|---|
| Multi-pane terminal grid | See many agents at once |
| Task-driven session launch | Avoid disconnected terminal chaos |
| Lightweight editor/diff surface | Review what agents changed |
| Agent role templates | Launch agents with consistent behavior |
| Workspace organization | Group sessions by project |
| Themes/layouts | Nice but secondary |

What not to copy:

- Exact branding
- Proprietary UX details
- Any non-public implementation
- Commercial packaging model

The goal is to learn from the visible product pattern, not reproduce their product.

---

## 6.2 agtx-Inspired Features

agtx-style workflow is valuable because it treats agents as parallel workers assigned to tasks.

Key ideas to borrow:

| Feature | Priority | Reason |
|---|---:|---|
| Kanban board as source of truth | High | Every agent run maps to a task |
| Worktree per task | High | Prevents agents from corrupting each other’s work |
| Orchestrator agent | Medium | Useful after manual workflow is stable |
| Task decomposition | Medium | Converts vague goals into executable tasks |
| Conflict detection | High | Needed for parallel coding |
| Phase-based task flow | High | Backlog → Ready → Running → Review → Done |
| Spec-driven execution | High | Prevents wandering agents |

agtx-like task flow:

```text
Idea / Prompt
  ↓
Task Created
  ↓
Task Refined
  ↓
Worktree Created
  ↓
Agent Assigned
  ↓
Agent Runs
  ↓
Diff Generated
  ↓
Review
  ↓
Merge / Reject / Rework
```

---

## 6.3 CodexMonitor-Inspired Features

CodexMonitor-style session management is useful because Codex CLI and similar tools need a persistent operational wrapper.

Features to borrow:

| Feature | Priority | Reason |
|---|---:|---|
| Persistent workspaces | High | Needed for many projects |
| Codex session/thread management | High | Resume and organize agent runs |
| Agent launch controls | High | Choose model/mode/profile |
| Git diff/review dock | High | Human approval is mandatory |
| Model/reasoning controls | Medium | Optimize for cost and quality |
| Sandbox/access modes | High | Safe vs full-auto execution |
| Prompt/skill templates | High | Repeatable workflows |
| Logs/export/debug view | High | Agents fail often |

---

## 6.4 Warp-Style Terminal Features

Useful terminal concepts:

| Feature | Priority | Reason |
|---|---:|---|
| Command blocks | Medium | Easier log navigation |
| Collapsible output | Medium | Keeps noisy agent output readable |
| Searchable session history | High | Needed for debugging |
| Copy command/output quickly | Medium | Good daily UX |
| Per-session environment metadata | High | Know which repo/branch/model is active |

Terminal UX does not need to be perfect in v1, but searchable logs are mandatory.

---

## 7. Product Concept

RunDeck has five main surfaces:

1. **Workspace sidebar**
2. **Kanban task board**
3. **Agent/session grid**
4. **Git/diff review panel**
5. **Usage/token-burn panel**

High-level layout:

```text
┌────────────────┬─────────────────────────────┬──────────────────────────┐
│ Workspaces     │ Kanban / Tasks              │ Session / Terminal Grid  │
│                │                             │                          │
│ Chainsavvy     │ Backlog | Running | Review  │ Agent 1 | Agent 2        │
│ GPU Autopilot  │                             │ Agent 3 | Agent 4        │
│ Hermes         │                             │                          │
├────────────────┴─────────────────────────────┴──────────────────────────┤
│ Git Diff / Logs / Token Burn / Task Metadata                              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Primary Objects

### 8.1 Workspace

A workspace is a project container.

Examples:

- GPU Autopilot
- Chainsavvy Website
- Hermes Agent Dwight
- Second Brain
- Client Campaigns
- Infrastructure Automation

Workspace contains:

- Repos
- Tasks
- Sessions
- Agent templates
- Usage records
- Settings
- Environment variables
- Notes

---

### 8.2 Project / Repo

A project points to a local directory or git repository.

Fields:

- Name
- Path
- Default branch
- Remote URL
- Package manager
- Test command
- Build command
- Default agent profile
- Allowed tools
- Sandbox mode

---

### 8.3 Task

A task is the operational unit of work.

Fields:

- Title
- Description
- Status
- Priority
- Assigned agent
- Repo
- Branch
- Worktree path
- Prompt
- Acceptance criteria
- Changed files
- Token burn
- Logs
- Review status
- Created/updated timestamps

Task states:

```text
Backlog
Ready
Running
Blocked
Needs Review
Rework
Done
Archived
```

---

### 8.4 Session

A session is a live or historical agent run.

Fields:

- Session ID
- Workspace ID
- Task ID
- Repo path
- Worktree path
- Agent type
- Model
- Launch command
- PID
- Status
- Started at
- Ended at
- Last output
- Token usage if available
- Log path

Session states:

```text
Created
Starting
Running
Idle
Stuck
Completed
Failed
Stopped
Archived
```

---

### 8.5 Agent Profile

Agent profiles define repeatable roles.

Examples:

| Profile | Purpose |
|---|---|
| Builder | Implements code changes |
| Reviewer | Reviews code, finds flaws |
| Tester | Adds or runs tests |
| Researcher | Collects data and sources |
| Refactorer | Cleans code without changing behavior |
| Docs Writer | Updates documentation |
| Infra Operator | Writes scripts, Docker, Kubernetes, Linux runbooks |
| Marketing Analyst | Researches prospects and campaign opportunities |
| Outreach Drafter | Drafts human-reviewed email/social copy |

Profile fields:

- Name
- Provider/tool
- Model
- Default prompt
- Allowed commands
- Sandbox mode
- Repo access
- Browser access
- Max runtime
- Token warning threshold
- Output expectations

---

## 9. Token Burn Feature

The token usage feature should focus on **token burn**, not USD cost.

USD can be optional/fun later, but it should not be required for v1.

The useful metric is:

> How much token volume is this agent/session/task consuming, and is it producing useful work?

---

### 9.1 Token Burn Goals

Show token usage at these scopes:

| Scope | Purpose |
|---|---|
| Per message | Understand noisy prompts/responses |
| Per session | See how expensive/heavy a run is |
| Per task | Compare task complexity |
| Per project | Track workload over time |
| Per day/week | Understand usage habits |
| Per model/provider | Compare Codex vs Claude vs Gemini vs local |

---

### 9.2 Token Burn Metrics

Track when available:

| Metric | Required? | Notes |
|---|---:|---|
| Input tokens | Yes if available | Prompt/context tokens |
| Output tokens | Yes if available | Agent response tokens |
| Total tokens | Yes | Main metric |
| Cached input tokens | Optional | Useful if provider exposes it |
| Reasoning tokens | Optional | Only if exposed |
| Tool-call count | Yes | Shell/file/browser/MCP calls |
| Runtime duration | Yes | Wall-clock time |
| Files changed | Yes | Productivity correlation |
| Lines changed | Optional | Useful but can be noisy |
| Last activity timestamp | Yes | Stuck-session detection |

---

### 9.3 Token Burn UI

#### Agent Pane Footer

```text
Codex Builder-1 | gpt-5.x | 42k tokens | 18m | task/pricing-fix
```

#### Task Card Badge

```text
Pricing Worker Fix
Running · Codex · 42k tokens · 3 files changed · 18m
```

#### Session Detail

```text
Session: codex-2026-04-27-001
Agent: Builder
Model: gpt-5.x
Runtime: 18m 42s
Input tokens: 31,200
Output tokens: 10,800
Total tokens: 42,000
Tool calls: 23
Files changed: 3
Status: Running
```

#### Daily Token Burn

| Project | Provider | Sessions | Total Tokens | Avg Tokens / Session |
|---|---:|---:|---:|---:|
| GPU Autopilot | Codex | 8 | 412,000 | 51,500 |
| Chainsavvy Site | Claude | 5 | 221,000 | 44,200 |
| Hermes Tools | Ollama | 12 | 680,000 | 56,666 |

---

### 9.4 Token Burn Warnings

Useful warnings:

```text
Warning: this session has exceeded 75k tokens with no file changes in 15 minutes.
```

```text
Warning: this task has used 120k tokens and is still in the planning loop.
```

```text
Warning: 3 agents are running against the same repo and 2 are editing overlapping files.
```

```text
Warning: no output received in 12 minutes. Session may be stuck.
```

```text
Warning: high token burn but no test/build command has been run.
```

These warnings matter more than perfect accounting.

---

### 9.5 Token Tracking Reality Check

Token tracking is easy when using APIs directly.

It is harder when using subscription-backed CLI tools because the CLI may not expose clean live token usage.

Examples:

- Direct OpenAI API: usage is usually exposed in responses.
- Direct Claude API / SDK: usage is usually exposed in responses.
- Local Ollama: token counts may be available depending on endpoint/model/runtime.
- Codex CLI with subscription auth: live token telemetry may not be exposed cleanly.
- Claude Code with subscription auth: usage visibility depends on what the CLI/API exposes.
- Gemini CLI: depends on implementation and logging.

Therefore, RunDeck should implement token tracking as a tiered system.

---

### 9.6 Token Tracking Tiers

| Tier | Method | Accuracy | v1 Priority |
|---|---|---:|---:|
| Tier 1 | Provider-native usage fields | High | High |
| Tier 2 | CLI log parsing if usage appears in output | Medium | Medium |
| Tier 3 | Local tokenizer estimate from prompts/responses/logs | Approximate | Medium |
| Tier 4 | Post-run summary estimate | Low | Low |
| Tier 5 | Unknown / unavailable | Honest fallback | Required |

The UI should support unknown token counts without breaking.

Example:

```text
Token burn: unavailable for this session
Reason: provider/CLI did not expose usage data
```

That is acceptable.

Do not overbuild this. If subscription-based tools make live counting painful, drop live token tracking and keep:

- Runtime
- Tool calls
- Output volume
- File changes
- Approximate prompt/response size
- Manual/estimated token count later

---

### 9.7 Token Burn Implementation Strategy

Recommended v1 approach:

1. Store all session input/output logs.
2. Track runtime and last activity.
3. Parse usage if provider emits it.
4. Estimate tokens locally when practical.
5. Mark unknown when not available.
6. Do not block agent workflows on token telemetry.

Pseudo-flow:

```text
Agent emits output
  ↓
Session logger stores output
  ↓
Usage parser checks for provider usage metadata
  ↓
If found: store real token usage
  ↓
If not found: optionally estimate from text
  ↓
If estimation unavailable: mark as unknown
```

---

## 10. Architecture

## 10.1 Recommended Stack

| Layer | Recommended Tech | Reason |
|---|---|---|
| Desktop shell | Tauri v2 | Lightweight native app |
| UI | React + TypeScript | Mature ecosystem |
| Terminal | xterm.js | Standard browser terminal component |
| PTY/session backend | node-pty or Rust PTY | Needed for interactive CLI sessions |
| Local DB | SQLite | Perfect for local-first state |
| Search/indexing | SQLite FTS5 initially | Simple full-text search |
| Git operations | libgit2 or shell git | Shell git is simpler v1 |
| Editor | Monaco optional | Useful later, not mandatory |
| Agent execution | CLI adapters | Codex, Claude, Gemini, OpenCode, Ollama |
| Background workers | Tauri commands / sidecar | Session and telemetry management |
| Config | YAML/TOML/JSON | Human-editable |

---

## 10.2 High-Level Components

```text
RunDeck Desktop App
├── UI Layer
│   ├── Workspace Sidebar
│   ├── Kanban Board
│   ├── Terminal Grid
│   ├── Session Detail
│   ├── Git Diff Panel
│   └── Token Burn Dashboard
│
├── Runtime Layer
│   ├── PTY Manager
│   ├── Process Manager
│   ├── Session Logger
│   ├── Agent Adapter Manager
│   └── Environment Manager
│
├── Workflow Layer
│   ├── Task Manager
│   ├── Worktree Manager
│   ├── Agent Profile Manager
│   ├── Review Gate Manager
│   └── Conflict Detector
│
├── Telemetry Layer
│   ├── Token Usage Parser
│   ├── Local Token Estimator
│   ├── Tool Call Tracker
│   ├── Runtime Tracker
│   └── Warning Engine
│
├── Storage Layer
│   ├── SQLite DB
│   ├── Session Logs
│   ├── Prompt Templates
│   ├── Agent Profiles
│   └── Workspace Config
│
└── Optional MCP Layer
    ├── expose tasks
    ├── expose sessions
    ├── expose usage
    └── expose workspace state
```

---

## 10.3 Local Directory Layout

Recommended local app data structure:

```text
~/.rundeck/
├── config.yaml
├── rundeck.db
├── workspaces/
│   ├── gpu-autopilot/
│   │   ├── workspace.yaml
│   │   ├── prompts/
│   │   ├── logs/
│   │   ├── artifacts/
│   │   └── sessions/
│   └── chainsavvy/
│       ├── workspace.yaml
│       ├── prompts/
│       ├── logs/
│       ├── artifacts/
│       └── sessions/
├── agent-profiles/
│   ├── builder.yaml
│   ├── reviewer.yaml
│   ├── researcher.yaml
│   └── infra-operator.yaml
├── tokenizers/
├── templates/
└── backups/
```

Worktrees should usually live near the repo or in a dedicated worktree folder:

```text
~/agent-worktrees/
├── gpu-autopilot/
│   ├── task-001-pricing-fix/
│   ├── task-002-docs-update/
│   └── task-003-test-suite/
└── chainsavvy-site/
    ├── task-004-homepage-copy/
    └── task-005-seo-metadata/
```

---

## 11. Data Model

SQLite is enough.

### 11.1 workspaces

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  root_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 11.2 repos

```sql
CREATE TABLE repos (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  remote_url TEXT,
  default_branch TEXT,
  test_command TEXT,
  build_command TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

### 11.3 tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  repo_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT,
  acceptance_criteria TEXT,
  assigned_profile_id TEXT,
  branch_name TEXT,
  worktree_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);
```

### 11.4 sessions

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task_id TEXT,
  repo_id TEXT,
  agent_type TEXT NOT NULL,
  agent_profile_id TEXT,
  model TEXT,
  launch_command TEXT,
  pid INTEGER,
  status TEXT NOT NULL,
  cwd TEXT,
  log_path TEXT,
  started_at TEXT,
  ended_at TEXT,
  last_activity_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);
```

### 11.5 token_usage

```sql
CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_id TEXT,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cached_input_tokens INTEGER,
  reasoning_tokens INTEGER,
  source TEXT NOT NULL,
  confidence TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

`source` examples:

```text
provider_native
cli_log_parse
local_estimate
manual
unknown
```

`confidence` examples:

```text
high
medium
low
unknown
```

### 11.6 session_events

```sql
CREATE TABLE session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

Event types:

```text
started
output
command_detected
tool_call
file_changed
token_usage_detected
warning
stopped
failed
completed
```

### 11.7 file_changes

```sql
CREATE TABLE file_changes (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  task_id TEXT,
  repo_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  change_type TEXT,
  lines_added INTEGER,
  lines_deleted INTEGER,
  detected_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (repo_id) REFERENCES repos(id)
);
```

### 11.8 agent_profiles

```sql
CREATE TABLE agent_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT,
  default_model TEXT,
  default_prompt TEXT,
  launch_template TEXT,
  sandbox_mode TEXT,
  max_runtime_minutes INTEGER,
  token_warning_threshold INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 12. Agent Adapters

RunDeck should not hard-code itself to one vendor.

Use an adapter model.

### 12.1 Adapter Interface

Each adapter should define:

```text
name
provider
launch_command_template
supports_resume
supports_token_usage
supports_structured_output
supports_sandbox_mode
detect_session_id()
parse_usage()
parse_status()
stop_session()
resume_session()
```

---

### 12.2 Example Adapter: Codex CLI

Conceptual config:

```yaml
id: codex-default
name: Codex CLI
provider: openai
command_template: "codex"
supports_resume: true
supports_token_usage: unknown
supports_structured_output: unknown
sandbox_modes:
  - read-only
  - workspace-write
  - full-access
```

Potential launch examples:

```text
codex
codex --model <model>
codex --sandbox <mode>
```

Exact commands should be validated against the installed Codex CLI version.

---

### 12.3 Example Adapter: Claude Code

Conceptual config:

```yaml
id: claude-code-default
name: Claude Code
provider: anthropic
command_template: "claude"
supports_resume: true
supports_token_usage: maybe
supports_structured_output: maybe
sandbox_modes:
  - default
  - dangerous-skip-permissions
```

Exact flags should be validated against the installed Claude Code version.

---

### 12.4 Example Adapter: Gemini CLI

```yaml
id: gemini-cli-default
name: Gemini CLI
provider: google
command_template: "gemini"
supports_resume: unknown
supports_token_usage: unknown
supports_structured_output: unknown
```

---

### 12.5 Example Adapter: Local/Ollama Agent

```yaml
id: ollama-local-agent
name: Ollama Local Agent
provider: local
command_template: "python3 local_agent.py"
supports_resume: depends
supports_token_usage: maybe
supports_structured_output: custom
```

---

## 13. Worktree Management

This is one of the most important features.

### 13.1 Why Worktrees Matter

Without worktrees:

- Agents overwrite each other
- Branches become messy
- Diffs become hard to review
- Merge conflicts appear late
- It is unclear which session changed what

With worktrees:

- One task = one branch = one isolated directory
- Easy review
- Easy deletion
- Easy rollback
- Parallel sessions are safer

---

### 13.2 Worktree Flow

```text
Create Task
  ↓
Select Repo
  ↓
Create Branch Name
  ↓
Create Worktree
  ↓
Launch Agent in Worktree
  ↓
Track Git Changes
  ↓
Review Diff
  ↓
Merge / Rework / Delete
```

Example commands:

```bash
git fetch origin
git worktree add ../worktrees/task-001-pricing-fix -b task/001-pricing-fix origin/main
```

Validation:

```bash
git worktree list
git status
git branch --show-current
```

Cleanup:

```bash
git worktree remove ../worktrees/task-001-pricing-fix
git branch -D task/001-pricing-fix
```

---

### 13.3 Conflict Detection

RunDeck should detect overlapping file edits.

Example:

```text
Task A changed:
- src/pricing/worker.ts
- src/pricing/types.ts

Task B changed:
- src/pricing/worker.ts
- README.md

Warning:
Task A and Task B are both modifying src/pricing/worker.ts
```

This should show before merge time.

---

## 14. Session Runtime

### 14.1 PTY Requirements

RunDeck needs real pseudo-terminal support because CLI agents are interactive.

Required capabilities:

- Start shell command in specific working directory
- Send input
- Stream output
- Resize terminal
- Stop process
- Persist logs
- Detect exit
- Reattach if possible
- Support multiple panes

---

### 14.2 Session Logging

Every session should have:

```text
raw.log
clean.log
metadata.json
events.jsonl
usage.jsonl
```

Example:

```text
~/.rundeck/workspaces/gpu-autopilot/sessions/session-20260427-001/
├── raw.log
├── clean.log
├── metadata.json
├── events.jsonl
└── usage.jsonl
```

---

### 14.3 Stuck Session Detection

A session may be stuck if:

- No output for X minutes
- Same line repeated many times
- High token burn without file changes
- Process still running but no terminal activity
- Agent repeatedly asks for approval
- Test/build command hangs

Warning logic:

```text
if last_activity > 10 minutes and process_running:
    status = "possibly_stuck"
```

---

## 15. Prompt and Agent Templates

Templates are critical for repeatability.

### 15.1 Builder Template

```markdown
You are a focused coding agent working inside a dedicated git worktree.

Goal:
{{task_title}}

Context:
{{task_description}}

Acceptance criteria:
{{acceptance_criteria}}

Rules:
- Make the smallest safe change.
- Do not modify unrelated files.
- Run relevant tests if possible.
- Summarize files changed.
- Stop and ask for review if requirements are unclear.
```

---

### 15.2 Reviewer Template

```markdown
You are reviewing another agent's changes.

Review the current git diff for:
- correctness
- regressions
- security risks
- unnecessary complexity
- missing tests
- broken assumptions

Return:
1. Summary
2. Blocking issues
3. Non-blocking issues
4. Recommended fix
5. Verdict: approve / rework
```

---

### 15.3 Infra Operator Template

```markdown
You are an infrastructure automation agent.

Rules:
- Prefer Ubuntu 22.04/24.04 and Debian-compatible commands.
- Prefer copy/paste-safe commands.
- Use heredoc/EOF for file creation.
- Include validation commands.
- Do not make destructive changes without explicit task approval.
- Explain rollback if applicable.
```

---

### 15.4 Researcher Template

```markdown
You are a research agent.

Goal:
{{task_title}}

Rules:
- Collect sources.
- Save source URLs.
- Do not fabricate.
- Mark confidence.
- Separate facts from assumptions.
- Store structured findings in the requested output format.
```

---

## 16. UI Specification

## 16.1 Workspace Sidebar

Should show:

- Workspaces
- Repos
- Active sessions count
- Running tasks count
- Recent alerts

Example:

```text
GPU Autopilot
  4 active sessions
  2 tasks in review
  1 warning

Chainsavvy
  1 active session
  5 backlog tasks

Hermes
  3 active sessions
```

---

## 16.2 Kanban Board

Columns:

- Backlog
- Ready
- Running
- Blocked
- Needs Review
- Done

Task card should show:

```text
Title
Agent
Repo
Branch/worktree
Runtime
Token burn if available
Changed files count
Warnings
```

---

## 16.3 Terminal Grid

Requirements:

- Multiple terminal panes
- Split horizontal/vertical
- Rename panes
- Group panes by task/repo
- Focus mode
- Kill/restart session
- Copy logs
- Search output
- Open associated task
- Open associated diff

---

## 16.4 Session Detail Panel

Should show:

- Agent type
- Model
- Launch command
- Working directory
- PID/status
- Runtime
- Token burn
- Last activity
- Associated task
- Associated worktree
- Changed files
- Warnings
- Buttons:
  - Stop
  - Restart
  - Archive
  - Open folder
  - Open diff
  - Create review task

---

## 16.5 Git Diff Panel

Minimum v1:

- Show changed files
- Show `git diff`
- Show staged/unstaged state
- Run test command
- Mark review result
- Copy summary

Later:

- Inline comments
- Approve/reject
- Merge button
- PR creation
- GitHub issue/PR sync

---

## 16.6 Token Burn Dashboard

Recommended views:

### Session View

```text
Session token burn
Input: 31k
Output: 11k
Total: 42k
Confidence: estimated
```

### Project View

```text
Today:
Codex: 412k tokens
Claude: 221k tokens
Local: 680k tokens
Unknown: 3 sessions
```

### Warning View

```text
High token burn, no file changes:
- session-001
- session-004
```

---

## 17. Security and Safety

## 17.1 Access Modes

RunDeck should expose agent permission modes clearly.

Example:

| Mode | Description |
|---|---|
| Read-only | Agent can inspect files only |
| Workspace-write | Agent can edit within selected repo/worktree |
| Full-access | Agent can run broader commands |
| YOLO | No prompts/approval, dangerous |
| Browser-enabled | Agent can use browser/profile |
| Network-disabled | No network access where possible |

The UI should make dangerous modes visually obvious.

---

## 17.2 Command Risk Detection

Flag risky commands:

```text
rm -rf /
dd if=
mkfs
curl | bash
chmod -R 777
chown -R
iptables flush
ufw disable
docker system prune -a
kubectl delete
terraform destroy
```

Do not block everything automatically, but warn.

---

## 17.3 Environment Isolation

Options:

| Isolation | Complexity | Notes |
|---|---:|---|
| Git worktree only | Low | Good v1 |
| Separate Linux user | Medium | Useful for local machine separation |
| Docker container | Medium | Good for repeatable environments |
| LXC/VM | High | Better isolation, more overhead |
| Remote runner | High | Useful later |

For v1, use git worktrees and clear sandbox modes.

---

## 18. Remote / Headless Mode

This is valuable later because agents may run on Linux hosts, LXCs, or GPU boxes while the UI runs on a desktop.

Architecture:

```text
Desktop UI
  ↓
RunDeck Agent Daemon on Linux host
  ↓
PTY/session manager
  ↓
Codex/Claude/Gemini/Hermes/local agents
```

Remote daemon capabilities:

- Start sessions
- Stop sessions
- Stream terminal output
- Report status
- Track git changes
- Expose logs
- Expose token data if available

Do not build this first unless local desktop control is already working.

---

## 19. Browser Profiles

Browser support should be later, not v1.

Reason:

- Browser automation adds complexity
- Session profiles need isolation
- Cookies/accounts are sensitive
- Headless browser UX can be fragile

When added, design should support:

- Per-agent browser profile
- Persistent cookies
- Proxy support
- Screenshot/history logs
- Human takeover
- Kill/reset browser profile
- Do not share auth cookies between agents unless intentional

Potential structure:

```text
~/.rundeck/browser-profiles/
├── chainsavvy-researcher-01/
├── gpuautopilot-x-campaign/
└── client-site-auditor/
```

---

## 20. MCP Layer

Optional but powerful.

RunDeck can expose its state as MCP tools so agents can query and update tasks.

Possible MCP tools:

```text
list_workspaces
list_tasks
get_task
create_task
update_task_status
append_task_note
list_sessions
get_session_status
get_token_burn
create_worktree
register_file_change
request_review
```

This allows a coordinator agent to manage the board without direct DB access.

---

## 21. Open Source Leverage Strategy

Do not start from a blank whiteboard unless necessary.

Potential building blocks:

| Area | Candidate |
|---|---|
| Desktop shell | Tauri |
| UI | React |
| Terminal | xterm.js |
| PTY | node-pty |
| Editor | Monaco |
| DB | SQLite |
| Git | shell git / isomorphic-git / libgit2 |
| Kanban UI | dnd-kit |
| Tables | TanStack Table |
| State | Zustand |
| Validation | Zod |
| Logs | JSONL |
| Search | SQLite FTS5 |

Potential project inspiration:

| Project Type | Use |
|---|---|
| agtx | Task/worktree/orchestrator concepts |
| CodexMonitor | Desktop/session management concepts |
| OpenCode | Agent CLI inspiration |
| Claude Code ecosystem tools | Usage/session patterns |
| Warp terminal UX | Command block inspiration |

Important:

> Use open-source projects as reference and components only where licenses allow. Do not copy proprietary BridgeSpace behavior or assets.

---

## 22. MVP Roadmap

## Phase 0 — Research Spike

Goal:

Validate feasibility.

Deliverables:

- Can Tauri launch and control a PTY?
- Can xterm.js show multiple sessions?
- Can app start Codex/Claude/Gemini in selected directories?
- Can logs be saved?
- Can SQLite track sessions?

Exit criteria:

- One desktop window
- Two terminal panes
- Start/stop sessions
- Logs saved to disk

---

## Phase 1 — Session Dashboard

Goal:

Basic usable multi-session manager.

Features:

- Add workspace
- Add repo
- Launch terminal session
- Select agent profile
- Store session metadata
- Stream terminal output
- Save logs
- Stop session
- Archive session
- Search logs

Do not include:

- Kanban
- Token tracking
- Worktree automation
- Browser automation

This is the fastest useful base.

---

## Phase 2 — Kanban + Worktrees

Goal:

Make sessions task-driven.

Features:

- Create task
- Assign repo
- Generate branch name
- Create git worktree
- Launch agent inside worktree
- Track task state
- Show active session on task card
- Show changed files
- Detect overlapping files
- Move to review

Exit criteria:

- One task creates one worktree
- Agent runs inside it
- Diff appears in UI
- Task moves to Needs Review

This is the real MVP.

---

## Phase 3 — Review Workflow

Goal:

Make agent output reviewable.

Features:

- Git diff panel
- Changed file list
- Test/build command button
- Review notes
- Approve/rework/done status
- Optional merge command
- Optional PR creation

Exit criteria:

- Human can review and accept/reject work without leaving RunDeck

---

## Phase 4 — Token Burn

Goal:

Add usage observability without blocking workflows.

Features:

- Store token usage if provider exposes it
- Parse CLI logs for usage if available
- Local estimate fallback
- Unknown fallback
- Per-session token display
- Per-task token display
- Daily/project dashboard
- Burn warnings

Exit criteria:

- Token burn appears for providers where feasible
- Unknown sessions are handled cleanly
- No workflow depends on token data

---

## Phase 5 — Orchestrator Agent

Goal:

Coordinate multi-agent work.

Features:

- Coordinator creates subtasks
- Assigns agent profiles
- Checks file overlap
- Requests reviews
- Summarizes progress
- Updates board through MCP/tools

Do not build before Phases 1–4 are stable.

---

## Phase 6 — Remote Daemon

Goal:

Control Linux boxes/LXCs/servers from desktop.

Features:

- RunDeck agent daemon
- Remote session start/stop
- WebSocket terminal stream
- Remote logs
- Remote git diff
- Remote token telemetry if available

---

## Phase 7 — Browser Profiles

Goal:

Support research/marketing/browser agents.

Features:

- Per-agent browser profile
- Persistent sessions
- Screenshot capture
- Browser history logs
- Account/profile separation
- Human takeover

---

## 23. Practical First Build Plan

The first implementation should be brutally simple.

### Week 1 Target

Build:

- Tauri app
- React UI
- SQLite DB
- xterm.js pane
- PTY launch
- Save logs
- Start/stop shell sessions

Test commands:

```bash
pwd
ls -la
git status
codex --version
claude --version
```

Expected result:

- App can launch real terminals
- App persists session records
- App saves raw output

---

### Week 2 Target

Build:

- Workspace management
- Repo management
- Agent profiles
- Launch command templates
- Session history
- Terminal grid

Expected result:

- Can run multiple agents across multiple repos

---

### Week 3 Target

Build:

- Kanban board
- Task creation
- Worktree creation
- Agent launch from task
- Changed file detection

Expected result:

- Task-driven agent workflow works end-to-end

---

### Week 4 Target

Build:

- Diff panel
- Review state
- Stuck-session warnings
- Basic token tracking/unknown fallback

Expected result:

- Tool is useful for daily private workflow

---

## 24. Example Agent Profile Configs

### 24.1 Codex Builder

```yaml
id: codex-builder
name: Codex Builder
provider: openai
tool: codex
default_model: default
sandbox_mode: workspace-write
token_warning_threshold: 75000
max_runtime_minutes: 60
launch_template: "codex"
system_prompt: |
  You are a focused coding agent. Make the smallest safe change.
  Work only inside the assigned repository/worktree.
  Do not modify unrelated files.
  Run tests when practical.
```

---

### 24.2 Claude Reviewer

```yaml
id: claude-reviewer
name: Claude Reviewer
provider: anthropic
tool: claude
default_model: default
sandbox_mode: read-only
token_warning_threshold: 50000
max_runtime_minutes: 30
launch_template: "claude"
system_prompt: |
  Review the current git diff for correctness, safety, tests, and unnecessary complexity.
  Return blocking issues, non-blocking issues, and a final verdict.
```

---

### 24.3 Research Agent

```yaml
id: research-agent
name: Research Agent
provider: mixed
tool: configurable
sandbox_mode: browser-enabled
token_warning_threshold: 100000
max_runtime_minutes: 90
system_prompt: |
  Research the assigned target.
  Save sources, confidence, and structured findings.
  Do not fabricate.
```

---

## 25. Example Task Template

```yaml
title: Fix Vast constant-duration repricing logic
repo: gpu-autopilot
priority: high
agent_profile: codex-builder
status: ready
acceptance_criteria:
  - Preserve constant duration setting during repricing
  - Avoid sending invalid duration/end_date combinations
  - Add or update tests if possible
  - Summarize changed files
worktree:
  branch_prefix: task/vast-constant-duration
  base_branch: main
```

---

## 26. Example Session Metadata

```json
{
  "session_id": "session-20260427-001",
  "workspace": "gpu-autopilot",
  "repo": "gpu-autopilot",
  "task": "Fix Vast constant-duration repricing logic",
  "agent_profile": "codex-builder",
  "provider": "openai",
  "tool": "codex",
  "model": "default",
  "cwd": "/home/bart/agent-worktrees/gpu-autopilot/task-vast-constant-duration",
  "status": "running",
  "started_at": "2026-04-27T21:30:00-05:00",
  "last_activity_at": "2026-04-27T21:42:00-05:00",
  "token_usage": {
    "input_tokens": null,
    "output_tokens": null,
    "total_tokens": null,
    "source": "unknown",
    "confidence": "unknown"
  }
}
```

---

## 27. Warnings Engine

Rules to implement early:

| Rule | Trigger |
|---|---|
| No output | No terminal output for X minutes |
| High token burn | Token count exceeds threshold |
| High output volume | Log grows rapidly |
| No file changes | Long runtime but clean git diff |
| File overlap | Two active tasks edit same file |
| Dirty base repo | Repo has uncommitted changes before worktree creation |
| Risky command | Dangerous shell command detected |
| Failed command | Common failure patterns detected |
| Approval loop | Agent repeatedly asks for permission |

Example warning object:

```json
{
  "type": "high_token_no_changes",
  "severity": "medium",
  "message": "Session exceeded 75k tokens with no file changes.",
  "session_id": "session-20260427-001",
  "task_id": "task-001",
  "created_at": "2026-04-27T21:50:00-05:00"
}
```

---

## 28. Key Design Decisions

### 28.1 Local-First

Decision:

- Store state locally in SQLite and files.

Reason:

- Private workflows
- No SaaS dependency
- Faster development
- Easier backup
- Works with local agents

---

### 28.2 Desktop App First

Decision:

- Build as Tauri desktop app.

Reason:

- Native terminal/session management
- Easier file system access
- Better UX for multi-pane operations
- Lighter than Electron

---

### 28.3 Worktree-First

Decision:

- Every coding task should run in a git worktree by default.

Reason:

- Cleaner isolation
- Easier review
- Safer parallel execution

---

### 28.4 Token Burn is Optional

Decision:

- Token burn is useful, but not required.

Reason:

- Subscription-backed tools may not expose live usage
- Approximation is acceptable
- Workflow should not depend on telemetry

---

### 28.5 Human Review Gate

Decision:

- No automatic merge to main in early versions.

Reason:

- Agents still make mistakes
- Human review preserves control
- Safer for production repos

---

## 29. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| CLI tools change flags/output | Medium | Adapter layer, version checks |
| Token usage unavailable | Low | Unknown fallback, local estimate |
| PTY handling is complex | Medium | Start with simple PTY, avoid overengineering |
| Agents damage repo | High | Worktrees, sandbox modes, review gate |
| Browser automation becomes fragile | Medium | Defer browser support |
| Too many features too early | High | Strict phased build |
| Merge conflicts | Medium | File overlap detection |
| Logs get huge | Medium | Log rotation/compression |
| Secrets leak into logs | High | Redaction rules |

---

## 30. Log Redaction

RunDeck should eventually redact common secrets from logs:

Patterns:

```text
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GITHUB_TOKEN=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
password=
Authorization: Bearer
```

Recommended behavior:

- Store raw logs only if enabled
- Store redacted logs by default
- Warn when possible secret appears
- Allow user to purge session logs

---

## 31. Backup and Export

RunDeck should support:

- Export workspace as zip
- Export tasks as markdown
- Export session logs
- Export usage summary as CSV
- Backup SQLite DB
- Import workspace config

Export examples:

```text
rundeck-export-gpu-autopilot-2026-04-27.zip
rundeck-sessions-2026-04.csv
rundeck-token-burn-2026-04.csv
```

---

## 32. Nice-to-Have Features

Later features:

- GitHub PR creation
- GitHub issue sync
- Slack/Discord notifications
- Telegram alerts
- Web UI companion
- Remote Linux daemon
- Browser automation
- Agent mailbox
- Agent-to-agent messaging
- Prompt library
- Prompt versioning
- Runbooks
- Scheduled agents
- Local LLM summarizer for logs
- Voice command mode
- Mobile read-only dashboard

---

## 33. What Makes This Better for Personal Use Than Existing Tools

RunDeck should be opinionated around your workflow:

| Need | RunDeck Answer |
|---|---|
| Many projects | Workspace groups |
| Many agents | Session grid |
| Agent chaos | Kanban task board |
| Repo safety | Worktree-per-task |
| Visibility | Logs, status, warnings |
| Usage awareness | Token burn dashboard |
| Review control | Diff/review gate |
| Linux agent hosts | Remote daemon later |
| Marketing/research agents | Browser profiles later |
| Private infra | Local-first design |

---

## 34. Recommended MVP Definition

The actual MVP should be:

> A local Tauri desktop app that lets you create tasks, launch CLI agents in git worktrees, view multiple live terminal sessions, inspect diffs, and see basic runtime/token-burn status where available.

MVP must include:

- Workspace CRUD
- Repo CRUD
- Task board
- Worktree creation
- Agent profile config
- Launch terminal session
- Multi-pane session view
- Session logs
- Git changed files
- Diff view
- Basic warnings
- Token burn field with unknown fallback

MVP should not include:

- Browser automation
- Cloud sync
- Multi-user auth
- Full editor
- Perfect token counting
- Full orchestrator
- Auto-merge
- Mobile app

---

## 35. First Technical Milestone

Milestone:

> Launch two live agent sessions from one desktop app and persist their logs.

Acceptance criteria:

- User can add a local repo.
- User can create two sessions.
- Each session opens in its own terminal pane.
- Each session runs in a chosen working directory.
- Output streams live.
- Logs are saved.
- Sessions appear in session history.
- User can stop/archive each session.

This proves the hardest foundation: native session orchestration.

---

## 36. Second Technical Milestone

Milestone:

> Launch an agent from a task into a dedicated git worktree.

Acceptance criteria:

- User creates a task.
- User selects repo.
- App creates branch/worktree.
- App launches selected agent in that worktree.
- App tracks task as running.
- App detects changed files.
- App shows diff.
- User marks task as review/done.

This proves the product is more than a terminal manager.

---

## 37. Third Technical Milestone

Milestone:

> Add token-burn display with graceful fallback.

Acceptance criteria:

- If provider exposes usage, show real token count.
- If logs can be estimated, show approximate token count.
- If unavailable, show `unknown`.
- Show runtime regardless.
- Show warning if session is long-running with no file changes.
- Do not block workflows when token data is unavailable.

---

## 38. Implementation Notes

### 38.1 Start with Session Control, Not AI

Do not start by building the orchestrator.

Start by controlling terminals reliably.

The order should be:

1. Terminal launch
2. Logs
3. Sessions
4. Workspaces
5. Tasks
6. Worktrees
7. Diffs
8. Token burn
9. Orchestrator

---

### 38.2 Avoid Overbuilding Token Counting

Token burn is useful but not foundational.

The app is still valuable with:

- Runtime
- Session status
- Logs
- Diffs
- File changes
- Stuck detection

If token telemetry is hard for subscription-based tools, leave it as:

```text
Token burn: unavailable
```

Then add support provider-by-provider.

---

### 38.3 Keep Config Human-Editable

All agent profiles should be editable as YAML.

This makes it easier to debug and customize.

Example:

```yaml
profiles_dir: ~/.rundeck/agent-profiles
default_workspace: gpu-autopilot
default_terminal_shell: /bin/bash
worktree_root: ~/agent-worktrees
```

---

## 39. CLI Companion

Eventually useful:

```bash
rundeck workspace list
rundeck task create --repo gpu-autopilot --title "Fix pricing bug"
rundeck task run task-001 --profile codex-builder
rundeck session list
rundeck session stop session-001
rundeck usage today
```

The CLI could also be used by agents.

---

## 40. Final Recommendation

Build RunDeck as:

```text
CodexMonitor-style native session manager
+ agtx-style Kanban/worktree workflow
+ optional token-burn observability
+ local-first SQLite state
+ future MCP interface
```

The most important product decisions:

1. **Use tasks as the source of truth.**
2. **Run coding agents inside git worktrees.**
3. **Keep terminal/session management rock-solid.**
4. **Make token burn useful but optional.**
5. **Do not build browser automation or orchestrator logic first.**
6. **Keep human review before merge.**
7. **Make it local-first and private.**

The first real win is not a beautiful UI.

The first real win is:

> One screen where multiple agents are running, each tied to a task, each isolated in a worktree, with logs, diffs, status, and token burn visibility where available.

That is the core product.
