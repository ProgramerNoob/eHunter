"""Workflow extraction and session-context regressions; fixtures stay in .tmp/."""

from contextlib import redirect_stderr
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".trellis/scripts"))
from common import paths, session_context as session, workflow_phase as workflow


class WorkflowContextTests(unittest.TestCase):
    def test_index_excludes_comments_and_states_but_source_retains_them(self):
        source = (ROOT / ".trellis/workflow.md").read_text(encoding="utf-8")
        states = dict(re.findall(
            r"\[workflow-state:([A-Za-z0-9_-]+)\]\s*\n(.*?)\n\s*\[/workflow-state:\1\]",
            source, re.DOTALL,
        ))
        self.assertTrue({
            "no_task", "task_error", "planning", "planning-inline",
            "in_progress", "in_progress-inline", "completed",
        } <= set(states))
        # Each state remains independently usable by the runtime breadcrumb extractor.
        for state, terms in {
            "no_task": ("consent", "skip Trellis", "Complex task"),
            "task_error": ("task.json", "status", "Preserve", "ask the user"),
            "planning": ("trellis-brainstorm", "review", "task.py start", "implement.jsonl", "check.jsonl"),
            "planning-inline": ("trellis-brainstorm", "review", "task.py start", "trellis-before-dev"),
            "in_progress": ("trellis-implement", "trellis-check", "trellis-update-spec", "commit", "finish-work", "Active task:", "acceptance.py summarize", "acceptance.py archive", "passed/waived"),
            "in_progress-inline": ("trellis-before-dev", "trellis-check", "validation", "trellis-update-spec", "commit", "finish-work", "passed/waived"),
            "completed": ("Code committed", "finish-work", "dirty", "3.4"),
        }.items():
            with self.subTest(state=state):
                for term in terms:
                    self.assertIn(term, states[state])
        index = workflow.get_phase_index()
        self.assertNotIn("<!--", index)
        self.assertNotIn("workflow-state:", index)
        self.assertIn("<!--", source)
        for step in ("1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "2.1", "2.2", "2.3", "3.2", "3.3", "3.4", "3.5"):
            self.assertIn(step, index)
            self.assertTrue(workflow.get_step(step).startswith(f"#### {step}"))
        self.assertEqual(workflow.get_step("99.0"), "")

    def test_commented_headings_do_not_truncate_index(self):
        source = """<!--
## Phase Index
bogus heading
-->
## Phase Index
keep before
<!--
## Phase 1: Plan
maintainer note
-->
[workflow-state:no_task]
breadcrumb only
[/workflow-state:no_task]
keep after
## Phase 1: Plan
step details
"""
        with patch.object(workflow, "_read_workflow", return_value=source):
            self.assertEqual(workflow.get_phase_index(), "## Phase Index\nkeep before\n\nkeep after\n")
        with patch.object(workflow, "_read_workflow", return_value="no index"):
            self.assertEqual(workflow.get_phase_index(), "")

    def test_platform_routes_and_special_dispatch_contracts(self):
        index = workflow.get_phase_index()
        agent_platforms = (
            "claude", "cursor", "opencode", "codex", "kiro", "gemini", "qoder",
            "codebuddy", "copilot", "droid", "pi", "omp", "zcode", "snow",
            "reasonix", "trae", "grok", "kimi",
        )
        for platform in agent_platforms + ("kilo", "antigravity", "devin", "dsh"):
            with self.subTest(platform=platform):
                effective = workflow.resolve_effective_platform(platform, {})
                text = workflow.filter_platform(index, effective)
                self.assertIn("trellis-brainstorm", text)
                self.assertIn("trellis-break-loop", text)
                self.assertIn("trellis-update-spec", text)
                if platform in agent_platforms:
                    self.assertIn("dispatch `trellis-implement` / `trellis-check`", text)
                else:
                    self.assertIn("Before editing -> `trellis-before-dev`", text)
                    self.assertNotIn("implementation/check -> dispatch", text)
                self.assertEqual("spawn_subagent" in text, platform == "grok")
                self.assertEqual(".kimi-code/skills/" in text, platform == "kimi")
        for mode, expected in (("auto", "codex-sub-agent"), ("sub-agent", "codex-sub-agent"), ("inline", "codex-inline"), ("invalid", "codex-inline")):
            with self.subTest(mode=mode):
                effective = workflow.resolve_effective_platform("codex", {"codex": {"dispatch_mode": mode}})
                self.assertEqual(effective, expected)
                text = workflow.filter_platform(index, effective)
                self.assertEqual("Before editing -> `trellis-before-dev`" in text, expected == "codex-inline")

    def test_phase_cli_matches_extractor_and_missing_step_is_error(self):
        command = [sys.executable, str(ROOT / ".trellis/scripts/get_context.py"), "--mode", "phase", "--platform", "pi"]
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, workflow.filter_platform(workflow.get_phase_index(), "pi"))
        result = subprocess.run(command + ["--step", "99.0"], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("Step not found: 99.0", result.stderr)


class SessionContextTests(unittest.TestCase):
    def setUp(self):
        base = ROOT / ".tmp/trellis-lean-context"
        base.mkdir(parents=True, exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=base, prefix="case-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.put(".trellis/.developer", "name=lean-dev\n")
        self.git_output = {}
        for mock in (
            patch.dict(os.environ, {"TRELLIS_DEVELOPER": "", "TRELLIS_CONTEXT_ID": "lean-test"}),
            patch.object(paths, "main_worktree_root", return_value=None),
            patch.object(session, "run_git", side_effect=self.git),
        ):
            mock.start()
            self.addCleanup(mock.stop)

    def put(self, relative, text):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def git(self, args, cwd, **kwargs):
        return self.git_output.get((str(cwd), tuple(args)), (1, "", "not a repository"))

    def repo(self, relative=".", dirty=True):
        directory = self.root / relative
        (directory / ".git").mkdir(parents=True, exist_ok=True)
        changes = "\n".join(f" M changed-{i}.py" for i in range(12)) if dirty else ""
        for args, output in (
            (("rev-parse", "--is-inside-work-tree"), "true\n"),
            (("branch", "--show-current"), "lean-branch\n"),
            (("status", "--porcelain"), changes),
            (("status", "--short"), changes),
            (("log", "--oneline", "-5"), "abc123 preserve facts\ndef456 earlier\n"),
        ):
            self.git_output[(str(directory), args)] = (0, output, "")

    def task(self, name, **overrides):
        data = {"name": name, "title": name + " title", "status": "planning", "assignee": "lean-dev", "priority": "P1", "createdAt": "2026-10-15"}
        data.update(overrides)
        return self.put(f".trellis/tasks/{name}/task.json", json.dumps(data))

    def activate(self, name):
        self.put(".trellis/.runtime/sessions/lean-test.json", json.dumps({"current_task": f".trellis/tasks/{name}"}))

    def test_full_overview_retains_facts_and_limits(self):
        self.repo()
        self.task("parent", children=["child", "archived"], description="用户可见描述")
        self.task("child", parent="parent", status="in_progress", assignee="other-dev")
        self.task("done", status="done")
        self.put(".trellis/tasks/parent/prd.md", "# Parent\n")
        self.activate("parent")
        self.put(".trellis/workspace/lean-dev/journal-1.md", "old\n")
        self.put(".trellis/workspace/lean-dev/journal-2.md", "entry\n" * 1801)
        self.put(".trellis/spec/frontend/index.md", "# Frontend\n")
        text = session.get_context_text(self.root)
        for fact in (
            "lean-dev", "lean-branch", "12 uncommitted change(s)", "abc123 preserve facts", "def456 earlier",
            "Path: .trellis/tasks/parent", "Source: session:lean-test", "Name: parent", "Status: planning", "Created: 2026-10-15",
            "用户可见描述", "prd.md", "- parent/ (planning) [1/2 done] @lean-dev", "  - child/ (in_progress) @other-dev",
            "Total: 3 active task(s)", "[P1] parent title (planning) [1/2 done]", "journal-2.md", "1801 / 2000",
            "WARNING: Approaching 2000 line limit!", "Spec layers: frontend", ".trellis/workspace/lean-dev/", ".trellis/tasks/", ".trellis/spec/",
        ):
            self.assertIn(fact, text)
        self.assertIn("changed-9.py", text)
        self.assertNotIn("changed-10.py", text)
        self.assertNotIn("[P1] done title", text)
        self.assertNotIn("[P1] child title", text)
        data = session.get_context_json(self.root)
        self.assertEqual(set(data), {"developer", "git", "tasks", "journal"})
        self.assertEqual(data["developer"], "lean-dev")
        self.assertEqual(data["journal"], {"file": ".trellis/workspace/lean-dev/journal-2.md", "lines": 1801, "nearLimit": True})
        self.assertEqual(data["git"], {"isRepo": True, "branch": "lean-branch", "isClean": False, "uncommittedChanges": 12, "recentCommits": [{"hash": "abc123", "message": "preserve facts"}, {"hash": "def456", "message": "earlier"}]})
        self.assertEqual(data["tasks"]["directory"], ".trellis/tasks")
        self.assertEqual([t["dir"] for t in data["tasks"]["active"]], ["child", "done", "parent"])

    def test_journal_boundary_and_clean_repo(self):
        self.repo(dirty=False)
        self.put(".trellis/workspace/lean-dev/journal-1.md", "entry\n" * 1800)
        text = session.get_context_text(self.root)
        self.assertIn("Working directory: Clean", text)
        self.assertIn("1800 / 2000", text)
        self.assertNotIn("WARNING", text)
        self.assertFalse(session.get_context_json(self.root)["journal"]["nearLimit"])

    def test_missing_task_journal_and_non_git_root(self):
        text = session.get_context_text(self.root)
        for signal in ("Root is not a Git repository.", "Root has no Git commit history", "(none)", "(no active tasks)", "Total: 0", "(no tasks assigned to you)", "No journal file found", "(single-repo mode)"):
            self.assertIn(signal, text)
        self.assertNotIn("Working directory: Clean", text)
        self.assertFalse(session.get_context_json(self.root)["git"]["isClean"])

    def test_uninitialized_error(self):
        self.put(".trellis/.developer", "")
        text = session.get_context_text(self.root)
        self.assertIn("ERROR: Not initialized. Run: python3 ./.trellis/scripts/init_developer.py <name>", text)
        self.assertNotIn("## Current task", text)

    def test_invalid_task_keeps_path_and_warning(self):
        self.task("broken")
        self.put(".trellis/tasks/broken/task.json", "{broken")
        self.activate("broken")
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            text = session.get_context_text(self.root)
        self.assertIn("Path: .trellis/tasks/broken", text)
        self.assertIn("Source: session:lean-test", text)
        self.assertIn("[WARN] Skipping task 'broken'", stderr.getvalue())
        self.assertNotIn("Name: broken", text)
        self.assertIn("Total: 0", text)

    def test_package_paths_status_and_specs(self):
        self.repo("packages/ui", dirty=False)
        self.put(".trellis/config.yaml", "packages:\n  ui:\n    path: packages/ui\n    git: true\ndefault_package: ui\n")
        self.put(".trellis/spec/ui/frontend/index.md", "# UI\n")
        text = session.get_context_text(self.root)
        for fact in ("Root is not a Git repository", "ui: packages/ui", "lean-branch", "Working directory: Clean", "abc123 preserve facts", "[frontend]", "(git repo)", "Default package: ui"):
            self.assertIn(fact, text)
        data = session.get_context_json(self.root)
        self.assertEqual(data["packageGit"][0]["path"], "packages/ui")
        self.assertFalse(data["git"]["isRepo"])
        self.assertTrue(data["packageGit"][0]["isClean"])


if __name__ == "__main__":
    unittest.main()
