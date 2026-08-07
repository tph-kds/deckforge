import json, unittest
from pathlib import Path
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

ROOT = Path(__file__).resolve().parents[1]

def load_validator(name):
    raw = json.loads((ROOT / 'schemas' / name).read_text(encoding='utf-8'))
    refs = json.loads((ROOT / 'schemas/capability-evidence.schema.json').read_text(encoding='utf-8'))
    registry = Registry().with_resource(
        refs['$id'], Resource.from_contents(refs, default_specification=DRAFT202012))
    return Draft202012Validator(raw, registry=registry)

SCHEMA = load_validator('browser-evidence-report.schema.json')

def evidence(test_id, status='passed'):
    return {
        "kind": "playwright", "testId": test_id, "status": status,
        "commit": "abc1234", "runId": "ci-1", "browser": "chromium",
        "viewport": "1440x900", "artifact": f"evidence/{test_id}.zip",
        "artifactSha256": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        "startedAt": "2026-08-06T10:00:00Z", "finishedAt": "2026-08-06T10:00:18Z"
    }

GOOD = {
    "reportVersion": "1.0.0",
    "project": "examples/02-example",
    "profile": "editable-deck",
    "commit": "abc1234",
    "runId": "ci-1",
    "generatedAt": "2026-08-06T10:00:20Z",
    "capabilities": {
        "edit.text": [evidence("editor-save-reload")],
        "persistence.autosave": [evidence("editor-save-reload")]
    },
    "unverifiedCapabilities": ["present.remote"],
    "consoleErrors": [],
    "failedRequests": []
}

class BrowserEvidenceReportSchemaTests(unittest.TestCase):
    def test_good_report_passes(self):
        self.assertEqual(list(SCHEMA.iter_errors(GOOD)), [])

    def test_console_error_requires_message(self):
        bad = dict(GOOD, consoleErrors=[{"url": "http://x"}])
        self.assertTrue(list(SCHEMA.iter_errors(bad)))

    def test_unverified_capabilities_strings(self):
        bad = dict(GOOD, unverifiedCapabilities=[{"id": "x"}])
        self.assertTrue(list(SCHEMA.iter_errors(bad)))

if __name__ == '__main__':
    unittest.main()
