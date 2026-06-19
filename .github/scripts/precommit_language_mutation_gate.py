"""Run mutmut against repository Python source files.

The mutmut native config accepts directories or explicit paths, but a broad
directory path also copies ignored runtime trees into the mutant workspace.
This wrapper keeps the hook generic by discovering Python files from Git and
passing the current source set to mutmut programmatically.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

import mutmut.configuration as mutmut_configuration
from mutmut.configuration import Config
from mutmut.mutation.data import SourceFileMutationData

EXCLUDED_DIRS = {
    ".agents",
    ".codex",
    ".github",
    ".gsd",
    ".skills",
    ".skillss",
    ".venv",
    "mutants",
    "skills",
    "tests",
    "frontend",
}

ALSO_COPY = [
    Path("backend"),
    Path("setup.cfg"),
    Path("backend/pyproject.toml"),
]


def _git_python_files(root: Path) -> list[Path]:
    result = subprocess.run(
        [
            "git",
            "ls-files",
            "--cached",
            "--others",
            "--exclude-standard",
            "backend/*.py",
            "backend/**/*.py",
        ],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return [Path(line) for line in result.stdout.splitlines() if line]


def _fallback_python_files(root: Path) -> list[Path]:
    return [path.relative_to(root) for path in root.rglob("*.py") if path.is_file()]


def _is_excluded(path: Path) -> bool:
    return any(part in EXCLUDED_DIRS for part in path.parts[:-1])


def discover_python_sources(root: Path) -> list[Path]:
    try:
        candidates = _git_python_files(root)
    except (FileNotFoundError, subprocess.CalledProcessError):
        candidates = _fallback_python_files(root)

    sources = [
        path
        for path in candidates
        if path.parts[:1] == ("backend",) and not _is_excluded(path)
    ]
    return sorted(set(sources), key=lambda path: path.as_posix())


def configure_mutmut(source_paths: list[Path]) -> None:
    mutmut_configuration._config = Config(  # noqa: SLF001 - mutmut exposes no public config injection API.
        also_copy=ALSO_COPY,
        only_mutate=["*.py"],
        do_not_mutate=[
            "tests/*",
            "./tests/*",
            "backend/tests/*",
            "./backend/tests/*",
            "backend/test/*",
            "./backend/test/*",
            ".github/*",
            "./.github/*",
            ".agents/*",
            "./.agents/*",
            ".codex/*",
            "./.codex/*",
            ".gsd/*",
            "./.gsd/*",
            ".skillss/*",
            "./.skillss/*",
            ".skills/*",
            "./.skills/*",
            ".venv/*",
            "./.venv/*",
            "skills/*",
            "./skills/*",
            "frontend/*",
            "./frontend/*",
            "mutants/*",
            "./mutants/*",
        ],
        do_not_mutate_patterns=[],
        max_stack_depth=-1,
        debug=False,
        mutate_only_covered_lines=False,
        source_paths=source_paths,
        pytest_add_cli_args=[],
        pytest_add_cli_args_test_selection=["backend"],
        timeout_multiplier=15.0,
        timeout_constant=1.0,
        type_check_command=[],
        use_setproctitle=platform.system() != "Darwin",
    )


def print_results() -> None:
    from mutmut.__main__ import status_by_exit_code, walk_mutatable_files

    for path in walk_mutatable_files():
        mutation_data = SourceFileMutationData(path=path)
        mutation_data.load()
        for mutant_name, exit_code in mutation_data.exit_code_by_key.items():
            status = status_by_exit_code[exit_code]
            if status == "killed":
                continue
            print(f"    {mutant_name}: {status}")


def warm_imports() -> None:
    return None


def main(argv: list[str] | None = None) -> int:
    argv = argv or sys.argv[1:]
    root = Path.cwd()
    source_paths = discover_python_sources(root)
    configure_mutmut(source_paths)

    if argv == ["--check-config"]:
        print(f"language mutation source files: {len(source_paths)}")
        print(f"excluded directories: {', '.join(sorted(EXCLUDED_DIRS))}")
        return 0

    os.environ["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] = "1"
    os.environ["PYTHONPATH"] = ""

    coverage_source = root / "build/slow-lane/.coverage"
    coverage_target = root / ".coverage"
    copied_coverage = False
    if coverage_source.exists():
        shutil.copy2(coverage_source, coverage_target)
        copied_coverage = True

    warm_imports()

    from mutmut.__main__ import _run

    status = 0
    try:
        try:
            _run((), None)
        except SystemExit as exc:
            status = int(exc.code or 0)
    finally:
        if copied_coverage:
            coverage_target.unlink(missing_ok=True)

    print_results()
    return status


if __name__ == "__main__":
    raise SystemExit(main())
