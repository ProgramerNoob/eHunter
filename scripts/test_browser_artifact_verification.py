"""Browser preflight artifact verification fixtures; cases live below repository .tmp/ except the out-of-repository check."""

from contextlib import redirect_stderr, redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

import acceptance


def digest(path):
    data = path.read_bytes()
    return {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "length": len(data.decode("utf-8"))}


class BrowserArtifactTests(unittest.TestCase):
    def setUp(self):
        base = acceptance.ROOT / ".tmp/browser-artifact-verification"
        base.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=base, prefix="case-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / ".tmp").mkdir()
        (self.root / "src").mkdir()
        (self.root / "src/main.ts").write_text("export const entry = 1;\n", encoding="utf-8")
        self.bundle = self.root / "bundle.js"
        self.bundle.write_text("console.log('bundle');\n", encoding="utf-8")
        self.loader = self.root / "loader.js"
        self.loader.write_text("// loader\n", encoding="utf-8")
        self.scenario = self.root / ".tmp/scenario.json"
        self.scenario.write_text('{"scenario": "fixture"}\n', encoding="utf-8")
        self.artifact = self.root / ".tmp/browser-preflight/round"

    def provenance(self, kind):
        scenario = {"path": ".tmp/scenario.json", **digest(self.scenario)}
        if kind == "vite":
            files = [{"path": "src/main.ts", **digest(self.root / "src/main.ts")}]
            source = {"kind": "vite", "fingerprint": acceptance.browser_aggregate(files), "files": files}
        else:
            source = {"kind": kind,
                      "bundle": {"path": "bundle.js", "sha256": digest(self.bundle)["sha256"]},
                      "loader": {"path": "loader.js", "sha256": digest(self.loader)["sha256"]}}
        return {
            "artifactVersion": 1, "runId": "run-1", "roundId": "round-1",
            "artifactDir": str(self.artifact), "result": "result.json",
            "sourceKind": kind, "url": "https://exhentai.org/s/fixture/1-1", "profile": "desktop",
            "viewport": {"width": 1200, "height": 900, "dpr": 1, "mobile": False,
                         "touchPoints": 0, "coarse": False},
            "page": {"label": "p1", "spaceId": 42}, "taskSpace": "10-17-browser-artifact-verification",
            "scenarioInputs": [scenario], "scenarioInputsSha256": acceptance.browser_aggregate([scenario]),
            "source": source, "startedAt": "2026-10-16T10:00:00Z",
        }

    def initial_fingerprint(self, kind):
        if kind == "vite":
            files = [{"path": "src/main.ts", **digest(self.root / "src/main.ts")}]
            return {"sha256": acceptance.browser_aggregate(files), "files": files}
        return {"bundle": digest(self.bundle), "loader": digest(self.loader)}

    def identity(self, kind):
        if kind == "vite":
            return [{"scriptId": "1", "url": "http://127.0.0.1:5173/src/main.ts", "verified": True}]
        return [{"scriptId": "1", "url": "", "verified": True, "fullBundleCandidate": True,
                 "actual": {"sha256": digest(self.bundle)["sha256"]}}]

    def record(self, kind="eh", **changes):
        provenance = self.provenance(kind)
        result = {
            "runId": "run-1", "roundId": "round-1", "artifactDir": str(self.artifact),
            "artifactVersion": 1, "observed": "passed", "preparation": "verified", "checks": "executed",
            "errors": [], "unsaved": [],
            "eventCollection": {"maxConcurrent": 1, "unresolved": [], "timeouts": []},
            "identity": self.identity(kind), "provenance": json.loads(json.dumps(provenance)),
        }
        if kind == "vite":
            result["inventory"] = {"missingRequired": [], "notLoadedInputs": []}
        else:
            result["permissions"] = {"verified": True}
            result["installation"] = ({"dynamicLoaderEnabled": True, "staticScriptDisabled": True}
                                      if kind == "nh" else
                                      {"loggedIn": True, "dynamicLoaderEnabled": True, "staticScriptDisabled": True})
        result.update(changes)
        manifest = {"runId": "run-1", "roundId": "round-1", "artifactDir": str(self.artifact),
                    "artifactVersion": 1, "provenance": provenance, "state": "incomplete"}
        source = {"artifactVersion": 1, "source": {"kind": kind},
                  "initialFingerprint": self.initial_fingerprint(kind)}
        return manifest, source, result

    def write(self, manifest, source, result, files=("manifest.json", "source.json", "result.json")):
        self.artifact.mkdir(parents=True, exist_ok=True)
        for name, value in (("manifest.json", manifest), ("source.json", source), ("result.json", result)):
            if name in files:
                (self.artifact / name).write_text(json.dumps(value, indent=2), encoding="utf-8")

    def verify(self, artifact=None):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            code = acceptance.main(["verify-browser", str(artifact or self.artifact)], root=self.root)
        return code, json.loads(stdout.getvalue()), stderr.getvalue()

    def verdict(self, kind="eh"):
        manifest, source, result = self.record(kind)
        self.write(manifest, source, result)
        return self.verify()


    def test_fresh_artifacts_pass_for_every_source_kind(self):
        for kind in ("eh", "nh", "vite"):
            with self.subTest(kind):
                code, report, _ = self.verdict(kind)
                self.assertEqual((code, report["status"], report["valid"]), (0, "passed", True))
                self.assertEqual(report["errors"], [])
                self.assertEqual(report["artifact"]["sourceKind"], kind)
                self.assertEqual(report["artifact"]["artifactDir"], ".tmp/browser-preflight/round")
                self.assertEqual(report["artifact"]["runId"], "run-1")
                self.assertEqual(report["artifact"]["observed"], "passed")

    def test_observed_failed_or_blocked_is_never_passing(self):
        for observed in ("failed", "blocked", "incomplete"):
            with self.subTest(observed):
                manifest, source, result = self.record(observed=observed)
                self.write(manifest, source, result)
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"], report["valid"]), (1, "blocked", True))
                self.assertIn(f"observed is '{observed}'", " ".join(report["errors"]))

    def test_unfinished_preparation_or_checks_are_not_passing(self):
        for field, value, fragment in (("preparation", "unrun", "preparation is 'unrun'"),
                                       ("checks", "running", "functional checks did not complete"),
                                       ("checks", "unrun", "functional checks did not complete")):
            with self.subTest(field=field, value=value):
                manifest, source, result = self.record(**{field: value})
                self.write(manifest, source, result)
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"]), (1, "blocked"))
                self.assertIn(fragment, " ".join(report["errors"]))

    def test_recorded_errors_events_and_unsaved_batches_block(self):
        manifest, source, result = self.record(
            errors=[{"phase": "checks", "name": "ProductAssertion", "message": "reader stayed closed"}],
            unsaved=[{"phase": "checks-complete"}],
        )
        result["eventCollection"].update(unresolved=[{"id": 2}], timeouts=[{"id": 3}])
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (1, "blocked"))
        errors = " ".join(report["errors"])
        for fragment in ("errors records 1 failure(s)", "reader stayed closed",
                         "eventCollection.unresolved is not empty", "eventCollection.timeouts is not empty",
                         "unsaved event batches were not persisted"):
            self.assertIn(fragment, errors)

    def test_userscript_identity_contract_is_rechecked(self):
        manifest, source, result = self.record()
        result["permissions"] = {"verified": False}
        result["installation"]["loggedIn"] = False
        result["identity"] = [{"verified": True, "fullBundleCandidate": True, "actual": {"sha256": "0" * 64}},
                              {"verified": True, "fullBundleCandidate": True, "actual": {"sha256": "0" * 64}}]
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (1, "blocked"))
        errors = " ".join(report["errors"])
        for fragment in ("permissions:", "installation: loggedIn is not confirmed",
                         "expected exactly one production bundle candidate, found 2"):
            self.assertIn(fragment, errors)

    def test_vite_identity_and_inventory_are_rechecked(self):
        manifest, source, result = self.record("vite")
        result["identity"][0]["verified"] = False
        result["inventory"] = {"missingRequired": ["http://127.0.0.1:5173/src/lazy.ts"]}
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (1, "blocked"))
        errors = " ".join(report["errors"])
        self.assertIn("lacks exact source and execution evidence", errors)
        self.assertIn("required modules missing", errors)

    def test_missing_result_is_blocked_not_invalid(self):
        manifest, source, _ = self.record()
        self.write(manifest, source, {}, files=("manifest.json", "source.json"))
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"], report["valid"]), (1, "blocked", True))
        self.assertIn("result.json: missing from the artifact", " ".join(report["errors"]))

    def test_missing_provenance_is_legacy(self):
        manifest, source, result = self.record()
        del manifest["artifactVersion"]
        del manifest["provenance"]
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"], report["valid"]), (3, "legacy", True))
        self.assertIn("backfill freshness facts", " ".join(report["errors"]))

    def test_association_mismatch_is_invalid(self):
        for field, value in (("runId", "run-2"), ("roundId", "round-2")):
            with self.subTest(field):
                manifest, source, result = self.record()
                manifest["provenance"][field] = value
                self.write(manifest, source, result)
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"], report["valid"]), (2, "invalid", False))
                self.assertIn(f"provenance {field} differs", " ".join(report["errors"]))

    def test_result_provenance_must_match_the_manifest(self):
        manifest, source, result = self.record()
        result["provenance"]["scenarioInputsSha256"] = "t" * 64
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("provenance scenarioInputsSha256 differs from manifest.json", " ".join(report["errors"]))

    def test_missing_run_ids_are_invalid(self):
        for field in ("runId", "roundId"):
            with self.subTest(field):
                manifest, source, result = self.record()
                for record in (manifest, manifest["provenance"], result, result["provenance"]):
                    record.pop(field)
                self.write(manifest, source, result)
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"]), (2, "invalid"))
                self.assertIn(f"{field} must be a nonempty string", " ".join(report["errors"]))

    def test_missing_manifest_or_source_is_invalid(self):
        for name in ("manifest.json", "source.json"):
            with self.subTest(name):
                manifest, source, result = self.record()
                self.write(manifest, source, result)
                (self.artifact / name).unlink()
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"]), (2, "invalid"))
                self.assertIn(f"{name}: missing from the artifact", " ".join(report["errors"]))

    def test_source_json_must_agree_with_the_manifest(self):
        manifest, source, result = self.record()
        source["source"]["kind"] = "nh"
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("source.json: source kind differs", " ".join(report["errors"]))

    def test_artifact_outside_the_repository_is_invalid(self):
        with tempfile.TemporaryDirectory() as outside:
            code, report, _ = self.verify(outside)
        self.assertEqual((code, report["status"], report["valid"]), (2, "invalid", False))
        self.assertIn("expected a directory inside the repository", " ".join(report["errors"]))

    def test_empty_scenario_inputs_are_invalid(self):
        manifest, source, result = self.record()
        manifest["provenance"]["scenarioInputs"] = []
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("scenarioInputs must declare at least one input", " ".join(report["errors"]))

    def test_source_path_escape_is_invalid(self):
        manifest, source, result = self.record()
        result["provenance"]["source"]["bundle"]["path"] = "../outside.js"
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("path escapes the repository", " ".join(report["errors"]))

    def test_changed_scenario_input_is_stale(self):
        manifest, source, result = self.record()
        self.write(manifest, source, result)
        self.scenario.write_text('{"scenario": "edited"}\n', encoding="utf-8")
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"], report["valid"]), (1, "stale", True))
        self.assertIn("scenario input changed since this round: .tmp/scenario.json", " ".join(report["errors"]))

    def test_changed_or_deleted_bundle_is_stale(self):
        for remove in (False, True):
            with self.subTest(deleted=remove):
                manifest, source, result = self.record()
                self.write(manifest, source, result)
                if remove:
                    self.bundle.unlink()
                else:
                    self.bundle.write_text("console.log('rebuilt');\n", encoding="utf-8")
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"]), (1, "stale"))
                self.assertIn("bundle source", " ".join(report["errors"]))

    def test_changed_vite_input_is_stale(self):
        manifest, source, result = self.record("vite")
        self.write(manifest, source, result)
        (self.root / "src/main.ts").write_text("export const entry = 2;\n", encoding="utf-8")
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (1, "stale"))
        self.assertIn("source input changed since this round: src/main.ts", " ".join(report["errors"]))


    def test_non_object_artifacts_are_invalid(self):
        for name in ("manifest.json", "source.json", "result.json"):
            with self.subTest(name):
                manifest, source, result = self.record()
                self.write(manifest, source, result)
                (self.artifact / name).write_text("[]", encoding="utf-8")
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"], report["valid"]), (2, "invalid", False))
                self.assertIn("expected a JSON object", " ".join(report["errors"]))

    def test_corrupt_result_json_is_invalid_not_blocked(self):
        manifest, source, result = self.record()
        self.write(manifest, source, result)
        (self.artifact / "result.json").write_text("{", encoding="utf-8")
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"], report["valid"]), (2, "invalid", False))
        self.assertIn("cannot read JSON", " ".join(report["errors"]))
        self.assertNotIn("never wrote result.json", " ".join(report["errors"]))

    def test_copied_artifact_is_not_the_recorded_artifact(self):
        manifest, source, result = self.record()
        self.write(manifest, source, result)
        copied = self.root / ".tmp/browser-preflight/copied"
        shutil.copytree(self.artifact, copied)
        code, report, _ = self.verify(copied)
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("does not name this artifact directory", " ".join(report["errors"]))

    def test_scenario_aggregates_are_recomputed(self):
        manifest, source, result = self.record()
        manifest["provenance"]["scenarioInputsSha256"] = "0" * 64
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("scenarioInputsSha256 does not match the recorded inputs", " ".join(report["errors"]))

    def test_result_scenario_inputs_must_match_the_manifest(self):
        manifest, source, result = self.record()
        entries = result["provenance"]["scenarioInputs"]
        entries[0]["path"] = ".tmp/other.json"
        result["provenance"]["scenarioInputsSha256"] = acceptance.browser_aggregate(entries)
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("differs from manifest.json", " ".join(report["errors"]))

    def test_duplicate_scenario_inputs_are_invalid(self):
        for label, second in (("identical", ".tmp/scenario.json"), ("normalized", "./.tmp/scenario.json")):
            with self.subTest(label):
                self._duplicate_inputs(second)

    def _duplicate_inputs(self, second):
        manifest, source, result = self.record()
        entries = manifest["provenance"]["scenarioInputs"]
        duplicated = [entries[0], dict(entries[0], path=second)]
        manifest["provenance"]["scenarioInputs"] = duplicated
        manifest["provenance"]["scenarioInputsSha256"] = acceptance.browser_aggregate(duplicated)
        result["provenance"]["scenarioInputs"] = duplicated
        result["provenance"]["scenarioInputsSha256"] = acceptance.browser_aggregate(duplicated)
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("must not repeat a path", " ".join(report["errors"]))

    def test_vite_fingerprint_is_recomputed_from_its_files(self):
        manifest, source, result = self.record("vite")
        result["provenance"]["source"]["files"] = [
            {"path": "src/main.ts", "sha256": "0" * 64, "bytes": 1, "length": 1}]
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (2, "invalid"))
        self.assertIn("source.fingerprint does not match its files", " ".join(report["errors"]))

    def test_identity_evidence_is_required(self):
        cases = (
            ("empty", [], "no script identity rows were recorded"),
            ("no hash", [{"scriptId": "1", "verified": True, "fullBundleCandidate": True, "actual": "0" * 64}],
             "no recorded execution hash"),
            ("wrong hash", [{"scriptId": "1", "verified": True, "fullBundleCandidate": True,
                             "actual": {"sha256": "0" * 64}}],
             "executed bundle hash differs from the recorded source bundle"),
        )
        for label, identity, fragment in cases:
            with self.subTest(label):
                manifest, source, result = self.record(identity=identity)
                self.write(manifest, source, result)
                code, report, _ = self.verify()
                self.assertEqual((code, report["status"]), (1, "blocked"))
                self.assertIn(fragment, " ".join(report["errors"]))

    def test_host_script_rows_are_ignored(self):
        manifest, source, result = self.record()
        result["identity"].insert(0, {"scriptId": "0", "url": "http://127.0.0.1:8000/old.js", "verified": False})
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (0, "passed"))

    def test_nh_installation_flags_are_rechecked(self):
        manifest, source, result = self.record("nh")
        result["installation"]["staticScriptDisabled"] = False
        self.write(manifest, source, result)
        code, report, _ = self.verify()
        self.assertEqual((code, report["status"]), (1, "blocked"))
        self.assertIn("installation: staticScriptDisabled is not confirmed", " ".join(report["errors"]))

    def test_verification_is_read_only_and_repeatable(self):
        manifest, source, result = self.record()
        self.write(manifest, source, result)
        before = {path.name: (path.read_bytes(), path.stat().st_mtime_ns)
                  for path in self.artifact.iterdir()}
        self.assertEqual(self.verify()[0], 0)
        self.assertEqual(self.verify()[0], 0)
        after = {path.name: (path.read_bytes(), path.stat().st_mtime_ns)
                 for path in self.artifact.iterdir()}
        self.assertEqual(before, after)
        self.assertEqual(sorted(before), ["manifest.json", "result.json", "source.json"])


if __name__ == "__main__":
    unittest.main()
