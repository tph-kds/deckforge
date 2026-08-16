/**
 * deck/slot-validation.ts
 *
 * Creation-time validation and auto-repair for slot-positioned blocks.
 *
 * This module ensures that every block with positionMode "slot" satisfies
 * the strict positioning contract BEFORE export:
 *
 *   1. slotId exists on the block
 *   2. slotId references a slot in the active layout
 *   3. The slot accepts the block type (allowedBlocks)
 *   4. The slot has remaining capacity (maxItems)
 *
 * Invariants:
 *   - Never persist a block with positionMode "slot" and no valid slotId
 *   - Never persist a block referencing a nonexistent slot
 *   - Auto-repair is deterministic and uses the same logic as the runtime resolver
 *   - Preflight should normally pass immediately for a correctly generated deck
 */

import type { Block, DeckProject, DeckSlide, LayoutBinding } from './types';
import {
  getLayoutContract,
  resolveLayout,
  suggestSlotForBlock,
  type LayoutSlotContract,
} from './layout';

// ─── Error Types ───────────────────────────────────────────────────────────

export type SlotValidationErrorKind =
  | 'MISSING_SLOT_ID'
  | 'UNKNOWN_SLOT'
  | 'SLOT_TYPE_MISMATCH'
  | 'SLOT_CAPACITY_EXCEEDED'
  | 'MISSING_LAYOUT'
  | 'MISSING_FRAME'
  | 'NON_FINITE_GEOMETRY'
  | 'INVALID_SIZE';

export interface SlotValidationError {
  kind: SlotValidationErrorKind;
  blockId: string;
  blockType: string;
  slotId?: string;
  layoutId?: string;
  message: string;
  /** The slot role the block was trying to target, if determinable. */
  requestedRole?: string;
  /** Available slots that could accept this block type. */
  availableSlots?: string[];
}

export interface BlockValidationResult {
  valid: boolean;
  errors: SlotValidationError[];
  /** The slot the block should be bound to after repair. */
  repairedSlotId?: string;
  /** Whether the block's slot property was changed during repair. */
  slotChanged?: boolean;
  /** Whether a new binding was created during repair. */
  bindingCreated?: boolean;
}

export interface SlideValidationResult {
  valid: boolean;
  blockResults: Map<string, BlockValidationResult>;
  totalErrors: number;
  /** Repaired slide with corrected bindings. */
  repairedSlide?: DeckSlide;
}

// ─── Slot Acceptance Logic ─────────────────────────────────────────────────

/**
 * Check if a slot accepts a block type.
 * Uses the same logic as seed.ts and geometry-resolver.ts for consistency.
 */
export function slotAccepts(slot: LayoutSlotContract | undefined, type: string): boolean {
  return !slot?.allowedBlocks?.length || slot.allowedBlocks.includes(type);
}

/**
 * Check if a slot has remaining capacity.
 */
export function slotHasRoom(
  slot: LayoutSlotContract,
  currentBindings: Map<string, LayoutBinding>,
): boolean {
  const count = currentBindings.get(slot.id)?.blockIds.length ?? 0;
  return slot.maxItems == null || count < slot.maxItems;
}

// ─── Single Block Validation ───────────────────────────────────────────────

/**
 * Validate a single block's positioning contract.
 *
 * Returns a BlockValidationResult with:
 * - valid: true if the block satisfies the contract
 * - errors: list of validation errors
 * - repairedSlotId: the slot the block should be bound to (if repair is possible)
 */
export function validateBlockPositioning(
  block: Block,
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): BlockValidationResult {
  const errors: SlotValidationError[] = [];
  const layoutId = slide.layout;

  // Freeform and background blocks are not validated for slot positioning
  if (block.positionMode === 'freeform' || block.positionMode === 'background') {
    // But they still need valid frames
    if (!block.frame) {
      const frame = block.resolvedFrame;
      if (!frame) {
        errors.push({
          kind: 'MISSING_FRAME',
          blockId: block.id,
          blockType: block.type,
          layoutId,
          message: `${block.type} block "${block.id}" has positionMode "${block.positionMode}" but no frame`,
        });
      } else if (!Number.isFinite(frame.x) || !Number.isFinite(frame.y) || !Number.isFinite(frame.w) || !Number.isFinite(frame.h)) {
        errors.push({
          kind: 'NON_FINITE_GEOMETRY',
          blockId: block.id,
          blockType: block.type,
          layoutId,
          message: `${block.type} block "${block.id}" has non-finite frame dimensions`,
        });
      } else if (frame.w <= 0 || frame.h <= 0) {
        errors.push({
          kind: 'INVALID_SIZE',
          blockId: block.id,
          blockType: block.type,
          layoutId,
          message: `${block.type} block "${block.id}" has zero or negative frame dimensions`,
        });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // Slot-positioned blocks need a valid layout
  const contract = getLayoutContract(layoutId);
  if (!contract?.composition?.slots.length) {
    // No layout defined — use suggestSlotForBlock as fallback
    const suggestedSlot = suggestSlotForBlock(slide, block);
    if (suggestedSlot) {
      return {
        valid: true,
        errors: [],
        repairedSlotId: suggestedSlot,
        slotChanged: block.slot !== suggestedSlot,
      };
    }
    errors.push({
      kind: 'MISSING_LAYOUT',
      blockId: block.id,
      blockType: block.type,
      layoutId,
      message: `No layout contract found for "${layoutId}"`,
    });
    return { valid: false, errors };
  }

  // Check if block has a slot property
  if (!block.slot) {
    // Auto-repair: find best matching slot
    const suggestedSlot = suggestSlotForBlock(slide, block);
    if (suggestedSlot) {
      return {
        valid: true,
        errors: [],
        repairedSlotId: suggestedSlot,
        slotChanged: true,
      };
    }
    errors.push({
      kind: 'MISSING_SLOT_ID',
      blockId: block.id,
      blockType: block.type,
      layoutId,
      message: `${block.type} block "${block.id}" has positionMode "slot" but no slotId`,
    });
    return { valid: false, errors };
  }

  // Check if the slot exists in the layout
  const slotContract = contract.composition.slots.find((s) => s.id === block.slot);
  if (!slotContract) {
    // Auto-repair: find best matching slot
    const suggestedSlot = suggestSlotForBlock(slide, block);
    if (suggestedSlot) {
      return {
        valid: true,
        errors: [],
        repairedSlotId: suggestedSlot,
        slotChanged: true,
      };
    }
    errors.push({
      kind: 'UNKNOWN_SLOT',
      blockId: block.id,
      blockType: block.type,
      slotId: block.slot,
      layoutId,
      message: `Slot "${block.slot}" does not exist in layout "${layoutId}"`,
      availableSlots: contract.composition.slots.map((s) => s.id),
    });
    return { valid: false, errors };
  }

  // Check if the slot accepts this block type
  if (!slotAccepts(slotContract, block.type)) {
    // Auto-repair: find best matching slot
    const suggestedSlot = suggestSlotForBlock(slide, block);
    if (suggestedSlot) {
      return {
        valid: true,
        errors: [],
        repairedSlotId: suggestedSlot,
        slotChanged: true,
      };
    }
    errors.push({
      kind: 'SLOT_TYPE_MISMATCH',
      blockId: block.id,
      blockType: block.type,
      slotId: block.slot,
      layoutId,
      message: `Slot "${block.slot}" does not accept ${block.type} blocks (allowedBlocks: ${slotContract.allowedBlocks?.join(', ') ?? 'any'})`,
      availableSlots: contract.composition.slots
        .filter((s) => slotAccepts(s, block.type))
        .map((s) => s.id),
    });
    return { valid: false, errors };
  }

  // Block satisfies the positioning contract
  return { valid: true, errors: [] };
}

// ─── Slide Validation ──────────────────────────────────────────────────────

/**
 * Validate all blocks on a slide for slot positioning.
 *
 * Returns a SlideValidationResult with per-block results and the total error count.
 */
export function validateSlideSlotBindings(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): SlideValidationResult {
  const blockResults = new Map<string, BlockValidationResult>();
  let totalErrors = 0;

  for (const block of slide.blocks) {
    if (block.hidden) continue;
    const result = validateBlockPositioning(block, slide, canvas);
    blockResults.set(block.id, result);
    totalErrors += result.errors.length;
  }

  return {
    valid: totalErrors === 0,
    blockResults,
    totalErrors,
  };
}

// ─── Auto-Repair ───────────────────────────────────────────────────────────

/**
 * Repair a single invalid slot block by binding it to the best matching slot.
 *
 * Returns a new block with the corrected slot property.
 */
export function repairSlotBlock(
  block: Block,
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): Block {
  const suggestedSlot = suggestSlotForBlock(slide, block);
  if (!suggestedSlot) return block;
  return { ...block, slot: suggestedSlot, positionMode: 'slot' };
}

/**
 * Repair all invalid slot blocks on a slide.
 *
 * Returns a new slide with corrected layoutBindings.
 * The input slide is never mutated.
 */
export function repairSlideSlotBindings(
  slide: DeckSlide,
  canvas: DeckProject['canvas'],
): DeckSlide {
  const contract = getLayoutContract(slide.layout);
  if (!contract?.composition?.slots.length) return slide;

  // Build current bindings map
  const bindings = new Map<string, LayoutBinding>();
  for (const binding of slide.layoutBindings ?? []) {
    bindings.set(binding.slot, binding);
  }

  // Track which blocks are already bound
  const boundBlockIds = new Set<string>();
  for (const binding of slide.layoutBindings ?? []) {
    for (const id of binding.blockIds) {
      boundBlockIds.add(id);
    }
  }

  // Find blocks that need repair
  const blocksToRepair: Block[] = [];
  for (const block of slide.blocks) {
    if (block.hidden) continue;
    if (block.positionMode === 'freeform' || block.positionMode === 'background') continue;
    if (boundBlockIds.has(block.id)) continue;

    const result = validateBlockPositioning(block, slide, canvas);
    if (!result.valid || result.repairedSlotId) {
      blocksToRepair.push(block);
    }
  }

  if (blocksToRepair.length === 0) return slide;

  // Repair each block
  const repairedBlocks: Block[] = [];
  const newBindings = new Map<string, string[]>();

  // Initialize with existing bindings
  for (const [slotId, binding] of bindings) {
    newBindings.set(slotId, [...binding.blockIds]);
  }

  for (const block of blocksToRepair) {
    const result = validateBlockPositioning(block, slide, canvas);
    const repairedSlot = result.repairedSlotId ?? suggestSlotForBlock(slide, block);

    if (repairedSlot) {
      // Add block to the repaired slot's binding
      if (!newBindings.has(repairedSlot)) {
        newBindings.set(repairedSlot, []);
      }
      newBindings.get(repairedSlot)!.push(block.id);

      // Add repaired block to the list
      repairedBlocks.push({
        ...block,
        slot: repairedSlot,
        positionMode: 'slot',
      });
    } else {
      // No slot found — keep block as-is (will be caught by geometry resolver)
      repairedBlocks.push(block);
    }
  }

  // Build new layoutBindings
  const layoutBindings: LayoutBinding[] = [];
  const slotOrder = contract.composition.responsiveOrder ?? contract.composition.slots.map((s) => s.id);

  for (const slotId of slotOrder) {
    const blockIds = newBindings.get(slotId);
    if (blockIds && blockIds.length > 0) {
      const existingBinding = bindings.get(slotId);
      layoutBindings.push({
        slot: slotId,
        blockIds,
        flow: existingBinding?.flow ?? 'stack',
        gap: existingBinding?.gap ?? 8,
      });
    }
  }

  // Merge repaired blocks with original blocks
  const blockById = new Map(slide.blocks.map((b) => [b.id, b]));
  for (const repaired of repairedBlocks) {
    blockById.set(repaired.id, repaired);
  }

  return {
    ...slide,
    blocks: [...blockById.values()],
    layoutBindings,
  };
}

// ─── Deck Validation ───────────────────────────────────────────────────────

/**
 * Validate all blocks in a deck for slot positioning.
 *
 * Returns validation results for each slide.
 */
export function validateDeckSlotBindings(
  deck: DeckProject,
): Map<string, SlideValidationResult> {
  const canvas = deck.canvas ?? { aspectRatio: '16:9', width: 1600, height: 900, safeMargin: 64 };
  const results = new Map<string, SlideValidationResult>();

  for (const slide of deck.slides) {
    results.set(slide.id, validateSlideSlotBindings(slide, canvas));
  }

  return results;
}

/**
 * Repair all invalid slot blocks in a deck.
 *
 * Returns a new deck with corrected layoutBindings.
 * The input deck is never mutated.
 */
export function repairDeckSlotBindings(deck: DeckProject): DeckProject {
  const canvas = deck.canvas ?? { aspectRatio: '16:9', width: 1600, height: 900, safeMargin: 64 };
  return {
    ...deck,
    slides: deck.slides.map((slide) => repairSlideSlotBindings(slide, canvas)),
  };
}

// ─── Exportability Gate ─────────────────────────────────────────────────────

/**
 * Check if a deck is exportable (all blocks have valid geometry).
 *
 * This is a lightweight preflight check that can be run after generation
 * to ensure the deck is ready for export without manual repairs.
 */
export function isDeckExportable(deck: DeckProject): {
  exportable: boolean;
  errors: SlotValidationError[];
  totalBlocks: number;
  validBlocks: number;
  invalidBlocks: number;
} {
  const results = validateDeckSlotBindings(deck);
  const allErrors: SlotValidationError[] = [];
  let totalBlocks = 0;
  let validBlocks = 0;
  let invalidBlocks = 0;

  for (const [slideId, result] of results) {
    for (const [blockId, blockResult] of result.blockResults) {
      totalBlocks++;
      if (blockResult.valid) {
        validBlocks++;
      } else {
        invalidBlocks++;
        allErrors.push(...blockResult.errors);
      }
    }
  }

  return {
    exportable: allErrors.length === 0,
    errors: allErrors,
    totalBlocks,
    validBlocks,
    invalidBlocks,
  };
}
