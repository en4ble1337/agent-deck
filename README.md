# RunDeck Agent Mission Control MVP

RunDeck is a local-first desktop control surface for managing multiple CLI-based AI agent sessions across workspaces, repositories, tasks, git worktrees, terminal panes, logs, and review states.

## Quick Start

1. Clone the repository.
2. Run `python setup_launchpad.py` if the scaffold has not been generated yet.
3. Copy `.env.example` to `.env` and configure local paths.
4. Install frontend dependencies with `npm install`.
5. Fetch backend dependencies with `cd src-tauri && cargo fetch && cd ..`.
6. Follow `directives/001_initial_setup.md`.

## Documentation

- [Product Requirements](docs/PRD.md)
- [Technical Architecture](docs/ARCH.md)
- [Implementation Research](docs/RESEARCH.md)
- [Agent Instructions](AGENTS.md)

## Development Methodology

- [Implementation Planning](docs/methodology/implementation-planning.md)
- [Review Gates](docs/methodology/review-gates.md)
- [Debugging Guide](docs/methodology/debugging-guide.md)

## Project Structure

```text
.
|-- .github/
|-- .tmp/
|-- directives/
|-- docs/
|   |-- methodology/
|   `-- plans/
|-- e2e/
|-- execution/
|-- src-tauri/
|   |-- migrations/
|   |-- src/
|   |   |-- adapters/
|   |   |-- commands/
|   |   |-- db/
|   |   |-- logging/
|   |   |-- models/
|   |   |-- profiles/
|   |   |-- services/
|   |   |-- errors.rs
|   |   `-- main.rs
|   `-- tests/
|-- src/
|   |-- app/
|   |-- components/
|   |-- features/
|   |   |-- profiles/
|   |   |-- repos/
|   |   |-- review/
|   |   |-- sessions/
|   |   |-- tasks/
|   |   |-- warnings/
|   |   `-- workspaces/
|   |-- lib/
|   `-- types/
`-- tests/
```
