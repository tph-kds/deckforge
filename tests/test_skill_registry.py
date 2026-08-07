import json, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SkillRegistryTests(unittest.TestCase):
    def load(self):
        return json.loads((ROOT / 'config/skill-registry.json').read_text(encoding='utf-8'))

    def test_registry_lists_all_skills(self):
        registry = self.load()
        names = {s['id'] for s in registry['skills']}
        expected = {
            'deckforge', 'deckforge-audit', 'deckforge-runtime-planner',
            'deckforge-publish', 'deckforge-export',
            'deckforge-visual-evidence', 'deckforge-skill-evaluator',
        }
        self.assertEqual(names, expected)

    def test_registry_matches_skill_directories(self):
        registry = self.load()
        for skill in registry['skills']:
            path = ROOT / 'skills' / skill['id']
            self.assertTrue(path.exists(), f"missing skill dir {skill['id']}")

if __name__ == '__main__':
    unittest.main()
