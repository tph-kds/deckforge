import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class ExampleTests(unittest.TestCase):
    def test_example_ids(self):
        data=json.loads((ROOT/'examples/ai-product-vision.deck.json').read_text())
        self.assertEqual(data['schemaVersion'],'2.0')
        self.assertTrue(data['slides'])
        ids=[s['id'] for s in data['slides']]
        self.assertEqual(len(ids),len(set(ids)))
if __name__=='__main__': unittest.main()
