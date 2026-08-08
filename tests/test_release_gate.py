import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class ReleaseGateTests(unittest.TestCase):
 def test_check_release_gate_returns_zero_for_current(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/check_release_gate.py'),'--workdir',str(ROOT/'examples/02-example')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
 def test_check_release_gate_exposes_condition_flag(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/check_release_gate.py'),'--help'],capture_output=True,text=True)
  self.assertEqual(r.returncode,0)
  self.assertIn('--condition',r.stdout)
