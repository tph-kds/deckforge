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
 def test_stress_test_deck_passes_all_audits(self):
  path=ROOT/'examples/stress-test-30.deck.json'
  data=json.loads(path.read_text())
  self.assertEqual(len(data['slides']),30)
  ids=[s['id'] for s in data['slides']]
  self.assertEqual(len(ids),len(set(ids)))
  subprocess.run([sys.executable,str(ROOT/'scripts/audit_deck_layout.py'),str(path),'--strict'],check=True)
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),str(path)],check=True)
 def test_theme_variant_example_passes_audits(self):
  path=ROOT/'examples/acme-platform-migration.deck.json'
  data=json.loads(path.read_text())
  self.assertEqual(data['schemaVersion'],'2.1')
  self.assertEqual(data['presentation']['motionProfileId'],'seminar-editorial')
  self.assertEqual(data['theme']['id'],'editorial-cream')
  subprocess.run([sys.executable,str(ROOT/'scripts/audit_deck_layout.py'),str(path),'--strict'],check=True)
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),str(path)],check=True)
 def test_motion_audit_fails_for_static_deck(self):
  import tempfile, json, os
  static={'presentation':{'mode':'horizontal','transition':'','reducedMotion':'respect-system'},'slides':[{'id':'s1','title':'t','layout':'title-hero','blocks':[{'id':'b1','type':'text','content':'x'}]}]}
  with tempfile.TemporaryDirectory() as d:
   p=os.path.join(d,'deck.json');Path(p).write_text(json.dumps(static),encoding='utf-8')
   r=subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),p],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
 def test_content_audit_passes_for_real_decks(self):
  for name in ('ai-product-vision.deck.json','02-example/deck.json','acme-platform-migration.deck.json'):
   subprocess.run([sys.executable,str(ROOT/'scripts/audit_deck_content.py'),str(ROOT/'examples'/name)],check=True)
 def test_ai_product_vision_passes_all_audits(self):
  path=ROOT/'examples/ai-product-vision.deck.json'
  subprocess.run([sys.executable,str(ROOT/'scripts/audit_deck_layout.py'),str(path),'--strict'],check=True)
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),str(path)],check=True)
 def test_content_audit_fails_for_violation_fixture(self):
  path=ROOT/'tests/fixtures/content-violations/deck.json'
  r=subprocess.run([sys.executable,str(ROOT/'scripts/audit_deck_content.py'),str(path)],capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0)
  for needle in ('duplicate slide title','empty content','metric missing','repeated claim'):
   self.assertIn(needle,r.stderr)
 def test_embedded_skill_copy_in_sync(self):
  import hashlib
  canon=ROOT/'skills/deckforge';embed=ROOT/'examples/02-example/.agents/skills/deckforge'
  def md5(p):return hashlib.md5(p.read_bytes()).hexdigest()
  missing=[str(c.relative_to(canon)) for c in canon.rglob('*') if c.is_file() and not (embed/c.relative_to(canon)).exists()]
  drift=[]
  for c in canon.rglob('*'):
   if not c.is_file():continue
   rel=c.relative_to(canon);d=embed/rel
   if d.exists() and md5(c)!=md5(d):drift.append(str(rel))
  stale=[str(d.relative_to(embed)) for d in embed.rglob('*') if d.is_file() and not (canon/d.relative_to(embed)).exists()]
  self.assertEqual(missing+drift+stale,[])
if __name__=='__main__':unittest.main()
