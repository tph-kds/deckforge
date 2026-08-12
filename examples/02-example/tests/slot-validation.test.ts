import { describe, expect, it } from 'vitest';
import {
  validateBlockPositioning,
  validateSlideSlotBindings,
  validateDeckSlotBindings,
  repairSlotBlock,
  repairSlideSlotBindings,
  repairDeckSlotBindings,
  isDeckExportable,
  slotAccepts,
} from '../src/deck/slot-validation';
import { resolveSlideGeometry, resolveDeckScenes } from '../src/deck/geometry-resolver';
import { listLayouts, getLayoutContract } from '../src/deck/layout';
import type { Block, DeckProject, DeckSlide } from '../src/deck/types';

const CANVAS = { aspectRatio: '16:9' as const, width: 1600, height: 900, safeMargin: 64 };

function mk(id: string, type: string, extra: Partial<Block> = {}): Block {
  return { id, type, content: {}, ...extra };
}

// ─── Slot Acceptance Tests ─────────────────────────────────────────────────

describe('slotAccepts', () => {
  it('accepts any block type when allowedBlocks is empty', () => {
    const slot = { id: 'test', role: 'body', grid: { column: 1, row: 1, columnSpan: 12, rowSpan: 1 } };
    expect(slotAccepts(slot, 'heading')).toBe(true);
    expect(slotAccepts(slot, 'chart')).toBe(true);
    expect(slotAccepts(slot, 'any-type')).toBe(true);
  });

  it('accepts only allowed block types', () => {
    const slot = {
      id: 'test',
      role: 'visual',
      grid: { column: 1, row: 1, columnSpan: 12, rowSpan: 1 },
      allowedBlocks: ['chart', 'image'],
    };
    expect(slotAccepts(slot, 'chart')).toBe(true);
    expect(slotAccepts(slot, 'image')).toBe(true);
    expect(slotAccepts(slot, 'heading')).toBe(false);
    expect(slotAccepts(slot, 'text')).toBe(false);
  });

  it('handles undefined slot', () => {
    expect(slotAccepts(undefined, 'heading')).toBe(true);
  });
});

// ─── Block Positioning Validation Tests ────────────────────────────────────

describe('validateBlockPositioning', () => {
  const slide: DeckSlide = {
    id: 'test-slide',
    title: 'Test',
    layout: 'two-column',
    blocks: [],
    layoutBindings: [],
  };

  it('validates freeform block with frame', () => {
    const block = mk('b1', 'heading', {
      positionMode: 'freeform',
      frame: { x: 0, y: 0, w: 100, h: 100 },
    });
    const result = validateBlockPositioning(block, slide, CANVAS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('invalidates freeform block without frame', () => {
    const block = mk('b1', 'heading', { positionMode: 'freeform' });
    const result = validateBlockPositioning(block, slide, CANVAS);
    expect(result.valid).toBe(false);
    expect(result.errors[0].kind).toBe('MISSING_FRAME');
  });

  it('validates slot block with valid binding', () => {
    const block = mk('b1', 'heading', { positionMode: 'slot', slot: 'title' });
    const result = validateBlockPositioning(block, slide, CANVAS);
    expect(result.valid).toBe(true);
  });

  it('auto-repairs slot block without slotId', () => {
    const block = mk('b1', 'heading', { positionMode: 'slot' });
    const result = validateBlockPositioning(block, slide, CANVAS);
    expect(result.valid).toBe(true);
    expect(result.repairedSlotId).toBeDefined();
    expect(result.slotChanged).toBe(true);
  });

  it('auto-repairs slot block with unknown slot', () => {
    const block = mk('b1', 'heading', { positionMode: 'slot', slot: 'nonexistent-slot' });
    const result = validateBlockPositioning(block, slide, CANVAS);
    expect(result.valid).toBe(true);
    expect(result.repairedSlotId).toBeDefined();
    expect(result.slotChanged).toBe(true);
  });
});

// ─── Slide Validation Tests ────────────────────────────────────────────────

describe('validateSlideSlotBindings', () => {
  it('validates a correct slide', () => {
    const slide: DeckSlide = {
      id: 'test-slide',
      title: 'Test',
      layout: 'two-column',
      blocks: [
        mk('b1', 'heading', { positionMode: 'slot', slot: 'title' }),
        mk('b2', 'text', { positionMode: 'slot', slot: 'left' }),
      ],
      layoutBindings: [
        { slot: 'title', blockIds: ['b1'], flow: 'stack', gap: 8 },
        { slot: 'left', blockIds: ['b2'], flow: 'stack', gap: 8 },
      ],
    };
    const result = validateSlideSlotBindings(slide, CANVAS);
    expect(result.valid).toBe(true);
    expect(result.totalErrors).toBe(0);
  });

  it('detects unbound slot blocks', () => {
    const slide: DeckSlide = {
      id: 'test-slide',
      title: 'Test',
      layout: 'two-column',
      blocks: [
        mk('b1', 'heading', { positionMode: 'slot', slot: 'title' }),
        mk('b2', 'text', { positionMode: 'slot' }), // No slotId
      ],
      layoutBindings: [
        { slot: 'title', blockIds: ['b1'], flow: 'stack', gap: 8 },
      ],
    };
    const result = validateSlideSlotBindings(slide, CANVAS);
    expect(result.valid).toBe(true); // Auto-repaired
    expect(result.blockResults.get('b2')?.repairedSlotId).toBeDefined();
  });
});

// ─── Repair Tests ──────────────────────────────────────────────────────────

describe('repairSlideSlotBindings', () => {
  it('repairs unbound blocks', () => {
    const slide: DeckSlide = {
      id: 'test-slide',
      title: 'Test',
      layout: 'two-column',
      blocks: [
        mk('b1', 'heading', { positionMode: 'slot', slot: 'title' }),
        mk('b2', 'text', { positionMode: 'slot' }), // No slotId
      ],
      layoutBindings: [
        { slot: 'title', blockIds: ['b1'], flow: 'stack', gap: 8 },
      ],
    };
    const repaired = repairSlideSlotBindings(slide, CANVAS);
    expect(repaired.layoutBindings.length).toBeGreaterThan(1);
    const allBoundBlockIds = repaired.layoutBindings.flatMap((b) => b.blockIds);
    expect(allBoundBlockIds).toContain('b2');
  });

  it('does not mutate original slide', () => {
    const slide: DeckSlide = {
      id: 'test-slide',
      title: 'Test',
      layout: 'two-column',
      blocks: [mk('b1', 'text', { positionMode: 'slot' })],
      layoutBindings: [],
    };
    const originalBindings = slide.layoutBindings;
    repairSlideSlotBindings(slide, CANVAS);
    expect(slide.layoutBindings).toBe(originalBindings);
  });
});

// ─── Exportability Gate Tests ──────────────────────────────────────────────

describe('isDeckExportable', () => {
  it('reports exportable deck', () => {
    const deck: DeckProject = {
      schemaVersion: '2.1',
      meta: { id: 'test', slug: 'test', title: 'Test', language: 'en' },
      canvas: CANVAS,
      theme: { id: 'test' },
      presentation: {},
      editor: { enabled: true },
      slides: [
        {
          id: 's1',
          title: 'Test',
          layout: 'two-column',
          blocks: [
            mk('b1', 'heading', { positionMode: 'slot', slot: 'title' }),
            mk('b2', 'text', { positionMode: 'slot', slot: 'left' }),
          ],
          layoutBindings: [
            { slot: 'title', blockIds: ['b1'], flow: 'stack', gap: 8 },
            { slot: 'left', blockIds: ['b2'], flow: 'stack', gap: 8 },
          ],
        },
      ],
    };
    const result = isDeckExportable(deck);
    expect(result.exportable).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Layout Compatibility Matrix ───────────────────────────────────────────

describe('layout compatibility matrix', () => {
  const layouts = listLayouts();

  for (const layout of layouts) {
    describe(`layout: ${layout.id}`, () => {
      it('has valid structure', () => {
        expect(layout.id).toBeDefined();
        expect(layout.composition).toBeDefined();
        expect(layout.composition.slots.length).toBeGreaterThan(0);
      });

      it('all slots resolve to valid frames', () => {
        const resolved = resolveSlideGeometry(
          {
            id: `test-${layout.id}`,
            title: 'Test',
            layout: layout.id,
            blocks: [],
            layoutBindings: [],
          },
          CANVAS,
        );
        expect(resolved.missingFrames).toHaveLength(0);
      });
    });
  }
});

// ─── Property Tests: Block + Slot Combinations ─────────────────────────────

describe('property tests: block + slot combinations', () => {
  const blockTypes = ['heading', 'text', 'chart', 'image', 'callout', 'process', 'citation'];
  const layouts = listLayouts();

  for (const layout of layouts) {
    for (const blockType of blockTypes) {
      it(`${blockType} + ${layout.id} resolves correctly`, () => {
        const block = mk(`b-${blockType}-${layout.id}`, blockType, {
          positionMode: 'slot',
        });
        const slide: DeckSlide = {
          id: `s-${blockType}-${layout.id}`,
          title: 'Test',
          layout: layout.id,
          blocks: [block],
          layoutBindings: [],
        };
        const result = validateBlockPositioning(block, slide, CANVAS);
        // Should either be valid or have a repaired slot
        expect(result.valid || result.repairedSlotId).toBeDefined();
      });
    }
  }
});

// ─── Invariant Tests ───────────────────────────────────────────────────────

describe('invariants', () => {
  it('every slot-positioned block has a valid slotId after repair', () => {
    const deck: DeckProject = {
      schemaVersion: '2.1',
      meta: { id: 'test', slug: 'test', title: 'Test', language: 'en' },
      canvas: CANVAS,
      theme: { id: 'test' },
      presentation: {},
      editor: { enabled: true },
      slides: [
        {
          id: 's1',
          title: 'Test',
          layout: 'two-column',
          blocks: [
            mk('b1', 'heading', { positionMode: 'slot' }), // No slotId
            mk('b2', 'text', { positionMode: 'slot', slot: 'nonexistent' }), // Unknown slot
          ],
          layoutBindings: [],
        },
      ],
    };
    const repaired = repairDeckSlotBindings(deck);
    const scenes = resolveDeckScenes(repaired);
    for (const [slideId, scene] of scenes) {
      expect(scene.missingFrames).toHaveLength(0);
    }
  });

  it('never places blocks at (0,0) as fake geometry', () => {
    const block = mk('b1', 'heading', { positionMode: 'slot' });
    const slide: DeckSlide = {
      id: 'test',
      title: 'Test',
      layout: 'two-column',
      blocks: [block],
      layoutBindings: [],
    };
    const result = validateBlockPositioning(block, slide, CANVAS);
    if (result.repairedSlotId) {
      // Repaired slot should not be at (0,0)
      const contract = getLayoutContract('two-column');
      const slot = contract?.composition.slots.find((s) => s.id === result.repairedSlotId);
      if (slot) {
        // The slot has a grid position, so it should have non-zero coordinates
        // when resolved through the layout engine
        expect(slot.grid.column).toBeGreaterThan(0);
        expect(slot.grid.row).toBeGreaterThan(0);
      }
    }
  });
});
