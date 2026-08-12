import type { Block, DeckProject, DeckSlide, Frame } from "./types";
import {
  getLayoutContract,
  resolveLayout,
  resolveSlidePlacements,
  type LayoutSlotContract,
} from "./layout";
import { isUsableFrame, type Rect } from "../export/geometry";
import {
  validateBlockPositioning,
  type SlotValidationError,
  type BlockValidationResult,
} from "./slot-validation";

/**
 * deck/geometry-resolver.ts
 *
 * THE canonical slide-geometry resolution pipeline (Phase 2/5/16).
 *
 * A SlideDocument stores slot/flow blocks WITHOUT a persisted frame; their
 * geometry is a deterministic function of the layout contract + layoutBindings.
 * This module resolves EVERY block on a slide to a canonical document-pixel
 * frame exactly once, so the editor, presenter, preflight, and the PPTX
 * exporter can never disagree about where a block is.
 *
 * Invariant:  visible block  =>  resolvable canonical frame.
 * A visible block that cannot be resolved (unbound slot/flow block, or a
 * freeform/background block with no frame) is reported in `missingFrames` and
 * MUST fail closed — never silently placed at (0,0).
 *
 * Resolution priority for a single block (single source of truth):
 *
 *   1. explicit `block.frame`
 *   2. positionMode "slot" + valid slot binding → the layout slot frame
 *   3. deterministic layout-engine result (auto-bind the block to the best
 *      slot for its type) — a generated/template block is never allowed to
 *      exist as positionMode "slot" without a resolvable slot, so the user is
 *      never forced to hand-bind generated blocks
 *   4. versioned legacy migration (a persisted `resolvedFrame` from an older
 *      hydration run)
 *   5. explicit geometry error
 *
 * `ensureDeckSlotBindings` implements the slot-binding contract at the source:
 * it returns a NEW deck whose `layoutBindings` bind every visible slot-positioned
 * block to a slot that exists in the active layout contract.
 *
 * IMPORTANT: resolution never mutates the input deck. Callers that want to
 * persist the result may use `hydrateDeckGeometry`, which returns a NEW deck
 * with `block.resolvedFrame` attached.
 */

export interface ResolvedBlockGeometry {
  blockId: string;
  block: Block;
  /** Canonical frame in document pixels (always usable; finite, w>0, h>0). */
  frame: Rect;
  slotId?: string;
  role?: string;
  /** Where the frame came from, for diagnostics: explicit|slot-binding|deterministic-layout|legacy-migration. */
  resolutionSource: BlockFrameSource;
}

export type BlockFrameSource =
  | "explicit"
  | "slot-binding"
  | "deterministic-layout"
  | "legacy-migration";

export interface MissingGeometry {
  blockId: string;
  block: Block;
  reason: string;
  /** Classification used by preflight diagnostics (Phase 16). */
  state: GeometryDiagnosticState;
  /** The slot the block declares, when present. */
  slotId?: string;
  layoutId?: string;
  /** Structured validation error for developer diagnostics. */
  validationError?: SlotValidationError;
}

export type GeometryDiagnosticState =
  | "MISSING_FRAME"
  | "UNKNOWN_SLOT"
  | "MISSING_SLOT_ID"
  | "NON_FINITE_GEOMETRY"
  | "INVALID_SIZE"
  | "OUT_OF_BOUNDS";

export interface ResolvedSlideScene {
  slideId: string;
  blocks: ResolvedBlockGeometry[];
  frameByBlockId: Map<string, Rect>;
  /** Visible blocks with no usable frame. Export/preflight MUST fail closed. */
  missingFrames: MissingGeometry[];
}

const NON_SLOT_MODES: ReadonlySet<string> = new Set(["freeform", "background"]);

/** Is this block on the semantic slot/flow layer (vs freeform/background)? */
function isSlotMode(block: Block): boolean {
  return !NON_SLOT_MODES.has(block.positionMode ?? "");
}

function usable(candidate: Frame | undefined): Rect | undefined {
  if (!candidate) return undefined;
  const rect = { x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h };
  return isUsableFrame(rect) ? rect : undefined;
}

function slotAccepts(slot: LayoutSlotContract | undefined, type: string): boolean {
  return !slot?.allowedBlocks?.length || slot.allowedBlocks.includes(type);
}

/**
 * Deterministic auto-binding for a slot-positioned block that has no binding.
 * Resolution preference:
 *
 *   1. the block's own `slot`, when it exists in the active layout and accepts
 *      the block type (and still has room);
 *   2. the first slot (in responsive order) that accepts the block type and has
 *      room;
 *   3. any slot with remaining capacity (never drops a block).
 *
 * `boundCounts` lets multiple unbound blocks share capacity deterministically.
 */
function deterministicSlotId(
  block: Block,
  slide: DeckSlide,
  canvas: DeckProject["canvas"],
  boundCounts: Map<string, number>,
): string | undefined {
  const resolved = resolveLayout(slide.layout, canvas);
  const slots = resolved.map((entry) => entry.slot);
  const responsiveOrder =
    slots.length > 0
      ? slots
      : ([] as LayoutSlotContract[]);
  const hasRoom = (slot: LayoutSlotContract): boolean => {
    const count = boundCounts.get(slot.id) ?? 0;
    return slot.maxItems == null || count < slot.maxItems;
  };

  if (block.slot) {
    const slot = responsiveOrder.find((candidate) => candidate.id === block.slot);
    if (slot && slotAccepts(slot, block.type) && hasRoom(slot)) return slot.id;
  }

  const preferred = responsiveOrder.find(
    (slot) => slotAccepts(slot, block.type) && hasRoom(slot),
  );
  if (preferred) return preferred.id;

  return responsiveOrder.find(hasRoom)?.id;
}

export interface BlockFrameResult {
  frame: Rect;
  slotId?: string;
  role?: string;
  source: BlockFrameSource;
}

/**
 * Resolve the canonical frame for a single block (single source of truth).
 * Resolution priority:
 *
 *   1. explicit `block.frame`
 *   2. a valid slot binding → the layout slot frame
 *   3. a deterministic auto-binding → the layout slot frame
 *   4. a persisted `resolvedFrame` (legacy migration)
 *   5. nothing (caller reports the geometry error)
 */
export function resolveBlockFrame(
  block: Block,
  slide: DeckSlide,
  canvas: DeckProject["canvas"],
  placement: { slotId: string; role: string; frame: Frame } | undefined,
  boundCounts?: Map<string, number>,
): BlockFrameResult | undefined {
  const mode = block.positionMode ?? "";

  if (mode === "freeform" || mode === "background") {
    const explicit = usable(block.frame);
    if (explicit) return { frame: explicit, source: "explicit" };
    const legacy = usable(block.resolvedFrame);
    if (legacy) return { frame: legacy, source: "legacy-migration" };
    return undefined;
  }

  // 1. explicit frame wins for slot/flow blocks too.
  const explicit = usable(block.frame);
  if (explicit) return { frame: explicit, source: "explicit" };

  // 2. valid slot binding.
  if (placement) {
    const slotFrame = usable(placement.frame);
    if (slotFrame) {
      return {
        frame: slotFrame,
        slotId: placement.slotId,
        role: placement.role,
        source: "slot-binding",
      };
    }
  }

  // 3. deterministic auto-binding (slot-positioned blocks never go unbound).
  const counts = boundCounts ?? new Map<string, number>();
  const slotId = deterministicSlotId(block, slide, canvas, counts);
  if (slotId) {
    const entry = resolveLayout(slide.layout, canvas).find((entry) => entry.slot.id === slotId);
    const slotFrame = usable(entry?.frame);
    if (slotFrame) {
      counts.set(slotId, (counts.get(slotId) ?? 0) + 1);
      return {
        frame: slotFrame,
        slotId,
        role: entry!.slot.role,
        source: "deterministic-layout",
      };
    }
  }

  // 4. legacy migration.
  const legacy = usable(block.resolvedFrame);
  if (legacy) return { frame: legacy, source: "legacy-migration" };

  // 5. explicit geometry error (caller reports).
  return undefined;
}

function geometryStateFor(
  block: Block,
  slide: DeckSlide,
): GeometryDiagnosticState {
  if (block.frame) {
    const errors = [
      ...(!Number.isFinite(block.frame.x) ? ["x"] : []),
      ...(!Number.isFinite(block.frame.y) ? ["y"] : []),
      ...(!Number.isFinite(block.frame.w) ? ["w"] : []),
      ...(!Number.isFinite(block.frame.h) ? ["h"] : []),
    ];
    if (errors.length) return "NON_FINITE_GEOMETRY";
    if (block.frame.w <= 0 || block.frame.h <= 0) return "INVALID_SIZE";
    return "OUT_OF_BOUNDS";
  }
  if (block.positionMode === "slot") {
    if (!block.slot) return "MISSING_SLOT_ID";
    const layout = getLayoutContract(slide.layout);
    const hasSlot = layout?.composition.slots.some((slot) => slot.id === block.slot) ?? false;
    if (!hasSlot) return "UNKNOWN_SLOT";
  }
  return "MISSING_FRAME";
}

/**
 * Resolve the canonical frame for a single block given its slot placement
 * (when bound) and the canvas. Returns undefined when no usable frame exists.
 */
export function resolveBlockGeometry(
  block: Block,
  placement: { slotId: string; role: string; frame: Frame } | undefined,
  slide?: DeckSlide,
  canvas?: DeckProject["canvas"],
): ResolvedBlockGeometry | undefined {
  const resolved = resolveBlockFrame(
    block,
    slide ?? {
      id: "standalone",
      title: "",
      layout: "two-column",
      blocks: [block],
    } as DeckSlide,
    canvas ?? { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 64 } as DeckProject["canvas"],
    placement,
  );
  if (!resolved) return undefined;
  return {
    blockId: block.id,
    block,
    frame: resolved.frame,
    slotId: resolved.slotId,
    role: resolved.role,
    resolutionSource: resolved.source,
  };
}

/**
 * Ensure the slot-binding contract: every visible slot-positioned block is
 * bound to a slot that exists in the active layout. Returns a NEW slide; the
 * input is never mutated.
 */
export function ensureSlideSlotBindings(slide: DeckSlide, canvas: DeckProject["canvas"]): DeckSlide {
  const contractSlots = resolveLayout(slide.layout, canvas).map((entry) => entry.slot.id);
  const slotSet = new Set(contractSlots);
  const bindings = new Map<string, Set<string>>();
  for (const binding of slide.layoutBindings ?? []) {
    if (!slotSet.has(binding.slot)) continue;
    bindings.set(binding.slot, new Set(binding.blockIds));
  }

  const blockById = new Map(slide.blocks.map((block) => [block.id, block]));
  const boundCounts = new Map<string, number>();
  for (const [slotId, ids] of bindings) {
    boundCounts.set(slotId, ids.size);
  }

  for (const block of slide.blocks) {
    if (block.hidden) continue;
    if (!isSlotMode(block)) continue;
    const alreadyBound = [...bindings.values()].some((ids) => ids.has(block.id));
    if (alreadyBound) continue;
    const slotId = deterministicSlotId(block, slide, canvas, boundCounts);
    if (!slotId) continue;
    if (!bindings.has(slotId)) bindings.set(slotId, new Set());
    bindings.get(slotId)!.add(block.id);
    boundCounts.set(slotId, (boundCounts.get(slotId) ?? 0) + 1);
  }

  const blockSeen = new Set<string>();
  const ordered = contractSlots
    .filter((slotId) => bindings.has(slotId))
    .map((slotId) => {
      const ids = [...bindings.get(slotId)!].filter((id) => blockById.has(id));
      ids.forEach((id) => blockSeen.add(id));
      return { slot: slotId, blockIds: ids };
    });

  return { ...slide, layoutBindings: ordered };
}

/**
 * Ensure the slot-binding contract across the whole deck. Returns a NEW deck
 * whose `layoutBindings` bind every visible slot-positioned block to a valid
 * slot, so generated/template decks never ship an unbound slot block.
 */
export function ensureDeckSlotBindings(deck: DeckProject): DeckProject {
  const canvas = deck.canvas ?? { aspectRatio: "16:9", width: 1600, height: 900, safeMargin: 64 };
  return {
    ...deck,
    slides: deck.slides.map((slide) => ensureSlideSlotBindings(slide, canvas)),
  };
}

/** Resolve every block on a slide to its canonical frame. */
export function resolveSlideGeometry(
  slide: DeckSlide,
  canvas: DeckProject["canvas"],
): ResolvedSlideScene {
  const placements = resolveSlidePlacements(slide, canvas);
  const placementByBlock = new Map<
    string,
    { slotId: string; role: string; frame: Frame }
  >();
  for (const placement of placements) {
    placementByBlock.set(placement.blockId, {
      slotId: placement.slotId,
      role: placement.slot.role,
      frame: placement.frame,
    });
  }

  const blocks: ResolvedBlockGeometry[] = [];
  const frameByBlockId = new Map<string, Rect>();
  const missingFrames: MissingGeometry[] = [];
  const boundCounts = new Map<string, number>();
  for (const placement of placements) {
    boundCounts.set(placement.slotId, (boundCounts.get(placement.slotId) ?? 0) + 1);
  }

  for (const block of slide.blocks) {
    if (block.hidden) continue;
    const placement = placementByBlock.get(block.id);
    const resolved = resolveBlockFrame(block, slide, canvas, placement, boundCounts);
    if (resolved) {
      blocks.push({
        blockId: block.id,
        block,
        frame: resolved.frame,
        slotId: resolved.slotId,
        role: resolved.role,
        resolutionSource: resolved.source,
      });
      frameByBlockId.set(block.id, resolved.frame);
    } else {
      // Get structured validation error for developer diagnostics
      const validationResult = validateBlockPositioning(block, slide, canvas);
      const validationError = validationResult.errors.length > 0 ? validationResult.errors[0] : undefined;

      missingFrames.push({
        blockId: block.id,
        block,
        slotId: block.slot,
        layoutId: slide.layout,
        state: geometryStateFor(block, slide),
        reason: `${block.type} block "${block.id}" (positionMode "${block.positionMode ?? "slot"}") has no resolvable frame`,
        validationError,
      });
    }
  }

  return { slideId: slide.id, blocks, frameByBlockId, missingFrames };
}

/** Resolve all slides in a deck. */
export function resolveDeckScenes(deck: DeckProject): Map<string, ResolvedSlideScene> {
  const scenes = new Map<string, ResolvedSlideScene>();
  for (const slide of deck.slides) {
    scenes.set(slide.id, resolveSlideGeometry(slide, deck.canvas));
  }
  return scenes;
}

/**
 * Return a NEW deck with `block.resolvedFrame` attached to every resolvable
 * block. Safe for document load / migration / post-mutation hydration: the
 * original deck is never mutated, so editor history and export both stay
 * deterministic and idempotent.
 */
export function hydrateDeckGeometry(deck: DeckProject): DeckProject {
  const scenes = resolveDeckScenes(deck);
  const hydrated: DeckProject = {
    ...deck,
    slides: deck.slides.map((slide) => {
      const scene = scenes.get(slide.id);
      if (!scene) return slide;
      return {
        ...slide,
        blocks: slide.blocks.map((block) => {
          const frame = scene.frameByBlockId.get(block.id);
          if (!frame) return block;
          return { ...block, resolvedFrame: { ...frame } };
        }),
      };
    }),
  };
  return hydrated;
}
