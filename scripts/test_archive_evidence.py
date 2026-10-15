"""Regression tests for archive-time acceptance evidence path rewriting."""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".trellis/scripts"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import acceptance
from common import active_task, task_store


class ArchiveEvidenceRewriteTests(unittest.TestCase):
    ACTIVE_REL = ".trellis/tasks/example"
    ARCHIVE_REL = ".trellis/tasks/archive/2026-10/example"

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.active = self.root / self.ACTIVE_REL
        self.archive = self.root / self.ARCHIVE_REL
        self.active.mkdir(parents=True)
        self.archive.mkdir(parents=True)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _write_acceptance(self, data):
        path = self.archive / "acceptance.json"
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return path

    def _data(self):
        return {
            "schemaVersion": 1,
            "criteria": {"AC1": "Keep the acceptance result"},
            "checks": [
                {
                    "id": "evidence",
                    "ac": ["AC1"],
                    "claim": "Evidence remains available",
                    "scope": "Archive task",
                    "method": "inspection",
                    "dimension": "behavior",
                    "observed": "passed",
                    "execution": None,
                    "evidence": [
                        f"{self.ACTIVE_REL}/research/evidence.md",
                        ".tmp/archive.log",
                        ".trellis/tasks/other/research.md",
                        ".trellis/tasks/example-similar/research.md",
                        42,
                    ],
                    "note": f"Keep this note mentioning {self.ACTIVE_REL}/unchanged.md",
                    "waiver": None,
                }
            ],
        }

    def _rewrite(self):
        return task_store._rewrite_archived_acceptance_evidence(
            self.archive, self.active, self.root
        )

    def test_rewrites_only_task_owned_evidence_and_preserves_other_data(self):
        data = self._data()
        self._write_acceptance(data)

        self.assertTrue(self._rewrite())
        saved = json.loads((self.archive / "acceptance.json").read_text(encoding="utf-8"))
        expected = json.loads(json.dumps(data))
        expected["checks"][0]["evidence"][0] = (
            f"{self.ARCHIVE_REL}/research/evidence.md"
        )
        self.assertEqual(saved, expected)

    def test_missing_acceptance_is_a_noop(self):
        self.assertTrue(self._rewrite())
        self.assertFalse((self.archive / "acceptance.json").exists())

    def test_no_matching_evidence_does_not_rewrite_file(self):
        data = self._data()
        data["checks"][0]["evidence"] = [".tmp/archive.log"]
        path = self._write_acceptance(data)
        before = path.read_bytes()

        self.assertTrue(self._rewrite())
        self.assertEqual(path.read_bytes(), before)

    def test_invalid_json_is_reported_without_overwriting_file(self):
        path = self.archive / "acceptance.json"
        path.write_bytes(b'{"checks":')
        before = path.read_bytes()
        stderr = io.StringIO()

        with contextlib.redirect_stderr(stderr):
            self.assertFalse(self._rewrite())

        self.assertEqual(path.read_bytes(), before)
        self.assertIn("not valid JSON", stderr.getvalue())

    def test_unreadable_json_is_reported(self):
        stderr = io.StringIO()
        with (
            patch.object(task_store, "read_json_checked", return_value=(None, "unreadable")),
            contextlib.redirect_stderr(stderr),
        ):
            self.assertFalse(self._rewrite())
        self.assertIn("could not be read", stderr.getvalue())

    def test_invalid_checks_shape_is_reported_without_write(self):
        data = self._data()
        data["checks"] = {"not": "an array"}
        path = self._write_acceptance(data)
        before = path.read_bytes()
        stderr = io.StringIO()

        with contextlib.redirect_stderr(stderr):
            self.assertFalse(self._rewrite())

        self.assertEqual(path.read_bytes(), before)
        self.assertIn("checks must be a JSON array", stderr.getvalue())

    def test_missing_evidence_shape_is_reported_without_write(self):
        data = self._data()
        del data["checks"][0]["evidence"]
        path = self._write_acceptance(data)
        before = path.read_bytes()
        stderr = io.StringIO()

        with contextlib.redirect_stderr(stderr):
            self.assertFalse(self._rewrite())

        self.assertEqual(path.read_bytes(), before)
        self.assertIn("checks[0].evidence must be a JSON array", stderr.getvalue())

    def test_write_failure_preserves_original_file(self):
        data = self._data()
        path = self._write_acceptance(data)
        before = path.read_bytes()
        stderr = io.StringIO()

        with (
            patch.object(task_store, "write_json", return_value=False),
            contextlib.redirect_stderr(stderr),
        ):
            self.assertFalse(self._rewrite())

        self.assertEqual(path.read_bytes(), before)
        self.assertIn("existing file is unchanged", stderr.getvalue())


class ArchiveCommandEvidenceTests(unittest.TestCase):
    def test_evidence_failure_skips_auto_commit_after_move(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            task_dir = root / ".trellis/tasks/example"
            task_dir.mkdir(parents=True)
            (root / ".trellis/tasks/archive").mkdir(parents=True)
            (task_dir / "acceptance.json").write_bytes(b'{"checks":')

            args = argparse.Namespace(
                name="example", no_commit=False, skip_branch_validation=False
            )
            stderr = io.StringIO()
            with (
                patch.object(task_store, "get_repo_root", return_value=root.resolve()),
                patch.object(task_store, "run_task_hooks"),
                patch.object(active_task, "clear_task_from_sessions"),
                patch.object(task_store, "_auto_commit_archive") as auto_commit,
                contextlib.redirect_stderr(stderr),
            ):
                result = task_store.cmd_archive(args)

            self.assertEqual(result, 1)
            self.assertFalse(task_dir.exists())
            auto_commit.assert_not_called()
            self.assertIn("Archive moved on disk, but acceptance evidence was not updated", stderr.getvalue())

    def test_cmd_archive_rewrites_evidence_and_acceptance_still_validates(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            task_dir = root / ".trellis/tasks/example"
            evidence = task_dir / "research/evidence.md"
            evidence.parent.mkdir(parents=True)
            evidence.write_text("durable evidence\n", encoding="utf-8")
            (root / ".trellis/tasks/archive").mkdir(parents=True)
            (task_dir / "prd.md").write_text(
                "## Acceptance Criteria\n\n- [AC1] Keep the acceptance result\n",
                encoding="utf-8",
            )
            acceptance_data = {
                "schemaVersion": 1,
                "criteria": {"AC1": "Keep the acceptance result"},
                "checks": [
                    {
                        "id": "evidence",
                        "ac": ["AC1"],
                        "claim": "Evidence remains available",
                        "scope": "Archive task",
                        "method": "inspection",
                        "dimension": "behavior",
                        "observed": "passed",
                        "execution": None,
                        "evidence": [
                            ".trellis/tasks/example/research/evidence.md"
                        ],
                        "note": "The evidence file is present.",
                        "waiver": None,
                    }
                ],
            }
            (task_dir / "acceptance.json").write_text(
                json.dumps(acceptance_data, indent=2), encoding="utf-8"
            )

            args = argparse.Namespace(
                name="example", no_commit=True, skip_branch_validation=False
            )
            stdout = io.StringIO()
            stderr = io.StringIO()
            with (
                patch.object(task_store, "get_repo_root", return_value=root.resolve()),
                patch.object(task_store, "run_task_hooks"),
                patch.object(active_task, "clear_task_from_sessions"),
                contextlib.redirect_stdout(stdout),
                contextlib.redirect_stderr(stderr),
            ):
                result = task_store.cmd_archive(args)

            self.assertEqual(result, 0, stderr.getvalue())
            self.assertFalse(task_dir.exists())
            archive_dir = root / ".trellis/tasks/archive/2026-10/example"
            if not archive_dir.exists():
                archive_dir = next((root / ".trellis/tasks/archive").glob("*/example"))
            saved = json.loads(
                (archive_dir / "acceptance.json").read_text(encoding="utf-8")
            )
            archived_evidence = saved["checks"][0]["evidence"][0]
            self.assertTrue(archived_evidence.startswith(".trellis/tasks/archive/"))
            self.assertTrue((root / archived_evidence).is_file())

            _, loaded = acceptance.load(root.resolve(), str(archive_dir))
            self.assertTrue(acceptance.summarize(loaded)["valid"])


if __name__ == "__main__":
    unittest.main()
