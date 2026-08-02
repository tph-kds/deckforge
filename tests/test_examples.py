import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ExampleTests(unittest.TestCase):
 def test_example_ids_and_version(self):
  for path in [ROOT/'examples/ai-product-vision.deck.json',ROOT/'examples/02-example/deck.json']:
   data=json.loads(path.read_text())
   self.assertEqual(data['schemaVersion'],'2.1')
   self.assertTrue(data['slides'])
   ids=[s['id'] for s in data['slides']]
   self.assertEqual(len(ids),len(set(ids)))
   self.assertIn('experience',data)
 def test_static_presenter_fails_editable_contract(self):
  result=subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/validate_output_contract.py'),str(ROOT/'tests/fixtures/static-presenter'),'--profile','editable-deck'],capture_output=True,text=True)
  self.assertNotEqual(result.returncode,0)
  self.assertIn('editor-shell',result.stderr)
 def test_editable_example_contract(self):
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_layout.py'),str(ROOT/'examples/02-example/deck.json')],check=True)
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/validate_output_contract.py'),str(ROOT/'examples/02-example'),'--profile','editable-deck'],check=True)
 def test_motion_audit_passes_for_editable_example(self):
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),str(ROOT/'examples/02-example/deck.json')],check=True)
 def test_editable_example_passes_motion_and_chrome_checks(self):
  result=subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/validate_output_contract.py'),str(ROOT/'examples/02-example'),'--profile','editable-deck'],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
 def test_motion_audit_fails_for_static_deck(self):
  import tempfile, json, os
  static={'presentation':{'mode':'horizontal','transition':'','reducedMotion':'respect-system'},'slides':[{'id':'s1','title':'t','layout':'title-hero','blocks':[{'id':'b1','type':'text','content':'x'}]}]}
  with tempfile.TemporaryDirectory() as d:
   p=os.path.join(d,'deck.json');open(p,'w',encoding='utf-8').write(json.dumps(static))
   r=subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),p],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
if __name__=='__main__':unittest.main()
