"""Regression tests for archive auto-commit pathspec construction.

Bug fixed here: `_auto_commit_archive` used to append `source_rel` to the
`git commit -- <pathspec>` unconditionally. Archiving a task that was never
tracked by git then failed the whole commit ("pathspec did not match any
file(s) known to git") and printed `[WARN] Auto-commit failed` even though
the archive move on disk had already succeeded.

Run: python3 -m unittest discover -s scripts -p 'test_archive_autocommit.py'
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".trellis/scripts"))

from common import task_store


class ArchiveCommitPathsTests(unittest.TestCase):
    def test_tracked_source_appends_source_rel(self):
        result = task_store._archive_commit_paths(
            [".trellis/tasks/archive"], ".trellis/tasks/x", True
        )
        self.assertEqual(result, [".trellis/tasks/archive", ".trellis/tasks/x"])

    def test_untracked_source_omits_source_rel(self):
        result = task_store._archive_commit_paths(
            [".trellis/tasks/archive"], ".trellis/tasks/x", False
        )
        self.assertEqual(result, [".trellis/tasks/archive"])

    def test_modified_children_paths_preserved(self):
        paths = [".trellis/tasks/archive", ".trellis/tasks/child-a"]
        result = task_store._archive_commit_paths(paths, ".trellis/tasks/x", False)
        self.assertEqual(result, paths)

    def test_result_is_a_copy_not_alias(self):
        paths = [".trellis/tasks/archive"]
        result = task_store._archive_commit_paths(paths, ".trellis/tasks/x", True)
        result.append("mutated")
        self.assertNotIn("mutated", paths)


class _GitRecorder:
    """Captures git invocations and replays scripted results by subcommand."""

    def __init__(self):
        self.calls = []

    def run_git(self, args, cwd=None, **_kwargs):
        self.calls.append(("run_git", args))
        return self._dispatch(args)

    def run_git_retry_index_lock(self, args, cwd=None, **_kwargs):
        self.calls.append(("run_git_retry_index_lock", args))
        return self._dispatch(args)

    def _dispatch(self, args):
        sub = args[0] if args else ""
        if sub == "ls-files":
            return self.ls_files_result
        if sub == "diff" and "--quiet" in args:
            # Non-zero => there are staged changes to commit.
            return (1, "", "")
        if sub == "rm":
            return (0, "", "")
        if sub == "commit":
            return self.commit_result
        return (0, "", "")


class AutoCommitArchivePathspecTests(unittest.TestCase):
    """Drive `_auto_commit_archive` with mocked git plumbing and assert the
    exact pathspec lists handed to `git diff --cached --quiet` and
    `git commit`."""

    SOURCE_REL = ".trellis/tasks/example"
    ADD_PATHS = [".trellis/tasks/archive"]

    def _run(self, *, ls_files_result, commit_result=(0, "", "")):
        rec = _GitRecorder()
        rec.ls_files_result = ls_files_result
        rec.commit_result = commit_result
        with (
            patch.object(task_store, "get_session_auto_commit", return_value=True),
            patch.object(task_store, "run_git", side_effect=rec.run_git),
            patch.object(
                task_store, "run_git_retry_index_lock",
                side_effect=rec.run_git_retry_index_lock,
            ),
            patch.object(
                task_store, "safe_archive_paths_to_add", return_value=list(self.ADD_PATHS)
            ),
            patch.object(task_store, "safe_git_add", return_value=(True, "", "")),
        ):
            ok = task_store._auto_commit_archive("example", Path("/repo"))
        return ok, rec

    def _args_of(self, rec, subcommand):
        return [args for _name, args in rec.calls if args and args[0] == subcommand]

    def test_untracked_task_commit_pathspec_excludes_source(self):
        ok, rec = self._run(ls_files_result=(0, "", ""))
        self.assertTrue(ok)
        commit_calls = self._args_of(rec, "commit")
        self.assertEqual(len(commit_calls), 1)
        pathspec = commit_calls[0][commit_calls[0].index("--") + 1 :]
        self.assertNotIn(self.SOURCE_REL, pathspec)
        self.assertEqual(pathspec, self.ADD_PATHS)
        diff_calls = self._args_of(rec, "diff")
        self.assertEqual(len(diff_calls), 1)
        diff_pathspec = diff_calls[0][diff_calls[0].index("--") + 1 :]
        self.assertNotIn(self.SOURCE_REL, diff_pathspec)

    def test_tracked_task_commit_pathspec_includes_source(self):
        ok, rec = self._run(
            ls_files_result=(0, f"{self.SOURCE_REL}/task.json\n", "")
        )
        self.assertTrue(ok)
        commit_calls = self._args_of(rec, "commit")
        self.assertEqual(len(commit_calls), 1)
        pathspec = commit_calls[0][commit_calls[0].index("--") + 1 :]
        self.assertEqual(pathspec, [*self.ADD_PATHS, self.SOURCE_REL])
        diff_calls = self._args_of(rec, "diff")
        diff_pathspec = diff_calls[0][diff_calls[0].index("--") + 1 :]
        self.assertIn(self.SOURCE_REL, diff_pathspec)

    def test_untracked_commit_failure_returns_success_without_warn_path(self):
        # Previously the failing commit (bad pathspec) put untracked archives
        # through the `[WARN] Auto-commit failed` branch. The return value is
        # still True for untracked tasks even on a genuine commit failure;
        # this test pins that semantic so the fix doesn't change it.
        ok, rec = self._run(
            ls_files_result=(0, "", ""), commit_result=(1, "", "boom")
        )
        self.assertTrue(ok)

    def test_tracked_commit_failure_returns_false(self):
        ok, rec = self._run(
            ls_files_result=(0, f"{self.SOURCE_REL}/task.json\n", ""),
            commit_result=(1, "", "boom"),
        )
        self.assertFalse(ok)

    def test_modified_children_kept_in_pathspec(self):
        rec = _GitRecorder()
        rec.ls_files_result = (0, "", "")
        rec.commit_result = (0, "", "")
        paths = [".trellis/tasks/archive", ".trellis/tasks/child-a"]
        with (
            patch.object(task_store, "get_session_auto_commit", return_value=True),
            patch.object(task_store, "run_git", side_effect=rec.run_git),
            patch.object(
                task_store, "run_git_retry_index_lock",
                side_effect=rec.run_git_retry_index_lock,
            ),
            patch.object(task_store, "safe_archive_paths_to_add", return_value=paths),
            patch.object(task_store, "safe_git_add", return_value=(True, "", "")),
        ):
            ok = task_store._auto_commit_archive(
                "example", Path("/repo"), modified_children=["child-a"]
            )
        self.assertTrue(ok)
        commit_args = self._args_of(rec, "commit")[0]
        pathspec = commit_args[commit_args.index("--") + 1 :]
        self.assertIn(".trellis/tasks/child-a", pathspec)

    def test_git_rm_cached_still_unconditional(self):
        # `git rm --cached --ignore-unmatch` must run for tracked AND
        # untracked sources (no-op for the latter, staged deletes for the
        # former) so phantom deletes can't slip through.
        for tracked in (False, True):
            ls = (0, f"{self.SOURCE_REL}/task.json\n", "") if tracked else (0, "", "")
            ok, rec = self._run(ls_files_result=ls)
            self.assertTrue(ok)
            rm_calls = self._args_of(rec, "rm")
            self.assertEqual(len(rm_calls), 1, f"tracked={tracked}")
            self.assertIn("--ignore-unmatch", rm_calls[0])


if __name__ == "__main__":
    unittest.main()
