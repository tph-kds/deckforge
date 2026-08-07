import json, unittest
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]

class EvalResultSchemaTests(unittest.TestCase):
    def load(self, name):
        return json.loads((ROOT / 'schemas' / name).read_text(encoding='utf-8'))

    def test_skill_eval_result_passes(self):
        doc = {
            "schemaVersion": "1.0.0",
            "condition": "candidate",
            "caseId": "editable-deck",
            "score": 88,
            "assertions": {"typecheck": True, "build": True},
            "runtimeMs": 1200,
            "contextTokens": 45000,
            "failures": [],
            "runAt": "2026-08-06T10:00:00Z"
        }
        self.assertEqual(list(Draft202012Validator(self.load('skill-eval-result.schema.json')).iter_errors(doc)), [])

    def test_trigger_eval_result_passes(self):
        doc = {
            "schemaVersion": "1.0.0",
            "prompt": "Create an editable web presentation",
            "expected": "deckforge",
            "actual": "deckforge",
            "matched": True,
            "runAt": "2026-08-06T10:00:00Z"
        }
        self.assertEqual(list(Draft202012Validator(self.load('trigger-eval-result.schema.json')).iter_errors(doc)), [])

if __name__ == '__main__':
    unittest.main()
