import json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class PerformanceBudgetTests(unittest.TestCase):
 def test_missing_report_allowed(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/check_performance_budget.py'),'--allow-missing'],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
 def test_over_budget_lcp_fails(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'lhr.json'
   p.write_text(json.dumps({'audits':{'largest-contentful-paint':{'numericValue':5000},'interactive':{'numericValue':6000},'total-byte-weight':{'numericValue':3_000_000}}}),encoding='utf-8')
   r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/check_performance_budget.py'),'--report',str(p)],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
 def test_within_budget_passes(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'lhr.json'
   p.write_text(json.dumps({'audits':{'largest-contentful-paint':{'numericValue':1800},'interactive':{'numericValue':2500},'total-byte-weight':{'numericValue':700_000}}}),encoding='utf-8')
   r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/check_performance_budget.py'),'--report',str(p)],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr)
