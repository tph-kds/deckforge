import json, subprocess, sys, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SkillZipsIndexTests(unittest.TestCase):
    def test_index_lists_registry_skills(self):
        packager = ROOT / 'scripts/package/package_skill_zips.py'
        proc = subprocess.run([sys.executable, str(packager)], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        registry = json.loads((ROOT / 'config/skill-registry.json').read_text(encoding='utf-8'))
        index = json.loads((ROOT / 'skill-zips/index.json').read_text(encoding='utf-8'))
        ids = {e['id'] for e in index['skills']}
        expected = {s['id'] for s in registry['skills']}
        self.assertEqual(ids, expected)

if __name__ == '__main__':
    unittest.main()
