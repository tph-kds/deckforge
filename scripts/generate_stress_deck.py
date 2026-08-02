#!/usr/bin/env python3
"""Generate a 30-slide stress-test deck from the validated 02-example deck.

Clones the source deck's slides with remapped slide/block ids so the result
passes schema, layout, motion, and output-contract audits while exercising
grid, overview, and rendering performance at 30 slides (plan §20.5).
"""
from __future__ import annotations
import json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
SOURCE = HERE / 'examples' / '02-example' / 'deck.json'
TARGET = HERE / 'examples' / 'stress-test-30.deck.json'
TARGET_SLIDES = 30

def remap(deck: dict, count: int) -> dict:
    slides = deck['slides']
    out = []
    for i in range(count):
        src = slides[i % len(slides)]
        clone = json.loads(json.dumps(src))
        id_map = {}
        slide_id = f"s-stress-{i + 1:02d}"
        id_map[clone['id']] = slide_id
        clone['id'] = slide_id
        clone['title'] = f"{clone.get('title', 'Slide')} {i + 1}"
        new_blocks = []
        for block in clone['blocks']:
            old_id = block['id']
            new_id = f"b-stress-{i + 1:02d}-{len(new_blocks) + 1:02d}"
            id_map[old_id] = new_id
            block['id'] = new_id
            new_blocks.append(block)
        clone['blocks'] = new_blocks
        for binding in clone.get('layoutBindings', []):
            binding['blockIds'] = [id_map.get(b, b) for b in binding['blockIds']]
        if clone.get('focalBlockId'):
            clone['focalBlockId'] = id_map.get(clone['focalBlockId'], clone['focalBlockId'])
        for interaction in clone.get('interactions', []):
            if interaction.get('targetBlockId'):
                interaction['targetBlockId'] = id_map.get(interaction['targetBlockId'], interaction['targetBlockId'])
        out.append(clone)
    return {**deck, 'slides': out}

def main() -> int:
    source = json.loads(SOURCE.read_text(encoding='utf-8'))
    target = remap(source, TARGET_SLIDES)
    TARGET.write_text(json.dumps(target, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'wrote {TARGET} with {len(target["slides"])} slides')
    return 0

if __name__ == '__main__':
    sys.exit(main())
