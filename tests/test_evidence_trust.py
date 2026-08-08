import json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/deckforge/scripts'

def run_audit(blocks, sources=None):
 deck={
  'schemaVersion':'2.1',
  'meta':{'id':'e','slug':'e','title':'E','language':'en'},
  'canvas':{'width':1600,'height':900,'safeMargin':64},
  'theme':{'id':'editorial-cream'},
  'presentation':{'mode':'horizontal','motionProfileId':'seminar-editorial','reducedMotion':'respect-system'},
  'editor':{'enable':True},
  'publish':{'enabled':False},
  'experience':{'density':'medium'},
  'sources':sources or [{'id':'src-1','title':'S','url':'https://example.com/s1'}],
  'slides':[{'id':'s1','title':'S','layout':'title-hero','density':'medium','layoutBindings':[],'blocks':blocks}],
 }
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/'deck.json';p.write_text(json.dumps(deck),encoding='utf-8')
  return subprocess.run([sys.executable,str(SKILL/'audit_deck_content.py'),str(p)],capture_output=True,text=True)

class EvidenceTrustTests(unittest.TestCase):
 def test_citation_with_source_passes(self):
  r=run_audit([{'id':'b1','type':'citation','slot':'body','content':'cite','sourceIds':['src-1']}])
  self.assertEqual(r.returncode,0,r.stderr)
 def test_citation_without_source_fails(self):
  r=run_audit([{'id':'b1','type':'citation','slot':'body','content':'cite','sourceIds':[]}])
  self.assertNotEqual(r.returncode,0)
 def test_metric_source_url_format_valid(self):
  r=run_audit([{'id':'b1','type':'metric','slot':'body','content':{'value':'4','label':'x'},'sourceIds':['src-1']}])
  self.assertEqual(r.returncode,0,r.stderr)
 def test_metric_source_bad_url_format_warns(self):
  r=run_audit([{'id':'b1','type':'metric','slot':'body','content':{'value':'4','label':'x'},'sourceIds':['src-bad']}],
              sources=[{'id':'src-bad','title':'X','url':'not-a-url'}])
  self.assertEqual(r.returncode,0,r.stderr)  # warning only in offline mode

if __name__=='__main__':unittest.main()
