import base64, json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

# A valid 1x1 transparent PNG (widely used test fixture).
PNG_1PX = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42m'
    'P8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')

class ExportGoldenTests(unittest.TestCase):
 def test_comparator_missing_artifacts_reports(self):
  with tempfile.TemporaryDirectory() as d:
   r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/compare_export_goldens.py'),'--export-dir',d],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
 def test_comparator_accepts_matching_golden(self):
  with tempfile.TemporaryDirectory() as d:
   Path(d).joinpath('slide-01.png').write_bytes(PNG_1PX)
   r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/compare_export_goldens.py'),'--export-dir',d,'--golden-dir',d,'--allow-missing'],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr)
