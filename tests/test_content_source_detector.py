import json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/deckforge/scripts'

def write_deck(blocks):
 deck={
  'schemaVersion':'2.1',
  'meta':{'id':'c','slug':'c','title':'C','language':'en'},
  'canvas':{'width':1600,'height':900,'safeMargin':64},
  'theme':{'id':'editorial-cream'},
  'presentation':{'mode':'horizontal','motionProfileId':'seminar-editorial','reducedMotion':'respect-system'},
  'editor':{'enable':True},
  'publish':{'enabled':False},
  'experience':{'density':'medium'},
  'sources':[{'id':'src-1','title':'S1','url':'https://example.com/s1'}],
  'slides':[{'id':'s1','title':'Slide','layout':'title-hero','density':'medium','layoutBindings':[],'blocks':blocks}],
 }
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/'deck.json';p.write_text(json.dumps(deck),encoding='utf-8')
  r=subprocess.run([sys.executable,str(SKILL/'audit_deck_content.py'),str(p)],capture_output=True,text=True)
  return r.returncode, r.stderr, r.stdout

class SourceDetectorTests(unittest.TestCase):
 def test_metric_with_source_passes(self):
  rc,err,out=write_deck([{'id':'b1','type':'metric','slot':'body','content':{'value':'42','label':'x'},'sourceIds':['src-1']}])
  self.assertEqual(rc,0)
 def test_metric_without_source_reports_error(self):
  rc,err,out=write_deck([{'id':'b1','type':'metric','slot':'body','content':{'value':'42','label':'x'},'sourceIds':[]}])
  self.assertNotEqual(rc,0)
  self.assertIn('no source',err)
 def test_metric_with_unknown_source_id_reports_error(self):
  rc,err,out=write_deck([{'id':'b1','type':'metric','slot':'body','content':{'value':'42','label':'x'},'sourceIds':['nope']}])
  self.assertNotEqual(rc,0)
