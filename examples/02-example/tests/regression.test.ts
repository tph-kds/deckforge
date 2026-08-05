import { describe, expect, it } from 'vitest';
import type { DeckProject } from '../src/deck/types';
import type { MeasureIssue } from '../src/deck/measure';
import { measureSlide, hasBlockingIssues } from '../src/deck/measure';
import { resolveSlidePlacements, getLayoutContract } from '../src/deck/layout';
import { repairDeck, repairSlide } from '../src/deck/repair';
import type { RepairResult } from '../src/deck/repair';
import { reducedMotionMode } from '../src/deck/motion';
import { resolveImage, validateDeckAssets } from '../src/deck/assets';
import { checkFontCompatibility } from '../src/export/pptx/pptx-fonts';
import { mapThemeFonts } from '../src/export/pptx/pptx-theme';
import { getExportability } from '../src/export/pptx/block-exporters';
import { runExportPreflight } from '../src/export/export-preflight';
import { DEFAULT_PPTX_CONFIG } from '../src/export/export-types';

import fixtureFreeformSlot from './fixtures/regression-freeform-slot.json';
import fixtureReusedSlots from './fixtures/regression-reused-slots.json';
import fixtureLongContent from './fixtures/regression-long-content.json';
import fixtureMedia from './fixtures/regression-media.json';
import fixtureNarrowViewport from './fixtures/regression-narrow-viewport.json';
import fixtureLargeTable from './fixtures/regression-large-table.json';
import fixtureReload from './fixtures/regression-reload.json';

function loadFixture(raw: unknown): DeckProject {
  return structuredClone(raw) as DeckProject;
}

/**
 * App-level structural validation mirroring what the pipeline requires:
 * required top-level sections, unique IDs, valid layouts/slots, bindings that
 * reference existing blocks exactly once, and resolvable source references.
 */
function validateDeckShape(deck: DeckProject): string[] {
  const errors: string[] = [];
  const requiredTop: Array<keyof DeckProject> = [
    'schemaVersion',
    'meta',
    'canvas',
    'theme',
    'presentation',
    'editor',
    'slides',
    'publish',
    'experience',
  ];
  for (const key of requiredTop) {
    if (!(key in deck)) errors.push(`missing top-level "${key}"`);
  }
  if (deck.schemaVersion !== '2.1') errors.push(`schemaVersion "${deck.schemaVersion}"`);
  if (!['16:9', '4:3', 'custom'].includes(deck.canvas.aspectRatio)) errors.push('invalid canvas.aspectRatio');
  if (!(deck.canvas.width > 0) || !(deck.canvas.height > 0)) errors.push('invalid canvas dimensions');
  if (deck.slides.length === 0) errors.push('no slides');

  const slideIds = new Set<string>();
  const sourceIds = new Set((deck.sources ?? []).map((source) => source.id));

  for (const slide of deck.slides) {
    if (!slide.id || !slide.title || !slide.layout || !Array.isArray(slide.blocks)) {
      errors.push(`slide "${slide.id ?? '?'}" is malformed`);
    }
    if (slideIds.has(slide.id)) errors.push(`duplicate slide id "${slide.id}"`);
    slideIds.add(slide.id);

    const contract = getLayoutContract(slide.layout);
    if (!contract) {
      errors.push(`slide "${slide.id}" uses unknown layout "${slide.layout}"`);
      continue;
    }
    const slotIds = new Set(contract.composition.slots.map((slot) => slot.id));
    const localIds = new Set<string>();

    for (const block of slide.blocks) {
      if (!block.id || !block.type) errors.push(`slide "${slide.id}" has a block without id/type`);
      if (localIds.has(block.id)) errors.push(`duplicate block id "${block.id}"`);
      localIds.add(block.id);
      const mode = block.positionMode ?? (block.slot ? 'slot' : 'freeform');
      if (mode === 'freeform' && !block.frame) errors.push(`freeform block "${block.id}" has no frame`);
      if (mode === 'slot' && !block.slot) errors.push(`slot block "${block.id}" has no slot`);
      if (mode === 'slot' && block.slot && !slotIds.has(block.slot)) {
        errors.push(`block "${block.id}" references unknown slot "${block.slot}"`);
      }
      for (const sourceId of block.sourceIds ?? []) {
        if (!sourceIds.has(sourceId)) errors.push(`block "${block.id}" references unknown source "${sourceId}"`);
      }
    }

    const bound = new Set<string>();
    for (const binding of slide.layoutBindings ?? []) {
      if (!slotIds.has(binding.slot)) errors.push(`slide "${slide.id}" binding references unknown slot "${binding.slot}"`);
      for (const blockId of binding.blockIds) {
        if (!localIds.has(blockId)) errors.push(`slide "${slide.id}" binding references unknown block "${blockId}"`);
        if (bound.has(blockId)) errors.push(`slide "${slide.id}" binds block "${blockId}" more than once`);
        bound.add(blockId);
      }
    }

    for (const sourceId of slide.sources ?? []) {
      if (!sourceIds.has(sourceId)) errors.push(`slide "${slide.id}" references unknown source "${sourceId}"`);
    }
  }
  return errors;
}

function runPipeline(deck: DeckProject): {
  schemaErrors: string[];
  measures: Array<{ slideId: string; issues: MeasureIssue[] }>;
  repairResults: RepairResult[];
} {
  const schemaErrors = validateDeckShape(deck);
  const measures = deck.slides.map((slide) => ({ slideId: slide.id, issues: measureSlide(deck, slide) }));
  const repairResults = repairDeck(deck);
  return { schemaErrors, measures, repairResults };
}

/** Each block renders exactly once: slot/flow blocks land on one slot, freeform/background blocks stay off the slot layer. */
function expectLayoutGroupsBlocksOnce(deck: DeckProject): void {
  for (const slide of deck.slides) {
    const placements = resolveSlidePlacements(slide, deck.canvas);
    const counts = new Map<string, number>();
    for (const placement of placements) {
      counts.set(placement.blockId, (counts.get(placement.blockId) ?? 0) + 1);
    }
    for (const block of slide.blocks) {
      const onSlotLayer = block.positionMode === 'freeform' || block.positionMode === 'background';
      const expected = onSlotLayer ? 0 : 1;
      expect(counts.get(block.id) ?? 0, `${slide.id}/${block.id} placed ${counts.get(block.id) ?? 0} times`).toBe(expected);
    }
  }
}

/** Repair is idempotent: a repaired deck is already clean, so re-repairing makes no further attempts. */
function expectRepairIdempotent(deck: DeckProject): void {
  for (const slide of deck.slides) {
    const again = repairSlide(deck, slide.id);
    expect(again.accepted).toBe(true);
    expect(again.attempts).toHaveLength(0);
  }
}

describe('P0-010 regression fixtures', () => {
  it('freeform block with a slot value is never placed on the slot layer', () => {
    const deck = loadFixture(fixtureFreeformSlot);
    const { schemaErrors, measures, repairResults } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);

    const slide = deck.slides[0];
    const placements = resolveSlidePlacements(slide, deck.canvas);
    const freeform = slide.blocks.find((block) => block.id === 'b-freeform')!;
    expect(freeform.positionMode).toBe('freeform');
    expect(freeform.slot).toBe('title');
    expect(placements.some((placement) => placement.blockId === 'b-freeform')).toBe(false);

    const issues = measures[0].issues;
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(repairResults[0].accepted).toBe(true);
    expect(repairResults[0].attempts).toHaveLength(0);
  });

  it('empty presenter action does not throw and stays repairable', () => {
    const deck = loadFixture(fixtureFreeformSlot);
    const slide = deck.slides[0];
    expect(slide.interactions).toHaveLength(1);
    expect(slide.interactions?.[0].payload).toEqual({});
    expect(deck.presentation.defaultBuilds).toBe(false);
    expect(() => measureSlide(deck, slide)).not.toThrow();
    const result = repairSlide(deck, slide.id);
    expect(result.accepted).toBe(true);
  });

  it('reused slot names are scoped per slide', () => {
    const deck = loadFixture(fixtureReusedSlots);
    const { schemaErrors, measures } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);

    const [first, second] = deck.slides;
    expect(first.layout).toBe('title-hero');
    expect(second.layout).toBe('title-hero');

    const idsFirst = new Set(resolveSlidePlacements(first, deck.canvas).map((placement) => placement.blockId));
    const idsSecond = new Set(resolveSlidePlacements(second, deck.canvas).map((placement) => placement.blockId));
    for (const id of idsFirst) expect(idsSecond.has(id)).toBe(false);
    for (const id of idsSecond) expect(idsFirst.has(id)).toBe(false);

    const slotsFirst = new Set(resolveSlidePlacements(first, deck.canvas).map((placement) => placement.slotId));
    const slotsSecond = new Set(resolveSlidePlacements(second, deck.canvas).map((placement) => placement.slotId));
    expect(slotsFirst.has('title')).toBe(true);
    expect(slotsSecond.has('title')).toBe(true);

    for (const slide of deck.slides) {
      expect(hasBlockingIssues(measureSlide(deck, slide))).toBe(false);
    }
    expect(measures).toHaveLength(2);
  });

  it('long title, body, and URL are measured deterministically and repair converges', () => {
    const deck = loadFixture(fixtureLongContent);
    const { schemaErrors, measures } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);

    const slide = deck.slides[0];
    const issues = measures[0].issues;

    const overflow = issues.find((issue) => issue.blockId === 'b-subtitle');
    expect(overflow).toBeDefined();
    expect(overflow?.code).toBe('overflow');
    expect(overflow?.severity).toBe('error');

    const orphan = issues.find((issue) => issue.blockId === 'b-title');
    expect(orphan).toBeDefined();
    expect(orphan?.code).toBe('orphan');

    const urlBudget = issues.find((issue) => issue.slot === 'meta' && issue.code === 'budget');
    expect(urlBudget).toBeDefined();

    const result = repairSlide(deck, slide.id, 3, true);
    expect(result.accepted).toBe(true);
    expect(result.attempts.length).toBeGreaterThan(0);
    expect(hasBlockingIssues(measureSlide(result.deck, result.deck.slides[0]))).toBe(false);
    expectRepairIdempotent(result.deck);
  });

  it('mixed-language text is measured without error', () => {
    const deck = loadFixture(fixtureLongContent);
    const slide = deck.slides[0];
    const kicker = slide.blocks.find((block) => block.id === 'b-kicker')!;
    expect(kicker.content).toMatch(/Xin chào/);
    expect(kicker.content).toMatch(/Hello/);
    const issues = measureSlide(deck, slide);
    expect(issues.some((issue) => issue.blockId === 'b-kicker' && issue.severity === 'error')).toBe(false);
  });

  it('broken image resolves to failed and is flagged by asset validation', () => {
    const deck = loadFixture(fixtureMedia);
    const { schemaErrors } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);

    const slide = deck.slides.find((s) => s.id === 's-image')!;
    const imageBlock = slide.blocks.find((block) => block.id === 'b-image')!;
    const resolved = resolveImage(deck, imageBlock);
    expect(resolved.status).toBe('failed');

    const assetIssues = validateDeckAssets(deck);
    expect(assetIssues.some((issue) => issue.code === 'unknown-asset')).toBe(true);
    expect(assetIssues.some((issue) => issue.severity === 'error')).toBe(true);
  });

  it('a missing font resolves to a deterministic substitution warning', () => {
    const deck = loadFixture(fixtureMedia);
    expect(mapThemeFonts(deck.theme).heading).toBe('NonExistent Display Sans');
    const warning = checkFontCompatibility(mapThemeFonts(deck.theme).heading);
    expect(warning).not.toBeNull();
    expect(warning?.substituteFont).toBe('Arial');
  });

  it('an export-unsupported block kind is flagged, not silently skipped', async () => {
    const deck = loadFixture(fixtureMedia);
    expect(getExportability('timeline')).toBe('image-only');
    const preflight = await runExportPreflight(deck, DEFAULT_PPTX_CONFIG);
    const unsupported = preflight.issues.find((issue) => issue.code === 'unsupported-block-type');
    expect(unsupported).toBeDefined();
    expect(unsupported?.blockId).toBe('b2-steps');
    for (const slide of deck.slides) {
      expect(hasBlockingIssues(measureSlide(deck, slide))).toBe(false);
    }
  });

  it('narrow viewport resolves within canvas bounds and honors reduced motion', () => {
    const deck = loadFixture(fixtureNarrowViewport);
    const { schemaErrors } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);
    expect(reducedMotionMode(deck)).toBe('always');

    const slide = deck.slides[0];
    for (const placement of resolveSlidePlacements(slide, deck.canvas)) {
      expect(placement.frame.x).toBeGreaterThanOrEqual(0);
      expect(placement.frame.y).toBeGreaterThanOrEqual(0);
      expect(placement.frame.x + placement.frame.w).toBeLessThanOrEqual(deck.canvas.width);
      expect(placement.frame.y + placement.frame.h).toBeLessThanOrEqual(deck.canvas.height);
    }
    expect(hasBlockingIssues(measureSlide(deck, slide))).toBe(false);
  });

  it('a large table block flows through measurement and repair', () => {
    const deck = loadFixture(fixtureLargeTable);
    const { schemaErrors } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);

    const slide = deck.slides[0];
    const table = slide.blocks.find((block) => block.id === 'b-table')!;
    const content = table.content as { headers?: string[]; rows?: unknown[][] };
    expect(content.headers?.length).toBeGreaterThanOrEqual(8);
    expect(content.rows?.length).toBeGreaterThanOrEqual(8);
    expect(getExportability('table')).toBe('native-editable');

    const issues = measureSlide(deck, slide);
    expect(hasBlockingIssues(issues)).toBe(false);
    const result = repairSlide(deck, slide.id);
    expect(result.accepted).toBe(true);
  });

  it('a round-tripped deck still loads, validates, and runs the pipeline', () => {
    const deck = loadFixture(fixtureReload);
    const { schemaErrors } = runPipeline(deck);
    expect(schemaErrors).toEqual([]);
    expectLayoutGroupsBlocksOnce(deck);

    const reloaded = JSON.parse(JSON.stringify(deck)) as DeckProject;
    expect(JSON.stringify(reloaded)).toBe(JSON.stringify(deck));
    expect(validateDeckShape(reloaded)).toEqual([]);

    const slide = reloaded.slides[0];
    expect(slide.layoutVariant).toBe('statement-default');
    expect(slide.tags).toContain('roundtrip');
    expect(reloaded.theme.overrides?.typography).toBeDefined();
    expect(reloaded.meta.updatedAt).toBe('1970-01-01T00:00:00.000Z');

    const block = slide.blocks.find((b) => b.id === 'b-statement')!;
    expect(block.data).toEqual({ migrated: true, sourceVersion: '2.0' });

    expect(hasBlockingIssues(measureSlide(reloaded, slide))).toBe(false);
    const result = repairSlide(reloaded, slide.id);
    expect(result.accepted).toBe(true);
    expect(result.attempts).toHaveLength(0);
  });
});
