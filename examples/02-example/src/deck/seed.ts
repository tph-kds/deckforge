import seed from '../../deck.json';
import type { Block, DeckProject, DeckSlide } from './types';

export function loadSeedDeck(): DeckProject {
  return structuredClone(seed) as unknown as DeckProject;
}

export function newId(prefix = 'b'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeTextBlock(id: string, content: string, slot: string): Block {
  return {
    id,
    type: 'text',
    content,
    style: {},
    sourceIds: [],
    slot,
    positionMode: 'slot',
  };
}

export function makeHeadingBlock(id: string, content: string, slot: string, level = 3): Block {
  return {
    id,
    type: 'heading',
    content,
    style: { level },
    sourceIds: [],
    slot,
    positionMode: 'slot',
  };
}

/** Rebind blocks from a legacy layout to a new layout by best-effort slot mapping. */
const SLOT_ALIASES: Record<string, string[]> = {
  title: ['title'],
  kicker: ['kicker', 'context', 'chapter'],
  subtitle: ['subtitle', 'support', 'interpretation', 'meaning'],
  visual: ['visual', 'chart', 'map', 'devices', 'gallery', 'demo', 'accent'],
  'option-a': ['option-a', 'before', 'left', 'column-1'],
  'option-b': ['option-b', 'after', 'right', 'column-2'],
  decision: ['decision', 'impact', 'takeaway', 'outcome'],
  steps: ['steps', 'timeline', 'process'],
  footer: ['footer', 'contact', 'source', 'caption', 'meta'],
};

export function migrateLayoutBindings(
  slide: DeckSlide,
  newLayout: string,
): DeckSlide {
  const blocks = slide.blocks.filter((block) => block.slot);
  const assigned = new Set<string>();
  const bindings: DeckSlide['layoutBindings'] = [];
  for (const [targetSlot, aliases] of Object.entries(SLOT_ALIASES)) {
    const matched = blocks.filter(
      (block) => block.slot && aliases.includes(block.slot) && !assigned.has(block.id),
    );
    if (matched.length) {
      bindings.push({
        slot: targetSlot,
        blockIds: matched.map((block) => block.id),
        flow: 'stack',
        gap: 10,
      });
      matched.forEach((block) => assigned.add(block.id));
    }
  }
  return {
    ...slide,
    layout: newLayout,
    layoutBindings: bindings,
  };
}
