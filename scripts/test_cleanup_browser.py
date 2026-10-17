"""Cleanup-check regression suite; every fixture lives below repository .tmp/."""

from datetime import datetime, timedelta, timezone
import inspect
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import cleanup_browser as cleanup

TASK_SPACE = "42"


class FakeProbe:
    """Read-only probe surface; anything else is a contract violation."""

    def __init__(self):
        self.processes = {}
        self.listeners_by_port = {}
        self.pid_files = {}
        self.failures = {}
        self.calls = []

    def _fail(self, name):
        if name in self.failures:
            raise cleanup.ProbeError(self.failures[name])

    def process(self, pid):
        self.calls.append(("process", pid))
        self._fail("process")
        return self.processes.get(pid)

    def listeners(self, port):
        self.calls.append(("listeners", port))
        self._fail("listeners")
        return list(self.listeners_by_port.get(port, []))

    def pid_file(self, path):
        self.calls.append(("pid_file", str(path)))
        self._fail("pid_file")
        return self.pid_files.get(Path(path), {"present": False, "content": None})


class CleanupTests(unittest.TestCase):
    def setUp(self):
        base = cleanup.ROOT / ".tmp/cleanup-browser-tests"
        base.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=base, prefix="case-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / ".tmp").mkdir()
        (self.root / "pages.json").write_text("{}", encoding="utf-8")
        (self.root / ".tmp/eh-bundle-server.log").write_text("", encoding="utf-8")
        self.probe = FakeProbe()
        self.checked = datetime(2026, 10, 17, 12, 0, 0, tzinfo=timezone.utc)
        self.outputs = 0

    def observed(self, age):
        moment = self.checked - timedelta(seconds=age)
        return moment.isoformat(timespec="milliseconds").replace("+00:00", "Z")

    def page(self, label="p1", **overrides):
        data = {
            "label": label, "spaceId": 42, "pageId": "page-1", "owner": "agent",
            "createdByTask": TASK_SPACE, "state": "closed",
            "observedAt": self.observed(0), "evidence": ["pages.json"],
        }
        data.update(overrides)
        return data

    def server(self, label="s1", **overrides):
        data = {
            "label": label, "pid": 4242, "pidFile": ".tmp/service.pid", "port": 8787,
            "expectedCwd": ".", "expectedCommand": "node scripts/serve-bundle.mjs",
            "processStartToken": "4242@Fri Oct 17 10:00:00 2026",
            "owner": "agent", "createdByTask": TASK_SPACE,
            "evidence": [".tmp/eh-bundle-server.log"],
        }
        data.update(overrides)
        return data

    def live(self, pid=4242, **overrides):
        process = {
            "startToken": "4242@Fri Oct 17 10:00:00 2026",
            "cwd": str(self.root),
            "command": "node scripts/serve-bundle.mjs",
        }
        process.update(overrides)
        self.probe.processes[pid] = process
        return process

    def next_output(self, prefix="reports"):
        self.outputs += 1
        directory = self.root / ".tmp" / prefix
        directory.mkdir(exist_ok=True)
        return str(directory / f"report-{self.outputs}.json")

    def write_pair(self, pages=None, servers=None, task_space=TASK_SPACE,
                   pages_text=None, servers_text=None):
        pages_path = self.root / ".tmp/pages.json"
        servers_path = self.root / ".tmp/servers.json"
        pages_path.write_text(
            pages_text if pages_text is not None
            else json.dumps({"schemaVersion": 1, "taskSpace": task_space,
                             "pages": list(pages or [])}),
            encoding="utf-8")
        servers_path.write_text(
            servers_text if servers_text is not None
            else json.dumps({"schemaVersion": 1, "taskSpace": task_space,
                             "servers": list(servers or [])}),
            encoding="utf-8")
        return str(pages_path), str(servers_path)

    def run_cleanup(self, pages=None, servers=None, task_space=TASK_SPACE, output=None,
                    probe=None, pages_text=None, servers_text=None):
        self.outputs += 1
        target = output if output is not None else None
        if target is None:
            directory = self.root / ".tmp/reports"
            directory.mkdir(exist_ok=True)
            target = str(directory / f"report-{self.outputs}.json")
        pages_path, servers_path = self.write_pair(pages, servers, task_space,
                                                   pages_text, servers_text)
        report, code = cleanup.run_cleanup(
            self.root, task_space, pages_path, servers_path, target,
            probe=probe or self.probe, now=self.checked)
        return code, report

    def page_report(self, report):
        self.assertEqual(len(report["pages"]), 1)
        return report["pages"][0]

    def server_report(self, report):
        self.assertEqual(len(report["servers"]), 1)
        return report["servers"][0]

    def test_agent_page_window_boundaries_and_states(self):
        cases = [
            (0, "closed", "clean", 0),
            (300, "closed", "clean", 0),
            (300.5, "closed", "unknown", 1),
            (301, "closed", "unknown", 1),
            (-1, "closed", "unknown", 1),
            (0, "open", "residual", 1),
            (300, "open", "residual", 1),
            (0, "unknown", "unknown", 1),
        ]
        for age, state, classification, exit_code in cases:
            with self.subTest(age=age, state=state):
                page = self.page(state=state, observedAt=self.observed(age))
                code, report = self.run_cleanup(pages=[page])
                entry = self.page_report(report)
                self.assertEqual((code, entry["classification"]), (exit_code, classification))
                self.assertEqual(report["aggregate"]["status"], classification)
                self.assertEqual(report["checkedAt"], "2026-10-17T12:00:00Z")
                self.assertAlmostEqual(entry["ageSeconds"], age, places=3)
                target = self.root / ".tmp/reports" / f"report-{self.outputs}.json"
                saved = json.loads(target.read_text(encoding="utf-8"))
                self.assertEqual(saved, report)
                self.assertEqual(saved["schemaVersion"], 1)

    def test_page_observation_problems_are_unknown(self):
        cases = [
            ("missing observedAt", {"observedAt": None}, "observation-invalid"),
            ("no timezone", {"observedAt": "2026-10-17T12:00:00"}, "explicit timezone"),
            ("not a timestamp", {"observedAt": "yesterday"}, "RFC3339"),
            ("space instead of T", {"observedAt": "2026-10-17 12:00:00+00:00"}, "RFC3339"),
            ("clock without seconds", {"observedAt": "2026-10-17T12:00Z"}, "RFC3339"),
            ("missing state", {"state": None}, "observation-missing"),
            ("invalid state", {"state": "half-open"}, "observation-invalid"),
        ]
        for label, overrides, fragment in cases:
            with self.subTest(label=label):
                code, report = self.run_cleanup(pages=[self.page(**overrides)])
                entry = self.page_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertTrue(any(fragment in reason for reason in entry["reasons"]), entry["reasons"])
                self.assertEqual(report["aggregate"]["status"], "unknown")

    def test_user_owned_resources_are_preserved_without_probe(self):
        page = self.page(owner="user", state="open", observedAt=self.observed(86400), evidence=5)
        page.pop("createdByTask")
        server = self.server(owner="user", evidence={})
        code, report = self.run_cleanup(pages=[page], servers=[server])
        self.assertEqual(code, 0)
        self.assertEqual(self.page_report(report)["classification"], "preserved")
        self.assertEqual(self.server_report(report)["classification"], "preserved")
        self.assertEqual(report["aggregate"]["status"], "clean")
        self.assertEqual(report["unresolved"], [])
        self.assertEqual(self.probe.calls, [])

    def test_page_ownership_and_evidence_problems_are_unknown(self):
        cases = [
            ("owner missing", {"owner": None}, "owner-missing"),
            ("owner invalid", {"owner": "robot"}, "owner-invalid"),
            ("owner unknown", {"owner": "unknown"}, "owner-unknown"),
            ("task missing", {"createdByTask": None}, "createdByTask-missing"),
            ("task mismatch", {"createdByTask": "other"}, "createdByTask-mismatch"),
            ("evidence missing", {"evidence": None}, "evidence-missing"),
            ("evidence empty", {"evidence": []}, "evidence-missing"),
            ("evidence invalid", {"evidence": 5}, "evidence-invalid"),
            ("evidence unreadable", {"evidence": ["missing.json"]}, "evidence-unreadable"),
        ]
        for label, overrides, fragment in cases:
            with self.subTest(label=label):
                page = self.page(**overrides)
                code, report = self.run_cleanup(pages=[page])
                entry = self.page_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertTrue(any(fragment in reason for reason in entry["reasons"]), entry["reasons"])

    def test_page_space_mismatch_is_an_input_error(self):
        for space in (43, None, "other"):
            with self.subTest(space=space):
                target = self.next_output()
                code, report = self.run_cleanup(pages=[self.page(spaceId=space)], output=target)
                self.assertEqual(code, 2)
                self.assertFalse(report["valid"])
                self.assertIn("spaceId", report["errors"][0])
                self.assertFalse(Path(target).exists())

    def test_agent_server_clean(self):
        target = self.next_output()
        code, report = self.run_cleanup(servers=[self.server()], output=target)
        entry = self.server_report(report)
        self.assertEqual((code, entry["classification"]), (0, "clean"))
        self.assertEqual(entry["observed"]["process"], {"alive": False})
        self.assertEqual(entry["observed"]["port"]["listeners"], [])
        self.assertEqual(entry["observed"]["pidFile"]["path"], ".tmp/service.pid")
        self.assertIn("exited-and-cleaned", entry["reasons"][0])
        self.assertEqual([call[0] for call in self.probe.calls],
                         ["process", "listeners", "pid_file"])
        self.assertEqual(json.loads(Path(target).read_text(encoding="utf-8")), report)

    def test_live_and_leftover_resources_are_residual(self):
        cases = [
            ("alive listening with pid file", {"listeners": [4242], "pid_file": True},
             ["process-still-running", "port-still-listening", "pid-file-left"]),
            ("alive listening", {"listeners": [4242], "pid_file": False},
             ["process-still-running", "port-still-listening"]),
            ("alive not listening", {"listeners": [], "pid_file": False},
             ["process-still-running", "port-not-listening"]),
        ]
        for label, setup, fragments in cases:
            with self.subTest(label=label):
                self.setUp()
                self.live()
                self.probe.listeners_by_port[8787] = setup["listeners"]
                if setup["pid_file"]:
                    self.probe.pid_files[self.root / ".tmp/service.pid"] = {
                        "present": True, "content": "4242\n"}
                code, report = self.run_cleanup(servers=[self.server()])
                entry = self.server_report(report)
                self.assertEqual((code, entry["classification"]), (1, "residual"))
                for fragment in fragments:
                    self.assertTrue(any(fragment in reason for reason in entry["reasons"]),
                                    entry["reasons"])

    def test_exited_server_with_pid_file_is_residual(self):
        self.probe.pid_files[self.root / ".tmp/service.pid"] = {"present": True, "content": "4242\n"}
        code, report = self.run_cleanup(servers=[self.server()])
        entry = self.server_report(report)
        self.assertEqual((code, entry["classification"]), (1, "residual"))
        self.assertIn("pid-file-left", entry["reasons"][0])
        self.assertEqual(report["diagnostics"], [])

    def test_pid_reuse_and_identity_mismatch_are_unknown(self):
        cases = [
            ("start token", {"startToken": "4242@Fri Oct 17 11:00:00 2026"}, "start-token-mismatch"),
            ("cwd", {"cwd": "/somewhere/else"}, "cwd-mismatch"),
            ("command", {"command": "python3 -m http.server"}, "command-mismatch"),
            ("cwd unreadable", {"cwd": None}, "cwd-unknown"),
        ]
        for label, overrides, fragment in cases:
            with self.subTest(label=label):
                self.setUp()
                self.live(**overrides)
                self.probe.listeners_by_port[8787] = [4242]
                code, report = self.run_cleanup(servers=[self.server()])
                entry = self.server_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertTrue(any(fragment in reason for reason in entry["reasons"]),
                                entry["reasons"])
                self.assertEqual(report["diagnostics"][0]["code"], "pid-reuse")

    def test_port_mismatch_is_unknown(self):
        for label, listeners, fragment in (
                ("alive other listener", [999], "port-mismatch"),
                ("exited other listener", [999], "port-occupied")):
            with self.subTest(label=label):
                self.setUp()
                if label.startswith("alive"):
                    self.live()
                self.probe.listeners_by_port[8787] = listeners
                code, report = self.run_cleanup(servers=[self.server()])
                entry = self.server_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertTrue(any(fragment in reason for reason in entry["reasons"]),
                                entry["reasons"])

    def test_server_ownership_problems_are_unknown_without_probe(self):
        cases = [
            ("owner missing", {"owner": None}, "owner-missing"),
            ("owner invalid", {"owner": True}, "owner-invalid"),
            ("owner unknown", {"owner": "unknown"}, "owner-unknown"),
            ("task missing", {"createdByTask": None}, "createdByTask-missing"),
            ("task mismatch", {"createdByTask": "other"}, "createdByTask-mismatch"),
            ("evidence missing", {"evidence": None}, "evidence-missing"),
            ("evidence empty", {"evidence": []}, "evidence-missing"),
            ("evidence invalid", {"evidence": {"file": "x"}}, "evidence-invalid"),
            ("evidence unreadable", {"evidence": ["missing.json"]}, "evidence-unreadable"),
        ]
        for label, overrides, fragment in cases:
            with self.subTest(label=label):
                self.setUp()
                code, report = self.run_cleanup(servers=[self.server(**overrides)])
                entry = self.server_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertTrue(any(fragment in reason for reason in entry["reasons"]),
                                entry["reasons"])
                self.assertEqual(self.probe.calls, [])

    def test_incomplete_server_declarations_are_unknown(self):
        cases = [
            ("pid", {"pid": "4242"}, "pid-invalid"),
            ("port", {"port": 70000}, "port-invalid"),
            ("pidFile", {"pidFile": None}, "pidFile-missing"),
            ("expectedCwd", {"expectedCwd": " "}, "expectedCwd-missing"),
            ("expectedCommand", {"expectedCommand": []}, "expectedCommand-missing"),
            ("start token", {"processStartToken": None}, "processStartToken-missing"),
            ("start token contradiction", {"processStartToken": "999@Fri Oct 17 10:00:00 2026"},
             "processStartToken-mismatch"),
            ("empty start token suffix", {"processStartToken": "4242@"},
             "processStartToken-mismatch"),
        ]
        for label, overrides, fragment in cases:
            with self.subTest(label=label):
                self.setUp()
                code, report = self.run_cleanup(servers=[self.server(**overrides)])
                entry = self.server_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertTrue(any(fragment in reason for reason in entry["reasons"]),
                                entry["reasons"])
                self.assertEqual(self.probe.calls, [])

    def test_probe_failure_is_unknown_with_diagnostic(self):
        for failure, code_name in (("process", "process-probe-failed"),
                                   ("listeners", "resource-probe-failed"),
                                   ("pid_file", "resource-probe-failed")):
            with self.subTest(failure=failure):
                self.setUp()
                self.probe.failures[failure] = f"fixture {failure} unavailable"
                code, report = self.run_cleanup(servers=[self.server()])
                entry = self.server_report(report)
                self.assertEqual((code, entry["classification"]), (1, "unknown"))
                self.assertIn("probe-failed", entry["reasons"][0])
                self.assertEqual(report["diagnostics"][0]["code"], code_name)
                self.assertIn(f"fixture {failure} unavailable", report["diagnostics"][0]["message"])

    def test_empty_declarations_are_clean(self):
        code, report = self.run_cleanup(pages=[], servers=[])
        self.assertEqual(code, 0)
        self.assertEqual(report["aggregate"]["status"], "clean")
        self.assertEqual(report["aggregate"]["counts"],
                         {"clean": 0, "residual": 0, "preserved": 0, "unknown": 0})
        self.assertEqual(report["unresolved"], [])
        self.assertEqual(report["pages"], [])
        self.assertEqual(report["servers"], [])

    def test_report_shape_and_aggregate(self):
        self.probe.pid_files[self.root / ".tmp/service.pid"] = {"present": True, "content": "nope"}
        server = self.server(pid=5151, processStartToken="5151@Fri Oct 17 10:00:00 2026")
        page = self.page()
        user_server = self.server(label="user-service", owner="user", pid=1, pidFile="/tmp/user.pid")
        code, report = self.run_cleanup(pages=[page], servers=[server, user_server])
        self.assertEqual(code, 1)
        self.assertEqual(report["aggregate"]["status"], "unknown")
        self.assertEqual(report["aggregate"]["counts"],
                         {"clean": 1, "residual": 0, "preserved": 1, "unknown": 1})
        self.assertEqual(report["aggregate"]["servers"]["preserved"], 1)
        self.assertEqual(len(report["unresolved"]), 1)
        unresolved = report["unresolved"][0]
        self.assertEqual((unresolved["resource"], unresolved["label"]), ("servers", "s1"))
        self.assertIn("Human review", unresolved["action"])
        self.assertEqual(report["diagnostics"][0]["code"], "pid-file-content-mismatch")
        self.assertEqual(set(report), {"valid", "schemaVersion", "taskSpace", "checkedAt", "pages",
                                       "servers", "aggregate", "unresolved", "diagnostics"})

    def test_invalid_declarations_exit_two_and_write_nothing(self):
        valid_pages = json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE,
                                  "pages": [self.page()]})
        valid_servers = json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE, "servers": []})
        cases = [
            ("schema version", json.dumps({"schemaVersion": 2, "taskSpace": TASK_SPACE,
                                           "pages": []}), valid_servers, TASK_SPACE),
            ("schema boolean", json.dumps({"schemaVersion": True, "taskSpace": TASK_SPACE,
                                           "pages": []}), valid_servers, TASK_SPACE),
            ("task space mismatch",
             json.dumps({"schemaVersion": 1, "taskSpace": "other", "pages": []}),
             valid_servers, TASK_SPACE),
            ("server task space mismatch", valid_pages,
             json.dumps({"schemaVersion": 1, "taskSpace": "other", "servers": []}), TASK_SPACE),
            ("unknown wrapper field",
             json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE, "pages": [], "extra": 1}),
             valid_servers, TASK_SPACE),
            ("missing pages key", json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE}),
             valid_servers, TASK_SPACE),
            ("pages not an array",
             json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE, "pages": {}}),
             valid_servers, TASK_SPACE),
            ("duplicate labels",
             json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE,
                         "pages": [self.page(), self.page()]}), valid_servers, TASK_SPACE),
            ("invalid page id",
             json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE,
                         "pages": [self.page(pageId=["x"])]}), valid_servers, TASK_SPACE),
            ("missing page id",
             json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE,
                         "pages": [self.page(pageId=None)]}), valid_servers, TASK_SPACE),
            ("unknown page field",
             json.dumps({"schemaVersion": 1, "taskSpace": TASK_SPACE,
                         "pages": [self.page(extra=1)]}), valid_servers, TASK_SPACE),
            ("malformed json", "{broken", valid_servers, TASK_SPACE),
            ("duplicate json keys",
             '{"schemaVersion":1,"schemaVersion":1,"taskSpace":"42","pages":[]}',
             valid_servers, TASK_SPACE),
            ("missing input", None, valid_servers, TASK_SPACE),
            ("empty task space", valid_pages, valid_servers, " "),
        ]
        for label, pages_text, servers_text, task_space in cases:
            with self.subTest(label=label):
                self.setUp()
                target = self.next_output()
                if pages_text is None:
                    pages_path = str(self.root / ".tmp/missing.json")
                    servers_path = str(self.root / ".tmp/servers.json")
                    Path(servers_path).write_text(servers_text, encoding="utf-8")
                else:
                    pages_path, servers_path = self.write_pair(
                        pages_text=pages_text, servers_text=servers_text)
                report, code = cleanup.run_cleanup(
                    self.root, task_space, pages_path, servers_path, target,
                    probe=self.probe, now=self.checked)
                self.assertEqual(code, 2)
                self.assertFalse(report["valid"])
                self.assertTrue(report["errors"])
                self.assertFalse(Path(target).exists())

    def test_output_rules(self):
        cases = [
            ("outside tmp", ".trellis/report.json"),
            ("tmp itself", ".tmp"),
            ("missing parent", ".tmp/missing/report.json"),
        ]
        for label, target in cases:
            with self.subTest(label=label):
                self.setUp()
                code, report = self.run_cleanup(output=target)
                self.assertEqual(code, 2)
                self.assertIn("output", report["errors"][0])

        target = self.next_output()
        Path(target).parent.mkdir(parents=True, exist_ok=True)
        Path(target).write_text("keep me", encoding="utf-8")
        code, report = self.run_cleanup(output=target)
        self.assertEqual(code, 2)
        self.assertIn("refusing to overwrite", report["errors"][0])
        self.assertEqual(Path(target).read_text(encoding="utf-8"), "keep me")

        absolute = str(self.root / ".tmp/report-absolute.json")
        code, report = self.run_cleanup(output=absolute)
        self.assertEqual(code, 0)
        self.assertTrue(Path(absolute).is_file())
        self.assertEqual(list(Path(absolute).parent.glob(".cleanup-browser-*")), [])

    def test_output_failure_exits_two_without_leftovers(self):
        target = self.next_output()
        with patch.object(cleanup.os, "link", side_effect=OSError("fixture link failure")):
            code, report = self.run_cleanup(output=target)
        self.assertEqual(code, 2)
        self.assertIn("fixture link failure", report["errors"][0])
        self.assertFalse(Path(target).exists())
        self.assertEqual(list(Path(target).parent.glob(".cleanup-browser-*")), [])

        with patch.object(cleanup.tempfile, "NamedTemporaryFile", side_effect=OSError("fixture temp failure")):
            code, report = self.run_cleanup(output=self.next_output())
        self.assertEqual(code, 2)
        self.assertIn("fixture temp failure", report["errors"][0])

    def test_no_destructive_calls(self):
        source = inspect.getsource(cleanup)
        for token in ("os.kill", "killpg", "rmtree", "send_signal", "os.remove", "os.unlink"):
            self.assertNotIn(token, source)

        self.live()
        self.probe.listeners_by_port[8787] = [4242]
        with patch.object(cleanup.subprocess, "run",
                          side_effect=AssertionError("unexpected shell probe")), \
                patch.object(os, "kill") as kill:
            code, report = self.run_cleanup(pages=[self.page(owner="user")],
                                            servers=[self.server(), self.server("s2", owner="user")])
        self.assertEqual(code, 1)
        self.assertFalse(kill.called)
        self.assertEqual([call[0] for call in self.probe.calls],
                         ["process", "listeners", "pid_file"])
        self.assertEqual(self.page_report(report)["classification"], "preserved")

    def test_cli_dispatch(self):
        script = cleanup.ROOT / "scripts/acceptance.py"
        pages_path, servers_path = self.write_pair(
            servers=[self.server(evidence=[str(self.root / "pages.json")])])

        def invoke(output, task_space=TASK_SPACE):
            return subprocess.run(
                [sys.executable, str(script), "cleanup-browser", task_space,
                 "--pages", pages_path, "--servers", servers_path, "--output", str(output)],
                cwd=cleanup.ROOT, capture_output=True, text=True, timeout=20)

        clean_output = self.root / ".tmp/cli-clean.json"
        completed = invoke(clean_output)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        saved = json.loads(clean_output.read_text(encoding="utf-8"))
        self.assertEqual(json.loads(completed.stdout), saved)
        self.assertEqual(saved["aggregate"]["status"], "clean")

        pages_path, servers_path = self.write_pair(pages=[self.page(owner="unknown")])
        unknown_output = self.root / ".tmp/cli-unknown.json"
        completed = invoke(unknown_output)
        self.assertEqual(completed.returncode, 1, completed.stderr)
        self.assertEqual(json.loads(unknown_output.read_text(encoding="utf-8"))
                         ["aggregate"]["status"], "unknown")

        bad_output = self.root / ".tmp/cli-bad.json"
        completed = invoke(bad_output, task_space="99")
        self.assertEqual(completed.returncode, 2)
        self.assertFalse(json.loads(completed.stdout)["valid"])
        self.assertFalse(bad_output.exists())


class SystemProbeTests(unittest.TestCase):
    def test_process_identity_shape(self):
        probe = cleanup.SystemProbe()
        process = probe.process(os.getpid())
        self.assertIsNotNone(process)
        self.assertTrue(process["startToken"].startswith(f"{os.getpid()}@"))
        self.assertEqual(os.path.realpath(process["cwd"]),
                         os.path.realpath(str(cleanup.ROOT)))
        self.assertIn("python", process["command"])

    def test_absent_process_and_free_port(self):
        probe = cleanup.SystemProbe()
        self.assertIsNone(probe.process(54321))
        self.assertEqual(probe.listeners(1), [])

    def test_missing_process_requires_an_empty_stderr(self):
        probe = cleanup.SystemProbe()
        absent = cleanup.subprocess.CompletedProcess([], 1, "", "")
        with patch.object(cleanup.subprocess, "run", return_value=absent):
            self.assertIsNone(probe.process(4242))
        denied = cleanup.subprocess.CompletedProcess([], 1, "", "permission denied")
        with patch.object(cleanup.subprocess, "run", return_value=denied):
            with self.assertRaises(cleanup.ProbeError):
                probe.process(4242)

    def test_listener_probe_fails_closed_on_stderr(self):
        probe = cleanup.SystemProbe()
        denied = cleanup.subprocess.CompletedProcess([], 1, "", "lsof: permission denied")
        with patch.object(cleanup.subprocess, "run", return_value=denied):
            with self.assertRaises(cleanup.ProbeError):
                probe.listeners(8787)

    def test_live_process_with_unreadable_cwd_is_not_reported_as_exited(self):
        probe = cleanup.SystemProbe()
        with patch.object(cleanup.SystemProbe, "_cwd", return_value=None):
            with self.assertRaises(cleanup.ProbeError):
                probe.process(os.getpid())


if __name__ == "__main__":
    unittest.main()
