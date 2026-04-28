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


REQUIRED_DIRS = [
        ".github",
        ".tmp",
        "directives",
        "docs",
        "docs/methodology",
        "docs/plans",
        "e2e",
        "execution",
        "src",
        "src-tauri",
        "src-tauri/migrations",
        "src-tauri/src",
        "src-tauri/src/adapters",
        "src-tauri/src/commands",
        "src-tauri/src/db",
        "src-tauri/src/logging",
        "src-tauri/src/models",
        "src-tauri/src/profiles",
        "src-tauri/src/services",
        "src-tauri/tests",
        "src/app",
        "src/components",
        "src/features/profiles",
        "src/features/repos",
        "src/features/review",
        "src/features/sessions",
        "src/features/tasks",
        "src/features/warnings",
        "src/features/workspaces",
        "src/lib",
        "src/types",
        "tests"
]


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
        return False, f"{command[0]} not found"
    except subprocess.TimeoutExpired:
        return False, f"{command[0]} timed out"

    output = (result.stdout or result.stderr).strip().splitlines()
    message = output[0] if output else f"{command[0]} exited with {result.returncode}"
    return result.returncode == 0, message


def check_python_version() -> tuple[bool, str]:
    required = (3, 11)
    current = sys.version_info[:2]
    if current < required:
        return False, f"Python {required[0]}.{required[1]}+ required, found {current[0]}.{current[1]}"
    return True, f"Python {current[0]}.{current[1]}"


def check_tool(name: str, command: list[str]) -> tuple[bool, str]:
    if shutil.which(command[0]) is None:
        return False, f"{name} not found on PATH"
    passed, message = run_command(command)
    if not passed:
        return False, f"{name} check failed: {message}"
    return True, message


def check_env_file() -> tuple[bool, str]:
    env_path = Path(".env")
    if not env_path.exists():
        return False, ".env file not found (copy from .env.example)"
    return True, ".env file exists"


def check_required_dirs() -> tuple[bool, str]:
    missing = [directory for directory in REQUIRED_DIRS if not Path(directory).is_dir()]
    if missing:
        return False, f"Missing directories: {', '.join(missing)}"
    return True, "All required directories exist"


def check_docs() -> tuple[bool, str]:
    docs = ["docs/PRD.md", "docs/ARCH.md", "docs/RESEARCH.md", "AGENTS.md"]
    missing = [path for path in docs if not Path(path).exists()]
    if missing:
        return False, f"Missing documents: {', '.join(missing)}"
    return True, "PRD.md, ARCH.md, RESEARCH.md, and AGENTS.md exist"


def check_methodology() -> tuple[bool, str]:
    docs = [
        "docs/methodology/implementation-planning.md",
        "docs/methodology/review-gates.md",
        "docs/methodology/debugging-guide.md",
    ]
    missing = [path for path in docs if not Path(path).exists()]
    if missing:
        return False, f"Missing methodology docs: {', '.join(missing)}"
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
        return False, f"Missing manifests: {', '.join(missing)}"
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
        print(f"[{status}] {name}: {message}")
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
