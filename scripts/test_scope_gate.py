"""Regression tests for the task scope gate (scopePolicyVersion 1).

Every test builds an isolated git repository under ``.tmp/scope-gate/`` so the
real checkout's tasks, index and working tree are never touched.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / ".trellis" / "scripts"
for _entry in (str(SCRIPTS_DIR), str(REPO_ROOT / "scripts")):
    if _entry not in sys.path:
        sys.path.insert(0, _entry)

import acceptance  # noqa: E402
import task as task_cli  # noqa: E402
from common import active_task, scope_gate, task_store  # noqa: E402

BASE_FILES = {
    "src/app.txt": "hello\n",
    "docs/readme.md": "docs\n",
    "package.json": '{"name": "fixture"}\n',
}

TASK_REL = ".trellis/tasks/10-17-fixture"


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class ScopeGateFixture(unittest.TestCase):
    """Temporary git repository plus helpers for task lifecycle calls."""

    def setUp(self) -> None:
        temp_parent = REPO_ROOT / ".tmp" / "scope-gate"
        temp_parent.mkdir(parents=True, exist_ok=True)
        self._temp = tempfile.TemporaryDirectory(dir=temp_parent, prefix="case-")
        self.addCleanup(self._temp.cleanup)
        self.root = Path(self._temp.name).resolve()
        self._cwd = os.getcwd()
        self.addCleanup(os.chdir, self._cwd)

        env = {
            "TRELLIS_DEVELOPER": "scope-gate-tester",
            "TRELLIS_CONTEXT_ID": "scope-gate-test",
            "GIT_AUTHOR_NAME": "Scope Gate",
            "GIT_AUTHOR_EMAIL": "scope-gate@example.com",
            "GIT_COMMITTER_NAME": "Scope Gate",
            "GIT_COMMITTER_EMAIL": "scope-gate@example.com",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_CONFIG_SYSTEM": os.devnull,
        }
        for key, value in env.items():
            patcher = patch.dict(os.environ, {key: value})
            patcher.start()
            self.addCleanup(patcher.stop)

        for target in (task_store, task_cli):
            patcher = patch.object(target, "run_task_hooks")
            patcher.start()
            self.addCleanup(patcher.stop)

    # -- repository ---------------------------------------------------------

    def write(self, rel: str, content: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def write_bytes(self, rel: str, content: bytes) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def read(self, rel: str) -> str:
        return (self.root / rel).read_text(encoding="utf-8")

    def git(self, *args: str) -> str:
        completed = subprocess.run(
            ["git", *args], cwd=self.root, capture_output=True, text=True
        )
        self.assertEqual(
            completed.returncode, 0, f"git {' '.join(args)} failed: {completed.stderr}"
        )
        return completed.stdout.strip()

    def init_repo(self, files: dict[str, str] | None = None) -> None:
        for rel, content in (files or BASE_FILES).items():
            self.write(rel, content)
        (self.root / ".trellis").mkdir(parents=True, exist_ok=True)
        self.git("init", "-q", "-b", "main", ".")
        self.git("add", "-A")
        self.git("commit", "-qm", "init")
        os.chdir(self.root)

    def copy_scripts(self) -> None:
        shutil.copytree(
            SCRIPTS_DIR,
            self.root / ".trellis" / "scripts",
            ignore=shutil.ignore_patterns("__pycache__"),
        )
        shared_gitignore = REPO_ROOT / ".trellis" / ".gitignore"
        if shared_gitignore.is_file():
            shutil.copyfile(shared_gitignore, self.root / ".trellis" / ".gitignore")
        self.git("add", "-A")
        self.git("commit", "-qm", "add task scripts")

    # -- task lifecycle -----------------------------------------------------

    def call(self, func, args: argparse.Namespace) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = func(args)
        return rc, out.getvalue(), err.getvalue()

    def create_task(
        self,
        slug: str = "fixture",
        scope_json: str | None = None,
        meta_pairs: list[str] | None = None,
        no_start: bool = True,
    ) -> tuple[int, str, str]:
        pairs = list(meta_pairs or [])
        if scope_json is not None:
            pairs.append(f"scope={scope_json}")
        args = argparse.Namespace(
            title=f"Task {slug}",
            slug=slug,
            description="scope gate fixture",
            assignee="scope-gate-tester",
            priority="P2",
            parent=None,
            package=None,
            base_branch="main",
            meta=pairs,
            no_start=no_start,
            force=False,
        )
        return self.call(task_store.cmd_create, args)

    def task_dir(self, slug: str = "fixture") -> Path:
        matches = sorted((self.root / ".trellis" / "tasks").glob(f"*-{slug}"))
        self.assertEqual(len(matches), 1, f"expected one task dir for {slug}: {matches}")
        return matches[0]

    def task_rel(self, slug: str = "fixture") -> str:
        return self.task_dir(slug).relative_to(self.root).as_posix()

    def task_json(self, slug: str = "fixture") -> dict:
        return json.loads(self.read(f"{self.task_rel(slug)}/task.json"))

    def write_task_json(self, slug: str, data: dict) -> None:
        self.write(
            f"{self.task_rel(slug)}/task.json",
            json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        )

    def start(self, slug: str = "fixture") -> tuple[int, str, str]:
        args = argparse.Namespace(
            dir=self.task_rel(slug), allow_empty_context=True
        )
        return self.call(task_cli.cmd_start, args)

    def archive(
        self,
        slug: str = "fixture",
        *,
        no_commit: bool = True,
        skip_branch_validation: bool = False,
    ) -> tuple[int, str, str]:
        args = argparse.Namespace(
            name=self.task_dir(slug).name,
            no_commit=no_commit,
            skip_branch_validation=skip_branch_validation,
        )
        return self.call(task_store.cmd_archive, args)

    def finish(self) -> tuple[int, str, str]:
        return self.call(task_cli.cmd_finish, argparse.Namespace())

    def prepared_task(
        self,
        slug: str = "fixture",
        scope_json: str | None = None,
        *,
        pre_dirty: bool = False,
        branch: str = "feat/scope-gate",
    ) -> Path:
        if pre_dirty:
            self.write("src/app.txt", "pre-existing user edit\n")
            self.write("scratch.txt", "pre-existing untracked\n")
        rc, _out, err = self.create_task(slug, scope_json=scope_json)
        self.assertEqual(rc, 0, err)
        self.git("checkout", "-qb", branch)
        rc, _out, err = self.start(slug)
        self.assertEqual(rc, 0, err)
        self.assertTrue((self.task_dir(slug) / scope_gate.SNAPSHOT_FILE).is_file())
        return self.task_dir(slug)

    # -- snapshot helpers ---------------------------------------------------

    def snapshot(self, task_rel: str = TASK_REL) -> dict:
        return scope_gate.capture_snapshot(
            self.root, task_rel, scope_gate.default_scope(task_rel)
        )

    def changed(self, snapshot: dict) -> dict[str, list[str]]:
        changes, problems = scope_gate.collect_changes(self.root, snapshot)
        self.assertEqual(problems, [], problems)
        self.assertIsNotNone(changes)
        return {item["path"]: item["layers"] for item in changes}


def _scope_with(**categories: list[str]) -> dict:
    cats = {"task-evidence": [".trellis/tasks/**"]}
    cats.update(categories)
    return {"version": 1, "mode": "enforce", "categories": cats}


class CreateScopeTests(ScopeGateFixture):
    def test_default_create_seeds_marker_and_task_evidence_scope(self) -> None:
        self.init_repo()
        rc, out, err = self.create_task()
        self.assertEqual(rc, 0, err)
        self.assertIn(".trellis/tasks/10-17-fixture", out)

        task_rel = self.task_rel()
        data = self.task_json()
        self.assertEqual(data["scopePolicyVersion"], 1)
        scope = data["meta"]["scope"]
        self.assertEqual(scope["version"], 1)
        self.assertEqual(scope["mode"], "enforce")
        self.assertEqual(scope["categories"], {"task-evidence": [f"{task_rel}/**"]})
        self.assertNotIn("snapshot", scope)
        self.assertEqual(scope_gate.validate_scope(scope, task_rel), [])

    def test_auto_activated_create_snapshot_allows_archive(self) -> None:
        self.init_repo()
        rc, _out, err = self.create_task(no_start=False)
        self.assertEqual(rc, 0, err)

        rc, _out, err = self.archive()
        self.assertEqual(rc, 0, err)
        self.assertIn("Archived:", err)
        archived = self.root / ".trellis/tasks/archive"
        self.assertEqual(len(list(archived.glob("*/*/task.json"))), 1)

    def test_create_rejects_invalid_scope_rules_with_located_errors(self) -> None:
        self.init_repo()
        cases = [
            (
                "version",
                {"version": 2, "mode": "enforce", "categories": {"task-evidence": [".trellis/tasks/**"]}},
                "meta.scope.version",
            ),
            (
                "version-bool",
                {"version": True, "mode": "enforce", "categories": {"task-evidence": [".trellis/tasks/**"]}},
                "meta.scope.version",
            ),
            (
                "mode",
                {"version": 1, "mode": "warn", "categories": {"task-evidence": [".trellis/tasks/**"]}},
                "meta.scope.mode",
            ),
            (
                "categories-empty",
                {"version": 1, "mode": "enforce", "categories": {}},
                "meta.scope.categories",
            ),
            (
                "missing-task-evidence",
                {"version": 1, "mode": "enforce", "categories": {"tests": ["tests/**"]}},
                "missing required 'task-evidence'",
            ),
            (
                "evidence-outside-task",
                _scope_with(**{"tests": ["tests/**"]}),
                "",
            ),
            (
                "evidence-exact-path",
                _scope_with(**{"task-evidence": [TASK_REL]}),
                "must cover this task's evidence directory",
            ),
            (
                "absolute",
                _scope_with(**{"tests": ["/etc/passwd"]}),
                "meta.scope.categories.tests[0]",
            ),
            (
                "dotdot",
                _scope_with(**{"tests": ["../escape"]}),
                "'..'",
            ),
            (
                "empty-category-list",
                _scope_with(**{"tests": []}),
                "non-empty array",
            ),
            (
                "empty-rule",
                _scope_with(**{"tests": [""]}),
                "empty",
            ),
            (
                "inner-double-star",
                _scope_with(**{"tests": ["tests/**/spec"]}),
                "trailing",
            ),
            (
                "trailing-slash",
                _scope_with(**{"tests": ["tests/"]}),
                "trailing '/'",
            ),
            (
                "backslash",
                _scope_with(**{"tests": ["tests\\spec"]}),
                "POSIX",
            ),
            (
                "drive-letter",
                _scope_with(**{"tests": ["C:/spec"]}),
                "absolute",
            ),
            (
                "snapshot-field",
                {**_scope_with(), "snapshot": {"path": "scope-start.json", "sha256": "0" * 64}},
                "meta.scope.snapshot",
            ),
            ("not-json", "{", "not valid JSON"),
            ("not-object", "[]", "must be a JSON object"),
        ]
        tasks_dir = self.root / ".trellis" / "tasks"
        for label, scope, fragment in cases:
            with self.subTest(label):
                if label == "evidence-outside-task":
                    scope = {
                        "version": 1,
                        "mode": "enforce",
                        "categories": {"task-evidence": [".trellis/tasks/other-task/**"]},
                    }
                    fragment = "must cover this task's evidence directory"
                raw = scope if isinstance(scope, str) else json.dumps(scope)
                rc, _out, err = self.create_task(scope_json=raw)
                self.assertEqual(rc, 1, err)
                self.assertIn("No task was created", err)
                self.assertIn(fragment, err)
                self.assertEqual(list(tasks_dir.glob("*-fixture")), [])

    def test_explicit_scope_json_is_stored(self) -> None:
        self.init_repo()
        scope = _scope_with(**{"tests": ["tests/**"], "exact": ["package.json"]})
        rc, _out, err = self.create_task(scope_json=json.dumps(scope))
        self.assertEqual(rc, 0, err)
        stored = self.task_json()["meta"]["scope"]
        self.assertEqual(stored["version"], 1)
        self.assertEqual(stored["mode"], "enforce")
        self.assertEqual(
            sorted(stored["categories"]["task-evidence"]), [".trellis/tasks/**"]
        )
        self.assertEqual(sorted(stored["categories"]["tests"]), ["tests/**"])
        self.assertEqual(sorted(stored["categories"]["exact"]), ["package.json"])
        self.assertEqual(self.task_json()["scopePolicyVersion"], 1)

    def test_set_meta_scope_roundtrip_and_rejection(self) -> None:
        self.init_repo()
        rc, _out, err = self.create_task()
        self.assertEqual(rc, 0, err)
        task_rel = self.task_rel()
        set_meta = argparse.Namespace(
            dir=task_rel,
            key="scope",
            value=json.dumps(_scope_with(**{"tests": ["tests/**"]})),
        )
        rc, out, err = self.call(task_store.cmd_set_meta, set_meta)
        self.assertEqual(rc, 0, err)
        self.assertIn("✓ Meta set", out)
        self.assertEqual(
            self.task_json()["meta"]["scope"]["categories"]["tests"], ["tests/**"]
        )

        before = self.task_json()
        set_meta.value = json.dumps(_scope_with(**{"tests": ["/absolute"]}))
        rc, _out, err = self.call(task_store.cmd_set_meta, set_meta)
        self.assertEqual(rc, 1)
        self.assertIn("meta.scope.categories.tests[0]", err)
        self.assertEqual(self.task_json(), before)


class StartSnapshotTests(ScopeGateFixture):
    def test_legacy_planning_task_is_migrated_on_start(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-legacy-plan"
        self.write(
            f"{rel}/task.json",
            json.dumps(
                {
                    "id": "10-17-legacy-plan",
                    "title": "legacy plan",
                    "status": "planning",
                    "branch": None,
                    "meta": {},
                }
            )
            + "\n",
        )
        self.write(f"{rel}/prd.md", "# legacy plan\n")

        rc, _out, err = self.call(
            task_cli.cmd_start,
            argparse.Namespace(dir=rel, allow_empty_context=True),
        )
        self.assertEqual(rc, 0, err)
        data = json.loads(self.read(f"{rel}/task.json"))
        self.assertEqual(data["scopePolicyVersion"], 1)
        self.assertEqual(data["status"], "in_progress")
        self.assertEqual(
            data["meta"]["scope"]["categories"], {"task-evidence": [f"{rel}/**"]}
        )
        snapshot = data["meta"]["scope"]["snapshot"]
        self.assertEqual(snapshot["path"], scope_gate.SNAPSHOT_FILE)
        snapshot_path = self.root / rel / scope_gate.SNAPSHOT_FILE
        self.assertTrue(snapshot_path.is_file())
        self.assertEqual(_sha256(snapshot_path.read_bytes()), snapshot["sha256"])
        self.assertEqual(active_task.resolve_active_task(self.root).task_path, rel)

    def test_legacy_planning_task_keeps_valid_scope_and_adds_marker(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-legacy-scope"
        scope = {
            "version": 1,
            "mode": "enforce",
            "categories": {
                "task-evidence": [f"{rel}/**"],
                "tests": ["tests/**"],
            },
        }
        self.write(
            f"{rel}/task.json",
            json.dumps(
                {
                    "id": "10-17-legacy-scope",
                    "title": "legacy scope",
                    "status": "planning",
                    "branch": None,
                    "meta": {"scope": scope},
                }
            )
            + "\n",
        )
        self.write(f"{rel}/prd.md", "# legacy scope\n")

        rc, _out, err = self.call(
            task_cli.cmd_start,
            argparse.Namespace(dir=rel, allow_empty_context=True),
        )
        self.assertEqual(rc, 0, err)
        data = json.loads(self.read(f"{rel}/task.json"))
        self.assertEqual(data["scopePolicyVersion"], 1)
        self.assertEqual(data["meta"]["scope"]["categories"], scope["categories"])
        self.assertEqual(
            data["meta"]["scope"]["snapshot"]["path"], scope_gate.SNAPSHOT_FILE
        )
        snapshot = json.loads(
            self.read(f"{rel}/{scope_gate.SNAPSHOT_FILE}")
        )
        self.assertEqual(snapshot["scopeDigest"], scope_gate.scope_digest(scope))

    def test_second_start_reuses_snapshot_and_keeps_baseline(self) -> None:
        self.init_repo()
        self.prepared_task()
        snapshot_path = self.task_dir() / scope_gate.SNAPSHOT_FILE
        baseline = snapshot_path.read_bytes()
        recorded = self.task_json()["meta"]["scope"]["snapshot"]

        self.write("src/app.txt", "edited before second start\n")
        rc, _out, err = self.start()
        self.assertEqual(rc, 0, err)
        self.assertIn("reused", err)
        self.assertEqual(snapshot_path.read_bytes(), baseline)
        self.assertEqual(self.task_json()["meta"]["scope"]["snapshot"], recorded)

        report = scope_gate.check_archive_scope(self.task_dir(), self.root)
        self.assertEqual(report["status"], "blocked")
        self.assertEqual(
            [item["path"] for item in report["violations"]], ["src/app.txt"]
        )

    def test_start_fails_before_activation_when_snapshot_write_fails(self) -> None:
        self.init_repo()
        rc, _out, err = self.create_task("writefail")
        self.assertEqual(rc, 0, err)
        original_write_json = scope_gate.write_json

        def failing_write_json(path, data):
            if Path(path).name == scope_gate.SNAPSHOT_FILE:
                return False
            return original_write_json(path, data)

        with patch.object(scope_gate, "write_json", side_effect=failing_write_json):
            rc, _out, err = self.start("writefail")
        self.assertEqual(rc, 1)
        self.assertIn("task was not activated", err)
        data = self.task_json("writefail")
        self.assertEqual(data["status"], "planning")
        self.assertNotIn("snapshot", data["meta"]["scope"])
        self.assertFalse(
            (self.task_dir("writefail") / scope_gate.SNAPSHOT_FILE).exists()
        )
        self.assertIsNone(active_task.resolve_active_task(self.root).task_path)

    def test_active_legacy_task_start_does_not_fabricate_marker(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-legacy-active"
        task_data = {
            "id": "10-17-legacy-active",
            "title": "legacy active",
            "status": "in_progress",
            "branch": None,
            "meta": {},
        }
        self.write(f"{rel}/task.json", json.dumps(task_data) + "\n")
        self.write(f"{rel}/prd.md", "# legacy active\n")

        rc, _out, err = self.call(
            task_cli.cmd_start,
            argparse.Namespace(dir=rel, allow_empty_context=True),
        )
        self.assertEqual(rc, 0, err)
        self.assertIn("predates scopePolicyVersion 1", err)
        self.assertIn("legacy", err)
        data = json.loads(self.read(f"{rel}/task.json"))
        self.assertNotIn("scopePolicyVersion", data)
        self.assertNotIn("scope", data["meta"])
        self.assertFalse((self.root / rel / scope_gate.SNAPSHOT_FILE).exists())

    def test_start_rejects_invalid_stored_scope(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-bad-scope"
        bad_scope = {
            "version": 1,
            "mode": "warn",
            "categories": {"task-evidence": [f"{rel}/**"]},
        }
        self.write(
            f"{rel}/task.json",
            json.dumps(
                {
                    "id": "10-17-bad-scope",
                    "title": "bad scope",
                    "status": "planning",
                    "branch": None,
                    "scopePolicyVersion": 1,
                    "meta": {"scope": bad_scope},
                }
            )
            + "\n",
        )
        self.write(f"{rel}/prd.md", "# bad scope\n")

        rc, _out, err = self.call(
            task_cli.cmd_start,
            argparse.Namespace(dir=rel, allow_empty_context=True),
        )
        self.assertEqual(rc, 1)
        self.assertIn("meta.scope.mode", err)
        data = json.loads(self.read(f"{rel}/task.json"))
        self.assertEqual(data["status"], "planning")
        self.assertFalse((self.root / rel / scope_gate.SNAPSHOT_FILE).exists())

    def test_start_refuses_tampered_snapshot_instead_of_resetting(self) -> None:
        self.init_repo()
        self.prepared_task()
        snapshot_path = self.task_dir() / scope_gate.SNAPSHOT_FILE
        original = snapshot_path.read_bytes()
        snapshot_path.write_bytes(original + b"\n")

        rc, _out, err = self.start()
        self.assertEqual(rc, 1)
        self.assertIn("hash mismatch", err)
        self.assertEqual(snapshot_path.read_bytes(), original + b"\n")


class SnapshotChangeTests(ScopeGateFixture):
    def test_preexisting_dirty_and_untracked_are_ignored(self) -> None:
        self.init_repo()
        self.write("src/app.txt", "pre-existing edit\n")
        self.write("scratch.txt", "pre-existing untracked\n")
        snapshot = self.snapshot()
        self.assertEqual(self.changed(snapshot), {})

    def test_changed_preexisting_paths_are_included(self) -> None:
        self.init_repo()
        self.write("src/app.txt", "pre-existing edit\n")
        self.write("scratch.txt", "pre-existing untracked\n")
        snapshot = self.snapshot()
        self.write("src/app.txt", "edited after start\n")
        self.write("scratch.txt", "untracked edited after start\n")
        changed = self.changed(snapshot)
        self.assertEqual(set(changed), {"src/app.txt", "scratch.txt"})
        for layers in changed.values():
            self.assertIn("worktree", layers)

    def test_new_untracked_file_is_included(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        self.write("src/new.txt", "new\n")
        self.assertEqual(self.changed(snapshot), {"src/new.txt": ["worktree"]})

    def test_staged_new_file_is_included_once_in_index(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        self.write("src/new.txt", "new\n")
        self.git("add", "src/new.txt")
        self.assertEqual(self.changed(snapshot), {"src/new.txt": ["index"]})

    def test_staging_preexisting_untracked_file_is_included(self) -> None:
        self.init_repo()
        self.write("scratch.txt", "pre-existing untracked\n")
        snapshot = self.snapshot()
        self.git("add", "scratch.txt")
        self.assertIn("index", self.changed(snapshot)["scratch.txt"])

    def test_staging_preexisting_dirty_file_is_included(self) -> None:
        self.init_repo()
        self.write("src/app.txt", "pre-existing edit\n")
        snapshot = self.snapshot()
        self.git("add", "src/app.txt")
        self.assertIn("index", self.changed(snapshot)["src/app.txt"])

    def test_commit_after_snapshot_is_included(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        self.write("src/app.txt", "committed after start\n")
        self.git("add", "src/app.txt")
        self.git("commit", "-qm", "post start")
        changed = self.changed(snapshot)
        self.assertEqual(set(changed["src/app.txt"]), {"head", "index"})

    def test_deleted_tracked_file_is_included(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        os.unlink(self.root / "src/app.txt")
        self.assertEqual(self.changed(snapshot)["src/app.txt"], ["worktree"])

    def test_staged_deletion_is_included(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        self.git("rm", "-q", "src/app.txt")
        self.assertIn("index", self.changed(snapshot)["src/app.txt"])

    def test_staged_rename_includes_both_ends(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        self.git("mv", "src/app.txt", "src/moved.txt")
        changed = self.changed(snapshot)
        self.assertEqual(set(changed), {"src/app.txt", "src/moved.txt"})
        self.assertIn("index", changed["src/app.txt"])
        self.assertIn("index", changed["src/moved.txt"])

    def test_untracked_rename_includes_both_ends(self) -> None:
        self.init_repo()
        self.write("scratch.txt", "untracked before start\n")
        snapshot = self.snapshot()
        os.rename(self.root / "scratch.txt", self.root / "scratch2.txt")
        changed = self.changed(snapshot)
        self.assertEqual(set(changed), {"scratch.txt", "scratch2.txt"})
        self.assertEqual(changed["scratch.txt"], ["worktree"])
        self.assertEqual(changed["scratch2.txt"], ["worktree"])

    def test_mode_change_is_included(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        os.chmod(self.root / "src/app.txt", 0o755)
        self.assertIn("worktree", self.changed(snapshot)["src/app.txt"])

    def test_ignored_untracked_file_is_ignored(self) -> None:
        self.init_repo({**BASE_FILES, ".gitignore": "ignored/\n"})
        snapshot = self.snapshot()
        self.write("ignored/after.txt", "ignored\n")
        self.assertEqual(self.changed(snapshot), {})

    def test_task_runtime_state_is_not_a_scope_change(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        self.write(".trellis/.runtime/sessions/scope-gate-test.json", "{}\n")
        self.assertEqual(self.changed(snapshot), {})

    def test_git_failure_fails_closed(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        with patch.object(scope_gate, "_git", return_value=(1, "", "boom")):
            changes, problems = scope_gate.collect_changes(self.root, snapshot)
        self.assertIsNone(changes)
        self.assertTrue(problems, "git failure must produce diagnostics")
        self.assertTrue(
            any("boom" in problem or "git" in problem.lower() for problem in problems),
            problems,
        )

    def test_unreadable_head_fails_closed(self) -> None:
        self.init_repo()
        snapshot = self.snapshot()
        snapshot["head"] = "0" * 40
        changes, problems = scope_gate.collect_changes(self.root, snapshot)
        self.assertIsNone(changes)
        self.assertTrue(problems)


class RuleTests(ScopeGateFixture):
    def test_exact_rule_matching(self) -> None:
        self.assertTrue(scope_gate.rule_matches("src/app.txt", "src/app.txt"))
        self.assertFalse(scope_gate.rule_matches("src/app.txt", "src/app.txt.bak"))
        self.assertFalse(scope_gate.rule_matches("src/app.txt", "src/app.txt/x"))

    def test_directory_rule_covers_directory_and_children_only(self) -> None:
        rule = ".trellis/tasks/10-17-x/**"
        self.assertTrue(scope_gate.rule_matches(rule, ".trellis/tasks/10-17-x"))
        self.assertTrue(scope_gate.rule_matches(rule, ".trellis/tasks/10-17-x/a.md"))
        self.assertTrue(
            scope_gate.rule_matches(rule, ".trellis/tasks/10-17-x/nested/a.md")
        )
        self.assertFalse(scope_gate.rule_matches(rule, ".trellis/tasks/10-17-xy"))
        self.assertFalse(scope_gate.rule_matches(rule, ".trellis/tasks/10-17-xy/a.md"))

    def test_digest_is_order_insensitive_and_ignores_snapshot(self) -> None:
        left = {
            "version": 1,
            "mode": "enforce",
            "categories": {"b": ["y/**"], "task-evidence": ["t/**", "t/**"]},
        }
        right = {
            "version": 1,
            "mode": "enforce",
            "categories": {"task-evidence": ["t/**"], "b": ["y/**"]},
        }
        self.assertEqual(scope_gate.scope_digest(left), scope_gate.scope_digest(right))
        with_snapshot = dict(right)
        with_snapshot["snapshot"] = {"path": "scope-start.json", "sha256": "0" * 64}
        self.assertEqual(
            scope_gate.scope_digest(with_snapshot), scope_gate.scope_digest(right)
        )

    def test_default_scope_covers_only_the_task_directory(self) -> None:
        scope = scope_gate.default_scope(".trellis/tasks/10-17-x")
        rule = scope["categories"]["task-evidence"][0]
        self.assertTrue(scope_gate.rule_matches(rule, ".trellis/tasks/10-17-x/task.json"))
        self.assertFalse(scope_gate.rule_matches(rule, ".trellis/tasks/10-17-y/task.json"))

    def test_rule_parser_rejects_absolute_and_parent_segments(self) -> None:
        rel = ".trellis/tasks/10-17-x"
        for rule, fragment in [
            ("/etc/passwd", "absolute"),
            ("../escape", "'..'"),
            ("./relative", "'.'"),
            ("a//b", "empty"),
            ("", "empty"),
        ]:
            with self.subTest(rule=rule):
                scope = {
                    "version": 1,
                    "mode": "enforce",
                    "categories": {"task-evidence": [f"{rel}/**"], "bad": [rule]},
                }
                problems = scope_gate.validate_scope(scope, rel)
                self.assertTrue(problems)
                self.assertTrue(
                    any(fragment in problem for problem in problems), problems
                )


class ArchiveGateTests(ScopeGateFixture):
    def test_archive_allows_in_scope_worktree_change(self) -> None:
        self.init_repo()
        task_dir = self.prepared_task()
        self.write(f"{self.task_rel()}/notes.md", "evidence\n")

        rc, out, err = self.archive()
        self.assertEqual(rc, 0, err)
        self.assertIn("Archived:", err)
        self.assertIn("all allowed by meta.scope", err)
        self.assertIn("archive/", out)
        archived = self.root / ".trellis/tasks/archive"
        archived_tasks = list(archived.glob("*/*/task.json"))
        self.assertEqual(len(archived_tasks), 1)
        archived_data = json.loads(archived_tasks[0].read_text(encoding="utf-8"))
        self.assertEqual(archived_data["status"], "completed")
        self.assertFalse(task_dir.exists())
        self.assertIsNone(active_task.resolve_active_task(self.root).task_path)

    def test_archive_allows_declared_exact_and_directory_rules(self) -> None:
        self.init_repo()
        self.prepared_task(
            scope_json=json.dumps(_scope_with(**{"tests": ["tests/**"], "exact": ["package.json"]})),
        )
        self.write("tests/test_new.py", "pass\n")
        self.write("package.json", '{"name": "fixture", "changed": true}\n')

        rc, _out, err = self.archive()
        self.assertEqual(rc, 0, err)

    def test_archive_blocks_out_of_scope_change_without_side_effects(self) -> None:
        self.init_repo()
        task_dir = self.prepared_task()
        task_bytes_before = (task_dir / "task.json").read_bytes()
        scope_before = self.task_json()["meta"]["scope"]
        head_before = self.git("rev-parse", "HEAD")
        self.write("src/leak.txt", "leak\n")

        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("src/leak.txt", err)
        self.assertIn("no category rule matches", err)
        self.assertNotIn("Archived:", err)

        self.assertTrue(task_dir.is_dir())
        self.assertEqual((task_dir / "task.json").read_bytes(), task_bytes_before)
        self.assertEqual(self.task_json()["meta"]["scope"], scope_before)
        self.assertEqual(self.git("rev-parse", "HEAD"), head_before)
        self.assertFalse((self.root / ".trellis/tasks/archive").exists() and any((self.root / ".trellis/tasks/archive").glob("*/*")))
        self.assertEqual(
            active_task.resolve_active_task(self.root).task_path, self.task_rel()
        )

    def test_archive_blocks_staged_and_committed_out_of_scope_changes(self) -> None:
        self.init_repo()
        self.prepared_task()
        self.write("src/leak.txt", "leak\n")
        self.git("add", "src/leak.txt")

        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("index", err)
        self.assertIn("src/leak.txt", err)

        self.git("commit", "-qm", "leak")
        head_before = self.git("rev-parse", "HEAD")
        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("src/leak.txt", err)
        self.assertEqual(self.git("rev-parse", "HEAD"), head_before)
        self.assertTrue(self.task_dir().is_dir())

    def test_preexisting_dirty_state_before_start_does_not_block(self) -> None:
        self.init_repo()
        self.prepared_task(pre_dirty=True)
        rc, _out, err = self.archive()
        self.assertEqual(rc, 0, err)

    def test_same_path_modified_after_start_blocks(self) -> None:
        self.init_repo()
        self.prepared_task(pre_dirty=True)
        self.write("src/app.txt", "edited after start\n")
        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("src/app.txt", err)

    def test_marker_task_without_scope_fails_closed(self) -> None:
        self.init_repo()
        rc, _out, err = self.create_task()
        self.assertEqual(rc, 0, err)
        data = self.task_json()
        data["meta"].pop("scope")
        self.write_task_json("fixture", data)

        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("meta.scope is missing", err)
        self.assertTrue(self.task_dir().is_dir())

    def test_marker_task_without_snapshot_fails_closed(self) -> None:
        self.init_repo()
        rc, _out, err = self.create_task()
        self.assertEqual(rc, 0, err)
        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("snapshot is missing", err)
        self.assertTrue(self.task_dir().is_dir())

    def test_tampered_snapshot_fails_closed(self) -> None:
        self.init_repo()
        self.prepared_task()
        snapshot_path = self.task_dir() / scope_gate.SNAPSHOT_FILE
        snapshot_path.write_bytes(snapshot_path.read_bytes() + b" \n")
        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("hash mismatch", err)
        self.assertTrue(self.task_dir().is_dir())

    def test_corrupt_snapshot_json_fails_closed(self) -> None:
        self.init_repo()
        self.prepared_task()
        snapshot_path = self.task_dir() / scope_gate.SNAPSHOT_FILE
        snapshot_path.write_bytes(b"{not json")
        data = self.task_json()
        data["meta"]["scope"]["snapshot"]["sha256"] = _sha256(b"{not json")
        self.write_task_json("fixture", data)

        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("not valid JSON", err)
        self.assertTrue(self.task_dir().is_dir())

    def test_snapshot_path_outside_task_dir_fails_closed(self) -> None:
        self.init_repo()
        self.prepared_task()
        data = self.task_json()
        data["meta"]["scope"]["snapshot"]["path"] = "../scope-start.json"
        self.write_task_json("fixture", data)
        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("snapshot", err.lower())
        self.assertTrue(self.task_dir().is_dir())

    def test_scope_edited_after_start_fails_closed(self) -> None:
        self.init_repo()
        self.prepared_task()
        data = self.task_json()
        data["meta"]["scope"]["categories"]["src"] = ["src/**"]
        self.write_task_json("fixture", data)
        rc, _out, err = self.archive()
        self.assertEqual(rc, 1)
        self.assertIn("changed after task start", err)
        self.assertTrue(self.task_dir().is_dir())

    def test_unsupported_policy_version_fails_closed(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-future"
        self.write(
            f"{rel}/task.json",
            json.dumps(
                {
                    "id": "10-17-future",
                    "title": "future",
                    "status": "in_progress",
                    "scopePolicyVersion": 2,
                    "meta": {"scope": {"version": 1, "mode": "enforce", "categories": {"task-evidence": [f"{rel}/**"]}}},
                }
            )
            + "\n",
        )
        rc, _out, err = self.call(
            task_store.cmd_archive,
            argparse.Namespace(
                name="10-17-future", no_commit=True, skip_branch_validation=True
            ),
        )
        self.assertEqual(rc, 1)
        self.assertIn("unsupported scopePolicyVersion", err)
        self.assertTrue((self.root / rel).is_dir())

    def test_legacy_task_without_marker_archives_with_diagnostic(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-legacy"
        self.write(
            f"{rel}/task.json",
            json.dumps(
                {
                    "id": "10-17-legacy",
                    "title": "legacy",
                    "status": "in_progress",
                    "branch": None,
                    "meta": {},
                }
            )
            + "\n",
        )
        rc, _out, err = self.call(
            task_store.cmd_archive,
            argparse.Namespace(name="10-17-legacy", no_commit=True, skip_branch_validation=False),
        )
        self.assertEqual(rc, 0, err)
        self.assertIn("legacy", err)
        self.assertIn("no scopePolicyVersion", err)
        self.assertFalse((self.root / rel).exists())

    def test_legacy_scope_without_marker_is_reported_as_legacy(self) -> None:
        self.init_repo()
        rel = ".trellis/tasks/10-17-legacy-scope"
        self.write(
            f"{rel}/task.json",
            json.dumps(
                {
                    "id": "10-17-legacy-scope",
                    "title": "legacy scope",
                    "status": "in_progress",
                    "branch": None,
                    "meta": {"scope": {"version": 1, "mode": "enforce", "categories": {"task-evidence": [f"{rel}/**"]}}},
                }
            )
            + "\n",
        )
        rc, _out, err = self.call(
            task_store.cmd_archive,
            argparse.Namespace(name="10-17-legacy-scope", no_commit=True, skip_branch_validation=False),
        )
        self.assertEqual(rc, 0, err)
        self.assertIn("legacy", err)
        self.assertIn("scopePolicyVersion is missing", err)

    def test_unreadable_task_json_archives_with_legacy_diagnostic(self) -> None:
        self.init_repo()
        task_dir = self.prepared_task()
        self.write(f"{self.task_rel()}/task.json", "{broken\n")

        rc, _out, err = self.archive()
        self.assertEqual(rc, 0, err)
        self.assertIn("legacy behavior", err)
        self.assertIn("cannot read task.json", err)
        self.assertFalse(task_dir.exists())


class FinishScopeTests(ScopeGateFixture):
    def test_finish_clears_pointer_only_with_out_of_scope_change(self) -> None:
        self.init_repo()
        self.prepared_task()
        self.write("src/leak.txt", "leak\n")

        rc, out, err = self.finish()
        self.assertEqual(rc, 0, err)
        self.assertIn("Cleared current task", out)
        self.assertNotIn("Scope gate", out + err)
        self.assertIsNone(active_task.resolve_active_task(self.root).task_path)
        self.assertTrue(self.task_dir().is_dir())
        self.assertEqual(self.task_json()["status"], "in_progress")


class AcceptanceArchiveTests(ScopeGateFixture):
    def call_acceptance(self, slug: str) -> tuple[int, dict, str]:
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            output, rc = acceptance.archive(
                self.root, self.task_rel(slug), {"status": "passed"}
            )
        return rc, output, err.getvalue()

    def test_acceptance_archive_delegates_and_respects_gate(self) -> None:
        self.init_repo()
        self.copy_scripts()

        self.create_task("allowed")
        allowed_dir = self.task_dir("allowed")
        self.git("checkout", "-qb", "feat/allowed")
        rc, _out, err = self.start("allowed")
        self.assertEqual(rc, 0, err)
        self.write(f"{self.task_rel('allowed')}/notes.md", "evidence\n")
        rc, output, _err = self.call_acceptance("allowed")
        self.assertEqual(rc, 0, output)
        self.assertTrue(output["archiveDelegated"])
        self.assertEqual(output["archiveExitCode"], 0)
        self.assertEqual(output["acceptanceStatus"], "passed")
        self.assertFalse(allowed_dir.exists())

        self.create_task("blocked")
        self.git("checkout", "-qb", "feat/blocked")
        rc, _out, err = self.start("blocked")
        self.assertEqual(rc, 0, err)
        self.write("src/leak.txt", "leak\n")
        head_before = self.git("rev-parse", "HEAD")
        rc, output, _err = self.call_acceptance("blocked")
        self.assertEqual(rc, 4, output)
        self.assertTrue(output["archiveDelegated"])
        self.assertEqual(output["archiveExitCode"], 1)
        self.assertIn("src/leak.txt", output["archiveStderr"])
        self.assertTrue(self.task_dir("blocked").is_dir())
        self.assertEqual(self.task_json("blocked")["status"], "in_progress")
        self.assertEqual(self.git("rev-parse", "HEAD"), head_before)
        self.assertEqual(
            active_task.resolve_active_task(self.root).task_path,
            self.task_rel("blocked"),
        )


if __name__ == "__main__":
    unittest.main()
