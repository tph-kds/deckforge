import layoutManifest from './layout-manifest.json';
import type { Block, DeckProject, DeckSlide, Frame, LayoutBinding } from './types';

/**
 * Typed slot roles for semantic block-slot matching.
 *
 * Use these roles instead of arbitrary string IDs to ensure
 * deterministic compatibility between blocks and slots.
 */
export type SlotRole =
  | 'title'
  | 'subtitle'
  | 'kicker'
  | 'body'
  | 'visual'
  | 'chart'
  | 'callout'
  | 'image'
  | 'process'
  | 'citation'
  | 'footer'
  | 'context'
  | 'metric'
  | 'meaning'
  | 'evidence'
  | 'caption'
  | 'meta'
  | 'steps'
  | 'decision'
  | 'support'
  | 'left'
  | 'right'
  | 'column-1'
  | 'column-2'
  | 'column-3'
  | 'content'
  | 'accent'
  | 'devices'
  | 'gallery'
  | 'demo'
  | 'map'
  | 'option-a'
  | 'option-b'
  | 'before'
  | 'after'
  | 'impact'
  | 'takeaway'
  | 'outcome'
  | 'interpretation'
  | 'meaning-alt'
  | 'timeline'
  | 'source'
  | 'contact'
  | string; // Allow custom roles for extensibility

export interface LayoutSlotContract {
  id: string;
  role: SlotRole;
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
 * Mirrors scripts/audits/audit_deck_layout.py's resolve_slot so editor rendering
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

/** Slot/flow layer entry: a block bound to a semantic slot frame. */
export interface SlotFlowEntry {
  block: Block;
  placement: BlockPlacement;
}

/** Freeform layer entry: an explicitly positioned block on its own frame. */
export interface FreeformEntry {
  block: Block;
  frame: Frame;
}

/** Background layer entry: a full-canvas (or framed) block rendered behind slots. */
export interface BackgroundEntry {
  block: Block;
  frame?: Frame;
}

/**
 * Exclusive rendering layers (P0-005): each block id appears in EXACTLY ONE
 * bucket. Layer order is background → semantic slot/flow → freeform, with a
 * system overlay rendered separately by the host.
 */
export interface LayerAssignment {
  background: BackgroundEntry[];
  slotFlow: SlotFlowEntry[];
  freeform: FreeformEntry[];
}

/** Position modes that must never participate in the semantic slot pass. */
const NON_SLOT_MODES: ReadonlySet<string> = new Set(['freeform', 'background']);

/**
 * Bind blocks to slot frames for a slide using its layoutBindings.
 * Returns placements in responsive (slot) order for stable reading order.
 *
 * Blocks whose positionMode is 'freeform' or 'background' are excluded from
 * the slot pass even when a binding lists them, so they can never be placed on
 * the slot layer (P0-005).
 */
export function resolveSlidePlacements(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): BlockPlacement[] {
  const byId = new Map(slide.blocks.map((block) => [block.id, block]));
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
      const block = byId.get(blockId);
      if (block && NON_SLOT_MODES.has(block.positionMode ?? '')) continue;
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

/**
 * Assign every block on a slide to exactly one rendering layer (P0-005):
 *
 * - `slotFlow`   — blocks bound to semantic slots (positionMode slot/flow).
 * - `freeform`   — blocks with positionMode 'freeform', at their own frame.
 * - `background` — blocks with positionMode 'background', full-canvas or framed.
 *
 * The invariant is that each block id lands in exactly one bucket. A block
 * listed in a binding but flagged freeform/background stays off the slot pass.
 * Violations (double assignment, missing frame, or orphan blocks) are reported
 * via console.error so renderers stay resilient while the invariant is visible.
 */
export function assignBlocksToLayers(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): LayerAssignment {
  const byId = new Map(slide.blocks.map((block) => [block.id, block]));
  const background: BackgroundEntry[] = [];
  const slotFlow: SlotFlowEntry[] = [];
  const freeform: FreeformEntry[] = [];

  const assigned = new Set<string>();
  const mark = (block: Block): boolean => {
    if (assigned.has(block.id)) {
      console.error(`[deckforge] P0-005 invariant violation: block "${block.id}" assigned to more than one layer`);
      return false;
    }
    assigned.add(block.id);
    return true;
  };

  for (const placement of resolveSlidePlacements(slide, canvas)) {
    const block = byId.get(placement.blockId);
    if (!block || !mark(block)) continue;
    slotFlow.push({ block, placement });
  }

  for (const block of slide.blocks) {
    if (block.positionMode !== 'freeform') continue;
    const frame = block.frame;
    if (!frame) {
      console.error(`[deckforge] P0-005 invariant violation: freeform block "${block.id}" has no frame`);
      continue;
    }
    if (!mark(block)) continue;
    freeform.push({ block, frame });
  }

  for (const block of slide.blocks) {
    if (block.positionMode !== 'background') continue;
    if (!mark(block)) continue;
    background.push({ block, frame: block.frame });
  }

  for (const block of slide.blocks) {
    if (!assigned.has(block.id)) {
      console.error(`[deckforge] P0-005 invariant violation: block "${block.id}" was not assigned to any layer`);
    }
  }

  return { background, slotFlow, freeform };
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
/**
 * Pick the best slot to bind a newly inserted block to. Prefers the first
 * responsive slot whose `allowedBlocks` accepts the type and that still has
 * room (maxItems not reached). Next prefers a type-compatible slot even when
 * it is at capacity (soft overflow), so a new block never lands in a slot
 * that rejects its type (e.g. an image in a text-only band producing a
 * degenerate frame). Falls back to the first slot with room so an insert
 * always renders instead of disappearing into state-only.
 */
export function suggestSlotForBlock(slide: DeckSlide, block: Block): string | undefined {
  const contract = getLayoutContract(slide.layout);
  if (!contract?.composition?.slots.length) return undefined;
  const bindings = new Map<string, LayoutBinding>();
  for (const binding of slide.layoutBindings ?? []) bindings.set(binding.slot, binding);
  const order = contract.composition.responsiveOrder ?? contract.composition.slots.map((slot) => slot.id);
  const ordered = [...order, ...contract.composition.slots.map((slot) => slot.id)];
  const seen = new Set<string>();
  const slots: LayoutSlotContract[] = [];
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    const slot = contract.composition.slots.find((candidate) => candidate.id === id);
    if (slot) slots.push(slot);
  }
  const hasRoom = (slot: LayoutSlotContract): boolean => {
    const count = bindings.get(slot.id)?.blockIds.length ?? 0;
    return slot.maxItems == null || count < slot.maxItems;
  };
  const allows = (slot: LayoutSlotContract): boolean =>
    !slot.allowedBlocks?.length || slot.allowedBlocks.includes(block.type);
  return (
    slots.find((slot) => allows(slot) && hasRoom(slot))?.id ??
    slots.find((slot) => allows(slot))?.id ??
    slots.find(hasRoom)?.id
  );
}

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
