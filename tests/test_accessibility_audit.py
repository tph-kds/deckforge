import json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/deckforge/scripts'

def base_deck(**over):
 deck={
  'schemaVersion':'2.1',
  'meta':{'id':'a','slug':'a','title':'A','language':'en'},
  'canvas':{'width':1600,'height':900,'safeMargin':64},
  'theme':{'id':'editorial-cream'},
  'presentation':{'mode':'horizontal','motionProfileId':'seminar-editorial','reducedMotion':'respect-system'},
  'editor':{'enable':True},
  'publish':{'enabled':False},
  'experience':{'density':'medium'},
  'slides':[{'id':'s1','title':'S','layout':'title-hero','density':'medium','layoutBindings':[],'blocks':[{'id':'b1','type':'text','slot':'body','content':'hello'}]}],
 }
 deck.update(over);return deck

class AccessibilityAuditTests(unittest.TestCase):
 def test_editable_example_passes(self):
  r=subprocess.run([sys.executable,str(SKILL/'audit_accessibility.py'),str(ROOT/'examples/02-example/deck.json')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
 def test_reduced_motion_required(self):
  d=base_deck();d['presentation']['reducedMotion']=''
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'deck.json';p.write_text(json.dumps(d),encoding='utf-8')
   r=subprocess.run([sys.executable,str(SKILL/'audit_accessibility.py'),str(p)],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
