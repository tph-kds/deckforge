import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class CliDiscoveryTests(unittest.TestCase):
 def test_offline_structural_check_passes(self):
  r=subprocess.run([sys.executable,str(ROOT/'scripts/validate/validate_cli_discovery.py')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
 def test_marketplace_matches_registry(self):
  registry=json.loads((ROOT/'config/skill-registry.json').read_text())
  market=json.loads((ROOT/'.agents/plugins/marketplace.json').read_text())
  self.assertEqual(market['name'],registry['name'])
  self.assertEqual([s['id'] for s in market['skills']],[s['id'] for s in registry['skills']])
 def test_plugin_manifests_list_all_registry_skills(self):
  registry=json.loads((ROOT/'config/skill-registry.json').read_text())
  for rel in ['.claude-plugin/plugin.json','.codex-plugin/plugin.json']:
   manifest=json.loads((ROOT/rel).read_text())
   self.assertEqual([s.split('/')[-1] for s in manifest['skills']],[s['id'] for s in registry['skills']])
