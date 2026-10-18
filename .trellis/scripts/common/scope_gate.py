#!/usr/bin/env python3
"""
Task change-scope gate.

Provides:
    default_scope          - enforce scope covering only a task's evidence directory
    scope_for_new_task     - resolve the scope a new task is created with
    scope_from_cli_json    - parse and validate a JSON scope from --meta / set-meta
    validate_scope         - locate problems in a scope declaration
    scope_digest           - canonical digest of the policy part of a scope
    rule_matches           - exact / trailing-/** rule matching
    prepare_scope_start    - migrate marker/scope and write the start snapshot
    collect_changes        - paths whose state changed since the start snapshot
    check_archive_scope    - archive-time gate; never mutates the worktree
    print_scope_report     - human diagnostics plus the machine-readable report
"""

from __future__ import annotations

import hashlib
import json
import os
import stat
import sys
from datetime import datetime
from pathlib import Path

from .git import run_git
from .io import read_json_checked, write_json, write_text_atomic
from .log import Colors, colored
from .paths import FILE_TASK_JSON


SCOPE_POLICY_VERSION = 1
SCOPE_MARKER = "scopePolicyVersion"
SNAPSHOT_SCHEMA_VERSION = 1
SNAPSHOT_FILE = "scope-start.json"
SNAPSHOT_EXTENSIONS_KEY = "scopeExtensions"
TASK_EVIDENCE_CATEGORY = "task-evidence"
SCOPE_FIELDS = frozenset({"version", "mode", "categories", "snapshot"})
TOOL_STATE_DIRS = (".trellis/.runtime/",)
TOOL_STATE_FILES = frozenset({".trellis/.current-task"})


class ScopeGateError(RuntimeError):
    """Git or snapshot state cannot be computed reliably."""


def _is_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _timestamp() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def repo_relative(path: Path, repo_root: Path) -> str | None:
    try:
        return path.resolve().relative_to(repo_root.resolve()).as_posix()
    except (OSError, ValueError):
        return None


# =============================================================================
# Scope declaration
# =============================================================================

def rule_matches(rule: str, path: str) -> bool:
    """Whether a repo-relative path is covered by one scope rule."""
    if not isinstance(rule, str) or not path:
        return False
    if rule.endswith("/**"):
        prefix = rule[:-3]
        return path == prefix or path.startswith(prefix + "/")
    return path == rule


def default_scope(task_rel: str) -> dict:
    """Enforce scope a new task starts with: its own evidence directory only."""
    return {
        "version": SCOPE_POLICY_VERSION,
        "mode": "enforce",
        "categories": {TASK_EVIDENCE_CATEGORY: [f"{task_rel}/**"]},
    }


def _validate_rule(rule: object, location: str) -> list[str]:
    if not isinstance(rule, str) or not rule:
        return [f"{location}: must be a non-empty string"]
    if rule.startswith("/") or rule.startswith("\\"):
        return [f"{location}: absolute paths are not allowed: {rule!r}"]
    if "\\" in rule:
        return [f"{location}: use POSIX '/' separators: {rule!r}"]
    if len(rule) >= 2 and rule[1] == ":":
        return [f"{location}: absolute paths are not allowed: {rule!r}"]
    if rule.endswith("/**"):
        prefix = rule[:-3]
        if not prefix:
            return [f"{location}: '**' must follow a directory: {rule!r}"]
        if "**" in prefix:
            return [f"{location}: '**' is only allowed as a trailing /**: {rule!r}"]
        segments = prefix.split("/")
    else:
        if "**" in rule:
            return [f"{location}: '**' is only allowed as a trailing /**: {rule!r}"]
        if rule.endswith("/"):
            return [f"{location}: trailing '/' is not allowed (write /** instead): {rule!r}"]
        segments = rule.split("/")
    for segment in segments:
        if not segment:
            return [f"{location}: empty path segment: {rule!r}"]
        if segment in (".", ".."):
            return [f"{location}: '{segment}' segments are not allowed: {rule!r}"]
    return []


def validate_scope(scope: object, task_rel: str, *, allow_snapshot: bool = True) -> list[str]:
    """Return located problems with a scope declaration ([] when valid)."""
    if not isinstance(scope, dict):
        return ["meta.scope: must be a JSON object"]

    problems: list[str] = []
    for key in sorted(scope):
        if key not in SCOPE_FIELDS:
            problems.append(f"meta.scope.{key}: unknown field")
    version = scope.get("version")
    if not _is_int(version) or version != SCOPE_POLICY_VERSION:
        problems.append(f"meta.scope.version: must be {SCOPE_POLICY_VERSION}")
    if scope.get("mode") != "enforce":
        problems.append('meta.scope.mode: must be "enforce"')
    if "snapshot" in scope and not allow_snapshot:
        problems.append(
            "meta.scope.snapshot: managed by task.py start; remove it from this declaration"
        )

    categories = scope.get("categories")
    if not isinstance(categories, dict) or not categories:
        problems.append("meta.scope.categories: must be a non-empty JSON object")
        return problems

    for name in sorted(categories):
        location = f"meta.scope.categories.{name}"
        if not isinstance(name, str) or not name.strip():
            problems.append("meta.scope.categories: category names must be non-empty strings")
            continue
        rules = categories[name]
        if not isinstance(rules, list) or not rules:
            problems.append(f"{location}: must be a non-empty array of path rules")
            continue
        for index, rule in enumerate(rules):
            problems.extend(_validate_rule(rule, f"{location}[{index}]"))

    evidence = categories.get(TASK_EVIDENCE_CATEGORY)
    if TASK_EVIDENCE_CATEGORY not in categories:
        problems.append(
            f"meta.scope.categories: missing required '{TASK_EVIDENCE_CATEGORY}' "
            f"category covering {task_rel}/**"
        )
    elif not isinstance(evidence, list) or not any(
        isinstance(rule, str) and rule_matches(rule, f"{task_rel}/task.json")
        for rule in evidence
    ):
        problems.append(
            f"meta.scope.categories.{TASK_EVIDENCE_CATEGORY}: must cover this task's "
            f"evidence directory, including {task_rel}/task.json (write {task_rel}/**)"
        )
    return problems


def normalize_scope(scope: dict) -> dict:
    """Canonical policy form used for digests; `snapshot` is not policy."""
    categories = scope.get("categories")
    normalized: dict[str, list[str]] = {}
    if isinstance(categories, dict):
        for name, rules in categories.items():
            if isinstance(rules, list):
                normalized[str(name)] = sorted(
                    {rule for rule in rules if isinstance(rule, str)}
                )
    return {
        "version": scope.get("version"),
        "mode": scope.get("mode"),
        "categories": normalized,
    }


def scope_digest(scope: dict) -> str:
    payload = json.dumps(
        normalize_scope(scope),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return _sha256_bytes(payload.encode("utf-8"))


def parse_scope_argument(raw: str) -> tuple[dict | None, list[str]]:
    """Parse a scope JSON string from the command line."""
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        return None, [f"meta.scope: not valid JSON ({exc.msg} at position {exc.pos})"]
    if not isinstance(value, dict):
        return None, ["meta.scope: must be a JSON object"]
    return value, []


def scope_from_cli_json(
    raw: str, task_rel: str, *, allow_snapshot: bool = False
) -> tuple[dict | None, list[str]]:
    value, problems = parse_scope_argument(raw)
    if problems or value is None:
        return None, problems
    problems = validate_scope(value, task_rel, allow_snapshot=allow_snapshot)
    if problems:
        return None, problems
    return value, []


def scope_for_new_task(task_rel: str, raw: str | None) -> tuple[dict | None, list[str]]:
    if raw is None:
        return default_scope(task_rel), []
    return scope_from_cli_json(raw, task_rel)


def _scope_of(data: dict) -> object:
    meta = data.get("meta")
    if not isinstance(meta, dict):
        return None
    return meta.get("scope")


# =============================================================================
# Worktree / git state
# =============================================================================

def _git(repo_root: Path, *args: str) -> tuple[int, str, str]:
    return run_git(list(args), cwd=repo_root)


def _is_tool_state(path: str) -> bool:
    """Pointer/session state written by task.py itself, never task scope."""
    return path in TOOL_STATE_FILES or path.startswith(TOOL_STATE_DIRS)


def _worktree_state(path: Path) -> dict | None:
    """Content/type/mode summary of one worktree path (None when unreadable)."""
    try:
        info = path.lstat()
    except FileNotFoundError:
        return {"type": "missing"}
    except OSError:
        return None
    if stat.S_ISLNK(info.st_mode):
        try:
            target = os.readlink(path)
        except OSError:
            return None
        return {"type": "symlink", "sha256": _sha256_bytes(target.encode("utf-8"))}
    if stat.S_ISDIR(info.st_mode):
        return {"type": "dir"}
    if stat.S_ISREG(info.st_mode):
        try:
            content = path.read_bytes()
        except OSError:
            return None
        mode = "100755" if info.st_mode & stat.S_IXUSR else "100644"
        return {"type": "file", "mode": mode, "sha256": _sha256_bytes(content)}
    return {"type": "other"}


def _parse_status(output: str) -> list[dict] | None:
    tokens = output.split("\0")
    entries: list[dict] = []
    index = 0
    while index < len(tokens):
        token = tokens[index]
        index += 1
        if not token:
            continue
        if len(token) < 4 or token[2] != " ":
            return None
        xy = token[:2]
        path = token[3:]
        if xy[0] in "RC" or xy[1] in "RC":
            if index >= len(tokens):
                return None
            index += 1
        entries.append({"xy": xy, "path": path})
    return entries


def _tree_entries(repo_root: Path, ref: str) -> dict[str, list[str]]:
    rc, out, err = _git(repo_root, "ls-tree", "-r", "-z", "--full-tree", ref)
    if rc != 0:
        raise ScopeGateError(f"cannot read git tree {ref}: {err.strip() or 'git ls-tree failed'}")
    entries: dict[str, list[str]] = {}
    for token in out.split("\0"):
        if not token:
            continue
        meta, tab, path = token.partition("\t")
        parts = meta.split(" ")
        if not tab or not path or len(parts) != 3:
            raise ScopeGateError(f"could not parse git ls-tree output for tree {ref}")
        entries[path] = [parts[0], parts[2]]
    return entries


def _current_state(repo_root: Path) -> dict:
    rc, out, err = _git(repo_root, "rev-parse", "--show-toplevel")
    if rc != 0:
        raise ScopeGateError(f"not a git work tree: {err.strip() or 'git rev-parse failed'}")
    try:
        toplevel = Path(out.strip()).resolve()
    except (OSError, ValueError) as exc:
        raise ScopeGateError(f"cannot resolve the git work tree root: {exc}") from exc
    if toplevel != repo_root.resolve():
        raise ScopeGateError(
            f"git work tree root is {toplevel}, expected {repo_root.resolve()}"
        )

    rc, out, _ = _git(repo_root, "rev-parse", "--verify", "HEAD^{commit}")
    head = out.strip() if rc == 0 and out.strip() else None

    rc, out, err = _git(repo_root, "write-tree")
    index_tree = out.strip()
    if rc != 0 or not index_tree:
        raise ScopeGateError(
            "git write-tree failed; the index may contain unmerged entries: "
            f"{err.strip() or 'no tree returned'}"
        )

    rc, out, _ = _git(repo_root, "branch", "--show-current")
    branch = out.strip() if rc == 0 else ""

    rc, out, err = _git(
        repo_root, "status", "--porcelain=v1", "-z", "--untracked-files=all"
    )
    if rc != 0:
        raise ScopeGateError(f"git status failed: {err.strip() or 'git status returned nonzero'}")
    status_entries = _parse_status(out)
    if status_entries is None:
        raise ScopeGateError("could not parse `git status --porcelain -z` output")

    dirty: dict[str, dict] = {}
    untracked: dict[str, dict] = {}
    for entry in status_entries:
        xy = entry["xy"]
        path = entry["path"]
        if _is_tool_state(path):
            continue
        if xy == "??":
            state = _worktree_state(repo_root / path)
            if state is None:
                raise ScopeGateError(f"cannot read untracked path: {path}")
            untracked[path] = state
        elif xy[1] in "MADT":
            state = _worktree_state(repo_root / path)
            if state is None:
                raise ScopeGateError(f"cannot read changed path: {path}")
            dirty[path] = state

    return {
        "head": head,
        "branch": branch,
        "indexTree": index_tree,
        "headEntries": _tree_entries(repo_root, head) if head else {},
        "indexEntries": _tree_entries(repo_root, index_tree),
        "dirty": dirty,
        "untracked": untracked,
    }


def capture_snapshot(repo_root: Path, task_rel: str, scope: dict) -> dict:
    """Baseline of HEAD/index/worktree/untracked state for a task start."""
    state = _current_state(repo_root)
    return {
        "schemaVersion": SNAPSHOT_SCHEMA_VERSION,
        "task": task_rel,
        "branch": state["branch"],
        "head": state["head"],
        "indexTree": state["indexTree"],
        "capturedAt": _timestamp(),
        "scopeDigest": scope_digest(scope),
        "dirty": state["dirty"],
        "untracked": state["untracked"],
    }


# =============================================================================
# Snapshot loading and change collection
# =============================================================================

def _snapshot_entries_problems(value: object, location: str) -> list[str]:
    if not isinstance(value, dict):
        return [f"{location}: must be a JSON object"]
    problems: list[str] = []
    for path, state in value.items():
        if not isinstance(path, str) or not path:
            problems.append(f"{location}: path keys must be non-empty strings")
            continue
        if not isinstance(state, dict) or not isinstance(state.get("type"), str):
            problems.append(f"{location}.{path}: must be an object with a string 'type'")
    return problems


def _snapshot_extensions_problems(value: object) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        return ["start snapshot.scopeExtensions: must be a JSON array"]
    problems: list[str] = []
    for index, entry in enumerate(value):
        location = f"start snapshot.scopeExtensions[{index}]"
        if not isinstance(entry, dict):
            problems.append(f"{location}: must be a JSON object")
            continue
        if not isinstance(entry.get("category"), str) or not entry.get("category"):
            problems.append(f"{location}.category: must be a non-empty string")
        rules = entry.get("rules")
        if (
            not isinstance(rules, list)
            or not rules
            or any(not isinstance(rule, str) or not rule for rule in rules)
        ):
            problems.append(f"{location}.rules: must be a non-empty array of path rules")
        if not isinstance(entry.get("at"), str) or not entry.get("at"):
            problems.append(f"{location}.at: must be a non-empty timestamp")
    return problems


def _snapshot_shape_problems(snapshot: object) -> list[str]:
    if not isinstance(snapshot, dict):
        return ["start snapshot: top level must be a JSON object"]
    problems: list[str] = []
    if snapshot.get("schemaVersion") != SNAPSHOT_SCHEMA_VERSION:
        problems.append(
            f"start snapshot: schemaVersion must be {SNAPSHOT_SCHEMA_VERSION}"
        )
    if not isinstance(snapshot.get("task"), str) or not snapshot.get("task"):
        problems.append("start snapshot: task must be a non-empty string")
    head = snapshot.get("head")
    if head is not None and (not isinstance(head, str) or not head):
        problems.append("start snapshot: head must be a commit id or null")
    if not isinstance(snapshot.get("indexTree"), str) or not snapshot.get("indexTree"):
        problems.append("start snapshot: indexTree must be a non-empty string")
    digest = snapshot.get("scopeDigest")
    if (
        not isinstance(digest, str)
        or len(digest) != 64
        or any(char not in "0123456789abcdef" for char in digest)
    ):
        problems.append("start snapshot: scopeDigest must be a SHA-256 hex digest")
    problems.extend(_snapshot_entries_problems(snapshot.get("dirty"), "start snapshot.dirty"))
    problems.extend(
        _snapshot_entries_problems(snapshot.get("untracked"), "start snapshot.untracked")
    )
    problems.extend(_snapshot_extensions_problems(snapshot.get(SNAPSHOT_EXTENSIONS_KEY)))
    return problems


def _load_task_snapshot(
    task_dir: Path, task_rel: str, scope: dict
) -> tuple[dict | None, list[str]]:
    reference = scope.get("snapshot")
    if reference is None:
        return None, [
            "meta.scope.snapshot is missing; run task.py start to record the baseline "
            "before archiving"
        ]
    if not isinstance(reference, dict):
        return None, ["meta.scope.snapshot: must be an object with path and sha256"]

    rel_path = reference.get("path")
    if not isinstance(rel_path, str) or not rel_path:
        return None, ["meta.scope.snapshot.path: must be a non-empty string"]
    if (
        rel_path.startswith("/")
        or "\\" in rel_path
        or any(part in ("", ".", "..") for part in rel_path.split("/"))
    ):
        return None, [
            f"meta.scope.snapshot.path: must be a repo-relative POSIX path: {rel_path!r}"
        ]

    try:
        task_root = task_dir.resolve()
        snapshot_path = (task_dir / rel_path).resolve()
        snapshot_path.relative_to(task_root)
    except (OSError, ValueError):
        return None, [
            f"meta.scope.snapshot.path: must point inside the task directory: {rel_path!r}"
        ]
    if not snapshot_path.is_file():
        return None, [f"start snapshot not found: {rel_path}"]

    declared = reference.get("sha256")
    if (
        not isinstance(declared, str)
        or len(declared) != 64
        or any(char not in "0123456789abcdef" for char in declared)
    ):
        return None, ["meta.scope.snapshot.sha256: must be a SHA-256 hex digest"]
    try:
        raw = snapshot_path.read_bytes()
    except OSError as exc:
        return None, [f"start snapshot could not be read: {exc}"]
    actual = _sha256_bytes(raw)
    if actual != declared:
        return None, [
            f"start snapshot hash mismatch (recorded {declared[:12]}..., "
            f"actual {actual[:12]}...); the baseline was modified after start"
        ]

    try:
        snapshot = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return None, [f"start snapshot is not valid JSON: {exc}"]

    problems = _snapshot_shape_problems(snapshot)
    if problems:
        return None, problems
    if snapshot["task"] != task_rel:
        return None, [
            f"start snapshot belongs to {snapshot['task']}, not {task_rel}"
        ]
    if snapshot["scopeDigest"] != scope_digest(scope):
        return None, [
            "meta.scope changed after task start; archive refuses without a matching "
            "baseline (restore the start-time scope, or remove meta.scope.snapshot and "
            "re-run task.py start to reset the baseline deliberately)"
        ]
    return snapshot, []


def extend_scope_category(
    scope: dict, task_rel: str, category: str, rules: list[str]
) -> tuple[dict | None, list[str], list[str]]:
    """Merge path rules into one category without touching the start baseline."""
    if not isinstance(category, str) or not category.strip():
        return None, [], ["scope category: must be a non-empty string"]
    if not rules:
        return None, [], ["scope rules: at least one path rule is required"]
    categories = scope.get("categories")
    if not isinstance(categories, dict):
        return None, [], ["meta.scope.categories: must be a JSON object"]

    merged: dict[str, object] = {}
    for name, values in categories.items():
        merged[name] = list(values) if isinstance(values, list) else values
    existing = merged.get(category)
    if category in merged and not isinstance(existing, list):
        return None, [], [
            f"meta.scope.categories.{category}: must be a non-empty array of path rules"
        ]
    current = existing if isinstance(existing, list) else []
    merged[category] = current

    added: list[str] = []
    for rule in rules:
        if rule in current or rule in added:
            continue
        added.append(rule)
    current.extend(added)

    new_scope = dict(scope)
    new_scope["categories"] = merged
    problems = validate_scope(new_scope, task_rel)
    if problems:
        return None, [], problems
    return new_scope, added, []


def extend_task_scope(
    task_json_path: Path,
    task_dir: Path,
    task_rel: str,
    data: dict,
    category: str,
    rules: list[str],
) -> tuple[dict | None, list[str], list[str]]:
    """Merge rules into meta.scope, re-signing the start snapshot when present.

    The snapshot baseline (HEAD, index tree, dirty and untracked state) stays
    untouched; only its policy digest and audit trail change, so the archive
    gate still compares against the original start state.
    """
    meta = data.get("meta")
    scope = meta.get("scope") if isinstance(meta, dict) else None
    if not isinstance(meta, dict) or not isinstance(scope, dict):
        return None, [], ["meta.scope is missing; declare a scope before extending it"]

    new_scope, added, problems = extend_scope_category(scope, task_rel, category, rules)
    if problems or new_scope is None:
        return None, [], problems

    reference = new_scope.get("snapshot")
    if reference is None:
        if not added:
            return new_scope, added, []
        meta["scope"] = new_scope
        if not write_json(task_json_path, data):
            return None, [], [f"failed to write {task_json_path}"]
        return new_scope, added, []

    snapshot, problems = _load_task_snapshot(task_dir, task_rel, scope)
    if problems or snapshot is None:
        return None, [], problems or ["start snapshot could not be loaded"]
    if not added:
        return new_scope, added, []

    snapshot_path = task_dir / reference["path"]
    try:
        previous_bytes = snapshot_path.read_bytes()
    except OSError as exc:
        return None, [], [f"start snapshot could not be read: {exc}"]

    snapshot["scopeDigest"] = scope_digest(new_scope)
    extensions = snapshot.get(SNAPSHOT_EXTENSIONS_KEY)
    if not isinstance(extensions, list):
        extensions = []
    extensions.append({"category": category, "rules": added, "at": _timestamp()})
    snapshot[SNAPSHOT_EXTENSIONS_KEY] = extensions
    payload = json.dumps(snapshot, indent=2, ensure_ascii=False)
    if not write_text_atomic(snapshot_path, payload):
        return None, [], [f"failed to write start snapshot: {snapshot_path}"]
    new_sha = _sha256_bytes(payload.encode("utf-8"))

    new_scope = dict(new_scope)
    new_scope["snapshot"] = {"path": reference["path"], "sha256": new_sha}
    meta["scope"] = new_scope
    if not write_json(task_json_path, data):
        if not write_text_atomic(snapshot_path, previous_bytes.decode("utf-8")):
            return None, [], [
                f"failed to write {task_json_path}; the re-signed start snapshot "
                "could not be restored, so archive now reports a hash mismatch until "
                "the snapshot is restored or task.py start re-run"
            ]
        return None, [], [f"failed to write {task_json_path}"]
    return new_scope, added, []


def _worktree_map(snapshot: dict) -> dict[str, dict]:
    merged = dict(snapshot["untracked"])
    merged.update(snapshot["dirty"])
    return merged


def _same_worktree_state(before: dict | None, after: dict | None) -> bool:
    if before is None and after is None:
        return True
    if before is None or after is None:
        return False
    return before == after


def collect_changes(
    repo_root: Path, snapshot: dict
) -> tuple[list[dict] | None, list[str]]:
    """Paths whose HEAD/index/worktree state differs from the start snapshot."""
    problems = _snapshot_shape_problems(snapshot)
    if problems:
        return None, problems

    try:
        current = _current_state(repo_root)
        baseline_head = (
            _tree_entries(repo_root, snapshot["head"]) if snapshot["head"] else {}
        )
        baseline_index = _tree_entries(repo_root, snapshot["indexTree"])
    except ScopeGateError as exc:
        return None, [str(exc)]

    baseline_worktree = _worktree_map(snapshot)
    current_worktree = {**current["untracked"], **current["dirty"]}

    candidates = set(baseline_head) | set(current["headEntries"])
    candidates |= set(baseline_index) | set(current["indexEntries"])
    candidates |= set(baseline_worktree) | set(current_worktree)

    changes: list[dict] = []
    for path in sorted(candidates):
        layers: list[str] = []
        if baseline_head.get(path) != current["headEntries"].get(path):
            layers.append("head")
        if baseline_index.get(path) != current["indexEntries"].get(path):
            layers.append("index")
        if not _same_worktree_state(
            baseline_worktree.get(path), current_worktree.get(path)
        ):
            layers.append("worktree")
        if layers:
            changes.append({"path": path, "layers": layers})
    return changes, []


def _match_scope(scope: dict, path: str) -> tuple[str, str] | None:
    categories = scope.get("categories")
    if not isinstance(categories, dict):
        return None
    for name in sorted(categories):
        rules = categories[name]
        if not isinstance(rules, list):
            continue
        for rule in sorted(rule for rule in rules if isinstance(rule, str)):
            if rule_matches(rule, path):
                return name, rule
    return None


# =============================================================================
# Start snapshot / migration
# =============================================================================

def _print_problems(problems: list[str]) -> None:
    for problem in problems:
        print(colored(f"Error: {problem}", Colors.RED), file=sys.stderr)


def _report_read_failure(task_json_path: Path) -> None:
    print(
        colored(
            f"Warning: {task_json_path}: could not be read; scope snapshot not recorded.",
            Colors.YELLOW,
        ),
        file=sys.stderr,
    )


def _add_default_task_evidence(scope: dict, task_rel: str) -> dict:
    """Fill the required task-evidence category for a migrating planning task."""
    categories = scope.get("categories")
    if not isinstance(categories, dict):
        return scope
    rules = categories.get(TASK_EVIDENCE_CATEGORY)
    needed = f"{task_rel}/task.json"
    if isinstance(rules, list) and any(
        isinstance(rule, str) and rule_matches(rule, needed) for rule in rules
    ):
        return scope
    repaired = dict(scope)
    repaired_categories = dict(categories)
    default_rule = f"{task_rel}/**"
    if isinstance(rules, list):
        repaired_categories[TASK_EVIDENCE_CATEGORY] = [*rules, default_rule]
    else:
        repaired_categories[TASK_EVIDENCE_CATEGORY] = [default_rule]
    repaired["categories"] = repaired_categories
    return repaired


def prepare_scope_start(task_dir: Path, repo_root: Path, task_rel: str) -> bool:
    """Migrate marker/scope and ensure a valid start snapshot before activation.

    Returns False when start must not proceed. Existing pre-rollout tasks that
    were already active are reported as legacy and left untouched.
    """
    task_json_path = task_dir / FILE_TASK_JSON
    if not task_json_path.is_file():
        return True

    data, _ = read_json_checked(task_json_path)
    if data is None:
        _report_read_failure(task_json_path)
        return True

    meta = data.get("meta")
    if not isinstance(meta, dict):
        meta = {}

    marker = data.get(SCOPE_MARKER)
    scope_value = meta.get("scope")
    scope: dict

    if marker is None:
        if data.get("status") != "planning":
            print(
                colored(
                    "Note: this task predates scopePolicyVersion 1 and was already "
                    "active; scope enforcement stays legacy for it.",
                    Colors.YELLOW,
                ),
                file=sys.stderr,
            )
            return True
        if scope_value is None:
            scope = default_scope(task_rel)
        elif not isinstance(scope_value, dict):
            _print_problems(["meta.scope: must be a JSON object"])
            return False
        else:
            repaired = _add_default_task_evidence(scope_value, task_rel)
            if repaired is not scope_value:
                print(
                    colored(
                        "Note: added the default task-evidence scope for this task.",
                        Colors.YELLOW,
                    ),
                    file=sys.stderr,
                )
            problems = validate_scope(repaired, task_rel)
            if problems:
                _print_problems(problems)
                return False
            scope = repaired
        data[SCOPE_MARKER] = SCOPE_POLICY_VERSION
        marker_migrated = True
    else:
        if not _is_int(marker) or marker != SCOPE_POLICY_VERSION:
            _print_problems(
                [
                    f"scopePolicyVersion {marker!r} is not supported by this task.py "
                    f"(expected {SCOPE_POLICY_VERSION})"
                ]
            )
            return False
        if scope_value is None:
            _print_problems(
                ["scopePolicyVersion 1 is set but meta.scope is missing; add a scope first"]
            )
            return False
        problems = validate_scope(scope_value, task_rel)
        if problems:
            _print_problems(problems)
            return False
        scope = dict(scope_value)
        marker_migrated = False

    if scope.get("snapshot") is not None:
        snapshot, problems = _load_task_snapshot(task_dir, task_rel, scope)
        if problems or snapshot is None:
            _print_problems(problems)
            return False
        if marker_migrated:
            meta["scope"] = scope
            data["meta"] = meta
            if not write_json(task_json_path, data):
                _print_problems([f"failed to write {task_json_path}"])
                return False
        print(
            colored(
                f"✓ Scope snapshot reused: {task_rel}/{SNAPSHOT_FILE}",
                Colors.GREEN,
            ),
            file=sys.stderr,
        )
        return True

    try:
        snapshot = capture_snapshot(repo_root, task_rel, scope)
    except ScopeGateError as exc:
        _print_problems([f"cannot capture the scope start snapshot: {exc}"])
        return False

    snapshot_path = task_dir / SNAPSHOT_FILE
    if not write_json(snapshot_path, snapshot):
        _print_problems([f"failed to write {snapshot_path}; task was not activated"])
        return False
    try:
        digest = _sha256_bytes(snapshot_path.read_bytes())
    except OSError as exc:
        _print_problems([f"failed to read back {snapshot_path}: {exc}"])
        return False

    scope["snapshot"] = {"path": SNAPSHOT_FILE, "sha256": digest}
    meta["scope"] = scope
    data["meta"] = meta
    if not write_json(task_json_path, data):
        _print_problems(
            [
                f"failed to write {task_json_path}; task was not activated and the "
                "snapshot declaration was not recorded"
            ]
        )
        return False

    print(
        colored(f"✓ Scope snapshot recorded: {task_rel}/{SNAPSHOT_FILE}", Colors.GREEN),
        file=sys.stderr,
    )
    return True


# =============================================================================
# Archive gate
# =============================================================================

def _empty_report(task_rel: str | None) -> dict:
    return {
        "status": "allowed",
        "policyVersion": SCOPE_POLICY_VERSION,
        "task": task_rel,
        "changed": [],
        "allowed": [],
        "violations": [],
        "diagnostics": [],
    }


def check_archive_scope(task_dir: Path, repo_root: Path) -> dict:
    """Evaluate changes since the start snapshot; never mutates the worktree."""
    task_rel = repo_relative(task_dir, repo_root)
    report = _empty_report(task_rel)
    if task_rel is None:
        report["status"] = "blocked"
        report["diagnostics"].append(
            f"task directory is outside the repository root: {task_dir}"
        )
        return report

    task_json_path = task_dir / FILE_TASK_JSON
    if not task_json_path.is_file():
        report["status"] = "legacy"
        report["diagnostics"].append(
            "no task.json; archived with legacy behavior (scope gate not applicable)"
        )
        return report

    data, reason = read_json_checked(task_json_path)
    if data is None:
        report["status"] = "legacy"
        report["diagnostics"].append(
            f"cannot read task.json ({reason}); cannot determine the scope policy "
            "version — archived with legacy behavior"
        )
        return report

    marker = data.get(SCOPE_MARKER)
    scope_value = _scope_of(data)
    if marker is None:
        report["status"] = "legacy"
        if scope_value is None:
            report["diagnostics"].append(
                "no scopePolicyVersion or meta.scope; legacy task archived without "
                "scope enforcement (add meta.scope to enable the gate)"
            )
        else:
            report["diagnostics"].append(
                "meta.scope is present but scopePolicyVersion is missing; legacy task "
                "archived without scope enforcement"
            )
        return report

    if not _is_int(marker) or marker != SCOPE_POLICY_VERSION:
        report["status"] = "blocked"
        report["diagnostics"].append(
            f"unsupported scopePolicyVersion {marker!r}; this task.py understands "
            f"{SCOPE_POLICY_VERSION}"
        )
        return report

    if scope_value is None:
        report["status"] = "blocked"
        report["diagnostics"].append(
            "scopePolicyVersion 1 is set but meta.scope is missing — fail closed"
        )
        return report

    problems = validate_scope(scope_value, task_rel)
    if problems:
        report["status"] = "blocked"
        report["diagnostics"].extend(problems)
        return report
    scope = scope_value

    snapshot, problems = _load_task_snapshot(task_dir, task_rel, scope)
    if problems or snapshot is None:
        report["status"] = "blocked"
        report["diagnostics"].extend(problems)
        return report

    changes, problems = collect_changes(repo_root, snapshot)
    if changes is None:
        report["status"] = "blocked"
        report["diagnostics"].extend(problems)
        return report

    report["changed"] = changes
    for change in changes:
        match = _match_scope(scope, change["path"])
        if match is None:
            report["violations"].append(
                {
                    "path": change["path"],
                    "layers": change["layers"],
                    "reason": "no category rule matches",
                }
            )
        else:
            category, rule = match
            report["allowed"].append(
                {
                    "path": change["path"],
                    "layers": change["layers"],
                    "category": category,
                    "rule": rule,
                }
            )

    if report["violations"]:
        report["status"] = "blocked"
        report["diagnostics"].append(
            f"{len(report['violations'])} changed path(s) fall outside meta.scope"
        )
    return report


def print_scope_report(report: dict) -> None:
    status = report["status"]
    if status == "legacy":
        for diagnostic in report["diagnostics"]:
            print(
                colored(f"Scope gate: legacy — {diagnostic}", Colors.YELLOW),
                file=sys.stderr,
            )
    elif status == "blocked":
        for diagnostic in report["diagnostics"]:
            print(colored(f"Error: {diagnostic}", Colors.RED), file=sys.stderr)
        for violation in report["violations"]:
            layers = ", ".join(violation["layers"])
            print(
                colored(
                    f"Scope violation: {violation['path']} [{layers}] — "
                    "no category rule matches",
                    Colors.RED,
                ),
                file=sys.stderr,
            )
        print(
            "Refusing to archive before any status, pointer, move or commit change.",
            file=sys.stderr,
        )
        if report["violations"]:
            print(
                "Declare these paths in meta.scope before start, or split the task.",
                file=sys.stderr,
            )
    else:
        print(
            colored(
                f"Scope gate: {len(report['changed'])} changed path(s), all allowed "
                "by meta.scope.",
                Colors.GREEN,
            ),
            file=sys.stderr,
        )
    print(json.dumps(report, ensure_ascii=False), file=sys.stderr)
