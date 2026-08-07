import unittest
from pathlib import Path
from scripts.evals.check_trigger_routing import route_prompt

SKILLS = {
    "deckforge": "create a professional browser-native slide deck or presentation webapp; editable web presentation",
    "deckforge-visual-evidence": "start a deckforge application in an isolated browser session, capture screenshots and evidence",
    "deckforge-skill-evaluator": "evaluate and improve deckforge agent skills; compare baseline current and candidate",
    "deckforge-audit": "audit an existing web slide deck for story ui ux layout accessibility motion performance",
}

class TriggerRoutingTests(unittest.TestCase):
    def test_positive_editable_deck(self):
        self.assertEqual(route_prompt("Create an editable web presentation for the product review", SKILLS), "deckforge")

    def test_positive_visual_evidence(self):
        self.assertEqual(route_prompt("Verify the editor visually and capture screenshots", SKILLS), "deckforge-visual-evidence")

    def test_positive_skill_evaluator(self):
        self.assertEqual(route_prompt("Compare my updated DeckForge skill against the current one", SKILLS), "deckforge-skill-evaluator")

    def test_negative_login_form(self):
        self.assertIsNone(route_prompt("Create a login form for my app", SKILLS))

    def test_negative_pptx_only(self):
        self.assertIsNone(route_prompt("Create only a PPTX file from this outline", SKILLS))

    def test_negative_react_hook(self):
        self.assertNotEqual(route_prompt("Fix one React hook that re-renders too often", SKILLS), "deckforge")

if __name__ == '__main__':
    unittest.main()
