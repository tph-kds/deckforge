import type { DeckBlock, DeckProject, DeckSlide, Frame } from './deck-types';

export type LayoutSlot = {
  id: string;
  grid: { column: number; row: number; columnSpan: number; rowSpan: number };
  allowedBlocks: string[];
  maxItems: number;
  required?: boolean;
};
export type LayoutContract = { id: string; slots: LayoutSlot[]; responsiveOrder: string[] };

export function resolveSlotFrame(deck: DeckProject, slot: LayoutSlot): Frame {
  const safe = deck.canvas.safeMargin ?? 64;
  const width = deck.canvas.width - safe * 2;
  const height = deck.canvas.height - safe * 2;
  const columnGap = 16;
  const rowGap = 16;
  const column = (width - columnGap * 11) / 12;
  const row = (height - rowGap * 7) / 8;
  const g = slot.grid;
  return {
    x: safe + (g.column - 1) * (column + columnGap),
    y: safe + (g.row - 1) * (row + rowGap),
    w: g.columnSpan * column + (g.columnSpan - 1) * columnGap,
    h: g.rowSpan * row + (g.rowSpan - 1) * rowGap,
  };
}

export function blocksBySlot(slide: DeckSlide): Map<string, DeckBlock[]> {
  const map = new Map<string, DeckBlock[]>();
  for (const block of slide.blocks) {
    if ((block.positionMode ?? 'slot') === 'background') continue;
    const key = block.slot ?? '__unassigned__';
    map.set(key, [...(map.get(key) ?? []), block]);
  }
  return map;
}

export function validateSlotAssignments(slide: DeckSlide, contract: LayoutContract): string[] {
  const errors: string[] = [];
  const slots = new Map(contract.slots.map((slot) => [slot.id, slot]));
  const assigned = blocksBySlot(slide);
  for (const [slotId, blocks] of assigned) {
    const slot = slots.get(slotId);
    if (!slot) {
      errors.push(`Unknown slot ${slotId}`);
      continue;
    }
    if (blocks.length > slot.maxItems) errors.push(`${slotId} exceeds maxItems=${slot.maxItems}`);
    for (const block of blocks) if (!slot.allowedBlocks.includes(block.type)) errors.push(`${block.id} (${block.type}) is not allowed in ${slotId}`);
  }
  for (const slot of contract.slots) if (slot.required && !(assigned.get(slot.id)?.length)) errors.push(`Required slot ${slot.id} is empty`);
  return errors;
}
