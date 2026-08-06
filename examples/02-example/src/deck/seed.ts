import seed from '../../deck.json';
import type { Block, DeckProject, DeckSlide } from './types';
import { getLayoutContract, type LayoutSlotContract } from './layout';

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

const SLOT_ALIAS_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SLOT_ALIASES).flatMap(([target, aliases]) => aliases.map((alias) => [alias, target])),
);

/** Generic fallback slots that accept most block types when no better match exists. */
const GENERIC_SLOTS = ['left', 'right', 'column-1', 'column-2', 'column-3', 'support', 'content', 'body'];

function slotAccepts(slot: LayoutSlotContract, type: string): boolean {
  return !slot.allowedBlocks?.length || slot.allowedBlocks.includes(type);
}

/**
 * Lossless layout migration (P0-003, DF-012).
 *
 * Rebinds every non-background, non-freeform block to a slot in the target
 * layout so no block disappears when a layout changes. Mapping priority:
 *
 * 1. The block's current slot, when it exists in the target layout and accepts
 *    the block type.
 * 2. A semantic alias slot in the target layout that accepts the block type.
 * 3. A generic slot in the target layout that accepts the block type.
 * 4. Any target slot with remaining capacity (never drops a block).
 *
 * Freeform and background blocks are left untouched: they live on their own
 * rendering layer and are not bound to slots.
 */
export function migrateLayoutBindings(
  slide: DeckSlide,
  newLayout: string,
): DeckSlide {
  const contract = getLayoutContract(newLayout);
  if (!contract?.composition?.slots.length) {
    return { ...slide, layout: newLayout, layoutBindings: slide.layoutBindings };
  }

  const slots = contract.composition.slots;
  const responsiveOrder = contract.composition.responsiveOrder ?? slots.map((slot) => slot.id);
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  const slotCapacity = new Map<string, number>();
  for (const slot of slots) {
    slotCapacity.set(slot.id, slot.maxItems ?? Number.POSITIVE_INFINITY);
  }

  const targetIds = new Set(slots.map((slot) => slot.id));
  const slotBlocks = slide.blocks.filter((block) => block.positionMode !== 'background' && block.positionMode !== 'freeform');
  const boundCounts = new Map<string, number>();
  const assigned = new Set<string>();
  const bindingMap = new Map<string, string[]>();

  const place = (blockId: string, slotId: string) => {
    const used = boundCounts.get(slotId) ?? 0;
    if (used >= slotCapacity.get(slotId)!) return false;
    const list = bindingMap.get(slotId) ?? [];
    bindingMap.set(slotId, [...list, blockId]);
    boundCounts.set(slotId, used + 1);
    assigned.add(blockId);
    return true;
  };

  /** Place without a capacity check; used only as a last resort to avoid data loss. */
  const placeUnchecked = (slotId: string, blockId: string) => {
    const list = bindingMap.get(slotId) ?? [];
    bindingMap.set(slotId, [...list, blockId]);
    boundCounts.set(slotId, (boundCounts.get(slotId) ?? 0) + 1);
    assigned.add(blockId);
    return true;
  };

  const candidateSlotsFor = (block: Block): string[] => {
    const current = block.slot;
    const candidates = new Set<string>();
    if (current && targetIds.has(current)) candidates.add(current);
    const alias = current ? SLOT_ALIAS_REVERSE[current] : undefined;
    if (alias && targetIds.has(alias)) candidates.add(alias);
    for (const generic of GENERIC_SLOTS) {
      if (targetIds.has(generic)) candidates.add(generic);
    }
    // Fallback: any target slot (keep deterministic order, required slots first).
    const ordered = [...slots].sort((a, b) => Number(Boolean(b.required)) - Number(Boolean(a.required)));
    for (const slot of ordered) candidates.add(slot.id);
    return [...candidates];
  };

  for (const block of slotBlocks) {
    if (assigned.has(block.id)) continue;
    const candidates = candidateSlotsFor(block);
    const chosen = candidates.find((slotId) => slotAccepts(slotById.get(slotId)!, block.type) && place(block.id, slotId));
    if (!chosen) {
      // Last resort: bind to any slot that accepts the block type even when at
      // capacity (soft overflow is a warning, not data loss), then to any slot
      // regardless of allowedBlocks so a block never silently disappears.
      const accepting = [...slots].find((slot) => slotAccepts(slot, block.type) && placeUnchecked(slot.id, block.id));
      if (!accepting) {
        for (const slot of slots) {
          if (placeUnchecked(slot.id, block.id)) break;
        }
      }
    }
  }

  const layoutBindings = responsiveOrder
    .filter((slotId) => bindingMap.has(slotId))
    .map((slotId) => ({
      slot: slotId,
      blockIds: bindingMap.get(slotId)!,
      flow: 'stack' as const,
      gap: 10,
    }));

  return {
    ...slide,
    layout: newLayout,
    layoutBindings,
  };
}
