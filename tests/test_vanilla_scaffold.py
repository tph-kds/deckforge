import subprocess, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/deckforge/scripts'
SCHEMA = ROOT / 'scripts/validate/validate_deck_project.py'


class VanillaScaffoldTests(unittest.TestCase):
    DECK = ROOT / 'examples/vanilla-scaffold/deck.json'
    PROJECT = ROOT / 'examples/vanilla-scaffold'

    def test_deck_passes_schema(self):
        r = subprocess.run([sys.executable, str(SCHEMA), str(self.DECK)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_deck_passes_strict_layout(self):
        r = subprocess.run([sys.executable, str(SKILL / 'audit_deck_layout.py'), str(self.DECK), '--strict'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_output_contract_advisory_passes(self):
        r = subprocess.run([sys.executable, str(SKILL / 'validate_output_contract.py'), str(self.PROJECT), '--profile', 'editable-deck', '--advisory'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == '__main__':
    unittest.main()
