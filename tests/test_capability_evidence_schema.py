import json, unittest
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / 'schemas/capability-evidence.schema.json').read_text(encoding='utf-8'))

GOOD = {
    "kind": "playwright",
    "testId": "editor-save-reload",
    "status": "passed",
    "commit": "abc1234",
    "runId": "ci-4812",
    "browser": "chromium",
    "viewport": "1440x900",
    "artifact": "evidence/editor-save-reload.zip",
    "artifactSha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    "startedAt": "2026-08-06T10:00:00Z",
    "finishedAt": "2026-08-06T10:00:18Z"
}

class CapabilityEvidenceSchemaTests(unittest.TestCase):
    def test_good_entry_passes(self):
        errors = list(Draft202012Validator(SCHEMA).iter_errors(GOOD))
        self.assertEqual(errors, [])

    def test_rejects_missing_sha(self):
        bad = dict(GOOD); bad.pop('artifactSha256')
        errors = list(Draft202012Validator(SCHEMA).iter_errors(bad))
        self.assertTrue(errors)

    def test_rejects_skipped_status(self):
        bad = dict(GOOD, status='skipped')
        errors = list(Draft202012Validator(SCHEMA).iter_errors(bad))
        self.assertTrue(errors)

    def test_rejects_source_file_as_artifact(self):
        bad = dict(GOOD, artifact='tests/deck.test.ts')
        errors = list(Draft202012Validator(SCHEMA).iter_errors(bad))
        self.assertTrue(errors)

if __name__ == '__main__':
    unittest.main()
