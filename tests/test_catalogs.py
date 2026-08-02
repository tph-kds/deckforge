import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "skills" / "deckforge" / "assets"


class CatalogTests(unittest.TestCase):
    def load(self, name):
        return json.loads((ASSETS / name).read_text(encoding="utf-8"))

    def test_counts(self):
        expected = {
            "template-manifest.json": 30,
            "theme-manifest.json": 30,
            "layout-manifest.json": 20,
            "block-manifest.json": 20,
            "animation-manifest.json": 10,
            "interaction-manifest.json": 20,
            "presenter-control-manifest.json": 15,
            "export-manifest.json": 5,
        }
        for filename, minimum in expected.items():
            self.assertGreaterEqual(len(self.load(filename)), minimum, filename)

    def test_unique_ids(self):
        keys = {
            "template-manifest.json": "id",
            "theme-manifest.json": "id",
            "layout-manifest.json": "id",
            "block-manifest.json": "type",
            "animation-manifest.json": "id",
            "interaction-manifest.json": "id",
            "presenter-control-manifest.json": "id",
            "export-manifest.json": "id",
        }
        for filename, key in keys.items():
            ids = [item[key] for item in self.load(filename)]
            self.assertEqual(len(ids), len(set(ids)), filename)

    def test_template_layout_references(self):
        layouts = {item["id"] for item in self.load("layout-manifest.json")}
        for template in self.load("template-manifest.json"):
            for step in template["slidePlan"]:
                self.assertIn(step["layout"], layouts, template["id"])


if __name__ == "__main__":
    unittest.main()
