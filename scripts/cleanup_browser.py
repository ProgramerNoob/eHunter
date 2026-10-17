#!/usr/bin/env python3
"""Read-only cleanup check for browser-acceptance resources.

Protocol: .trellis/spec/frontend/browser-acceptance.md and .pi/skills/eh-test/SKILL.md.
The command only reads caller declarations, live PIDs, listening ports and PID files.
It never closes pages, signals processes, or deletes PID files.

Declared server identity is the launch record: `expectedCwd`, the recorded `ps -ww -o args=`
line in `expectedCommand`, and `processStartToken` in the form `<pid>@<ps -o lstart=>`.
"""

from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_VERSION = 1
RFC3339 = re.compile(
    r"^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$")
OBSERVATION_WINDOW = 300
OWNERS = ("agent", "user", "unknown")
STATES = ("open", "closed", "unknown")
CLASSIFICATIONS = ("clean", "residual", "preserved", "unknown")
PAGE_FIELDS = {
    "label", "spaceId", "pageId", "owner", "createdByTask", "state",
    "observedAt", "evidence", "note",
}
SERVER_FIELDS = {
    "label", "pid", "pidFile", "port", "expectedCwd", "expectedCommand",
    "processStartToken", "owner", "createdByTask", "evidence", "note",
}
ACTIONS = {
    "residual": "Human review: stop only the page or process proven to belong to this task, then re-run the check.",
    "unknown": "Human review: prove ownership and launch identity before touching any page, process, port, or PID file.",
}


class InputError(ValueError):
    """Malformed declarations or an unusable output path; never a resource result."""


class ProbeError(RuntimeError):
    """A read-only observation could not be completed; the item stays unknown."""


def require(condition, message):
    if not condition:
        raise InputError(message)


def nonempty_text(value):
    return isinstance(value, str) and bool(value.strip())


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"JSON: duplicate key {key!r}")
        result[key] = value
    return result


def load_json(root, value, location):
    require(nonempty_text(value), f"{location}: expected a path")
    path = Path(value)
    path = (path if path.is_absolute() else root / path).resolve()
    try:
        raw = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise InputError(f"{location}: not a readable file: {value}") from exc
    except (OSError, UnicodeDecodeError) as exc:
        raise InputError(f"{location}: cannot read {value}: {exc}") from exc
    try:
        return json.loads(raw, object_pairs_hook=unique_object)
    except json.JSONDecodeError as exc:
        raise InputError(f"{location}: cannot parse JSON: {exc}") from exc


def same_identity(value, task_space):
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        return False
    if not str(value).strip():
        return False
    return str(value).strip() == str(task_space).strip()


def load_declaration(root, value, kind, task_space):
    data = load_json(root, value, kind)
    require(isinstance(data, dict), f"{kind}: expected a JSON object")
    expected = {"schemaVersion", "taskSpace", kind}
    extra = data.keys() - expected
    require(not extra, f"{kind}: unknown fields {sorted(extra)}")
    require(expected <= data.keys(), f"{kind}: missing fields {sorted(expected - data.keys())}")
    require(type(data["schemaVersion"]) is int and data["schemaVersion"] == SCHEMA_VERSION,
            f"{kind}: schemaVersion must be integer {SCHEMA_VERSION}")
    require(nonempty_text(data["taskSpace"]) if isinstance(data["taskSpace"], str)
            else not isinstance(data["taskSpace"], bool) and isinstance(data["taskSpace"], int),
            f"{kind}: taskSpace must be a nonempty identifier")
    require(same_identity(data["taskSpace"], task_space),
            f"{kind}: taskSpace {data['taskSpace']!r} does not match the command task space {task_space!r}")
    items = data[kind]
    require(isinstance(items, list), f"{kind}: expected an array of {kind}")
    return items


def unique_labels(items, kind):
    seen = set()
    for index, item in enumerate(items):
        require(isinstance(item, dict), f"{kind}[{index}]: expected an object")
        label = item.get("label")
        require(nonempty_text(label), f"{kind}[{index}].label: expected a nonempty string")
        require(label not in seen, f"{kind}[{index}].label: duplicate {label!r}")
        seen.add(label)


def evidence_list(value, location):
    """Evidence problems stay item-level so a bad/absent reference is never clean."""
    if value is None or value == "" or value == []:
        return [], "evidence-missing: agent-owned resources need ownership evidence"
    if isinstance(value, str) and nonempty_text(value):
        return [value], None
    if isinstance(value, list) and all(nonempty_text(entry) for entry in value):
        return list(value), None
    return [], f"evidence-invalid: {location} must be a string or an array of nonempty strings"


def evidence_files_problem(root, evidence):
    """A declared reference proves nothing unless the recorded file is readable."""
    for value in evidence:
        path = Path(value)
        resolved = path if path.is_absolute() else root / path
        try:
            unreadable = not resolved.is_file() or not os.access(resolved, os.R_OK)
        except OSError:
            unreadable = True
        if unreadable:
            return f"evidence-unreadable: {value!r} is not a readable file"
    return None


def rfc3339(moment):
    return moment.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_observation(value):
    if not nonempty_text(value):
        raise ValueError("observedAt is missing")
    text = value.strip()
    if text.endswith(("Z", "z")):
        normalized = text[:-1] + "+00:00"
    else:
        normalized = text
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(f"observedAt is not an RFC3339 timestamp: {value!r}") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"observedAt requires an explicit timezone: {value!r}")
    if not RFC3339.fullmatch(text):
        raise ValueError(f"observedAt is not an RFC3339 timestamp: {value!r}")
    return parsed.astimezone(timezone.utc)


def display_path(root, path):
    try:
        return Path(path).resolve().relative_to(root).as_posix()
    except (OSError, ValueError):
        return str(path)


def resolved_cwd(root, value):
    path = Path(value)
    return os.path.realpath(path if path.is_absolute() else root / path)


def normalized_command(value):
    if isinstance(value, list):
        return " ".join(" ".join(value).split())
    return " ".join(value.split())


def diagnostic(resource, label, code, message):
    return {"resource": resource, "label": label, "code": code, "message": message}


def item_label(item, location):
    label = item.get("label")
    require(nonempty_text(label), f"{location}.label: expected a nonempty string")
    return label


def page_entry(index, item, task_space, root, checked_at):
    location = f"pages[{index}]"
    require(isinstance(item, dict), f"{location}: expected an object")
    label = item_label(item, location)
    evidence, evidence_problem = evidence_list(item.get("evidence"), f"{location}.evidence")
    entry = {
        "label": label,
        "spaceId": item.get("spaceId"),
        "pageId": item.get("pageId"),
        "owner": item.get("owner"),
        "createdByTask": item.get("createdByTask"),
        "state": item.get("state"),
        "observedAt": item.get("observedAt"),
        "ageSeconds": None,
        "classification": "unknown",
        "reasons": [],
        "evidence": evidence,
    }
    owner = entry["owner"]
    if owner == "user":
        entry["classification"] = "preserved"
        entry["reasons"] = [
            "owner-user: user-owned pages are preserved; pageId, spaceId, state, observedAt and evidence are not validated, and the page is never closed"]
        return entry
    if owner is None:
        entry["reasons"] = ["owner-missing: declare owner as agent, user or unknown"]
        return entry
    if owner not in OWNERS:
        entry["reasons"] = [f"owner-invalid: {owner!r} is not one of {list(OWNERS)}"]
        return entry
    if owner == "unknown":
        entry["reasons"] = ["owner-unknown: ownership is not proven, so the page is neither clean nor residual"]
        return entry
    extra = item.keys() - PAGE_FIELDS
    require(not extra, f"{location}: unknown fields {sorted(extra)}")

    created = entry["createdByTask"]
    if isinstance(created, bool) or not isinstance(created, (str, int)) or not str(created).strip():
        entry["reasons"] = ["createdByTask-missing: agent-owned pages need the creating task identifier"]
        return entry
    if not same_identity(created, task_space):
        entry["reasons"] = [f"createdByTask-mismatch: {created!r} does not match the task space {task_space!r}"]
        return entry
    if not positive_int(entry["spaceId"]):
        entry["reasons"] = [
            "spaceId-invalid: declare the Ego task space as a positive integer; it is not the task identifier"]
        return entry
    page_id = entry["pageId"]
    if isinstance(page_id, bool) or not isinstance(page_id, (str, int)) or (
            isinstance(page_id, str) and not page_id.strip()):
        entry["reasons"] = ["pageId-invalid: declare the page identifier as a nonempty string or integer"]
        return entry
    evidence_problem = evidence_problem or evidence_files_problem(root, evidence)
    if evidence_problem:
        entry["reasons"] = [evidence_problem]
        return entry

    state = entry["state"]
    if state is None:
        entry["reasons"] = ["observation-missing: declare state and observedAt"]
        return entry
    if state not in STATES:
        entry["reasons"] = [f"observation-invalid: state {state!r} is not one of {list(STATES)}"]
        return entry
    try:
        observed = parse_observation(entry["observedAt"])
    except ValueError as exc:
        entry["reasons"] = [f"observation-invalid: {exc}"]
        return entry

    age = (checked_at - observed).total_seconds()
    rounded_age = round(age, 3)
    entry["ageSeconds"] = rounded_age
    if age < 0:
        entry["reasons"] = [f"observation-future: observedAt is {-rounded_age:.3f}s ahead of checkedAt"]
        return entry
    if rounded_age > OBSERVATION_WINDOW:
        entry["reasons"] = [
            f"observation-expired: observedAt is {rounded_age:.3f}s older than the {OBSERVATION_WINDOW}s window"]
        return entry
    if state == "unknown":
        entry["reasons"] = ["observation-unknown: the caller did not observe open or closed"]
        return entry
    if state == "closed":
        entry["classification"] = "clean"
        entry["reasons"] = [
            f"page-closed: valid observation {rounded_age:.3f}s old and identity matches the creating task"]
        return entry
    entry["classification"] = "residual"
    entry["reasons"] = [
        f"page-still-open: valid observation {rounded_age:.3f}s old shows the agent-owned page is still open"]
    return entry


def positive_int(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def declaration_problems(item):
    problems = []
    if not positive_int(item.get("pid")):
        problems.append("pid-invalid: declare the launched process ID as a positive integer")
    port = item.get("port")
    if not (isinstance(port, int) and not isinstance(port, bool) and 0 < port < 65536):
        problems.append("port-invalid: declare the expected TCP port as an integer in 1..65535")
    if not nonempty_text(item.get("pidFile")):
        problems.append("pidFile-missing: declare the PID file path")
    if not nonempty_text(item.get("expectedCwd")):
        problems.append("expectedCwd-missing: declare the recorded working directory")
    command = item.get("expectedCommand")
    if isinstance(command, list):
        if not command or not all(nonempty_text(token) for token in command):
            problems.append("expectedCommand-missing: declare the recorded command line")
    elif not nonempty_text(command):
        problems.append("expectedCommand-missing: declare the recorded command line")
    token = item.get("processStartToken")
    if not nonempty_text(token):
        problems.append("processStartToken-missing: declare the start token recorded at launch")
    elif positive_int(item.get("pid")) and not token.strip().startswith(f"{item['pid']}@"):
        problems.append(
            "processStartToken-mismatch: the token does not start with the declared pid")
    elif positive_int(item.get("pid")):
        suffix = token.strip()[len(str(item["pid"])) + 1:].strip()
        if not suffix:
            problems.append(
                "processStartToken-mismatch: the token must record the launch time after <pid>@")
    return problems


def probe_unknown(entry, diagnostics, label, code, exc):
    entry["reasons"] = [f"probe-failed: {exc}"]
    diagnostics.append(diagnostic("servers", label, code, str(exc)))
    return entry


def server_entry(index, item, task_space, root, probe, diagnostics):
    location = f"servers[{index}]"
    require(isinstance(item, dict), f"{location}: expected an object")
    label = item_label(item, location)
    evidence, evidence_problem = evidence_list(item.get("evidence"), f"{location}.evidence")
    entry = {
        "label": label,
        "owner": item.get("owner"),
        "createdByTask": item.get("createdByTask"),
        "pid": item.get("pid"),
        "port": item.get("port"),
        "pidFile": item.get("pidFile"),
        "expectedCwd": item.get("expectedCwd"),
        "expectedCommand": item.get("expectedCommand"),
        "processStartToken": item.get("processStartToken"),
        "classification": "unknown",
        "reasons": [],
        "evidence": evidence,
        "observed": None,
    }
    owner = entry["owner"]
    if owner == "user":
        entry["classification"] = "preserved"
        entry["reasons"] = [
            "owner-user: user-owned processes, ports and PID files are preserved and never probed"]
        return entry
    if owner is None:
        entry["reasons"] = ["owner-missing: declare owner as agent, user or unknown"]
        return entry
    if owner not in OWNERS:
        entry["reasons"] = [f"owner-invalid: {owner!r} is not one of {list(OWNERS)}"]
        return entry
    if owner == "unknown":
        entry["reasons"] = ["owner-unknown: ownership is not proven, so the process is never probed"]
        return entry
    extra = item.keys() - SERVER_FIELDS
    require(not extra, f"{location}: unknown fields {sorted(extra)}")

    created = entry["createdByTask"]
    if isinstance(created, bool) or not isinstance(created, (str, int)) or not str(created).strip():
        entry["reasons"] = ["createdByTask-missing: agent-owned servers need the creating task identifier"]
        return entry
    if not same_identity(created, task_space):
        entry["reasons"] = [f"createdByTask-mismatch: {created!r} does not match the task space {task_space!r}"]
        return entry
    evidence_problem = evidence_problem or evidence_files_problem(root, evidence)
    if evidence_problem:
        entry["reasons"] = [evidence_problem]
        return entry

    problems = declaration_problems(item)
    if problems:
        entry["reasons"] = problems
        return entry

    pid, port = item["pid"], item["port"]
    pid_path = Path(item["pidFile"])
    if not pid_path.is_absolute():
        pid_path = root / pid_path
    expected_cwd = resolved_cwd(root, item["expectedCwd"])
    expected_command = normalized_command(item["expectedCommand"])
    expected_token = " ".join(item["processStartToken"].split())
    observations = {
        "process": None,
        "port": {"listeners": []},
        "pidFile": {"path": display_path(root, pid_path), "present": None, "content": None},
    }
    entry["observed"] = observations

    try:
        process = probe.process(pid)
    except ProbeError as exc:
        return probe_unknown(entry, diagnostics, entry["label"], "process-probe-failed", exc)

    if process is not None:
        observations["process"] = {
            "alive": True,
            "startToken": process.get("startToken"),
            "cwd": process.get("cwd"),
            "command": process.get("command"),
        }
        mismatches = []
        actual_token = " ".join(str(process.get("startToken") or "").split())
        if actual_token != expected_token:
            mismatches.append(
                f"start-token-mismatch: live {process.get('startToken')!r} != recorded {item['processStartToken']!r}")
        actual_cwd = process.get("cwd")
        if not nonempty_text(actual_cwd):
            mismatches.append("cwd-unknown: the probe could not read the live working directory")
        elif os.path.realpath(actual_cwd) != expected_cwd:
            mismatches.append(f"cwd-mismatch: live {actual_cwd!r} != recorded {item['expectedCwd']!r}")
        actual_command = process.get("command")
        if not nonempty_text(actual_command):
            mismatches.append("command-unknown: the probe could not read the live command line")
        elif " ".join(actual_command.split()) != expected_command:
            mismatches.append("command-mismatch: live command differs from the recorded command line")
        if mismatches:
            entry["reasons"] = mismatches
            diagnostics.append(diagnostic(
                "servers", entry["label"], "pid-reuse",
                f"pid {pid} is alive but its launch identity differs; treat it as reused"))
            return entry
    else:
        observations["process"] = {"alive": False}

    try:
        listeners = probe.listeners(port)
        pid_file = probe.pid_file(pid_path)
    except ProbeError as exc:
        return probe_unknown(entry, diagnostics, entry["label"], "resource-probe-failed", exc)

    observations["port"]["listeners"] = list(listeners)
    observations["pidFile"].update(present=pid_file.get("present"), content=pid_file.get("content"))
    pid_file_path = observations["pidFile"]["path"]

    if process is None:
        if listeners:
            entry["reasons"] = [
                f"port-occupied: port {port} is held by pid(s) {list(listeners)} although pid {pid} exited"]
            return entry
        if pid_file.get("present"):
            entry["classification"] = "residual"
            entry["reasons"] = [
                f"pid-file-left: {pid_file_path} still exists after pid {pid} exited; the command never deletes it"]
            content = pid_file.get("content")
            if content is not None and content.strip() != str(pid):
                entry["classification"] = "unknown"
                entry["reasons"].append(
                    f"pid-file-mismatch: {pid_file_path} records {content!r}, not pid {pid}")
                diagnostics.append(diagnostic(
                    "servers", entry["label"], "pid-file-content-mismatch",
                    f"{pid_file_path} records {content!r}, not pid {pid}"))
            return entry
        entry["classification"] = "clean"
        entry["reasons"] = [
            f"exited-and-cleaned: pid {pid} exited, port {port} is free and {pid_file_path} is absent"]
        return entry

    entry["classification"] = "residual"
    entry["reasons"] = [f"process-still-running: pid {pid} is alive with the recorded start token, cwd and command"]
    if pid in listeners:
        entry["reasons"].append(f"port-still-listening: pid {pid} still listens on port {port}")
    elif listeners:
        entry["classification"] = "unknown"
        entry["reasons"].append(
            f"port-mismatch: port {port} is held by pid(s) {list(listeners)}, not pid {pid}")
    else:
        entry["reasons"].append(
            f"port-not-listening: port {port} has no listener although the recorded process is alive")
    if pid_file.get("present"):
        entry["reasons"].append(f"pid-file-left: {pid_file_path} still exists")
    return entry


def build_report(root, task_space, pages, servers, checked_at, probe):
    diagnostics = []
    page_entries = [page_entry(index, item, task_space, root, checked_at)
                    for index, item in enumerate(pages)]
    server_entries = [server_entry(index, item, task_space, root, probe, diagnostics)
                      for index, item in enumerate(servers)]
    entries = [(kind, entry) for kind, rows in (("pages", page_entries), ("servers", server_entries))
               for entry in rows]
    counts = Counter(entry["classification"] for _, entry in entries)
    status = "residual" if counts["residual"] else "unknown" if counts["unknown"] else "clean"
    unresolved = [
        {"resource": kind, "label": entry["label"], "classification": entry["classification"],
         "reasons": list(entry["reasons"]), "action": ACTIONS[entry["classification"]]}
        for kind, entry in entries if entry["classification"] in ("residual", "unknown")
    ]
    return {
        "valid": True,
        "schemaVersion": SCHEMA_VERSION,
        "taskSpace": task_space,
        "checkedAt": rfc3339(checked_at),
        "pages": page_entries,
        "servers": server_entries,
        "aggregate": {
            "status": status,
            "counts": {key: counts[key] for key in CLASSIFICATIONS},
            "pages": {key: sum(1 for entry in page_entries if entry["classification"] == key)
                      for key in CLASSIFICATIONS},
            "servers": {key: sum(1 for entry in server_entries if entry["classification"] == key)
                        for key in CLASSIFICATIONS},
        },
        "unresolved": unresolved,
        "diagnostics": diagnostics,
    }


def output_path(root, value):
    require(nonempty_text(value), "output: expected a path")
    path = Path(value)
    resolved = (path if path.is_absolute() else root / path).resolve()
    tmp = (root / ".tmp").resolve()
    require(tmp in resolved.parents, f"output: must be a file under {tmp}/; refusing {value}")
    require(not resolved.exists(), f"output: refusing to overwrite the existing file {value}")
    require(resolved.parent.is_dir(), f"output: parent directory missing for {value}")
    return resolved


def write_report(root, value, report):
    path = output_path(root, value)
    try:
        descriptor, temporary = tempfile.mkstemp(
            prefix=f".{path.name}.", suffix=".part", dir=path.parent)
    except OSError as exc:
        raise InputError(f"output: cannot write {value}: {exc}") from exc
    temporary = Path(temporary)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(report, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, 0o644)
        os.link(temporary, path)
    except FileExistsError as exc:
        raise InputError(f"output: refusing to overwrite the existing file {value}") from exc
    except OSError as exc:
        raise InputError(f"output: cannot write {value}: {exc}") from exc
    finally:
        temporary.unlink(missing_ok=True)
    return path


class SystemProbe:
    """Read-only OS probes: ps, lsof and PID-file stat. No signals, no unlinks."""

    def __init__(self, timeout=10):
        self.timeout = timeout

    def _run(self, argv):
        # Fixed locale keeps `ps -o lstart=` comparable between launch and check.
        environment = dict(os.environ, LC_ALL="C", LANG="C")
        try:
            return subprocess.run(argv, capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", check=False,
                                  timeout=self.timeout, env=environment)
        except (OSError, subprocess.SubprocessError) as exc:
            raise ProbeError(f"{argv[0]} is unavailable: {exc}") from exc

    def process(self, pid):
        started = self._run(["ps", "-ww", "-p", str(pid), "-o", "lstart="])
        message = started.stderr.strip()
        if started.returncode == 1 and not started.stdout.strip() and not message:
            return None
        if started.returncode != 0 or not started.stdout.strip():
            raise ProbeError(f"ps could not inspect pid {pid}: {message or started.returncode}")
        command = self._run(["ps", "-ww", "-p", str(pid), "-o", "args="])
        if command.returncode != 0 or not command.stdout.strip():
            raise ProbeError(f"ps could not read the command line of pid {pid}")
        cwd = self._cwd(pid)
        if cwd is None:
            raise ProbeError(f"lsof could not read the cwd of pid {pid}")
        return {
            "startToken": f"{pid}@{' '.join(started.stdout.split())}",
            "cwd": cwd,
            "command": " ".join(command.stdout.split()),
        }

    def _cwd(self, pid):
        completed = self._run(["lsof", "-a", "-p", str(pid), "-d", "cwd", "-Fn"])
        if completed.returncode not in (0, 1):
            raise ProbeError(
                f"lsof could not read the cwd of pid {pid}: {completed.stderr.strip() or completed.returncode}")
        for line in completed.stdout.splitlines():
            if line.startswith("n") and len(line) > 1:
                return line[1:]
        return None

    def listeners(self, port):
        completed = self._run(["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-F", "p"])
        problems = [line for line in completed.stderr.splitlines()
                    if line.strip() and not line.startswith("lsof: WARNING")]
        if completed.returncode not in (0, 1) or problems:
            detail = "; ".join(problems) or completed.returncode
            raise ProbeError(f"lsof could not list port {port}: {detail}")
        pids = set()
        for line in completed.stdout.splitlines():
            if not line.startswith("p"):
                continue
            try:
                pids.add(int(line[1:]))
            except ValueError as exc:
                raise ProbeError(f"lsof returned an unreadable pid line for port {port}: {line!r}") from exc
        return sorted(pids)

    def pid_file(self, path):
        try:
            present = path.is_file()
            content = path.read_text(encoding="utf-8", errors="replace").strip() if present else None
        except OSError as exc:
            raise ProbeError(f"cannot inspect PID file {path}: {exc}") from exc
        return {"present": present, "content": content}


def run_cleanup(root, task_space, pages_argument, servers_argument, output_file, probe=None, now=None):
    root = Path(root).resolve()
    checked_at = now or datetime.now(timezone.utc)
    try:
        require(nonempty_text(task_space), "task-space: expected a nonempty identifier")
        require(isinstance(checked_at, datetime) and checked_at.tzinfo is not None,
                "checkedAt: expected a timezone-aware timestamp")
        pages = load_declaration(root, pages_argument, "pages", task_space)
        servers = load_declaration(root, servers_argument, "servers", task_space)
        unique_labels(pages, "pages")
        unique_labels(servers, "servers")
        report = build_report(root, task_space.strip(), pages, servers,
                              checked_at.astimezone(timezone.utc), probe or SystemProbe())
        write_report(root, output_file, report)
        return report, 0 if report["aggregate"]["status"] == "clean" else 1
    except InputError as exc:
        return {"valid": False, "status": "invalid", "errors": [str(exc)]}, 2
    except OSError as exc:
        return {"valid": False, "status": "invalid", "errors": [f"output: {exc}"]}, 2
