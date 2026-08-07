#!/usr/bin/env python3
"""Keyword-based trigger routing checker for DeckForge skills.

Approximates description-based skill routing so trigger precision can be tested
deterministically in CI. This is a test surrogate, not the agent harness router.

Usage:
    python scripts/evals/check_trigger_routing.py --prompt "Create an editable web presentation"
"""
from __future__ import annotations
import argparse, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILLS_DIR = ROOT / 'skills'

FORBIDDEN_DECK = re.compile(
    r"\b(login form|signup|e-commerce checkout|landing page hero|rest api|database schema|login)\b",
    re.IGNORECASE)
FORBIDDEN_FULL_WORKFLOW = re.compile(
    r"\b(pptx only|only a pptx|powerpoint only|just pptx)\b", re.IGNORECASE)


def skill_descriptions() -> dict[str, str]:
    descriptions: dict[str, str] = {}
    for skill in sorted(SKILLS_DIR.glob('*/SKILL.md')):
        header = skill.read_text(encoding='utf-8').split('---\n', 2)[1]
        match = re.search(r'^description:\s*(.+)$', header, re.M)
        if match:
            descriptions[skill.parent.name] = match.group(1).strip().lower()
    return descriptions


def route_prompt(prompt: str, skills: dict[str, str]) -> str | None:
    text = prompt.lower()
    if FORBIDDEN_DECK.search(text):
        return None
    if FORBIDDEN_FULL_WORKFLOW.search(text):
        return None
    has_evaluator = any('skill-evaluator' in key for key in skills)
    has_visual_evidence = any('visual-evidence' in key for key in skills)
    has_audit = any('audit' in key for key in skills)
    if has_evaluator and ('compare my' in text or 'evaluate' in text and 'skill' in text):
        return 'deckforge-skill-evaluator'
    if has_visual_evidence and ('verify' in text and 'visually' in text or 'screenshot' in text or 'browser session' in text):
        return 'deckforge-visual-evidence'
    if 'deckforge' in skills and ('slide deck' in text or 'editable web presentation' in text or 'presentation webapp' in text or 'create slides' in text or 'pitch deck' in text):
        return 'deckforge'
    if has_audit and ('audit' in text and 'deck' in text):
        return 'deckforge-audit'
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--prompt', required=True)
    args = ap.parse_args()
    result = route_prompt(args.prompt, skill_descriptions())
    print(result or 'NO_MATCH')
    return 0


if __name__ == '__main__':
    sys.exit(main())
