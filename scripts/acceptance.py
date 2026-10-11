#!/usr/bin/env python3
"""Project acceptance records. Protocol: .trellis/spec/frontend/quality-guidelines.md."""

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
OBSERVED = ("passed", "failed", "partial", "blocked", "unrun")
STATUSES = (*OBSERVED, "waived")
CHECK_FIELDS = {
    "id", "ac", "claim", "scope", "method", "dimension", "observed",
    "execution", "evidence", "note", "waiver",
}
EXECUTION_FIELDS = {"argv", "cwd", "exitCode", "startedAt", "endedAt", "log"}


class Invalid(ValueError):
    """An invalid acceptance record; never an acceptance failure or pass."""


def require(condition, message):
    if not condition:
        raise Invalid(message)


def text(value, location, nonempty=True):
    require(isinstance(value, str), f"{location}: expected string")
    require(not nonempty or bool(value.strip()), f"{location}: must not be empty")
    return value


def fields(value, expected, location):
    require(isinstance(value, dict), f"{location}: expected object")
    missing, extra = expected - value.keys(), value.keys() - expected
    require(not missing and not extra,
            f"{location}: missing fields {sorted(missing)}, unknown fields {sorted(extra)}")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"JSON: duplicate key {key!r}")
        result[key] = value
    return result


def repo_path(root, value, location):
    text(value, location)
    path = Path(value)
    require(not path.is_absolute(), f"{location}: expected repository-relative path")
    resolved = (root / path).resolve()
    require(resolved == root or root in resolved.parents, f"{location}: path escapes repository")
    return resolved


def readable(root, value, location, log=False):
    path = repo_path(root, value, location)
    if log:
        require(Path(value).parts[:1] == (".tmp",) and root / ".tmp" in path.parents,
                f"{location}: logs must be under .tmp/")
    require(path.is_file(), f"{location}: not a readable file: {value}")
    try:
        with path.open("rb") as stream:
            stream.read(1)
    except OSError as exc:
        raise Invalid(f"{location}: cannot read {value}: {exc}") from exc


def parse_criteria(prd):
    """Parse the deliberately narrow PRD AC section, ignoring fenced code."""
    criteria = {}
    section_count = 0
    active = False
    current = None
    fence = None
    for number, line in enumerate(prd.splitlines(), 1):
        fence_match = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if fence:
            if fence_match and fence_match[1][0] == fence[0] and len(fence_match[1]) >= len(fence) and not fence_match[2].strip():
                fence = None
            continue
        if fence_match:
            fence = fence_match[1]
            continue
        heading = re.match(r"^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$", line)
        if heading and len(heading[1]) <= 2:
            active = len(heading[1]) == 2 and heading[2] in ("接受标准", "Acceptance Criteria")
            current = None
            if active:
                section_count += 1
                require(section_count == 1, "prd.md: duplicate acceptance criteria section")
            continue
        if not active:
            continue
        item = re.match(r"^- \[(AC[1-9][0-9]*)\]\s+(.+)$", line)
        if item:
            current, claim = item.groups()
            require(current not in criteria, f"prd.md:{number}: duplicate {current}")
            criteria[current] = text(claim, f"prd.md:{number}").strip()
        elif line.startswith(("  ", "\t")) and current:
            if line.strip():
                criteria[current] += "\n" + line.strip()
        elif re.match(r"^\s*(?:[-+*]|[0-9]+[.)])(?:\s|$)", line):
            raise Invalid(f"prd.md:{number}: top-level criterion must use '- [AC1] text'")
        elif line.strip():
            current = None
    require(section_count == 1 and bool(criteria),
            "prd.md: add a nonempty '## 接受标准' or '## Acceptance Criteria' section with '- [AC1] text'")
    return criteria


def timestamp(value, location):
    text(value, location)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise Invalid(f"{location}: expected ISO timestamp with timezone") from exc
    require(parsed.tzinfo is not None, f"{location}: timezone required")
    return parsed


def validate(data, criteria, root):
    fields(data, {"schemaVersion", "criteria", "checks"}, "acceptance.json")
    require(type(data["schemaVersion"]) is int and data["schemaVersion"] == 1,
            "schemaVersion: expected integer 1")
    require(isinstance(data["criteria"], dict), "criteria: expected object")
    require(data["criteria"].keys() == criteria.keys(),
            f"criteria: must exactly match PRD identifiers {list(criteria)}")
    for key, expected in criteria.items():
        actual = text(data["criteria"][key], f"criteria.{key}")
        require(" ".join(actual.split()) == " ".join(expected.split()),
                f"criteria.{key}: text differs from prd.md")
    checks = data["checks"]
    require(isinstance(checks, list) and bool(checks), "checks: expected nonempty array")
    seen, covered = set(), set()
    for index, check in enumerate(checks):
        loc = f"checks[{index}]"
        fields(check, CHECK_FIELDS, loc)
        check_id = text(check["id"], f"{loc}.id")
        loc += f" ({check_id})"
        require(check_id not in seen, f"{loc}: duplicate check id")
        seen.add(check_id)
        ac = check["ac"]
        require(isinstance(ac, list) and bool(ac), f"{loc}.ac: expected nonempty array")
        for key in ac:
            text(key, f"{loc}.ac")
            require(key in criteria, f"{loc}.ac: unknown AC {key}")
        require(len(ac) == len(set(ac)), f"{loc}.ac: duplicate AC reference")
        covered.update(ac)
        for key in ("claim", "scope", "method", "dimension", "observed"):
            text(check[key], f"{loc}.{key}")
        require(check["method"] in ("command", "runtime", "inspection"), f"{loc}.method: invalid method")
        require(check["dimension"] in ("structure", "content", "behavior"), f"{loc}.dimension: invalid dimension")
        observed = check["observed"]
        require(observed in OBSERVED, f"{loc}.observed: invalid observation (waived is derived)")
        text(check["note"], f"{loc}.note", nonempty=observed != "passed" or check["method"] != "command")
        evidence = check["evidence"]
        require(isinstance(evidence, list), f"{loc}.evidence: expected array")
        require(observed != "passed" or bool(evidence), f"{loc}.evidence: passed needs evidence")
        for path in evidence:
            readable(root, path, f"{loc}.evidence")
        execution = check["execution"]
        if execution is not None:
            fields(execution, EXECUTION_FIELDS, f"{loc}.execution")
            argv = execution["argv"]
            require(isinstance(argv, list) and bool(argv), f"{loc}.execution.argv: expected nonempty array")
            for i, arg in enumerate(argv):
                text(arg, f"{loc}.execution.argv[{i}]", nonempty=i == 0)
            cwd = repo_path(root, execution["cwd"], f"{loc}.execution.cwd")
            require(cwd.is_dir(), f"{loc}.execution.cwd: directory missing")
            code = execution["exitCode"]
            require(code is None or type(code) is int, f"{loc}.execution.exitCode: expected integer or null")
            require(observed != "passed" or type(code) is int and code == 0,
                    f"{loc}: passed requires integer exitCode 0")
            require(observed != "unrun" or code is None, f"{loc}: unrun cannot have an exitCode")
            start = timestamp(execution["startedAt"], f"{loc}.execution.startedAt")
            end = execution["endedAt"]
            if end is not None:
                require(timestamp(end, f"{loc}.execution.endedAt") >= start,
                        f"{loc}.execution: endedAt precedes startedAt")
            require(code is None or end is not None, f"{loc}.execution: exitCode requires endedAt")
            readable(root, execution["log"], f"{loc}.execution.log", log=True)
        if check["method"] == "command" and observed == "passed":
            require(execution is not None, f"{loc}: command passed needs execution")
            require(execution["log"] in evidence, f"{loc}: command passed must link execution.log in evidence")
        waiver = check["waiver"]
        if waiver is not None:
            fields(waiver, {"reason", "authority"}, f"{loc}.waiver")
            text(waiver["reason"], f"{loc}.waiver.reason")
            text(waiver["authority"], f"{loc}.waiver.authority")
            require(observed != "passed", f"{loc}: passed cannot be waived")
    require(covered == criteria.keys(), f"checks: uncovered ACs {sorted(criteria.keys() - covered)}")


def load(root, task_arg):
    task = Path(task_arg)
    if not task.is_absolute():
        task = root / task
    task = task.resolve()
    require(task != root and root in task.parents, "task: expected explicit task directory inside repository")
    try:
        criteria = parse_criteria((task / "prd.md").read_text(encoding="utf-8"))
        data = json.loads((task / "acceptance.json").read_text(encoding="utf-8"),
                          object_pairs_hook=unique_object)
    except FileNotFoundError as exc:
        raise Invalid(f"{exc.filename}: missing; backfill original PRD ACs and actual acceptance.json results; historical checkmarks do not imply passed") from exc
    validate(data, criteria, root)
    return task, data


def aggregate(states):
    for state in ("failed", "blocked", "partial"):
        if state in states:
            return state
    if "unrun" in states:
        return "unrun" if all(state == "unrun" for state in states) else "partial"
    return "waived" if "waived" in states else "passed"


def totals(checks):
    observed = [check["observed"] for check in checks]
    statuses = [check["status"] for check in checks]
    counts, observed_counts = Counter(statuses), Counter(observed)
    return {
        "observedStatus": aggregate(observed), "status": aggregate(statuses),
        "counts": {state: counts[state] for state in STATUSES},
        "observedCounts": {state: observed_counts[state] for state in STATUSES},
    }


def summarize(data):
    checks = [dict(check, status="waived" if check["waiver"] else check["observed"]) for check in data["checks"]]
    return {
        "valid": True, **totals(checks),
        "criteria": {
            key: {"text": claim, **totals([check for check in checks if key in check["ac"]]),
                  "checks": [check["id"] for check in checks if key in check["ac"]]}
            for key, claim in data["criteria"].items()
        },
        "checks": checks,
        "waivedChecks": [check for check in checks if check["status"] == "waived"],
    }


def summary_exit(result):
    return {"passed": 0, "waived": 3}.get(result["status"], 1)


def save(task, data):
    """Replace the one record atomically; the main session is its sole writer."""
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=task,
                                         prefix=".acceptance-", suffix=".json", delete=False) as stream:
            temp_path = Path(stream.name)
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_path, task / "acceptance.json")
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


def now():
    return datetime.now(timezone.utc).isoformat()


class Interrupted(Exception):
    def __init__(self, signum):
        self.signum = signum


def interrupt(signum, _frame):
    raise Interrupted(signum)


def run_check(root, task, data, check_id, argv):
    check = next((item for item in data["checks"] if item["id"] == check_id), None)
    require(check is not None, f"run: unknown check id {check_id}")
    require(check["method"] == "command", f"run: {check_id} is not a command check")
    require(bool(argv) and bool(argv[0]), "run: supply explicit argv after --")
    check.update(observed="unrun", execution=None, evidence=[], waiver=None,
                 note="New run requested; no completed result yet.")
    save(task, data)  # Invalidate the old pass before even preparing the log/process.
    log_dir = root / ".tmp" / "acceptance" / task.name
    log_dir.mkdir(parents=True, exist_ok=True)
    handlers = {sig: signal.getsignal(sig) for sig in (signal.SIGINT, signal.SIGTERM)}
    child = None
    try:
        for sig in handlers:
            signal.signal(sig, interrupt)
        with tempfile.NamedTemporaryFile(mode="wb", dir=log_dir, suffix=".log", delete=False) as log:
            log_path = Path(log.name).relative_to(root).as_posix()
            execution = dict(argv=argv, cwd=".", exitCode=None, startedAt=now(), endedAt=None, log=log_path)
            check.update(execution=execution, evidence=[log_path])
            save(task, data)
            try:
                child = subprocess.Popen(argv, cwd=root, stdout=log, stderr=subprocess.STDOUT,
                                         shell=False, start_new_session=True)
                code = child.wait()
                execution["exitCode"] = code
                check.update(observed="passed" if code == 0 else "failed",
                             note=f"Command completed with exitCode {code}; covers only this check's claim and scope.")
                exit_code = code if code >= 0 else 128 - code
            except OSError as exc:
                check.update(observed="blocked", note=f"Command could not start: {exc}")
                log.write((check["note"] + "\n").encode("utf-8"))
                exit_code = 127
            except (Interrupted, KeyboardInterrupt) as exc:
                signum = exc.signum if isinstance(exc, Interrupted) else signal.SIGINT
                # Ignore further interrupts while stopping the group and reaping our child.
                for sig in handlers:
                    signal.signal(sig, signal.SIG_IGN)
                if child is not None:
                    try:
                        os.killpg(child.pid, signum)
                    except ProcessLookupError:
                        pass
                    try:
                        child.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        pass
                    # A reaped child can still have live descendants in its process group.
                    try:
                        os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    child.wait()
                    execution["exitCode"] = child.returncode
                check.update(observed="partial", note=f"Run interrupted by signal {signum}; verification incomplete.")
                exit_code = 128 + signum
            execution["endedAt"] = now()
        save(task, data)
        return {"valid": True, "check": check}, exit_code
    finally:
        for sig, handler in handlers.items():
            signal.signal(sig, handler)


def archive(root, task, result):
    """Reject before delegation; the native CLI retains all move/commit behavior."""
    status = result["status"]
    output = dict(result, acceptanceStatus=status, archiveDelegated=False)
    if status not in ("passed", "waived"):
        return output, 1
    output["archiveDelegated"] = True
    try:
        completed = subprocess.run(
            [sys.executable, str(root / ".trellis/scripts/task.py"), "archive", str(task)],
            cwd=root, shell=False, capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
    except OSError as exc:
        output.update(archiveExitCode=None, archiveStdout="", archiveStderr=str(exc))
        return output, 4
    output.update(archiveExitCode=completed.returncode,
                  archiveStdout=completed.stdout, archiveStderr=completed.stderr)
    return output, 0 if completed.returncode == 0 else 4


def main(argv=None, root=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("summarize", "archive", "run"):
        command = commands.add_parser(name)
        command.add_argument("task", help="explicit repository-relative or absolute task directory")
        if name == "run":
            command.add_argument("check_id")
            command.add_argument("argv", nargs=argparse.REMAINDER, help="-- argv to execute (shell=False)")
    args = parser.parse_args(argv)
    root = (root or ROOT).resolve()
    try:
        task, data = load(root, args.task)
        if args.command == "run":
            command_argv = args.argv[1:] if args.argv[:1] == ["--"] else args.argv
            result, exit_code = run_check(root, task, data, args.check_id, command_argv)
        else:
            result = summarize(data)
            if args.command == "archive":
                result, exit_code = archive(root, task, result)
            else:
                exit_code = summary_exit(result)
    except (Invalid, OSError, ValueError) as exc:
        result, exit_code = {"valid": False, "errors": [str(exc)]}, 2
        if args.command == "archive":
            result["archiveDelegated"] = False
        print(str(exc), file=sys.stderr)
    except (Interrupted, KeyboardInterrupt) as exc:
        signum = exc.signum if isinstance(exc, Interrupted) else signal.SIGINT
        result, exit_code = {"valid": False, "errors": ["Interrupted; no completed acceptance result. Inspect the saved record before retrying."]}, 128 + signum
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
