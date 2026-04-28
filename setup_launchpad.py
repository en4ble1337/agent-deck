#!/usr/bin/env python3
"""
Launchpad Setup Script
Creates the project scaffold from docs/PRD.md, docs/ARCH.md, and docs/RESEARCH.md.
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from textwrap import dedent


ROOT = Path(__file__).resolve().parent
DOCS_DIR = ROOT / "docs"

DOC_FILES = {
    "prd": DOCS_DIR / "PRD.md",
    "arch": DOCS_DIR / "ARCH.md",
    "research": DOCS_DIR / "RESEARCH.md",
}

BASE_DIRECTORIES = [
    "docs/",
    "docs/plans/",
    "docs/methodology/",
    "directives/",
    "execution/",
    "src/",
    "tests/",
    ".tmp/",
]


@dataclass(frozen=True)
class LaunchpadContext:
    prd: str
    arch: str
    research: str
    project_name: str
    project_slug: str
    description: str
    directory_entries: list[str]
    directories: list[str]
    tech_rows: list[dict[str, str]]
    stack_summary: str
    domain_entities: list[str]


def clean_cell(value: str) -> str:
    """Normalize a markdown table cell."""
    cleaned = value.strip()
    if cleaned.startswith("`") and cleaned.endswith("`") and cleaned.count("`") == 2:
        cleaned = cleaned[1:-1]
    return cleaned.strip()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return slug or "rundeck"


def extract_section(markdown: str, heading: str) -> str:
    """Extract a level-2 markdown section by its title, ignoring numbering."""
    pattern = re.compile(
        rf"^##\s+(?:\d+\.\s+)?{re.escape(heading)}\s*$",
        re.IGNORECASE | re.MULTILINE,
    )
    match = pattern.search(markdown)
    if not match:
        return ""
    start = match.end()
    next_match = re.search(r"^##\s+", markdown[start:], re.MULTILINE)
    end = start + next_match.start() if next_match else len(markdown)
    return markdown[start:end].strip()


def parse_markdown_table(section: str) -> list[dict[str, str]]:
    """Parse a simple markdown table into dictionaries keyed by header."""
    table_lines = [line for line in section.splitlines() if line.strip().startswith("|")]
    if len(table_lines) < 2:
        return []

    headers = [clean_cell(cell) for cell in table_lines[0].strip().strip("|").split("|")]
    rows: list[dict[str, str]] = []

    for line in table_lines[2:]:
        cells = [clean_cell(cell) for cell in line.strip().strip("|").split("|")]
        if len(cells) < len(headers):
            cells.extend([""] * (len(headers) - len(cells)))
        rows.append(dict(zip(headers, cells[: len(headers)])))

    return rows


def load_required_docs() -> tuple[str, str, str]:
    missing = [str(path) for path in DOC_FILES.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Missing required planning documents: " + ", ".join(missing)
        )

    return (
        DOC_FILES["prd"].read_text(encoding="utf-8"),
        DOC_FILES["arch"].read_text(encoding="utf-8"),
        DOC_FILES["research"].read_text(encoding="utf-8"),
    )


def extract_project_name(prd: str) -> str:
    title_match = re.search(r"^#\s+(?:PRD:\s*)?(.+?)\s*$", prd, re.MULTILINE)
    if title_match:
        return title_match.group(1).strip()

    first_sentence = extract_description(prd)
    name_match = re.match(r"([A-Z][A-Za-z0-9_-]+)\s+is\b", first_sentence)
    if name_match:
        return name_match.group(1)

    return "RunDeck"


def extract_description(prd: str) -> str:
    summary = extract_section(prd, "Executive Summary")
    source = summary or prd
    source = re.sub(r"\s+", " ", source).strip()
    sentence_match = re.search(r"(.+?\.)\s", source + " ")
    if sentence_match:
        return sentence_match.group(1).strip()
    return source[:200].strip()


def extract_directory_entries(arch: str) -> list[str]:
    rows = parse_markdown_table(extract_section(arch, "Directory Structure"))
    entries: set[str] = set(BASE_DIRECTORIES)

    for row in rows:
        raw_path = row.get("Path", "")
        if not raw_path:
            continue
        path = clean_cell(raw_path).replace("\\", "/")
        if path:
            entries.add(path)

    return sorted(entries, key=lambda value: value.lower())


def path_is_file(path: str) -> bool:
    normalized = path.rstrip("/")
    name = PurePosixPath(normalized).name
    return bool(PurePosixPath(normalized).suffix) and not path.endswith("/")


def directories_from_entries(entries: list[str]) -> list[str]:
    dirs: set[str] = set()
    for entry in entries:
        normalized = entry.strip().replace("\\", "/").rstrip("/")
        if not normalized:
            continue
        if path_is_file(entry):
            parent = str(PurePosixPath(normalized).parent)
            if parent != ".":
                dirs.add(parent)
        else:
            dirs.add(normalized)

    for base in BASE_DIRECTORIES:
        dirs.add(base.rstrip("/"))

    return sorted(dirs, key=lambda value: value.lower())


def extract_tech_rows(arch: str) -> list[dict[str, str]]:
    return parse_markdown_table(extract_section(arch, "Tech Stack"))


def summarize_stack(tech_rows: list[dict[str, str]]) -> str:
    preferred = {
        "Tauri",
        "Rust",
        "Node.js",
        "React",
        "TypeScript",
        "Vite",
        "xterm.js",
        "SQLite",
        "serde_yaml",
        "Zod plus Rust validation",
        "Vitest, React Testing Library, Rust tests",
        "Playwright or dev-browser skill",
    }
    parts: list[str] = []
    for row in tech_rows:
        technology = row.get("Technology", "").strip()
        version = row.get("Version", "").strip()
        if not technology:
            continue
        if technology in preferred:
            parts.append(f"{technology} {version}".strip())

    return ", ".join(parts) if parts else "Tauri v2, React, TypeScript, Rust, SQLite"


def extract_domain_entities(arch: str) -> list[str]:
    entities = re.findall(r"^### Entity:\s*(.+?)\s*$", arch, re.MULTILINE)
    if entities:
        return [entity.strip() for entity in entities]

    rows = parse_markdown_table(extract_section(arch, "Dictionary"))
    preferred = {
        "Workspace",
        "Repo",
        "Agent Profile",
        "Task",
        "Acceptance Criterion",
        "Session",
        "Changed File",
        "Warning",
        "Review Record",
        "Validation Run",
    }
    terms = [row.get("Term", "").strip() for row in rows if row.get("Term", "").strip()]
    return [term for term in terms if term in preferred] or terms[:20]


def load_context() -> LaunchpadContext:
    prd, arch, research = load_required_docs()
    project_name = extract_project_name(prd)
    directory_entries = extract_directory_entries(arch)
    tech_rows = extract_tech_rows(arch)

    return LaunchpadContext(
        prd=prd,
        arch=arch,
        research=research,
        project_name=project_name,
        project_slug=slugify(project_name),
        description=extract_description(prd),
        directory_entries=directory_entries,
        directories=directories_from_entries(directory_entries),
        tech_rows=tech_rows,
        stack_summary=summarize_stack(tech_rows),
        domain_entities=extract_domain_entities(arch),
    )


def write_file(path: Path, content: str, executable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content.strip("\n")
    lines = text.splitlines()
    first_content_line = next((line for line in lines if line.strip()), "")
    template_indent = len(first_content_line) - len(first_content_line.lstrip(" "))
    if template_indent:
        prefix = " " * template_indent
        lines = [line[template_indent:] if line.startswith(prefix) else line for line in lines]
    normalized = dedent("\n".join(lines)).strip()
    path.write_text(normalized + "\n", encoding="utf-8")
    if executable and os.name != "nt":
        path.chmod(path.stat().st_mode | 0o755)


def create_directories(context: LaunchpadContext) -> None:
    for directory in context.directories:
        (ROOT / directory).mkdir(parents=True, exist_ok=True)


def create_gitignore(context: LaunchpadContext) -> None:
    del context
    write_file(
        ROOT / ".gitignore",
        """
        # Python helpers
        __pycache__/
        *.py[cod]
        *$py.class
        .venv/
        venv/
        env/
        *.egg-info/

        # Node / Vite / Tauri frontend
        node_modules/
        dist/
        .vite/
        *.tsbuildinfo
        npm-debug.log*
        yarn-debug.log*
        yarn-error.log*
        pnpm-debug.log*

        # Rust / Tauri backend
        target/
        src-tauri/target/
        **/*.rs.bk

        # Tests and browser verification
        coverage/
        playwright-report/
        test-results/
        .nyc_output/

        # Environment
        .env
        .env.local
        *.local

        # IDE
        .idea/
        .vscode/
        *.swp
        *.swo

        # OS
        .DS_Store
        Thumbs.db

        # Project
        .tmp/
        *.log
        """,
    )


def create_env_example(context: LaunchpadContext) -> None:
    security = extract_section(context.arch, "Security Considerations")
    env_vars = sorted(set(re.findall(r"`([A-Z][A-Z0-9_]+)`", security)))
    has_app_data = "RUNDECK_APP_DATA_DIR" in env_vars

    lines = [
        "# RunDeck local data paths",
    ]
    if has_app_data:
        lines.append("RUNDECK_APP_DATA_DIR=%APPDATA%/RunDeck")
    else:
        lines.append("# RUNDECK_APP_DATA_DIR=%APPDATA%/RunDeck")

    lines.extend(
        [
            "# RUNDECK_PROFILE_DIR=%APPDATA%/RunDeck/profiles",
            "# RUNDECK_LOG_DIR=%APPDATA%/RunDeck/logs",
            "",
            "# WSL runtime",
            "# RUNDECK_DEFAULT_WSL_DISTRO=Ubuntu-24.04",
            "",
            "# Agent CLI credentials are inherited by launched CLIs.",
            "# RunDeck does not store provider API keys as structured secrets in v1.",
            "# OPENAI_API_KEY=sk-...",
            "# ANTHROPIC_API_KEY=sk-ant-...",
            "# GEMINI_API_KEY=...",
            "# GITHUB_TOKEN=ghp_...",
        ]
    )

    write_file(ROOT / ".env.example", "\n".join(lines))


def build_directory_tree(entries: list[str]) -> str:
    tree: dict[str, dict] = {}

    for entry in entries:
        normalized = entry.strip().replace("\\", "/").rstrip("/")
        if not normalized:
            continue
        parts = [part for part in normalized.split("/") if part]
        node = tree
        for index, part in enumerate(parts):
            is_last = index == len(parts) - 1
            key = part + ("" if is_last and path_is_file(entry) else "/")
            node = node.setdefault(key, {})

    def render_node(node: dict[str, dict], prefix: str = "") -> list[str]:
        lines: list[str] = []
        items = sorted(node.items(), key=lambda item: (not item[0].endswith("/"), item[0].lower()))
        for index, (name, child) in enumerate(items):
            last = index == len(items) - 1
            connector = "`-- " if last else "|-- "
            lines.append(f"{prefix}{connector}{name}")
            child_prefix = prefix + ("    " if last else "|   ")
            lines.extend(render_node(child, child_prefix))
        return lines

    return ".\n" + "\n".join(render_node(tree))


def create_readme(context: LaunchpadContext) -> None:
    tree = build_directory_tree(context.directory_entries)
    write_file(
        ROOT / "README.md",
        f"""
        # {context.project_name}

        {context.description}

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
        {tree}
        ```
        """,
    )


def create_requirements(context: LaunchpadContext) -> None:
    write_file(
        ROOT / "requirements.txt",
        """
        # Python helper scripts only.
        # The product runtime is Tauri v2 + React/TypeScript + Rust/SQLite.
        # Keep this file so setup and verification commands have a stable target:
        #   pip install -r requirements.txt
        """,
    )

    package_json = {
        "name": context.project_slug,
        "version": "0.1.0",
        "private": True,
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "preview": "vite preview",
            "test": "vitest run",
            "test:watch": "vitest",
            "lint": "tsc --noEmit",
            "tauri": "tauri",
            "e2e": "playwright test",
        },
        "dependencies": {
            "@tauri-apps/api": "^2.0.0",
            "@xterm/addon-fit": "^0.10.0",
            "@xterm/addon-search": "^0.15.0",
            "@xterm/addon-web-links": "^0.11.0",
            "@xterm/xterm": "^5.5.0",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "zod": "^3.23.8",
        },
        "devDependencies": {
            "@playwright/test": "^1.45.0",
            "@tauri-apps/cli": "^2.0.0",
            "@testing-library/jest-dom": "^6.4.0",
            "@testing-library/react": "^15.0.0",
            "@types/react": "^18.2.66",
            "@types/react-dom": "^18.2.22",
            "@vitejs/plugin-react": "^4.2.1",
            "jsdom": "^24.0.0",
            "typescript": "^5.4.0",
            "vite": "^5.2.0",
            "vitest": "^1.5.0",
        },
    }
    write_file(ROOT / "package.json", json.dumps(package_json, indent=2))

    write_file(ROOT / ".nvmrc", "lts/*")
    write_file(
        ROOT / "rust-toolchain.toml",
        """
        [toolchain]
        channel = "stable"
        components = ["rustfmt", "clippy"]
        """,
    )
    write_file(
        ROOT / "tsconfig.json",
        """
        {
          "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": true,
            "lib": ["DOM", "DOM.Iterable", "ES2020"],
            "allowJs": false,
            "skipLibCheck": true,
            "esModuleInterop": true,
            "allowSyntheticDefaultImports": true,
            "strict": true,
            "forceConsistentCasingInFileNames": true,
            "module": "ESNext",
            "moduleResolution": "Node",
            "resolveJsonModule": true,
            "isolatedModules": true,
            "noEmit": true,
            "jsx": "react-jsx"
          },
          "include": ["src", "tests", "vite.config.ts"],
          "references": []
        }
        """,
    )
    write_file(
        ROOT / "vite.config.ts",
        """
        import react from "@vitejs/plugin-react";
        import { defineConfig } from "vite";

        export default defineConfig({
          plugins: [react()],
          clearScreen: false,
          server: {
            port: 5173,
            strictPort: true,
          },
          envPrefix: ["VITE_", "TAURI_"],
          test: {
            environment: "jsdom",
            globals: true,
            setupFiles: [],
          },
        });
        """,
    )
    write_file(
        ROOT / "index.html",
        f"""
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{context.project_name}</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>
        """,
    )
    write_file(
        ROOT / "src" / "main.tsx",
        """
        import React from "react";
        import ReactDOM from "react-dom/client";
        import { App } from "./app/App";
        import "./styles.css";

        ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        );
        """,
    )
    write_file(
        ROOT / "src" / "app" / "App.tsx",
        f"""
        export function App() {{
          return (
            <main className="app-shell">
              <aside className="sidebar" aria-label="Workspaces">
                <div className="brand">RunDeck</div>
                <div className="nav-item is-active">Workspaces</div>
                <div className="nav-item">Tasks</div>
                <div className="nav-item">Sessions</div>
                <div className="nav-item">Review</div>
              </aside>
              <section className="workspace-surface" aria-label="Workspace dashboard">
                <header className="topbar">
                  <div>
                    <p className="eyebrow">Local Agent Mission Control</p>
                    <h1>{context.project_name}</h1>
                  </div>
                  <span className="status-pill">Scaffold Ready</span>
                </header>
                <div className="dashboard-grid">
                  <section className="panel">
                    <h2>Task Board</h2>
                    <p>Create Directive 002 before adding production workflow code.</p>
                  </section>
                  <section className="panel terminal-panel">
                    <h2>Terminal Grid</h2>
                    <pre>Session backend spike pending</pre>
                  </section>
                  <section className="panel">
                    <h2>Review Gate</h2>
                    <p>Changed files, raw diff, validation, and human review actions belong here.</p>
                  </section>
                </div>
              </section>
            </main>
          );
        }}
        """,
    )
    write_file(
        ROOT / "src" / "styles.css",
        """
        :root {
          color: #e8eef7;
          background: #101417;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
          font-synthesis: none;
          text-rendering: optimizeLegibility;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-width: 1280px;
          min-height: 720px;
          background: #101417;
        }

        .app-shell {
          display: grid;
          grid-template-columns: 248px minmax(0, 1fr);
          min-height: 100vh;
        }

        .sidebar {
          border-right: 1px solid #26313a;
          background: #151b20;
          padding: 20px 14px;
        }

        .brand {
          margin-bottom: 28px;
          font-size: 18px;
          font-weight: 700;
        }

        .nav-item {
          border-radius: 6px;
          color: #a9b5c2;
          padding: 10px 12px;
          font-size: 14px;
        }

        .nav-item.is-active {
          background: #25313b;
          color: #ffffff;
        }

        .workspace-surface {
          min-width: 0;
          padding: 24px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #26313a;
          padding-bottom: 18px;
        }

        .eyebrow {
          margin: 0 0 4px;
          color: #8ba0b5;
          font-size: 12px;
          text-transform: uppercase;
        }

        h1,
        h2,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 0;
          font-size: 24px;
        }

        h2 {
          font-size: 16px;
        }

        .status-pill {
          border: 1px solid #3c8f74;
          border-radius: 999px;
          color: #79d2b4;
          padding: 6px 10px;
          font-size: 12px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 20px;
        }

        .panel {
          min-height: 180px;
          border: 1px solid #26313a;
          border-radius: 8px;
          background: #171f25;
          padding: 16px;
        }

        .terminal-panel {
          grid-row: span 2;
        }

        pre {
          min-height: 260px;
          margin: 0;
          border-radius: 6px;
          background: #090c0f;
          color: #9ad28b;
          padding: 12px;
          overflow: auto;
        }
        """,
    )
    write_file(
        ROOT / "src-tauri" / "Cargo.toml",
        f"""
        [package]
        name = "{context.project_slug.replace('-', '_')}"
        version = "0.1.0"
        edition = "2021"

        [build-dependencies]
        tauri-build = {{ version = "2", features = [] }}

        [dependencies]
        portable-pty = "0.8"
        rusqlite = {{ version = "0.31", features = ["bundled"] }}
        serde = {{ version = "1", features = ["derive"] }}
        serde_json = "1"
        serde_yaml = "0.9"
        tauri = {{ version = "2", features = [] }}
        tauri-plugin-shell = "2"
        thiserror = "1"
        time = {{ version = "0.3", features = ["formatting", "parsing", "serde"] }}
        uuid = {{ version = "1", features = ["serde", "v4"] }}
        """,
    )
    write_file(
        ROOT / "src-tauri" / "build.rs",
        """
        fn main() {
            tauri_build::build()
        }
        """,
    )
    write_file(
        ROOT / "src-tauri" / "tauri.conf.json",
        f"""
        {{
          "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
          "productName": "{context.project_name}",
          "version": "0.1.0",
          "identifier": "com.rundeck.agentdeck",
          "build": {{
            "beforeDevCommand": "npm run dev",
            "devUrl": "http://localhost:5173",
            "beforeBuildCommand": "npm run build",
            "frontendDist": "../dist"
          }},
          "app": {{
            "windows": [
              {{
                "title": "{context.project_name}",
                "width": 1280,
                "height": 720,
                "minWidth": 1280,
                "minHeight": 720
              }}
            ],
            "security": {{
              "csp": null
            }}
          }},
          "bundle": {{
            "active": true,
            "targets": "all"
          }}
        }}
        """,
    )
    write_file(
        ROOT / "src-tauri" / "src" / "main.rs",
        """
        #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

        fn main() {
            tauri::Builder::default()
                .plugin(tauri_plugin_shell::init())
                .run(tauri::generate_context!())
                .expect("error while running RunDeck");
        }
        """,
    )
    write_file(
        ROOT / "src-tauri" / "src" / "errors.rs",
        """
        use serde::Serialize;
        use thiserror::Error;

        #[derive(Debug, Error)]
        pub enum AppError {
            #[error("{message}")]
            Validation { code: &'static str, message: String },
            #[error("internal error: {0}")]
            Internal(String),
        }

        #[derive(Debug, Serialize)]
        pub struct ErrorEnvelope {
            pub code: String,
            pub message: String,
            pub retryable: bool,
        }

        impl From<AppError> for ErrorEnvelope {
            fn from(error: AppError) -> Self {
                match error {
                    AppError::Validation { code, message } => Self {
                        code: code.to_string(),
                        message,
                        retryable: false,
                    },
                    AppError::Internal(message) => Self {
                        code: "INTERNAL_ERROR".to_string(),
                        message,
                        retryable: false,
                    },
                }
            }
        }
        """,
    )


def format_bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def create_agents_md(context: LaunchpadContext) -> None:
    domain_entities = format_bullets(context.domain_entities)
    write_file(
        ROOT / "AGENTS.md",
        f"""
        # AGENTS.md - System Kernel

        ## Project Context

        **Name:** {context.project_name}
        **Purpose:** {context.description}
        **Stack:** {context.stack_summary}

        ## Core Domain Entities

        {domain_entities}

        ---

        ## 1. The Prime Directive

        You are an agent operating on the {context.project_name} codebase.

        **Before writing ANY code:**
        1. Read `docs/PRD.md` to understand WHAT we are building.
        2. Read `docs/ARCH.md` to understand HOW we structure it.
        3. Consult `docs/RESEARCH.md` for proven patterns to follow.
        4. Check `directives/` for your current assignment.

        **Core Rules:**
        - Use ONLY the technologies defined in ARCH.md Tech Stack.
        - Use ONLY the terms defined in ARCH.md Dictionary.
        - Follow ONLY the API contracts defined in ARCH.md.
        - Place code ONLY in the directories specified in ARCH.md.
        - Preserve the local-first, operator-reviewed workflow. Do not add cloud sync, multi-user auth, browser automation, or auto-merge in v1.

        ---

        ## 2. The 3-Layer Workflow

        ### Layer 1: Directives (Orders)
        - Location: `directives/`
        - Purpose: Task assignments with specific acceptance criteria.
        - Action: Read the lowest-numbered incomplete directive.

        ### Layer 2: Orchestration (Planning)
        - Location: `docs/plans/`
        - Purpose: Granular implementation plans for each directive.
        - Action: Before coding, break the directive into tasks following `docs/methodology/implementation-planning.md`.

        ### Layer 3: Execution (Automation)
        - Location: `execution/`
        - Purpose: Reusable scripts for repetitive tasks.
        - Examples: `verify_setup.py`, `run_migrations.py`, `seed_data.py`, `run_tests.py`.

        ---

        ## 3. The TDD Iron Law

        **NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

        ### The Mandatory Cycle

        For every piece of functionality:

        1. **RED:** Write a test in `tests/` or `src-tauri/tests/` that describes the expected behavior. Run it. Confirm it **fails** and fails for the right reason.
        2. **GREEN:** Write the **minimum** code in `src/` or `src-tauri/src/` to make the test pass. Run all relevant tests. Confirm they pass.
        3. **REFACTOR:** Clean up the code while keeping tests green. Run all tests again. Confirm they still pass.
        4. **COMMIT:** Only after all tests pass.

        ### The Nuclear Rule

        If you write production code before writing its test:
        - **Delete it.** Not "keep as reference." Not "adapt it while writing tests." Delete means delete.
        - Write the test first.
        - Implement fresh, guided by the failing test.

        ### Test File Locations

        Mirror the source structure where practical:
        - `src/features/tasks/TaskCard.tsx` -> `tests/features/tasks/TaskCard.test.tsx`
        - `src/lib/tauriClient.ts` -> `tests/lib/tauriClient.test.ts`
        - `src-tauri/src/services/task_service.rs` -> `src-tauri/tests/task_service_test.rs`
        - `src-tauri/src/adapters/git.rs` -> `src-tauri/tests/git_adapter_test.rs`

        ### TDD Rationalizations Table

        If you catch yourself thinking any of these, **STOP**:

        | Excuse | Reality |
        |--------|---------|
        | "This is too simple to test" | Simple code breaks. The test takes 30 seconds to write. |
        | "I'll write tests after" | Tests that pass immediately prove nothing. They describe what the code does, not what it should do. |
        | "I already tested it manually" | Manual testing has no record and cannot be re-run. |
        | "Deleting my work is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt with interest. |
        | "I'll keep it as reference and write tests first" | You'll adapt it. That's tests-after with extra steps. Delete means delete. |
        | "I need to explore first" | Explore freely. Then throw away the exploration and start with TDD. |
        | "The test is hard to write; the design isn't clear yet" | Listen to the test. Hard to test means hard to use. Redesign. |
        | "TDD will slow me down" | TDD is faster than debugging. Every shortcut becomes a debugging session. |
        | "TDD is dogmatic; I'm being pragmatic" | TDD is pragmatic. "Pragmatic" shortcuts become production debugging. |
        | "This is different because..." | It's not. Delete the code. Start with the test. |

        ### Red Flags - Stop and Start Over

        - You wrote code before its test.
        - A new test passes immediately.
        - You cannot explain why a test failed.
        - You are rationalizing "just this once."

        ---

        ## 4. Implementation Planning

        **Before coding any directive, create an implementation plan.**

        See `docs/methodology/implementation-planning.md` for the full template.

        **The rule:** Write every plan as if the implementer is an enthusiastic junior engineer with no project context and an aversion to testing. This forces you to be completely explicit:

        - **Exact file paths** - not "the config file" but `src-tauri/src/adapters/git.rs`.
        - **Complete code** - not "add validation" but the actual validation code.
        - **Exact commands** - not "run the tests" but `npm test -- tests/features/tasks/TaskCard.test.tsx`.
        - **Expected output** - what success and failure look like.

        **Granularity:** Each task should take 2-5 minutes. Each step within a task is exactly ONE action.

        Plans are saved to `docs/plans/YYYY-MM-DD-<feature-name>.md`.

        ---

        ## 5. Review Gates

        **Every completed task goes through two review stages before moving on.**

        See `docs/methodology/review-gates.md` for checklists.

        ### Gate 1: Spec Compliance Review

        After completing a task, review against the directive's acceptance criteria:
        - Does the code implement exactly what was specified?
        - Is anything **missing** from the spec?
        - Is anything **extra** that was not requested? Remove it.
        - **Do not trust self-reports.** Read the actual code. Run the actual tests.

        ### Gate 2: Code Quality Review

        Only after spec compliance passes:
        - Architecture: Does it follow ARCH.md patterns?
        - Testing: Are tests meaningful and not just asserting mock behavior?
        - DRY: Is there duplication that should be consolidated?
        - Error handling: Are failure modes covered?
        - Security: Does it preserve log redaction, runtime isolation, and filesystem safety?

        Issues are categorized:
        - **Critical** - Must fix before proceeding. Blocks progress.
        - **Important** - Should fix. Creates tech debt if skipped.
        - **Minor** - Nice to have. Fix if time allows.

        ### Batch Checkpoints

        After every 3 completed tasks, pause and produce a progress report:
        - What's been completed.
        - What's next.
        - Any concerns or architectural questions.
        - Request human feedback before continuing.

        ---

        ## 6. Verification Before Completion

        **NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.**

        Before marking any task, directive, or feature as "done":
        1. **Run the verification command**: test suite, linter, type checker, Rust tests, or browser verification.
        2. **Read the actual output**: not from memory, not assumed.
        3. **Include the evidence** in your completion report.

        ### Verification Red Flags - Stop Immediately

        If you catch yourself using these words before running verification:
        - "Should work now"
        - "That should fix it"
        - "Seems correct"
        - "I'm confident this works"
        - "Great! Done!"

        These are emotional signals, not evidence. **Run the command. Read the output. Then speak.**

        ### Verification Rationalizations Table

        | Excuse | Reality |
        |--------|---------|
        | "It should work now" | Run the verification. |
        | "I'm confident in this change" | Confidence is not evidence. |
        | "The linter passed" | Linter passing is not the same as tests passing or correct behavior. |
        | "I checked it mentally" | Mental checks miss edge cases. Run the actual command. |
        | "Just this once we can skip verification" | No exceptions. |
        | "Partial verification is enough" | Partial evidence proves nothing about what you did not check. |

        ---

        ## 7. Systematic Debugging

        **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

        When something breaks, follow the 4-phase process. See `docs/methodology/debugging-guide.md` for details.

        ### Phase 1: Root Cause Investigation
        - Read the error carefully. Reproduce it consistently.
        - Check what recently changed.
        - Trace the data flow backward from the symptom to the source.

        ### Phase 2: Pattern Analysis
        - Find working examples of similar code in the codebase.
        - Compare the broken code against working references.
        - Identify all differences.

        ### Phase 3: Hypothesis and Testing
        - Form ONE hypothesis: "I think X happens because Y."
        - Test with the smallest possible change.
        - If wrong, form a NEW hypothesis. Do not stack fixes.

        ### Phase 4: Implementation
        - Write a failing test that reproduces the bug.
        - Fix with a single, targeted change.
        - Verify all tests pass, existing and new.

        ### The 3-Strikes Rule

        If 3 consecutive fix attempts fail: **STOP.**
        - Question whether the approach or architecture is fundamentally sound.
        - Discuss with the team before attempting more fixes.
        - Consider whether you're fixing a symptom instead of the cause.

        ---

        ## 8. Anti-Rationalization Rules

        AI agents, including you, will try to bypass the processes above. This section preemptively blocks the most common escape routes.

        **The principle: The ritual IS the spirit.** Violating the letter of these rules is violating the spirit. There are no clever workarounds.

        ### Universal Red Flags

        If any of these thoughts arise, treat them as a signal to **slow down**, not speed up:

        - "I need more context before I can start" - You have PRD, ARCH, RESEARCH, and the directive. Start with the test.
        - "Let me explore the codebase first" - Read the plan. If there's no plan, write one. Do not explore aimlessly.
        - "I'll clean this up later" - Clean it up now or do not touch it.
        - "This does not apply to this situation" - It does. Follow the process.
        - "I already know the answer" - Prove it. Write the test. Run the verification.
        - "I'll be more careful next time" - Be careful this time. Follow the process this time.

        ---

        ## 9. Definition of Done

        A task is complete when:
        - [ ] Implementation plan was written before coding.
        - [ ] Code exists in the appropriate `src/` or `src-tauri/src/` subdirectory.
        - [ ] All new code has corresponding tests in `tests/` or `src-tauri/tests/`.
        - [ ] Tests were written BEFORE implementation.
        - [ ] All tests pass after a fresh run.
        - [ ] Type checking passes with `npm run lint`.
        - [ ] Rust tests pass when backend code changed.
        - [ ] Browser verification passes for UI stories using Playwright or dev-browser skill.
        - [ ] Spec compliance review passed.
        - [ ] Code quality review passed with no Critical or Important issues.
        - [ ] Related PRD User Story acceptance criteria are met.
        - [ ] Directive file is marked as Complete.

        ---

        ## 10. File Naming Conventions

        | Type | Convention | Example |
        |------|------------|---------|
        | React components | PascalCase | `TaskCard.tsx` |
        | TypeScript utilities | camelCase | `tauriClient.ts` |
        | TypeScript tests | `.test.ts` or `.test.tsx` suffix | `TaskCard.test.tsx` |
        | Rust modules | snake_case | `task_service.rs` |
        | Rust tests | descriptive snake_case | `task_service_test.rs` |
        | Directives | `NNN_description.md` | `001_initial_setup.md` |
        | Implementation plans | `YYYY-MM-DD-feature.md` | `2026-04-28-session-backend.md` |
        | Tauri commands | snake_case verbs | `launch_task_session` |

        ---

        ## 11. Commit Message Format

        ```text
        type(scope): description

        [optional body]

        Refs: directive-NNN
        ```

        Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

        Example:

        ```text
        feat(sessions): add PTY session backend interface

        Adds the initial SessionBackend trait and tests for launch failure mapping.
        Refs: directive-002
        ```
        """,
    )


def create_methodology_docs(context: LaunchpadContext) -> None:
    del context
    write_file(
        ROOT / "docs" / "methodology" / "implementation-planning.md",
        """
        # Implementation Planning Guide

        ## Purpose

        Before coding any directive, break it into a detailed implementation plan. This prevents context drift and ensures each step is small enough to verify independently.

        ## Plan Template

        Save plans to `docs/plans/YYYY-MM-DD-<feature-name>.md`.

        ```markdown
        # [Feature Name] Implementation Plan

        **Directive:** [NNN]
        **Date:** [YYYY-MM-DD]
        **Goal:** [One sentence - what this achieves]
        **Architecture Notes:** [2-3 sentences - key patterns from ARCH.md that apply]

        ---

        ### Task 1: [Component Name]

        **Files:**
        - Create: `src/features/tasks/TaskCard.tsx`
        - Create: `tests/features/tasks/TaskCard.test.tsx`

        **Step 1:** Write failing test
        - File: `tests/features/tasks/TaskCard.test.tsx`
        - Code: [complete test code]
        - Run: `npm test -- tests/features/tasks/TaskCard.test.tsx`
        - Expected: 1 failed test for the expected missing behavior

        **Step 2:** Implement minimum code
        - File: `src/features/tasks/TaskCard.tsx`
        - Code: [complete implementation code]
        - Run: `npm test -- tests/features/tasks/TaskCard.test.tsx`
        - Expected: 1 passed test

        **Step 3:** Refactor if needed
        - [Describe what to clean up]
        - Run: `npm test`
        - Expected: All tests passed

        **Step 4:** Commit
        - `git add src/features/tasks/TaskCard.tsx tests/features/tasks/TaskCard.test.tsx`
        - `git commit -m "feat(tasks): add task card component"`
        ```

        ## Task Decomposition Rules

        1. **2-5 minutes per task.** If a task takes longer, break it down further.
        2. **One action per step.** "Write the test" is one step. "Run the test" is a separate step.
        3. **Exact file paths.** Never say "the config file"; say `src-tauri/src/db/connection.rs`.
        4. **Complete code.** Never say "add validation"; write the actual validation code.
        5. **Exact commands with expected output.** Never say "run tests"; say `npm test -- tests/features/tasks/TaskCard.test.tsx` and describe what success looks like.
        6. **Write for someone with no context.** Assume the implementer cannot infer anything.

        ## Plan Execution

        Execute tasks sequentially. After each task:
        1. Run the spec compliance review.
        2. Run the code quality review.
        3. Move to the next task only when both reviews pass.

        After every 3 tasks, produce a checkpoint report.
        """,
    )

    write_file(
        ROOT / "docs" / "methodology" / "review-gates.md",
        """
        # Review Gates Guide

        ## Purpose

        Every completed task passes through two review stages before moving on. This catches issues early, before they compound across multiple tasks.

        ## Gate 1: Spec Compliance Review

        **Goal:** Does the code do what the directive asked?

        ### Checklist

        - [ ] Read the directive's acceptance criteria line by line.
        - [ ] For each criterion, read the actual code that implements it.
        - [ ] For each criterion, run the verification command and confirm it passes.
        - [ ] Check for missing requirements - things the directive asked for that were not implemented.
        - [ ] Check for extra additions - things that were implemented but were not asked for.
        - [ ] Check for misinterpretations - things that were implemented but do not match the spec's intent.

        ### Adversarial Posture

        Assume the self-report is optimistic. Do NOT trust claims like:
        - "All tests pass" - Run them yourself.
        - "Implemented as specified" - Read the code and compare to the spec.
        - "No issues found" - Look for issues anyway.

        ### Outcome

        - **Pass:** Proceed to Gate 2.
        - **Issues Found:** Fix issues, then re-review from the beginning.

        ## Gate 2: Code Quality Review

        **Goal:** Is the code well-built?

        Only run this AFTER Gate 1 passes.

        ### Checklist

        - [ ] **Architecture:** Does it follow ARCH.md patterns and directory structure?
        - [ ] **Domain Language:** Are ARCH.md Dictionary terms used correctly and consistently?
        - [ ] **Testing:** Are tests testing real behavior, not just mock existence?
        - [ ] **Error Handling:** Are failure modes covered with appropriate error codes from ARCH.md?
        - [ ] **DRY:** Is there duplication that should be extracted?
        - [ ] **Security:** Does it follow ARCH.md Security Considerations?

        ### Issue Categorization

        | Category | Definition | Action |
        |----------|------------|--------|
        | **Critical** | Breaks functionality, security vulnerability, or violates ARCH.md contract | Must fix before proceeding |
        | **Important** | Tech debt, poor patterns, insufficient tests | Should fix; creates compound problems if skipped |
        | **Minor** | Style, naming, documentation | Fix if time allows |

        ### Outcome

        - **Pass:** Task is complete. Move to next task.
        - **Critical/Important issues:** Fix, then re-review from Gate 1.

        ## Batch Checkpoints

        After every 3 completed tasks, pause and report:

        ```markdown
        ## Checkpoint Report

        ### Completed
        - Task 1: [description] - Done
        - Task 2: [description] - Done
        - Task 3: [description] - Done

        ### Up Next
        - Task 4: [description]
        - Task 5: [description]

        ### Concerns
        - [Any architectural questions, blockers, or scope issues]

        ### Request
        [Ask for human feedback before continuing]
        ```
        """,
    )

    write_file(
        ROOT / "docs" / "methodology" / "debugging-guide.md",
        """
        # Systematic Debugging Guide

        ## Purpose

        When something breaks, resist the urge to guess-and-fix. Follow the 4-phase process to find and fix the actual root cause, not just the symptom.

        ## Phase 1: Root Cause Investigation

        Before changing any code:

        1. **Read the error carefully.** The full error message, stack trace, and logs. Not a glance - a careful read.
        2. **Reproduce consistently.** If you cannot reproduce it on demand, you do not understand it yet.
        3. **Check recent changes.** What was the last change before this broke? Start there.
        4. **Trace backward.** Start at the symptom. Ask: "What called this with the bad value?" Trace up the call stack until you find where the bad data originated.
        5. **Log at boundaries.** In multi-component systems, add logging at every component boundary to isolate which layer introduced the problem.

        ## Phase 2: Pattern Analysis

        1. **Find working examples.** Is there similar code in the codebase that works? Read it completely.
        2. **Compare differences.** What's different between the working code and the broken code?
        3. **Check documentation.** Does the library or framework documentation say something you missed?

        ## Phase 3: Hypothesis and Testing

        1. **Form ONE hypothesis.** "I think [symptom] happens because [cause]."
        2. **Test with the smallest possible change.** One variable at a time.
        3. **If wrong:** Form a NEW hypothesis. Do NOT stack multiple changes. Revert and try again.
        4. **If right:** Proceed to Phase 4.

        **Do not guess.** Do not try random fixes. Do not change multiple things at once.

        ## Phase 4: Implementation

        1. **Write a failing test** that reproduces the bug.
        2. **Fix with a single, targeted change.**
        3. **Run ALL tests** to confirm no regressions.
        4. **Add defense-in-depth validation** to prevent this class of bug from recurring:
           - Entry point validation.
           - Business logic assertions.
           - Clear error messages that point to the cause.

        ## The 3-Strikes Rule

        If 3 consecutive fix attempts fail: **STOP.**

        Before attempting a 4th fix, answer these questions:
        - "Is this architecture fundamentally sound, or am I fighting the design?"
        - "Am I fixing the root cause or a downstream symptom?"
        - "Should I discuss this with the team before continuing?"

        If you cannot confidently answer all three, escalate to a human.

        ## Common Debugging Anti-Patterns

        | Anti-Pattern | What To Do Instead |
        |--------------|-------------------|
        | Guessing and trying random fixes | Form a hypothesis, test one variable at a time |
        | Changing multiple things at once | Revert all, change one thing, verify |
        | Fixing the symptom not the cause | Trace backward to the source of bad data |
        | "It works on my machine" | Check environment differences systematically |
        | Adding try/catch to suppress errors | Fix the cause; errors exist for a reason |
        | Reading the error too quickly | Read it word by word, including the full stack trace |
        """,
    )


def create_initial_directive(context: LaunchpadContext) -> None:
    write_file(
        ROOT / "directives" / "001_initial_setup.md",
        f"""
        # Directive 001: Initial Environment Setup

        ## Objective

        Configure the {context.project_name} development environment and verify the Tauri, React, TypeScript, Rust, SQLite, and local execution tooling is ready.

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
        .venv\\Scripts\\activate
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
        """,
    )


def create_verify_script(context: LaunchpadContext) -> None:
    required_dirs = json.dumps(context.directories, indent=8)
    script = f'''
#!/usr/bin/env python3
"""
Verify that the development environment is correctly configured.
Run this after initial setup to confirm everything works.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


REQUIRED_DIRS = {required_dirs}


def run_command(command: list[str]) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except FileNotFoundError:
        return False, f"{{command[0]}} not found"
    except subprocess.TimeoutExpired:
        return False, f"{{command[0]}} timed out"

    output = (result.stdout or result.stderr).strip().splitlines()
    message = output[0] if output else f"{{command[0]}} exited with {{result.returncode}}"
    return result.returncode == 0, message


def check_python_version() -> tuple[bool, str]:
    required = (3, 11)
    current = sys.version_info[:2]
    if current < required:
        return False, f"Python {{required[0]}}.{{required[1]}}+ required, found {{current[0]}}.{{current[1]}}"
    return True, f"Python {{current[0]}}.{{current[1]}}"


def check_tool(name: str, command: list[str]) -> tuple[bool, str]:
    if shutil.which(command[0]) is None:
        return False, f"{{name}} not found on PATH"
    passed, message = run_command(command)
    if not passed:
        return False, f"{{name}} check failed: {{message}}"
    return True, message


def check_env_file() -> tuple[bool, str]:
    env_path = Path(".env")
    if not env_path.exists():
        return False, ".env file not found (copy from .env.example)"
    return True, ".env file exists"


def check_required_dirs() -> tuple[bool, str]:
    missing = [directory for directory in REQUIRED_DIRS if not Path(directory).is_dir()]
    if missing:
        return False, f"Missing directories: {{', '.join(missing)}}"
    return True, "All required directories exist"


def check_docs() -> tuple[bool, str]:
    docs = ["docs/PRD.md", "docs/ARCH.md", "docs/RESEARCH.md", "AGENTS.md"]
    missing = [path for path in docs if not Path(path).exists()]
    if missing:
        return False, f"Missing documents: {{', '.join(missing)}}"
    return True, "PRD.md, ARCH.md, RESEARCH.md, and AGENTS.md exist"


def check_methodology() -> tuple[bool, str]:
    docs = [
        "docs/methodology/implementation-planning.md",
        "docs/methodology/review-gates.md",
        "docs/methodology/debugging-guide.md",
    ]
    missing = [path for path in docs if not Path(path).exists()]
    if missing:
        return False, f"Missing methodology docs: {{', '.join(missing)}}"
    return True, "All methodology documents exist"


def check_manifests() -> tuple[bool, str]:
    manifests = [
        "package.json",
        "tsconfig.json",
        "vite.config.ts",
        "src-tauri/Cargo.toml",
        "src-tauri/tauri.conf.json",
        "rust-toolchain.toml",
    ]
    missing = [path for path in manifests if not Path(path).exists()]
    if missing:
        return False, f"Missing manifests: {{', '.join(missing)}}"
    return True, "Frontend and backend manifests exist"


def main() -> int:
    checks = [
        ("Python Version", check_python_version),
        ("Node.js", lambda: check_tool("Node.js", ["node", "--version"])),
        ("npm", lambda: check_tool("npm", ["npm", "--version"])),
        ("Rust Cargo", lambda: check_tool("Cargo", ["cargo", "--version"])),
        ("Git", lambda: check_tool("Git", ["git", "--version"])),
        ("Environment File", check_env_file),
        ("Directory Structure", check_required_dirs),
        ("Documentation", check_docs),
        ("Methodology", check_methodology),
        ("Project Manifests", check_manifests),
    ]

    print("=" * 50)
    print("Environment Verification")
    print("=" * 50)

    all_passed = True
    for name, check_func in checks:
        passed, message = check_func()
        status = "OK" if passed else "FAIL"
        print(f"[{{status}}] {{name}}: {{message}}")
        if not passed:
            all_passed = False

    print("=" * 50)
    if all_passed:
        print("All checks passed. Environment is ready.")
        return 0

    print("Some checks failed. Please fix the issues above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
'''
    write_file(ROOT / "execution" / "verify_setup.py", script, executable=True)


def create_ide_config(context: LaunchpadContext) -> None:
    write_file(
        ROOT / ".cursorrules",
        f"""
        # Cursor AI Rules for {context.project_name}

        ## Session Start Protocol
        ALWAYS read these files at the start of EVERY session:
        1. AGENTS.md (this project's conventions, workflow, and enforcement rules)
        2. docs/ARCH.md (technical architecture and constraints)
        3. docs/RESEARCH.md (proven patterns and anti-patterns)
        4. directives/ (find your current task)

        ## Code Generation Rules
        - Use ONLY technologies listed in docs/ARCH.md Tech Stack.
        - Follow directory structure defined in docs/ARCH.md.
        - Use domain terms EXACTLY as defined in ARCH.md Dictionary.
        - Write tests BEFORE implementation (TDD Iron Law).
        - Create implementation plans BEFORE coding (AGENTS.md Section 4).
        - Pass both review gates BEFORE marking tasks done (AGENTS.md Section 5).
        - Preserve the local-first Tauri desktop architecture.
        - Keep WSL, Git, PTY, filesystem, and log redaction behavior behind adapters.

        ## Forbidden Actions
        - Do NOT install packages not listed in package.json or src-tauri/Cargo.toml without approval.
        - Do NOT create files outside the defined directory structure without updating docs/ARCH.md.
        - Do NOT deviate from API contracts in ARCH.md.
        - Do NOT use .tmp/ for anything except temporary planning notes.
        - Do NOT write production code before its failing test.
        - Do NOT claim completion without running verification commands.
        - Do NOT add cloud sync, multi-user auth, browser automation, or auto-merge for v1.
        """,
    )


def create_placeholder_keep_files(context: LaunchpadContext) -> None:
    del context
    keep_dirs = [
        "docs/plans",
        "tests",
        "e2e",
        "src/components",
        "src/features/workspaces",
        "src/features/repos",
        "src/features/profiles",
        "src/features/sessions",
        "src/features/tasks",
        "src/features/review",
        "src/features/warnings",
        "src/lib",
        "src/types",
        "src-tauri/src/commands",
        "src-tauri/src/models",
        "src-tauri/src/services",
        "src-tauri/src/adapters",
        "src-tauri/src/db",
        "src-tauri/src/logging",
        "src-tauri/src/profiles",
        "src-tauri/migrations",
        ".github",
    ]
    for directory in keep_dirs:
        path = ROOT / directory
        if path.is_dir():
            keep = path / ".gitkeep"
            if not keep.exists():
                write_file(keep, "")


def main() -> int:
    context = load_context()

    print(f"Initializing {context.project_name}...")
    create_directories(context)
    create_gitignore(context)
    create_env_example(context)
    create_readme(context)
    create_requirements(context)
    create_agents_md(context)
    create_methodology_docs(context)
    create_initial_directive(context)
    create_verify_script(context)
    create_ide_config(context)
    create_placeholder_keep_files(context)
    print("Genesis complete! Run: python execution/verify_setup.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
