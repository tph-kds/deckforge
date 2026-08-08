import json, subprocess, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/deckforge/scripts'
SCHEMA = ROOT / 'scripts/validate/validate_deck_project.py'


class FinishedProductTests(unittest.TestCase):
    DECK = ROOT / 'examples/finished-product/deck.json'
    PROJECT = ROOT / 'examples/finished-product'

    def test_deck_passes_schema(self):
        r = subprocess.run([sys.executable, str(SCHEMA), str(self.DECK)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_deck_passes_strict_layout(self):
        r = subprocess.run([sys.executable, str(SKILL / 'audit_deck_layout.py'), str(self.DECK), '--strict'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_deck_passes_content_audit(self):
        r = subprocess.run([sys.executable, str(SKILL / 'audit_deck_content.py'), str(self.DECK)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_deck_passes_motion_audit(self):
        r = subprocess.run([sys.executable, str(SKILL / 'audit_deck_motion.py'), str(self.DECK)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_output_contract_advisory_passes(self):
        r = subprocess.run([sys.executable, str(SKILL / 'validate_output_contract.py'), str(self.PROJECT), '--profile', 'editable-deck', '--advisory'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_deck_has_at_least_four_slides_with_unique_ids(self):
        data = json.loads(self.DECK.read_text(encoding='utf-8'))
        ids = [s['id'] for s in data['slides']]
        self.assertGreaterEqual(len(ids), 4)
        self.assertEqual(len(ids), len(set(ids)))


if __name__ == '__main__':
    unittest.main()
