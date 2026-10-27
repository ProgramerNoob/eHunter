"""Standard-library regression suite; all fixtures live below repository .tmp/."""

from contextlib import redirect_stderr, redirect_stdout
from copy import deepcopy
import io
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

import acceptance


class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        base = acceptance.ROOT / ".tmp/acceptance-result-gate"
        base.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=base, prefix="case-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.task = self.root / ".trellis/tasks/example"
        self.task.mkdir(parents=True)
        (self.task / "prd.md").write_text("# Example\n\n## 接受标准\n\n- [AC1] Required behavior\n", encoding="utf-8")
        (self.task / "task.json").write_text('{"status":"in_progress"}', encoding="utf-8")
        pointer = self.root / ".trellis/.runtime/sessions/test.json"
        pointer.parent.mkdir(parents=True)
        pointer.write_text('{"task":".trellis/tasks/example"}', encoding="utf-8")
        (self.root / ".tmp").mkdir()
        (self.root / ".tmp/evidence.log").write_text("Observed fixture result\n", encoding="utf-8")
        self.data = {"schemaVersion": 1, "criteria": {"AC1": "Required behavior"}, "checks": [self.check()]}
        self.write()

    def check(self, check_id="check", observed="passed", method="inspection", ac=None):
        result = {
            "id": check_id, "ac": ac or ["AC1"], "claim": "Required behavior is satisfied",
            "scope": "isolated fixture", "method": method, "dimension": "behavior",
            "observed": observed, "execution": None,
            "evidence": [".tmp/evidence.log"] if observed == "passed" else [],
            "note": "Fixture observed as declared; incomplete cases retain their missing scope.", "waiver": None,
        }
        if method == "command" and observed == "passed":
            result["execution"] = self.execution()
        return result

    def execution(self, code=0):
        return {"argv": [sys.executable, "-c", "pass"], "cwd": ".", "exitCode": code,
                "startedAt": "2026-10-11T10:00:00Z", "endedAt": "2026-10-11T10:00:01Z",
                "log": ".tmp/evidence.log"}

    def write(self):
        (self.task / "acceptance.json").write_text(json.dumps(self.data), encoding="utf-8")

    def invoke(self, *args):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = acceptance.main(list(args), root=self.root)
        return code, json.loads(stdout.getvalue()), stderr.getvalue()

    def summary(self):
        self.write()
        return self.invoke("summarize", str(self.task))

    def assert_invalid(self, fragment):
        code, result, diagnostic = self.summary()
        self.assertEqual(code, 2)
        self.assertFalse(result["valid"])
        self.assertNotIn("status", result)
        self.assertIn(fragment, diagnostic)

    def cli(self, *args):
        script = self.root / "scripts/acceptance.py"
        script.parent.mkdir(exist_ok=True)
        shutil.copyfile(acceptance.__file__, script)
        return [sys.executable, str(script), *args]

    def test_exit_2_cannot_be_passed_even_with_waiver(self):
        check = self.check(method="command")
        check["execution"]["exitCode"] = 2
        self.data["checks"] = [check]
        for waiver in (None, {"reason": "Existing issue", "authority": "prd.md:10"}):
            with self.subTest(waiver=waiver):
                check["waiver"] = waiver
                self.assert_invalid("passed requires integer exitCode 0")

    def test_failed_exit_code_is_preserved(self):
        check = self.check(observed="failed", method="command")
        check["execution"] = self.execution(2)
        self.data["checks"] = [check]
        code, result, _ = self.summary()
        self.assertEqual((code, result["status"]), (1, "failed"))
        self.assertEqual(result["checks"][0]["execution"]["exitCode"], 2)

    def test_ac4_partial_among_eight_is_not_all_passed(self):
        self.data["criteria"] = {f"AC{i}": f"Requirement {i}" for i in range(1, 9)}
        (self.task / "prd.md").write_text("## 接受标准\n" + "\n".join(
            f"- [{key}] {text}" for key, text in self.data["criteria"].items()), encoding="utf-8")
        self.data["checks"] = [self.check(str(i), "partial" if i == 4 else "passed", ac=[f"AC{i}"]) for i in range(1, 9)]
        code, result, _ = self.summary()
        self.assertEqual((code, result["status"], result["criteria"]["AC4"]["status"]), (1, "partial", "partial"))
        self.assertEqual(result["counts"]["passed"], 7)
        self.assertEqual(result["counts"]["partial"], 1)

    def test_zip_structure_does_not_hide_blocked_content(self):
        structure = self.check("zip-structure")
        structure["dimension"] = "structure"
        content = self.check("zip-content", "blocked", "runtime")
        content["dimension"] = "content"
        self.data["checks"] = [structure, content]
        code, result, _ = self.summary()
        self.assertEqual((code, result["status"]), (1, "blocked"))
        self.assertEqual(result["criteria"]["AC1"]["checks"], ["zip-structure", "zip-content"])
        self.assertEqual(result["counts"]["passed"], 1)

    def test_all_passed_and_summary_fields(self):
        self.data["checks"].append(self.check("command", method="command"))
        code, result, _ = self.summary()
        self.assertEqual((code, result["status"], result["observedStatus"]), (0, "passed", "passed"))
        self.assertEqual(result["criteria"]["AC1"]["status"], "passed")
        self.assertEqual(set(result["counts"]), set(acceptance.STATUSES))
        self.assertEqual(result["waivedChecks"], [])

    def test_waiver_preserves_original_failure_and_authority(self):
        check = self.check(observed="failed", method="command")
        check["execution"] = self.execution(2)
        check["waiver"] = {"reason": "Fixture authorized exception", "authority": "fixture user decision: message 12"}
        self.data["checks"] = [check]
        code, result, _ = self.summary()
        self.assertEqual((code, result["status"], result["observedStatus"]), (3, "waived", "failed"))
        waived = result["waivedChecks"][0]
        self.assertEqual(waived["observed"], "failed")
        self.assertEqual(waived["execution"]["exitCode"], 2)
        self.assertEqual(waived["waiver"], check["waiver"])
        self.assertEqual(result["observedCounts"]["failed"], 1)

    def test_waiver_cannot_cancel_other_incomplete_checks(self):
        check = self.check(observed="failed")
        check["waiver"] = {"reason": "Fixture exception", "authority": "fixture decision:12"}
        for observed, expected in (("failed", "failed"), ("blocked", "blocked"), ("partial", "partial"), ("unrun", "partial"), ("passed", "waived")):
            with self.subTest(observed=observed):
                self.data["checks"] = [check, self.check("other", observed)]
                code, result, _ = self.summary()
                self.assertEqual(result["status"], expected)
                self.assertEqual(code, 3 if expected == "waived" else 1)

    def test_aggregation_retains_lower_priority_counts(self):
        self.data["checks"] = [self.check(state, state) for state in acceptance.OBSERVED]
        code, result, _ = self.summary()
        self.assertEqual((code, result["status"]), (1, "failed"))
        for state in acceptance.OBSERVED:
            self.assertEqual(result["counts"][state], 1)
        self.data["checks"] = [self.check("first", "unrun"), self.check("second", "unrun")]
        self.assertEqual(self.summary()[1]["status"], "unrun")
        self.data["checks"].append(self.check("third"))
        self.assertEqual(self.summary()[1]["status"], "partial")

    def test_waiver_requires_basis_and_cannot_waive_pass(self):
        for waiver in ({}, {"reason": "why", "authority": ""}, {"reason": "", "authority": "ref"}, True,
                       {"reason": "why", "authority": "ref", "approved": True}):
            with self.subTest(waiver=waiver):
                self.data["checks"] = [self.check(observed="failed")]
                self.data["checks"][0]["waiver"] = waiver
                self.assert_invalid("waiver")
        self.data["checks"] = [self.check()]
        self.data["checks"][0]["waiver"] = {"reason": "why", "authority": "ref"}
        self.assert_invalid("passed cannot be waived")

    def test_missing_unknown_duplicate_and_empty_checks(self):
        baseline = deepcopy(self.data)
        mutations = [
            ("criteria", lambda d: d["criteria"].clear()),
            ("criteria", lambda d: d["criteria"].update(AC2="Unknown")),
            ("checks", lambda d: d.update(checks=[])),
            ("duplicate check", lambda d: d["checks"].append(deepcopy(d["checks"][0]))),
            ("unknown AC", lambda d: d["checks"][0].update(ac=["AC99"])),
            ("duplicate AC", lambda d: d["checks"][0].update(ac=["AC1", "AC1"])),
            ("nonempty array", lambda d: d["checks"][0].update(ac=[])),
            ("text differs", lambda d: d["criteria"].update(AC1="Changed")),
        ]
        for fragment, mutate in mutations:
            with self.subTest(fragment=fragment):
                self.data = deepcopy(baseline)
                mutate(self.data)
                self.assert_invalid(fragment)

    def test_uncovered_ac_is_rejected(self):
        with (self.task / "prd.md").open("a", encoding="utf-8") as stream:
            stream.write("- [AC2] Second requirement\n")
        self.data["criteria"]["AC2"] = "Second requirement"
        self.assert_invalid("uncovered ACs ['AC2']")

    def test_bad_field_types_and_handwritten_statuses(self):
        baseline = deepcopy(self.data)
        for key, value in (("schemaVersion", True), ("schemaVersion", "1"), ("criteria", []),
                           ("checks", {}), ("overall", "passed"), ("status", "passed")):
            with self.subTest(key=key, value=value):
                self.data = deepcopy(baseline)
                self.data[key] = value
                self.assert_invalid(key)
        for key, value in (("id", []), ("ac", "AC1"), ("ac", [{}]), ("claim", None), ("scope", ""),
                           ("method", []), ("dimension", False), ("observed", "waived"),
                           ("execution", []), ("evidence", ".tmp/evidence.log"), ("evidence", [True]),
                           ("note", 0), ("required", False), ("status", "passed")):
            with self.subTest(key=key, value=value):
                self.data = deepcopy(baseline)
                self.data["checks"][0][key] = value
                self.assert_invalid(key)

    def test_command_exit_code_strictness_and_execution_fields(self):
        for code in (None, True, False, "0", 0.0, [], {}):
            with self.subTest(code=code):
                self.data["checks"] = [self.check(method="command")]
                self.data["checks"][0]["execution"]["exitCode"] = code
                self.assert_invalid("exitCode")
        for field in acceptance.EXECUTION_FIELDS:
            with self.subTest(missing=field):
                self.data["checks"] = [self.check(method="command")]
                del self.data["checks"][0]["execution"][field]
                self.assert_invalid("missing fields")
        self.data["checks"] = [self.check(method="command")]
        self.data["checks"][0]["execution"] = None
        self.assert_invalid("needs execution")

    def test_incomplete_or_malformed_execution(self):
        for key, value in (("argv", []), ("argv", [0]), ("cwd", 1), ("cwd", "missing"),
                           ("startedAt", "yesterday"), ("endedAt", "2020-01-01T00:00:00Z"),
                           ("endedAt", None), ("log", ".tmp/missing.log"), ("log", ".")):
            with self.subTest(key=key):
                self.data["checks"] = [self.check(method="command")]
                self.data["checks"][0]["execution"][key] = value
                self.assert_invalid("execution")
        self.data["checks"] = [self.check(observed="unrun")]
        self.data["checks"][0]["execution"] = self.execution()
        self.assert_invalid("unrun cannot have an exitCode")

    def test_runtime_with_nonzero_execution_cannot_pass(self):
        self.data["checks"] = [self.check(method="runtime")]
        self.data["checks"][0]["execution"] = self.execution(2)
        self.assert_invalid("passed requires integer exitCode 0")

    def test_evidence_is_readable_and_command_log_is_linked(self):
        for evidence in ([], [".tmp/missing"], [".tmp"], [str(self.root / ".tmp/evidence.log")], ["../outside"]):
            with self.subTest(evidence=evidence):
                self.data["checks"][0]["evidence"] = evidence
                self.assert_invalid("evidence")
        self.data["checks"] = [self.check(method="command")]
        self.data["checks"][0]["evidence"] = [".trellis/tasks/example/prd.md"]
        self.assert_invalid("link execution.log")
        self.data["checks"][0]["execution"]["log"] = ".trellis/tasks/example/prd.md"
        self.assert_invalid("logs must be under .tmp/")

    def test_unreadable_file_is_not_accepted_by_existence_alone(self):
        original = Path.open

        def open_file(path, *args, **kwargs):
            if path.name == "evidence.log":
                raise PermissionError("fixture permission denied")
            return original(path, *args, **kwargs)

        with patch.object(Path, "open", open_file):
            self.assert_invalid("cannot read")

    def test_required_notes(self):
        for method, state in (("runtime", "passed"), ("inspection", "passed"), ("command", "blocked"),
                              ("inspection", "partial"), ("command", "unrun"), ("inspection", "failed")):
            with self.subTest(method=method, state=state):
                self.data["checks"] = [self.check(method=method, observed=state)]
                self.data["checks"][0]["note"] = " "
                self.assert_invalid("note")

    def test_prd_fences_sections_and_continuations(self):
        prd = """# Task
```md
## 接受标准
- [AC99] fake
```
## Acceptance Criteria
- [AC1] Required
  behavior
~~~md
- [AC2] fake
## 接受标准
~~~
## Other
- [AC3] not an AC definition
"""
        (self.task / "prd.md").write_text(prd, encoding="utf-8")
        self.assertEqual(self.summary()[0], 0)
        self.assertEqual(acceptance.parse_criteria(prd), {"AC1": "Required\nbehavior"})

    def test_malformed_prd_is_not_a_partial_inventory(self):
        for prd in ("# No AC section", "## 接受标准\n", "## 接受标准\n- no id",
                    "## 接受标准\n- [AC1] first\n- [AC1] duplicate",
                    "## 接受标准\n- [AC1] first\n## Acceptance Criteria\n- [AC2] second",
                    "## 接受标准\n- [AC1] first\n1. missing id", "## 接受标准\n- [AC0] invalid",
                    "## 接受标准\n- [AC1] first\n* missing id"):
            with self.subTest(prd=prd):
                (self.task / "prd.md").write_text(prd, encoding="utf-8")
                self.assert_invalid("prd.md")

    def test_duplicate_json_keys_are_rejected(self):
        for payload in ('{"schemaVersion":1,"schemaVersion":1}',
                        '{"criteria":{"AC1":"first","AC1":"second"}}'):
            with self.subTest(payload=payload):
                (self.task / "acceptance.json").write_text(payload, encoding="utf-8")
                code, result, _ = self.invoke("summarize", str(self.task))
                self.assertEqual(code, 2)
                self.assertIn("duplicate key", result["errors"][0])

    def test_old_task_missing_record_reports_backfill(self):
        (self.task / "acceptance.json").unlink()
        code, result, _ = self.invoke("summarize", str(self.task))
        self.assertEqual(code, 2)
        self.assertIn("backfill original PRD", result["errors"][0])

    def test_cli_summary_exit_codes_and_single_json(self):
        command = self.cli("summarize", str(self.task))
        for state, waived, expected in (("passed", False, 0), ("partial", False, 1), ("failed", True, 3), ("made-up", False, 2)):
            with self.subTest(state=state):
                self.data["checks"] = [self.check(observed=state)]
                if waived:
                    self.data["checks"][0]["waiver"] = {"reason": "Fixture only", "authority": "fixture:1"}
                self.write()
                result = subprocess.run(command, cwd=self.root, capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, expected)
                report = json.loads(result.stdout)
                self.assertEqual(report["valid"], expected != 2)
                if expected != 2:
                    self.assertEqual(report["status"], "waived" if waived else state)

    def test_cli_validate_reports_consistency_without_writing(self):
        before = (self.task / "acceptance.json").read_bytes()
        code, result, _ = self.invoke("validate", str(self.task))
        self.assertEqual(code, 0)
        self.assertTrue(result["valid"])
        self.assertEqual(result["checks"], 1)
        self.assertEqual(result["counts"]["passed"], 1)
        self.assertEqual((self.task / "acceptance.json").read_bytes(), before)

        self.data["criteria"]["AC2"] = "Second requirement"
        self.write()
        code, result, _ = self.invoke("validate", str(self.task))
        self.assertEqual(code, 2)
        self.assertFalse(result["valid"])
        self.assertIn("must exactly match PRD identifiers", " ".join(result["errors"]))

    def test_cli_validate_rejects_a_passed_check_without_evidence(self):
        self.data["checks"] = [self.check()]
        self.data["checks"][0]["evidence"] = []
        self.write()

        code, result, diagnostic = self.invoke("validate", str(self.task))
        self.assertEqual(code, 2)
        self.assertFalse(result["valid"])
        self.assertIn("passed needs evidence", " ".join(result["errors"]))
        self.assertIn("passed needs evidence", diagnostic)

    def test_cli_run_captures_actual_exit_2_and_both_streams(self):
        self.data["checks"] = [self.check(method="command", observed="unrun")]
        self.write()
        argv = [sys.executable, "-c", "import sys; print('stdout fact'); print('stderr fact', file=sys.stderr); sys.exit(2)"]
        command = self.cli("run", str(self.task), "check", "--", *argv)
        result = subprocess.run(command, cwd=self.root, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 2)
        saved = json.loads((self.task / "acceptance.json").read_text())["checks"][0]
        self.assertEqual((saved["observed"], saved["execution"]["exitCode"]), ("failed", 2))
        self.assertEqual(saved["execution"]["argv"], argv)
        log = (self.root / saved["execution"]["log"]).read_text()
        self.assertIn("stdout fact", log)
        self.assertIn("stderr fact", log)
        self.assertEqual(json.loads(result.stdout)["check"], saved)
        self.assertEqual(self.invoke("summarize", str(self.task))[0], 1)

    def test_rerun_invalidates_pass_and_waiver_before_launch(self):
        for waived in (False, True):
            with self.subTest(waived=waived):
                self.data["checks"] = [self.check(method="command", observed="failed" if waived else "passed")]
                if waived:
                    self.data["checks"][0]["waiver"] = {"reason": "Fixture only", "authority": "fixture:1"}
                self.write()
                # The child observes the on-disk staging state, not just an in-memory object.
                code = "import json,pathlib; c=json.loads(pathlib.Path('.trellis/tasks/example/acceptance.json').read_text())['checks'][0]; assert c['observed']=='unrun' and c['waiver'] is None and c['execution']['exitCode'] is None"
                result, output, _ = self.invoke("run", str(self.task), "check", "--", sys.executable, "-c", code)
                self.assertEqual(result, 0)
                self.assertEqual(output["check"]["observed"], "passed")
                self.assertIsNone(output["check"]["waiver"])
                self.assertEqual(self.invoke("summarize", str(self.task))[0], 0)

    def test_launch_failure_blocks_and_loses_old_pass(self):
        self.data["checks"] = [self.check(method="command")]
        self.write()
        code, result, _ = self.invoke("run", str(self.task), "check", "--", "./does-not-exist")
        self.assertEqual(code, 127)
        self.assertEqual(result["check"]["observed"], "blocked")
        self.assertIsNone(result["check"]["execution"]["exitCode"])
        self.assertIn("could not start", result["check"]["note"])
        self.assertEqual(self.invoke("summarize", str(self.task))[1]["status"], "blocked")

    def test_log_preparation_failure_still_invalidates_old_pass(self):
        self.data["checks"] = [self.check(method="command")]
        self.write()
        (self.root / ".tmp/acceptance").write_text("prevents directory creation")
        code, _, _ = self.invoke("run", str(self.task), "check", "--", sys.executable, "-c", "pass")
        self.assertEqual(code, 2)
        self.assertEqual(self.invoke("summarize", str(self.task))[1]["status"], "unrun")

    def test_explicit_argv_only_and_no_shell_interpretation(self):
        self.data["checks"] = [self.check(method="command")]
        self.data["checks"][0]["execution"]["argv"] = ["historical-command-must-not-run"]
        self.write()
        arg = "$(touch forbidden); `touch forbidden`; $HOME"
        code, result, _ = self.invoke("run", str(self.task), "check", "--", sys.executable, "-c", "import sys; print(sys.argv[1])", arg)
        self.assertEqual(code, 0)
        self.assertEqual((self.root / result["check"]["execution"]["log"]).read_text().strip(), arg)
        self.assertFalse((self.root / "forbidden").exists())

    def test_run_rejects_unknown_noncommand_and_absent_argv(self):
        before = (self.task / "acceptance.json").read_bytes()
        for args in (("missing", "--", "anything"), ("check", "--", "anything")):
            with self.subTest(args=args):
                self.assertEqual(self.invoke("run", str(self.task), *args)[0], 2)
                self.assertEqual((self.task / "acceptance.json").read_bytes(), before)
        self.data["checks"] = [self.check(method="command")]
        self.write()
        self.assertEqual(self.invoke("run", str(self.task), "check")[0], 2)

    @unittest.skipUnless(os.name == "posix", "POSIX process groups/signals")
    def test_child_signal_preserves_negative_returncode(self):
        self.data["checks"] = [self.check(method="command")]
        self.write()
        code, result, _ = self.invoke("run", str(self.task), "check", "--", sys.executable, "-c",
                                     "import os,signal; os.kill(os.getpid(), signal.SIGTERM)")
        self.assertEqual(code, 143)
        self.assertEqual(result["check"]["execution"]["exitCode"], -15)
        self.assertEqual(result["check"]["observed"], "failed")

    @unittest.skipUnless(os.name == "posix", "POSIX process groups/signals")
    def test_interruption_and_hard_kill_cannot_leave_old_pass(self):
        for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGKILL):
            with self.subTest(signal=sig):
                self.data["checks"] = [self.check(method="command")]
                self.write()
                ready = self.root / f"ready-{sig}.txt"
                code = "import os,pathlib,time; pathlib.Path(%r).write_text(str(os.getpid())); time.sleep(30)" % str(ready)
                command = self.cli("run", str(self.task), "check", "--", sys.executable, "-c", code)
                proc = subprocess.Popen(command, cwd=self.root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                child_pid = None
                try:
                    deadline = time.monotonic() + 5
                    while not ready.exists() and time.monotonic() < deadline and proc.poll() is None:
                        time.sleep(0.02)
                    self.assertTrue(ready.exists(), "child did not start")
                    child_pid = int(ready.read_text())
                    staging = json.loads((self.task / "acceptance.json").read_text())["checks"][0]
                    self.assertEqual(staging["observed"], "unrun")
                    self.assertIsNone(staging["execution"]["exitCode"])
                    proc.send_signal(sig)
                    stdout, stderr = proc.communicate(timeout=8)
                    if sig == signal.SIGKILL:
                        self.assertEqual(proc.returncode, -9)
                    else:
                        self.assertEqual(proc.returncode, 128 + sig, stderr)
                        self.assertEqual(json.loads(stdout)["check"]["observed"], "partial")
                        with self.assertRaises(ProcessLookupError):
                            os.kill(child_pid, 0)
                    _, result, _ = self.invoke("summarize", str(self.task))
                    self.assertEqual(result["status"], "unrun" if sig == signal.SIGKILL else "partial")
                finally:
                    if proc.poll() is None:
                        proc.kill()
                        proc.communicate(timeout=5)
                    if child_pid:
                        try:
                            os.killpg(child_pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass

    @unittest.skipUnless(os.name == "posix", "POSIX process groups/signals")
    def test_interrupt_remains_partial_when_child_exits_zero(self):
        self.data["checks"] = [self.check(method="command")]
        self.write()
        ready = self.root / "ready-zero.txt"
        code = ("import os,pathlib,signal,sys,time; "
                "signal.signal(signal.SIGTERM, lambda *_: sys.exit(0)); "
                "pathlib.Path(%r).write_text(str(os.getpid())); time.sleep(30)") % str(ready)
        proc = subprocess.Popen(self.cli("run", str(self.task), "check", "--", sys.executable, "-c", code),
                                cwd=self.root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        child_pid = None
        try:
            deadline = time.monotonic() + 5
            while not ready.exists() and time.monotonic() < deadline and proc.poll() is None:
                time.sleep(0.02)
            self.assertTrue(ready.exists())
            child_pid = int(ready.read_text())
            proc.terminate()
            stdout, stderr = proc.communicate(timeout=8)
            self.assertEqual(proc.returncode, 143, stderr)
            check = json.loads(stdout)["check"]
            self.assertEqual(check["execution"]["exitCode"], 0)
            self.assertEqual(check["observed"], "partial")
            self.assertEqual(self.invoke("summarize", str(self.task))[0], 1)
        finally:
            if proc.poll() is None:
                proc.kill()
                proc.communicate(timeout=5)
            if child_pid:
                try:
                    os.killpg(child_pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass

    @unittest.skipUnless(os.name == "posix", "POSIX process groups/signals")
    def test_interrupt_stops_grandchild_after_child_exits_zero(self):
        worker_code = r"""import pathlib, signal, sys, time
signal.signal(signal.SIGINT, signal.SIG_IGN)
signal.signal(signal.SIGTERM, signal.SIG_IGN)
heartbeat = pathlib.Path(sys.argv[1])
with heartbeat.open('a') as stream:
    while True:
        stream.write('beat\n')
        stream.flush()
        time.sleep(0.02)
"""
        parent_code = """import json, os, pathlib, signal, subprocess, sys, time
signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
worker = subprocess.Popen([sys.executable, '-c', sys.argv[1], sys.argv[2]])
while not pathlib.Path(sys.argv[2]).exists():
    time.sleep(0.01)
pathlib.Path(sys.argv[3]).write_text(json.dumps([os.getpid(), worker.pid]))
time.sleep(30)
"""
        for sig in (signal.SIGINT, signal.SIGTERM):
            with self.subTest(signal=sig):
                self.data["checks"] = [self.check(method="command")]
                self.write()
                ready = self.root / f"group-ready-{sig}.json"
                heartbeat = self.root / f"heartbeat-{sig}.txt"
                proc = subprocess.Popen(
                    self.cli("run", str(self.task), "check", "--", sys.executable, "-c",
                             parent_code, worker_code, str(heartbeat), str(ready)),
                    cwd=self.root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                )
                child_pid = None
                try:
                    deadline = time.monotonic() + 5
                    while not ready.exists() and time.monotonic() < deadline and proc.poll() is None:
                        time.sleep(0.02)
                    self.assertTrue(ready.exists(), "parent and grandchild did not start")
                    child_pid, worker_pid = json.loads(ready.read_text())
                    self.assertEqual(os.getpgid(worker_pid), child_pid)
                    proc.send_signal(sig)
                    stdout, stderr = proc.communicate(timeout=8)
                    self.assertEqual(proc.returncode, 128 + sig, stderr)
                    check = json.loads(stdout)["check"]
                    self.assertEqual(check["execution"]["exitCode"], 0)
                    self.assertEqual(check["observed"], "partial")
                    self.assertEqual(check, json.loads((self.task / "acceptance.json").read_text())["checks"][0])
                    self.assertEqual(self.invoke("summarize", str(self.task))[0], 1)
                    first = heartbeat.stat().st_size
                    time.sleep(0.2)
                    self.assertEqual(heartbeat.stat().st_size, first, "grandchild still working after runner exit")
                    status = subprocess.run(["ps", "-p", str(worker_pid), "-o", "stat="],
                                            capture_output=True, text=True, check=False).stdout.strip()
                    # Orphan zombies can only be reaped by their new parent, not the runner.
                    self.assertTrue(not status or status.startswith("Z"), status)
                    with self.assertRaises(ProcessLookupError):
                        os.kill(child_pid, 0)
                finally:
                    if proc.poll() is None:
                        proc.kill()
                        proc.communicate(timeout=5)
                    if child_pid:
                        try:
                            os.killpg(child_pid, signal.SIGKILL)
                        except ProcessLookupError:
                            pass

    def snapshot(self):
        return {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob("*") if path.is_file()}

    def test_archive_rejection_never_delegates_or_changes_task_or_pointer(self):
        for state in ("failed", "partial", "blocked", "unrun", "invalid", "missing", "bad-json"):
            with self.subTest(state=state):
                self.data["checks"] = [self.check(observed=state)]
                self.write()
                record = self.task / "acceptance.json"
                if state == "missing":
                    record.unlink()
                elif state == "bad-json":
                    record.write_text("{broken")
                before = self.snapshot()
                with patch.object(acceptance.subprocess, "run") as delegate:
                    code, report, _ = self.invoke("archive", str(self.task))
                    delegate.assert_not_called()
                self.assertEqual(code, 1 if state in acceptance.OBSERVED else 2)
                self.assertFalse(report["archiveDelegated"])
                self.assertEqual(before, self.snapshot())
                self.assertTrue(self.task.is_dir())

    def test_archive_passed_and_waived_delegate_once_and_return_zero(self):
        for waived in (False, True):
            with self.subTest(waived=waived):
                self.data["checks"] = [self.check(observed="blocked" if waived else "passed")]
                if waived:
                    self.data["checks"][0]["waiver"] = {"reason": "Fixture", "authority": "fixture decision:1"}
                self.write()
                with patch.object(acceptance.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "archived\n", "")) as delegate:
                    code, report, _ = self.invoke("archive", str(self.task))
                self.assertEqual(code, 0)
                self.assertEqual(report["acceptanceStatus"], "waived" if waived else "passed")
                self.assertEqual(report["archiveExitCode"], 0)
                self.assertEqual(report["archiveStdout"], "archived\n")
                delegate.assert_called_once()
                self.assertEqual(delegate.call_args.args[0], [sys.executable, str(self.root / ".trellis/scripts/task.py"), "archive", str(self.task)])
                self.assertFalse(delegate.call_args.kwargs["shell"])

    def test_archive_failure_retains_original_code_and_output_without_retry(self):
        for native_code in (1, 2, -15):
            with self.subTest(native_code=native_code):
                with patch.object(acceptance.subprocess, "run", return_value=subprocess.CompletedProcess([], native_code, "already moved\n", "commit failed\n")) as delegate:
                    code, report, _ = self.invoke("archive", str(self.task))
                self.assertEqual(code, 4)
                self.assertEqual(report["archiveExitCode"], native_code)
                self.assertEqual(report["archiveStdout"], "already moved\n")
                self.assertEqual(report["archiveStderr"], "commit failed\n")
                delegate.assert_called_once()
        with patch.object(acceptance.subprocess, "run", side_effect=OSError("cannot start")) as delegate:
            code, report, _ = self.invoke("archive", str(self.task))
        self.assertEqual(code, 4)
        self.assertIsNone(report["archiveExitCode"])
        self.assertEqual(report["archiveStderr"], "cannot start")
        delegate.assert_called_once()

    def test_archive_rechecks_current_files(self):
        self.assertEqual(self.invoke("summarize", str(self.task))[0], 0)
        self.data["checks"][0]["observed"] = "partial"
        self.write()
        with patch.object(acceptance.subprocess, "run") as delegate:
            self.assertEqual(self.invoke("archive", str(self.task))[0], 1)
            delegate.assert_not_called()


if __name__ == "__main__":
    unittest.main()
