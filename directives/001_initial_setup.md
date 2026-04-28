# Directive 001: Initial Environment Setup

## Objective

Configure the RunDeck Agent Mission Control MVP development environment and verify the Tauri, React, TypeScript, Rust, SQLite, and local execution tooling is ready.

## Prerequisites

- Python 3.11+ installed for setup and verification scripts.
- Node.js Active LTS installed.
- Rust stable and Cargo installed.
- Git installed.
- WSL installed if testing WSL runtime support.

## Steps

### Step 1: Python Helper Environment

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Fetch Backend Dependencies

```bash
cd src-tauri
cargo fetch
cd ..
```

### Step 4: Configure Environment

```bash
copy .env.example .env
# Edit .env with your local RunDeck data path and optional WSL defaults
```

### Step 5: Verify Scaffold

```bash
python execution/verify_setup.py
```

### Step 6: Run Initial Checks

```bash
npm run lint
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

## Acceptance Criteria

- [ ] Virtual environment created and activated for Python helper scripts.
- [ ] Frontend dependencies installed without errors.
- [ ] Rust dependencies fetched without errors.
- [ ] `.env` file exists with valid local configuration.
- [ ] `verify_setup.py` passes all checks.
- [ ] TypeScript typecheck runs.
- [ ] Vitest runs.
- [ ] Cargo tests run.

## Development Methodology

Starting from Directive 002 onward, all work follows the processes defined in AGENTS.md:
- **Implementation Planning** before coding (Section 4)
- **TDD Iron Law** during coding (Section 3)
- **Review Gates** after each task (Section 5)
- **Verification Before Completion** before marking done (Section 6)

See `docs/methodology/` for detailed reference guides.

## Status: [ ] Incomplete / [ ] Complete

## Notes

[Agent: Add any issues encountered or decisions made]
