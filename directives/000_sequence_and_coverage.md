# Directive Sequence and Coverage

## Directive Sequence Overview

1. Directive 001: Initial Environment Setup
   - Prerequisites: local tooling only
2. Directive 002: Terminal Feasibility Spike
   - Prerequisites: 001
3. Directive 003: Workspace Bootstrap and Persistence
   - Prerequisites: 002
4. Directive 004: Repo Registration and Runtime Context
   - Prerequisites: 003
5. Directive 005: Agent Profile YAML Management
   - Prerequisites: 003
6. Directive 006: Standalone Session Launch and Stop
   - Prerequisites: 004, 005
7. Directive 007: Terminal Grid, Session History, and Log Reader
   - Prerequisites: 006
8. Directive 008: Task Board and Task Detail CRUD
   - Prerequisites: 004, 005
9. Directive 009: Worktree Preflight and Warning Foundation
   - Prerequisites: 007, 008
10. Directive 010: Task Session Launch With Worktree Isolation
    - Prerequisites: 009
11. Directive 011: Changed Files and File Overlap Warnings
    - Prerequisites: 010
12. Directive 012: Diff Review Panel
    - Prerequisites: 011
13. Directive 013: Validation Commands
    - Prerequisites: 012
14. Directive 014: Review Outcomes and Worktree Cleanup
    - Prerequisites: 013
15. Directive 015: Stuck Session and Risky Command Warnings
    - Prerequisites: 011
16. Directive 016: Runtime and Token Metadata
    - Prerequisites: 015
17. Directive 017: Log Redaction and Possible Secret Warnings
    - Prerequisites: 016
18. Directive 018: MVP Hardening and Browser Verification
    - Prerequisites: 014, 017

## PRD Phase Coverage

| PRD Phase | Directive(s) |
|---|---|
| Phase 0: Feasibility Spike | 002 |
| Phase 1: Local Data Model and Configuration | 003, 004, 005, 006 |
| Phase 2: Session Dashboard | 006, 007, 015, 016 |
| Phase 3: Task Board and Worktree Launch | 008, 009, 010, 011 |
| Phase 4: Diff Review Gate | 012, 013, 014 |
| Phase 5: Required Warnings and Redaction | 009, 011, 015, 016, 017 |
| Phase 6: Hardening and Daily Workflow Polish | 018 |

## PRD User Story Coverage Matrix

| PRD User Story | Implementing Directive(s) |
|---|---|
| US-001 First Launch Workspace Entry | 003, 018 |
| US-002 Workspace Management | 003, 018 |
| US-003 Repo Registration | 004, 018 |
| US-004 User-Editable YAML Agent Profiles | 005, 018 |
| US-005 Launch Standalone Terminal Session | 002, 006, 018 |
| US-006 Terminal Grid | 002, 007, 018 |
| US-007 Stop and Archive Sessions | 002, 006, 007, 018 |
| US-008 Persist Session Logs and History | 002, 006, 007, 017, 018 |
| US-009 Task Board | 008, 018 |
| US-010 Task Detail and Prompt Definition | 008, 010, 018 |
| US-011 Dirty Repo Block Before Worktree Creation | 009, 010, 018 |
| US-012 Create Worktree for Coding-Agent Task | 009, 010, 018 |
| US-013 Launch Agent From Task | 010, 018 |
| US-014 Changed Files Tracking | 011, 018 |
| US-015 File Overlap Warning | 011, 018 |
| US-016 Diff Review Panel | 012, 018 |
| US-017 Run Test and Build Commands | 013, 018 |
| US-018 Mark Review Outcome | 014, 018 |
| US-019 Stuck Session Warning | 015, 018 |
| US-020 Risky Command Detection | 015, 018 |
| US-021 Runtime and Token Metadata | 016, 018 |
| US-022 Log Redaction | 017, 018 |

## Functional Requirement Coverage Matrix

| FR | Implementing Directive(s) |
|---|---|
| FR-1 | 003 |
| FR-2 | 003 |
| FR-3 | 004 |
| FR-4 | 004 |
| FR-5 | 004, 006, 009, 010, 013 |
| FR-6 | 004, 006, 010 |
| FR-7 | 005 |
| FR-8 | 005 |
| FR-9 | 005, 010 |
| FR-10 | 005 |
| FR-11 | 008 |
| FR-12 | 008 |
| FR-13 | 008, 010, 011, 014 |
| FR-14 | 008, 010 |
| FR-15 | 009, 010 |
| FR-16 | 009, 010 |
| FR-17 | 009, 010 |
| FR-18 | 009, 010 |
| FR-19 | 006, 010 |
| FR-20 | 009 |
| FR-21 | 009 |
| FR-22 | 006 |
| FR-23 | 010 |
| FR-24 | 010 |
| FR-25 | 002, 006 |
| FR-26 | 007 |
| FR-27 | 006 |
| FR-28 | 007 |
| FR-29 | 006 |
| FR-30 | 002, 006, 007, 017 |
| FR-31 | 017 |
| FR-32 | 007 |
| FR-33 | 006, 007, 016 |
| FR-34 | 016 |
| FR-35 | 016 |
| FR-36 | 016 |
| FR-37 | 011 |
| FR-38 | 011, 016 |
| FR-39 | 011, 012 |
| FR-40 | 011 |
| FR-41 | 011 |
| FR-42 | 012 |
| FR-43 | 012 |
| FR-44 | 013 |
| FR-45 | 013 |
| FR-46 | 013 |
| FR-47 | 014 |
| FR-48 | 014 |
| FR-49 | 014 |
| FR-50 | 014 |
| FR-51 | 015 |
| FR-52 | 015 |
| FR-53 | 009, 010 |
| FR-54 | 009, 011, 015, 017 |
| FR-55 | 009, 011, 015 |
| FR-56 | 016, 017 |

## ARCH API Endpoint Ownership

| API Command | Owning Directive |
|---|---|
| `get_bootstrap_state` | 003 |
| `create_workspace` | 003 |
| `update_workspace` | 003 |
| `select_workspace` | 003 |
| `register_repo` | 004 |
| `update_repo` | 004 |
| `reload_profiles` | 005 |
| `launch_standalone_session` | 006 |
| `stop_session` | 006 |
| `archive_session` | 007 |
| `read_log` | 007 |
| `create_task` | 008 |
| `update_task` | 008 |
| `archive_task` | 008 |
| `list_warnings` | 009 |
| `launch_task_session` | 010 |
| `refresh_changed_files` | 011 |
| `get_task_diff` | 012 |
| `run_validation_command` | 013 |
| `mark_review_outcome` | 014 |
| `delete_task_worktree` | 014 |

## ARCH Data Model Ownership

| Data Model | Owning Directive |
|---|---|
| Workspace | 003 |
| AppSetting | 003 |
| Repo | 004 |
| AgentProfile | 005 |
| Session | 006 |
| Task | 008 |
| AcceptanceCriterion | 008 |
| Warning | 009 |
| ChangedFile | 011 |
| ValidationRun | 013 |
| ReviewRecord | 014 |
| RiskyCommandPattern | 015 |
