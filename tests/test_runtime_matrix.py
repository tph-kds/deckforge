import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class RuntimeMatrixTests(unittest.TestCase):
 def test_validator_passes(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/validate_runtime_matrix.py')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
 def test_every_manifest_skill_path_exists(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/validate_runtime_matrix.py'),'--json-report',str(ROOT/'docs/AGENT_RUNTIME_MATRIX.md')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
