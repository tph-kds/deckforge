import importlib.util, json, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def load_script(rel):
    path = ROOT / rel
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

m = load_script('scripts/evidence/generate_capability_receipt.py')

class GenerateCapabilityReceiptTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / 'test-results').mkdir()
        (self.tmp / 'test-results' / 'last-run.json').write_text(json.dumps({
            "suites": [{
                "tests": [
                    {"title": "autosaves and restores an edit after reload", "status": "passed"},
                    {"title": "inserts a text block and edits its content", "status": "passed"},
                    {"title": "flaky test that failed", "status": "failed"}
                ]
            }]
        }))
        (self.tmp / 'test-results' / 'autosaves and restores an edit after reload.zip').write_bytes(b'abc')
        (self.tmp / 'evidence').mkdir()
        # agent-authored project facts: real entry points/commands/persistence
        (self.tmp / 'evidence' / 'runner-config.json').write_text(json.dumps({
            "persistence.autosave": {
                "entryPoints": ["/editor"], "commands": [],
                "persistence": ["localStorage"],
                "tests": ["tests/deck.test.ts"], "evidence": ["test-results/autosaves and restores an edit after reload.zip"]
            }
        }))

    def test_generates_report_with_artifact(self):
        report = m.generate_report(self.tmp, "abc1234", "ci-1", "chromium")
        self.assertIn("persistence.autosave", report["capabilities"])
        entry = report["capabilities"]["persistence.autosave"][0]
        self.assertEqual(entry["status"], "passed")
        self.assertRegex(entry["artifactSha256"], r"^[0-9a-f]{64}$")
        self.assertTrue(entry["artifact"].endswith(".zip"))

    def test_capability_without_artifact_is_unverified(self):
        report = m.generate_report(self.tmp, "abc1234", "ci-1", "chromium")
        self.assertIn("edit.block.create", report["unverifiedCapabilities"])
        self.assertNotIn("edit.block.create", report["capabilities"])

    def test_receipt_claim_satisfies_strict_requirements(self):
        report = m.generate_report(self.tmp, "abc1234", "ci-1", "chromium")
        receipt = m.build_receipt(self.tmp, report)
        claim = receipt["capabilities"]["persistence.autosave"]
        self.assertEqual(claim["status"], "implemented")
        self.assertIn("entryPoints", claim)
        self.assertIn("persistence", claim)
        self.assertTrue(claim["evidence"])

if __name__ == '__main__':
    unittest.main()
