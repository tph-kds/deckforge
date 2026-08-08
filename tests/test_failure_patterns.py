import json, subprocess, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/deckforge/scripts'

class FailurePatternTests(unittest.TestCase):
 def test_pattern1_layout_masquerade_rejected(self):
  r=subprocess.run([sys.executable,str(SKILL/'audit_deck_layout.py'),str(ROOT/'tests/fixtures/failure-pattern-1-layout-masquerade/deck.json'),'--strict'],capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0)
  self.assertIn('safe margins',r.stderr)
 def test_pattern3_sparse_composition_rejected(self):
  r=subprocess.run([sys.executable,str(SKILL/'audit_deck_layout.py'),str(ROOT/'tests/fixtures/failure-pattern-3-sparse-composition/deck.json'),'--strict'],capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0)
  self.assertIn('occupied ratio',r.stderr)
 def test_pattern4_decorative_motion_rejected(self):
  r=subprocess.run([sys.executable,str(SKILL/'audit_deck_motion.py'),str(ROOT/'tests/fixtures/failure-pattern-4-decorative-motion/deck.json')],capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0)
 def test_pattern5_hidden_shortcuts_rejected(self):
  r=subprocess.run([sys.executable,str(SKILL/'validate_output_contract.py'),str(ROOT/'tests/fixtures/failure-pattern-5-hidden-shortcuts'),'--profile','editable-deck'],capture_output=True,text=True)
  self.assertNotEqual(r.returncode,0)
  self.assertIn('shortcut-help',r.stderr)
