import tempfile, unittest
from pathlib import Path
from scripts.evals import run_skill_eval as m

class RunSkillEvalTests(unittest.TestCase):
    def test_run_eval_case_records_success(self):
        result = m.run_eval_case(
            {"id": "demo", "assertions": [{"name": "echo", "cmd": ["python", "-c", "print('ok')"]}]},
            "current", ["python"], Path.cwd())
        self.assertEqual(result["condition"], "current")
        self.assertTrue(result["assertions"]["echo"])
        self.assertEqual(result["failures"], [])

    def test_run_eval_case_records_failure(self):
        result = m.run_eval_case(
            {"id": "demo", "assertions": [{"name": "fail", "cmd": ["python", "-c", "raise SystemExit(1)"]}]},
            "baseline", ["python"], Path.cwd())
        self.assertFalse(result["assertions"]["fail"])
        self.assertGreaterEqual(len(result["failures"]), 1)

if __name__ == '__main__':
    unittest.main()
