#!/usr/bin/env python3
"""Audit DeckProject content quality (plan §5.5, §20.1).

Deterministic checks that a generated deck is content-sound without an LLM:

- Duplicate slide titles.
- Generic/placeholder titles (e.g. "Overview", "Thank you") with no context.
- Repeated claims: the same normalized claim text on more than one slide.
- Empty content: text-bearing blocks with no content.
- Excessive density: block count vs the layout manifest's density budget.
- Incomplete metrics: metric blocks missing value or label.
- Charts without a caption or nearby explanation text.
- Metric claims without a backing source reference (or referencing an unknown source).
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / 'assets'

GENERIC_TITLES = {
    'overview', 'introduction', 'intro', 'conclusion', 'summary', 'thank you',
    'thanks', 'questions', 'q&a', 'agenda', 'outline', 'table of contents',
    'references', 'appendix', 'results', 'key takeaways', 'next steps',
    'background', 'context', 'discussion', 'details',
}

DENSITY_BUDGET = {'minimal': 4, 'low': 6, 'medium': 9, 'dense': 14}

TEXT_BLOCK_TYPES = {'heading', 'text', 'bullets', 'quote', 'callout', 'caption',
                    'citation', 'citation-list', 'metric', 'timeline',
                    'comparison', 'code', 'speaker-cue', 'process'}


def norm(s: str) -> str:
    s = re.sub(r'\s+', ' ', s or '').strip().lower()
    s = re.sub(r'[^a-z0-9\u00e0-\u024f\u4e00-\u9fff\uac00-\ud7af\u3040-\u30ff\s]', '', s)
    return s


def extract_text(block: dict) -> str:
    content = block.get('content')
    if content is None:
        return ''
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        if 'value' in content and isinstance(content.get('value'), str):
            return str(content.get('value', ''))
        if 'items' in content and isinstance(content['items'], list):
            return ' '.join(str(i) for i in content['items'])
        if 'steps' in content and isinstance(content['steps'], list):
            return ' '.join(
                str(s.get('title', '')) + ' ' + str(s.get('detail', ''))
                for s in content['steps']
            )
        if 'nodes' in content:
            return ' '.join(str(n) for n in content.get('nodes', []))
        if 'text' in content:
            return str(content.get('text', ''))
    if isinstance(content, list):
        return ' '.join(str(i) for i in content)
    return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('deck', type=Path)
    ap.add_argument('--strict', action='store_true', help='Treat warnings as failures')
    ap.add_argument('--json-report', type=Path)
    args = ap.parse_args()

    deck = json.loads(args.deck.read_text(encoding='utf-8'))
    layouts = {x['id']: x for x in json.loads((ASSETS / 'layout-manifest.json').read_text(encoding='utf-8'))}
    errors, warnings = [], []

    slides = deck.get('slides', [])
    title_by_norm = {}
    for slide in slides:
        sid = slide.get('id', '?')
        title = slide.get('title', '')
        key = norm(title)
        if key in title_by_norm:
            errors.append(f'{sid}: duplicate slide title {title!r} (also {title_by_norm[key]})')
        else:
            title_by_norm[key] = sid
        if key in GENERIC_TITLES:
            warnings.append(f'{sid}: generic title {title!r} provides no context')

        layout = layouts.get(slide.get('layout'), {})
        density = slide.get('density') or layout.get('density')
        budget = DENSITY_BUDGET.get(density)
        if budget is not None and len(slide.get('blocks', [])) > budget:
            warnings.append(f'{sid}: {len(slide["blocks"])} blocks exceeds {density} density budget of {budget}')

        has_chart = False
        for block in slide.get('blocks', []):
            btype = block.get('type')
            text = extract_text(block)
            if btype in TEXT_BLOCK_TYPES and not norm(text) and not block.get('decorative'):
                is_struct = btype in ('metric', 'timeline') and isinstance(block.get('content'), dict)
                if not is_struct:
                    errors.append(f'{sid}/{block.get("id")}: {btype} block has empty content')
            if btype == 'metric':
                content = block.get('content') or {}
                if not content.get('value') or not content.get('label'):
                    errors.append(f'{sid}/{block.get("id")}: metric missing value or label')
            if btype in ('chart', 'diagram'):
                has_chart = True

        if has_chart:
            slide_text = norm(' '.join(extract_text(b) for b in slide.get('blocks', [])))
            has_caption = any(b.get('type') == 'caption' for b in slide.get('blocks', []))
            if not has_caption and len(slide_text) < 80:
                warnings.append(f'{sid}: chart/diagram has no caption and little supporting text')

    # Evidence trust: metric blocks must carry a backing source reference.
    deck_sources = {s.get('id') for s in deck.get('sources', [])}
    for slide in slides:
        sid = slide.get('id', '?')
        for block in slide.get('blocks', []):
            if block.get('type') != 'metric':
                continue
            refs = block.get('sourceIds') or []
            if not refs:
                errors.append(f'{sid}/{block.get("id")}: metric claim has no source reference')
            else:
                for ref in refs:
                    if ref not in deck_sources:
                        errors.append(f'{sid}/{block.get("id")}: metric references unknown source {ref!r}')

    # Repeated claims across slides: identical normalized claim text on >1 slide.
    claim_by_slide = {}
    for slide in slides:
        sid = slide.get('id', '?')
        for block in slide.get('blocks', []):
            text = norm(extract_text(block))
            if len(text) < 20:
                continue
            if text in claim_by_slide and claim_by_slide[text] != sid:
                errors.append(f'{sid}: repeated claim {block.get("content", "")[:60]!r} also on {claim_by_slide[text]}')
            else:
                claim_by_slide.setdefault(text, sid)

    report = {'errors': errors, 'warnings': warnings}
    if args.json_report:
        args.json_report.write_text(json.dumps(report, indent=2), encoding='utf-8')
    for x in errors:
        print('ERROR:', x, file=sys.stderr)
    for x in warnings:
        print('WARNING:', x, file=sys.stderr)
    print(f'CONTENT: {len(slides)} slides, {len(errors)} errors, {len(warnings)} warnings')
    if errors or (args.strict and warnings):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
