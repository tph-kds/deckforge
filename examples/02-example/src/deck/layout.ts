import layoutManifest from './layout-manifest.json';
import type { DeckProject, DeckSlide, Frame, LayoutBinding } from './types';

export interface LayoutSlotContract {
  id: string;
  role: string;
  grid: { column: number; row: number; columnSpan: number; rowSpan: number };
  allowedBlocks?: string[];
  required?: boolean;
  maxItems?: number;
  priority?: string;
  contentBudget?: { maxCharacters?: number; maxLines?: number };
}

export interface LayoutCompositionContract {
  grid: { columns: number; rows: number; columnGap: number; rowGap: number };
  slots: LayoutSlotContract[];
  responsiveOrder?: string[];
  collisionPolicy?: {
    mode?: string;
    allowedOverlapRoles?: string[];
    maxIncidentalOverlapRatio?: number;
  };
  whitespaceTarget?: { minOccupiedRatio?: number; maxOccupiedRatio?: number };
  freeformAllowed?: boolean;
}

export interface LayoutContract {
  id: string;
  name: string;
  category: string;
  purpose: string;
  density: string;
  composition: LayoutCompositionContract;
  defaultPositionMode?: string;
  freeformPolicy?: string;
  responsiveRule?: string;
}

export interface ResolvedFrame extends Frame {
  slot: string;
  role: string;
}

export type { LayoutBinding };

export function getLayoutContract(layoutId: string): LayoutContract | undefined {
  return (layoutManifest as LayoutContract[]).find((layout) => layout.id === layoutId);
}

export function listLayouts(): LayoutContract[] {
  return layoutManifest as LayoutContract[];
}

/**
 * Resolve a slot's grid geometry into canvas coordinates.
 * Mirrors scripts/audit_deck_layout.py's resolve_slot so editor rendering
 * matches the deterministic audit exactly.
 */
export function resolveSlotFrame(
  slot: LayoutSlotContract,
  canvas: DeckProject['canvas'],
): Frame {
  const safe = canvas.safeMargin ?? 64;
  const w = canvas.width ?? 1600;
  const h = canvas.height ?? 900;
  const innerW = w - 2 * safe;
  const innerH = h - 2 * safe;
  const cg = 0.35;
  const rg = 0.3;
  const colGap = 16 * (cg / 0.35);
  const rowGap = 16 * (rg / 0.3);
  const unitW = (innerW - colGap * 11) / 12;
  const unitH = (innerH - rowGap * 7) / 8;
  const g = slot.grid;
  const x = safe + (g.column - 1) * (unitW + colGap);
  const y = safe + (g.row - 1) * (unitH + rowGap);
  const sw = g.columnSpan * unitW + (g.columnSpan - 1) * colGap;
  const sh = g.rowSpan * unitH + (g.rowSpan - 1) * rowGap;
  return { x: Math.round(x), y: Math.round(y), w: Math.round(sw), h: Math.round(sh) };
}

export interface ResolvedSlot {
  slot: LayoutSlotContract;
  frame: Frame;
}

/**
 * Resolve all slots for a layout into frames. Slots are returned in
 * responsiveOrder (falling back to manifest order) so reading order is
 * deterministic and not coordinate-driven.
 */
export function resolveLayout(
  layoutId: string,
  canvas: DeckProject['canvas'],
): ResolvedSlot[] {
  const contract = getLayoutContract(layoutId);
  if (!contract?.composition) return [];
  const slots = contract.composition.slots;
  const order = contract.composition.responsiveOrder ?? slots.map((slot) => slot.id);
  const byId = new Map(slots.map((slot) => [slot.id, slot]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((slot): slot is LayoutSlotContract => Boolean(slot));
  for (const slot of slots) {
    if (!ordered.includes(slot)) ordered.push(slot);
  }
  return ordered.map((slot) => ({ slot, frame: resolveSlotFrame(slot, canvas) }));
}

export interface BlockPlacement {
  blockId: string;
  slotId: string;
  slot: LayoutSlotContract;
  frame: Frame;
}

/**
 * Bind blocks to slot frames for a slide using its layoutBindings.
 * Returns placements in responsive (slot) order for stable reading order.
 */
export function resolveSlidePlacements(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): BlockPlacement[] {
  const resolved = resolveLayout(slide.layout, canvas);
  const bySlot = new Map(resolved.map((entry) => [entry.slot.id, entry]));
  const bindingMap = new Map<string, LayoutBinding>();
  for (const binding of slide.layoutBindings ?? []) {
    bindingMap.set(binding.slot, binding);
  }
  const placements: BlockPlacement[] = [];
  for (const entry of resolved) {
    const binding = bindingMap.get(entry.slot.id);
    if (!binding) continue;
    for (const blockId of binding.blockIds) {
      placements.push({
        blockId,
        slotId: entry.slot.id,
        slot: entry.slot,
        frame: entry.frame,
      });
    }
  }
  return placements;
}

/** Returns the frame a specific block resolves to, if bound. */
export function resolveBlockFrame(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
  blockId: string,
): Frame | undefined {
  return resolveSlidePlacements(slide, canvas).find((placement) => placement.blockId === blockId)?.frame;
}

/** Warnings for the editor: empty required slots, over-budget slots. */
export interface LayoutIssue {
  severity: 'warning' | 'error';
  slot: string;
  message: string;
}

export function auditSlideLayout(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const resolved = resolveLayout(slide.layout, canvas);
  const bindings = new Map<string, LayoutBinding>();
  for (const binding of slide.layoutBindings ?? []) bindings.set(binding.slot, binding);
  for (const entry of resolved) {
    const binding = bindings.get(entry.slot.id);
    const count = binding?.blockIds.length ?? 0;
    if (entry.slot.required && count === 0) {
      issues.push({
        severity: 'error',
        slot: entry.slot.id,
        message: `Required slot "${entry.slot.id}" is empty`,
      });
    }
    if (entry.slot.maxItems != null && count > entry.slot.maxItems) {
      issues.push({
        severity: 'warning',
        slot: entry.slot.id,
        message: `Slot "${entry.slot.id}" has ${count} blocks, max is ${entry.slot.maxItems}`,
      });
    }
  }
  return issues;
}
