import json, unittest
from pathlib import Path
from scripts.generate.generate_manifests import generate_all

ROOT = Path(__file__).resolve().parents[1]

class ManifestGeneratorTests(unittest.TestCase):
    def setUp(self):
        self.registry = json.loads((ROOT / 'config/skill-registry.json').read_text(encoding='utf-8'))
        self.generated = generate_all(self.registry)

    def test_claude_plugin_lists_all_skills(self):
        manifest = self.generated['claude-plugin']
        ids = [s for s in manifest['skills']]
        self.assertIn('./skills/deckforge-visual-evidence', ids)
        self.assertIn('./skills/deckforge-skill-evaluator', ids)

    def test_marketplace_marks_workers_non_invocable(self):
        manifest = self.generated['marketplace']
        by_id = {s['id']: s for s in manifest['skills']}
        self.assertNotIn('userInvocable', by_id['deckforge-visual-evidence'])

    def test_routing_manifest_has_core_and_workers(self):
        manifest = self.generated['routing']
        self.assertIn('deckforge', manifest['coreSkills'])
        self.assertIn('deckforge-visual-evidence', manifest['conditionalSkills']['verification'])

if __name__ == '__main__':
    unittest.main()
