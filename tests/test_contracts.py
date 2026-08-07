import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / 'skills/deckforge/references'
REQUIRED = [
    'frontend-engineering-contract.md',
    'chart-accessibility-contract.md',
    'performance-budget-contract.md',
    'browser-evidence-contract.md',
    'skill-evaluation-contract.md',
    'provider-routing-contract.md',
]

class ContractTests(unittest.TestCase):
    def test_contracts_exist_and_are_substantial(self):
        for name in REQUIRED:
            path = CONTRACTS / name
            self.assertTrue(path.exists(), name)
            self.assertGreaterEqual(len(path.read_text(encoding='utf-8').split()), 60, name)

    def test_builtins_reference_contracts(self):
        builtins = ROOT / 'skills/deckforge/built-in-skills'
        mapping = {
            'accessibility.md': 'chart-accessibility-contract.md',
            'data-and-diagrams.md': 'chart-accessibility-contract.md',
            'performance.md': 'performance-budget-contract.md',
            'editor-experience.md': 'frontend-engineering-contract.md',
        }
        for filename, contract in mapping.items():
            text = (builtins / filename).read_text(encoding='utf-8')
            self.assertIn(contract, text, f'{filename} must reference {contract}')

if __name__ == '__main__':
    unittest.main()
