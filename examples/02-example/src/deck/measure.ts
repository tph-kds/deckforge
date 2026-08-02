import type { Block, DeckProject, DeckSlide, Frame } from './types';
import { resolveSlidePlacements, resolveLayout } from './layout';

/**
 * Measurement-aware layout validation (plan Workstream C + §15.2).
 *
 * Pure geometry and heuristic checks that run anywhere (editor, presenter,
 * tests, CI) without a browser. The deterministic DOM measurement pass of
 * plan §7.3 is approximated here by conservative typography heuristics on the
 * fixed logical canvas; runtime checks can refine these later.
 */

export interface MeasureIssue {
  severity: 'warning' | 'error';
  code:
    | 'overflow'
    | 'collision'
    | 'budget'
    | 'boundary'
    | 'orphan';
  slot: string;
  blockId?: string;
  message: string;
  metric?: { overflowLines?: number; collisionRatio?: number };
}

/** Rectangular overlap test (plan §15.2). */
export function overlaps(a: Frame, b: Frame): boolean {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

export function intersectionArea(a: Frame, b: Frame): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return w * h;
}

function area(frame: Frame): number {
  return Math.max(0, frame.w) * Math.max(0, frame.h);
}

/** Approximate body font size (px) for a container of the given width on the logical canvas. */
function bodyFontSize(containerWidth: number): number {
  const cqw = containerWidth / 100;
  return Math.min(20, Math.max(14, 1.6 * cqw));
}

/** Approximate heading font size for level-1 titles, reduced per typographic level. */
function headingFontSize(containerWidth: number, level = 3): number {
  const cqw = containerWidth / 100;
  const base = Math.min(52, Math.max(34, 4.2 * cqw));
  return base * Math.pow(0.9, Math.min(level, 3) - 1);
}

interface LineEstimate {
  lines: number;
  heightPx: number;
}

function estimateTextLines(
  text: string,
  frame: Frame,
  fontSize: number,
  lineHeight: number,
): LineEstimate {
  const charsPerLine = Math.max(8, Math.floor(frame.w / (fontSize * 0.5)));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return { lines, heightPx: lines * fontSize * lineHeight };
}

/**
 * Measure a single block's content against its resolved frame.
 * Returns an overflow issue when the estimated rendered height exceeds the
 * slot frame, mirroring plan §7.3 steps 5-6.
 */
export function measureBlockOverflow(block: Block, frame: Frame): MeasureIssue | undefined {
  const text = textOf(block);
  if (!text) return undefined;
  const level = typeof block.style?.level === 'number' ? block.style.level : undefined;
  const fontSize = block.type === 'heading' ? headingFontSize(frame.w, level) : bodyFontSize(frame.w);
  const { lines, heightPx } = estimateTextLines(text, frame, fontSize, 1.5);
  if (lines > 3 && block.type === 'heading') {
    return {
      severity: 'warning',
      code: 'orphan',
      slot: block.slot ?? block.id,
      blockId: block.id,
      message: `Heading is estimated at ${lines} lines; plan §7.6 avoids headings above three lines.`,
      metric: { overflowLines: lines },
    };
  }
  if (heightPx > frame.h) {
    const overflowLines = Math.ceil((heightPx - frame.h) / (fontSize * 1.5));
    return {
      severity: 'error',
      code: 'overflow',
      slot: block.slot ?? block.id,
      blockId: block.id,
      message: `Text estimated to overflow its slot by ~${overflowLines} line${overflowLines > 1 ? 's' : ''}.`,
      metric: { overflowLines },
    };
  }
  return undefined;
}

function textOf(block: Block): string {
  const content = block.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.filter((x): x is string => typeof x === 'string').join('\n');
  if (content && typeof content === 'object') {
    const value = (content as { value?: unknown }).value;
    if (typeof value === 'string') return value;
    const steps = (content as { steps?: unknown }).steps;
    if (Array.isArray(steps)) {
      return steps
        .map((step) => {
          if (typeof step === 'string') return step;
          const s = step as { title?: unknown; detail?: unknown };
          return [s.title, s.detail].filter((x): x is string => typeof x === 'string').join(' ');
        })
        .join('\n');
    }
    const items = (content as Record<string, unknown>)[Object.keys(content)[0] ?? ''];
    if (typeof items === 'string') return items;
    return JSON.stringify(content);
  }
  return '';
}

/**
 * Detect collisions between bound slot frames and freeform blocks.
 * Intentional overlap (allowOverlap or decorative) is respected (plan §15.2).
 */
export function detectCollisions(deck: DeckProject, slide: DeckSlide): MeasureIssue[] {
  const issues: MeasureIssue[] = [];
  const placements = resolveSlidePlacements(slide, deck.canvas);
  const byId = new Map(slide.blocks.map((block) => [block.id, block]));

  const regions: Array<{ label: string; frame: Frame; intentional: boolean; blockId?: string }> = placements.map(
    (placement) => ({
      label: `slot:${placement.slotId}`,
      frame: placement.frame,
      intentional: false,
      blockId: placement.blockId,
    }),
  );

  for (const block of slide.blocks) {
    if (block.positionMode !== 'freeform' || !block.frame) continue;
    const intentional = Boolean(block.allowOverlap || block.decorative);
    for (const other of regions) {
      if (!overlaps(block.frame, other.frame)) continue;
      const ratio = intersectionArea(block.frame, other.frame) / Math.min(area(block.frame), area(other.frame));
      if (ratio > 0.05 && !intentional) {
        issues.push({
          severity: 'error',
          code: 'collision',
          slot: block.slot ?? block.id,
          blockId: block.id,
          message: `Freeform block overlaps ${other.label} by ${ratio.toFixed(0)}%.`,
          metric: { collisionRatio: ratio },
        });
      }
    }
  }
  return issues;
}

/**
 * Full slide measurement: budget, overflow, boundary, and collision checks.
 * Returns issues sorted so errors precede warnings and structural checks lead.
 */
export function measureSlide(deck: DeckProject, slide: DeckSlide): MeasureIssue[] {
  const issues: MeasureIssue[] = [];
  const resolved = resolveLayout(slide.layout, deck.canvas);
  const slotById = new Map(resolved.map((entry) => [entry.slot.id, entry.slot]));
  const frameById = new Map(resolved.map((entry) => [entry.slot.id, entry.frame]));

  for (const binding of slide.layoutBindings ?? []) {
    const slot = slotById.get(binding.slot);
    const frame = frameById.get(binding.slot);
    if (!slot || !frame) continue;
    const count = binding.blockIds.length;
    if (slot.maxItems != null && count > slot.maxItems) {
      issues.push({
        severity: 'warning',
        code: 'budget',
        slot: binding.slot,
        message: `Slot "${binding.slot}" holds ${count} blocks, max is ${slot.maxItems}.`,
      });
    }
    const budgetChars = slot.contentBudget?.maxCharacters;
    if (budgetChars != null) {
      const chars = binding.blockIds.reduce((sum, blockId) => {
        const block = slide.blocks.find((b) => b.id === blockId);
        return sum + (block ? textOf(block).length : 0);
      }, 0);
      if (chars > budgetChars) {
        issues.push({
          severity: 'warning',
          code: 'budget',
          slot: binding.slot,
          message: `Slot "${binding.slot}" has ~${chars} characters, budget is ${budgetChars}.`,
        });
      }
    }
    for (const blockId of binding.blockIds) {
      const block = slide.blocks.find((b) => b.id === blockId);
      if (block && (block.type === 'text' || block.type === 'heading' || block.type === 'bullets')) {
        const overflow = measureBlockOverflow(block, frame);
        if (overflow) issues.push(overflow);
      }
    }
  }

  // Stage boundary check for freeform/background blocks.
  const cw = deck.canvas.width;
  const ch = deck.canvas.height;
  const safe = deck.canvas.safeMargin ?? 64;
  for (const block of slide.blocks) {
    if (block.positionMode !== 'freeform' || !block.frame) continue;
    const f = block.frame;
    if (f.x < safe || f.y < safe || f.x + f.w > cw - safe || f.y + f.h > ch - safe) {
      issues.push({
        severity: 'error',
        code: 'boundary',
        slot: block.slot ?? block.id,
        blockId: block.id,
        message: `Freeform block leaves the safe margin (${safe}px).`,
      });
    }
  }

  issues.push(...detectCollisions(deck, slide));

  const order: Record<MeasureIssue['code'], number> = { overflow: 1, collision: 2, budget: 3, boundary: 4, orphan: 5 };
  return issues.sort((a, b) => (order[a.code] ?? 9) - (order[b.code] ?? 9));
}

/** True when a slide still has unresolved blocking measurement issues. */
export function hasBlockingIssues(issues: MeasureIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

/** Human-readable summary counts for UI display. */
export function summarizeIssues(issues: MeasureIssue[]): { errors: number; warnings: number } {
  return {
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
  };
}
