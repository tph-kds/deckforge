import type { Block, DeckProject, DeckSlide } from './types';
import type { Command } from './commands';
import { measureSlide, type MeasureIssue } from './measure';
import { getLayoutContract } from './layout';

/**
 * Deterministic automated repair (plan §7.4, §15.3, §15.4, P0-004).
 *
 * Runs at most `maxAttempts` render→validate→repair attempts. Each attempt
 * applies a targeted repair for the worst blocking failure, then re-measures.
 * Repairs are immutable: every applied change is recorded as an explicit
 * `RepairOperation` and (where a granular command exists) a `DeckCommand`.
 * The loop detects convergence by document hash and never mutates its input.
 */

export type SemanticRisk = 'none' | 'low' | 'medium' | 'high';

/** Alias for the command layer's command union, so repairs are auditable/undoable. */
export type DeckCommand = Command;

export interface RepairAttempt {
  attempt: number;
  applied: string[];
  remainingErrors: number;
}

export interface RepairOperation {
  id: string;
  code: string;
  description: string;
  blockId?: string;
  slot?: string;
  confidence: number;
  semanticRisk: SemanticRisk;
  requiresApproval: boolean;
  approved?: boolean;
}

export interface RepairWarning {
  code: string;
  message: string;
  slot?: string;
  blockId?: string;
}

export interface RepairResult {
  deck: DeckProject;
  accepted: boolean;
  attempts: RepairAttempt[];
  finalIssues: MeasureIssue[];
  operations: RepairOperation[];
  commands: DeckCommand[];
  changed: boolean;
  converged: boolean;
  iterationCount: number;
  warnings: RepairWarning[];
  semanticRisk: SemanticRisk;
  blockedOnApproval?: boolean;
}

function cloneDeck(deck: DeckProject): DeckProject {
  return structuredClone(deck);
}

/**
 * Deterministic content hash over slides/blocks/layoutBindings (P0-004 C-03).
 * Uses a canonical projection (order-preserving) so identical decks hash
 * identically and any content change produces a different hash.
 */
export function hashDeck(deck: DeckProject): string {
  const projection = {
    slides: deck.slides.map((slide) => ({
      id: slide.id,
      layout: slide.layout,
      layoutVariant: slide.layoutVariant,
      density: slide.density,
      layoutBindings: (slide.layoutBindings ?? []).map((binding) => ({
        slot: binding.slot,
        blockIds: binding.blockIds,
        flow: binding.flow,
        gap: binding.gap,
      })),
      blocks: slide.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        style: block.style,
        slot: block.slot,
        positionMode: block.positionMode,
        frame: block.frame,
      })),
    })),
  };
  return JSON.stringify(projection);
}

function mapSlide(deck: DeckProject, slideId: string, fn: (slide: DeckSlide) => DeckSlide): DeckProject {
  return { ...deck, slides: deck.slides.map((slide) => (slide.id === slideId ? fn(slide) : slide)) };
}

function mapBlock(slide: DeckSlide, blockId: string, fn: (block: Block) => Block): DeckSlide {
  return { ...slide, blocks: slide.blocks.map((block) => (block.id === blockId ? fn(block) : block)) };
}

function updateBindingGap(slide: DeckSlide, slot: string, gap: number): DeckSlide {
  return {
    ...slide,
    layoutBindings: (slide.layoutBindings ?? []).map((binding) =>
      binding.slot === slot ? { ...binding, gap } : binding,
    ),
  };
}

/** Repair 1: remove unnecessary decorative spacing in an overflowing slot. */
function tightenSpacing(slide: DeckSlide, slot: string): DeckSlide {
  return updateBindingGap(slide, slot, 6);
}

function splitSentences(content: unknown): string[] {
  const text = typeof content === 'string' ? content : Array.isArray(content) ? content.join(' ') : '';
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Repair 2: convert a long paragraph into concise bullets (plan §7.4 step 4). */
function paragraphToBullets(slide: DeckSlide, blockId: string): DeckSlide {
  return mapBlock(slide, blockId, (block) => {
    if (block.type !== 'text') return block;
    const sentences = splitSentences(block.content);
    return { ...block, type: 'bullets', content: sentences.length > 1 ? sentences : block.content };
  });
}

/** Repair 3: trim optional supporting text to its leading sentences (plan §7.4 step 3). */
function trimSupportingText(slide: DeckSlide, blockId: string): DeckSlide {
  return mapBlock(slide, blockId, (block) => {
    const sentences = splitSentences(block.content);
    if (sentences.length <= 2) return block;
    const trimmed = sentences.slice(0, 2).join(' ');
    return { ...block, content: trimmed };
  });
}

/** Repair 4: reduce heading emphasis by one typography step (plan §7.4 step 6). */
function reduceHeadingStep(slide: DeckSlide, blockId: string): DeckSlide {
  return mapBlock(slide, blockId, (block) => {
    if (block.type !== 'heading') return block;
    const level = (block.style?.level as number) ?? 3;
    const next = level < 3 ? level + 1 : 3;
    return { ...block, style: { ...block.style, level: next } };
  });
}

function nextHeadingLevel(block: Block): number {
  const level = (block.style?.level as number) ?? 3;
  return level < 3 ? level + 1 : 3;
}

function firstBlockForIssue(deck: DeckProject, slide: DeckSlide, issue: MeasureIssue): Block | undefined {
  return slide.blocks.find((block) => block.id === issue.blockId);
}

function textBlockIds(deck: DeckProject, slide: DeckSlide): string[] {
  return slide.blocks
    .filter((block) => block.type === 'text' || block.type === 'heading')
    .map((block) => block.id);
}

/**
 * P0-004 C-02: slot availability is decided per-slide. A slot may only be
 * repaired when it is part of THIS slide's layout contract, never borrowed
 * from another slide.
 */
function slideHasSlot(slide: DeckSlide, slot: string): boolean {
  const contract = getLayoutContract(slide.layout);
  if (!contract?.composition) return false;
  return contract.composition.slots.some((entry) => entry.id === slot);
}

interface RepairStep {
  deck: DeckProject;
  applied: boolean;
  message: string;
  operation?: RepairOperation;
  command?: DeckCommand;
  warning?: RepairWarning;
}

function step(
  attempt: number,
  next: DeckProject,
  message: string,
  applied: boolean,
  op?: Omit<RepairOperation, 'id'>,
  command?: DeckCommand,
  warning?: RepairWarning,
): RepairStep {
  return {
    deck: next,
    applied,
    message,
    ...(op ? { operation: { ...op, id: `repair-op-${attempt}` } } : {}),
    ...(command ? { command } : {}),
    ...(warning ? { warning } : {}),
  };
}

const RISK_ORDER: Record<SemanticRisk, number> = { none: 0, low: 1, medium: 2, high: 3 };

function maxRisk(operations: RepairOperation[]): SemanticRisk {
  return operations.reduce<SemanticRisk>(
    (max, op) => (RISK_ORDER[op.semanticRisk] > RISK_ORDER[max] ? op.semanticRisk : max),
    'none',
  );
}

/**
 * Build the trim/bullets reduction step. Text reduction reduces content, so it
 * is tagged `medium` and requires approval (P0-004 C-04). When approval is not
 * granted the operation is recorded as proposed (`approved: false`) and the
 * deck is left untouched.
 */
function textReductionStep(
  attempt: number,
  deck: DeckProject,
  slide: DeckSlide,
  blockId: string,
  slot: string | undefined,
  strategy: 'trim' | 'bullets',
  approveRisk: boolean,
): RepairStep {
  const block = slide.blocks.find((b) => b.id === blockId);
  const sentences = splitSentences(block?.content);

  if (strategy === 'trim') {
    const trimmed = sentences.slice(0, 2).join(' ');
    const next = mapSlide(deck, slide.id, (s) => trimSupportingText(s, blockId));
    const op: Omit<RepairOperation, 'id'> = {
      code: 'repair-trim-text',
      description: `Trimmed supporting text in "${blockId}" to its leading sentences.`,
      blockId,
      slot,
      confidence: 0.75,
      semanticRisk: 'medium',
      requiresApproval: true,
      approved: approveRisk ? true : false,
    };
    if (!approveRisk) {
      return step(
        attempt,
        deck,
        `Requires approval: trim supporting text in "${blockId}".`,
        false,
        op,
        undefined,
        {
          code: 'approval-required',
          message: `Trimming text in "${blockId}" reduces content and requires approval.`,
          blockId,
          slot,
        },
      );
    }
    return step(
      attempt,
      next,
      `Trimmed supporting text in "${blockId}".`,
      true,
      op,
      { type: 'updateBlockContent', slideId: slide.id, blockId, content: trimmed },
    );
  }

  if (sentences.length <= 1) {
    return step(attempt, deck, 'No targeted repair available; rejecting.', false);
  }
  const next = mapSlide(deck, slide.id, (s) => paragraphToBullets(s, blockId));
  const op: Omit<RepairOperation, 'id'> = {
    code: 'repair-to-bullets',
    description: `Converted the paragraph in "${blockId}" to bullets.`,
    blockId,
    slot,
    confidence: 0.7,
    semanticRisk: 'medium',
    requiresApproval: true,
    approved: approveRisk ? true : false,
  };
  if (!approveRisk) {
    return step(
      attempt,
      deck,
      `Requires approval: convert text in "${blockId}" to bullets.`,
      false,
      op,
      undefined,
      {
        code: 'approval-required',
        message: `Converting text in "${blockId}" to bullets changes its format and requires approval.`,
        blockId,
        slot,
      },
    );
  }
  return step(
    attempt,
    next,
    `Converted text in "${blockId}" to bullets.`,
    true,
    op,
    { type: 'updateBlockContent', slideId: slide.id, blockId, content: sentences },
  );
}

function applyRepairForIssue(
  deck: DeckProject,
  slide: DeckSlide,
  issue: MeasureIssue,
  attempt: number,
  approveRisk: boolean,
): RepairStep {
  const blockId = issue.blockId;
  switch (issue.code) {
    case 'overflow': {
      if (attempt === 1) {
        if (!slideHasSlot(slide, issue.slot)) {
          return step(
            attempt,
            deck,
            `Refused slot repair: "${issue.slot}" is not part of slide "${slide.id}" layout contract.`,
            false,
            {
              code: 'repair-slot-scope-violation',
              description: `Refused to tighten spacing for slot "${issue.slot}", which is not in this slide's layout contract.`,
              slot: issue.slot,
              blockId,
              confidence: 0.4,
              semanticRisk: 'low',
              requiresApproval: true,
              approved: false,
            },
            undefined,
            {
              code: 'slot-scope-violation',
              message: `Repair refused slot "${issue.slot}" because it is not part of slide "${slide.id}" layout contract.`,
              slot: issue.slot,
              blockId,
            },
          );
        }
        const next = mapSlide(deck, slide.id, (s) => tightenSpacing(s, issue.slot));
        return step(
          attempt,
          next,
          `Tightened spacing in slot "${issue.slot}".`,
          true,
          {
            code: 'repair-tighten-spacing',
            description: `Reduced vertical gap in slot "${issue.slot}" to relieve overflow.`,
            slot: issue.slot,
            blockId,
            confidence: 0.9,
            semanticRisk: 'low',
            requiresApproval: false,
            approved: true,
          },
          { type: 'replaceDeck', deck: next },
        );
      }
      const block = blockId ? firstBlockForIssue(deck, slide, issue) : undefined;
      if (attempt === 2) {
        if (block?.type === 'heading') {
          const next = mapSlide(deck, slide.id, (s) => reduceHeadingStep(s, blockId!));
          return step(
            attempt,
            next,
            `Reduced heading emphasis in "${blockId}".`,
            true,
            {
              code: 'repair-reduce-heading',
              description: `Lowered heading emphasis by one typographic step in "${blockId}".`,
              blockId,
              slot: issue.slot,
              confidence: 0.8,
              semanticRisk: 'low',
              requiresApproval: false,
              approved: true,
            },
            { type: 'updateBlockStyle', slideId: slide.id, blockId: blockId!, style: { level: nextHeadingLevel(block) } },
          );
        }
        if (block?.type === 'text' && splitSentences(block.content).length > 2) {
          return textReductionStep(attempt, deck, slide, blockId!, issue.slot, 'trim', approveRisk);
        }
        return step(attempt, deck, 'No targeted repair available; rejecting.', false);
      }
      if (block?.type === 'text') {
        return textReductionStep(attempt, deck, slide, blockId!, issue.slot, 'bullets', approveRisk);
      }
      return step(attempt, deck, 'No targeted repair available; rejecting.', false);
    }
    case 'orphan': {
      if (!blockId) return step(attempt, deck, 'No repair available.', false);
      const block = firstBlockForIssue(deck, slide, issue);
      if (attempt === 1 && block?.type === 'text' && splitSentences(block.content).length > 2) {
        return textReductionStep(attempt, deck, slide, blockId, issue.slot, 'trim', approveRisk);
      }
      if (block?.type === 'heading') {
        const next = mapSlide(deck, slide.id, (s) => reduceHeadingStep(s, blockId));
        return step(
          attempt,
          next,
          `Reduced heading emphasis in "${blockId}".`,
          true,
          {
            code: 'repair-reduce-heading',
            description: `Lowered heading emphasis by one typographic step in "${blockId}".`,
            blockId,
            slot: issue.slot,
            confidence: 0.8,
            semanticRisk: 'low',
            requiresApproval: false,
            approved: true,
          },
          { type: 'updateBlockStyle', slideId: slide.id, blockId, style: { level: nextHeadingLevel(block) } },
        );
      }
      return step(attempt, deck, 'No repair available.', false);
    }
    case 'budget': {
      const candidates = textBlockIds(deck, slide);
      const target = candidates.find((bid) => {
        const block = slide.blocks.find((b) => b.id === bid);
        return block && typeof block.content === 'string' && block.content.split(/\s+/).length > 6;
      });
      if (target) {
        return textReductionStep(attempt, deck, slide, target, issue.slot, 'trim', approveRisk);
      }
      return step(attempt, deck, 'No trimming candidate; rejecting.', false);
    }
    default:
      return step(attempt, deck, `No deterministic repair for "${issue.code}"; rejecting.`, false);
  }
}

interface ResultTail {
  deck: DeckProject;
  accepted: boolean;
  attempts: RepairAttempt[];
  finalIssues: MeasureIssue[];
  operations: RepairOperation[];
  commands: DeckCommand[];
  warnings: RepairWarning[];
  converged: boolean;
  iterationCount: number;
  blockedOnApproval?: boolean;
}

function finalize(input: ResultTail): RepairResult {
  const changed = input.operations.some((op) => op.approved === true);
  const blocked =
    input.blockedOnApproval ??
    (!input.accepted && input.operations.some((op) => op.requiresApproval && op.approved === false));
  return {
    ...input,
    changed,
    semanticRisk: maxRisk(input.operations),
    ...(blocked ? { blockedOnApproval: true } : {}),
  };
}

/**
 * Run the repair loop for a single slide (P0-004).
 *
 * - Immutable: the input deck is cloned and never mutated.
 * - Every applied repair is recorded as an operation and (where possible) a
 *   command; operations that reduce content require approval and are only
 *   applied when `approveRisk` is true.
 * - Slot availability is scoped per slide (C-02).
 * - The loop stops early when a pass makes zero net change (converged=true) or
 *   revisits an earlier state (converged=false), and otherwise runs at most
 *   `maxAttempts` times (C-03).
 */
export function repairSlide(
  deck: DeckProject,
  slideId: string,
  maxAttempts = 3,
  approveRisk = false,
): RepairResult {
  let working = cloneDeck(deck);
  const attempts: RepairAttempt[] = [];
  const operations: RepairOperation[] = [];
  const commands: DeckCommand[] = [];
  const warnings: RepairWarning[] = [];

  const seenHashes = new Set<string>([hashDeck(working)]);
  let lastHash = hashDeck(working);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const slide = working.slides.find((s) => s.id === slideId);
    if (!slide) {
      return finalize({
        deck: working,
        accepted: false,
        attempts,
        finalIssues: [],
        operations,
        commands,
        warnings,
        converged: false,
        iterationCount: attempt - 1,
        blockedOnApproval: false,
      });
    }

    const issues = measureSlide(working, slide);
    const blocking = issues.filter((issue) => issue.severity === 'error');
    if (blocking.length === 0) {
      return finalize({
        deck: working,
        accepted: true,
        attempts,
        finalIssues: issues,
        operations,
        commands,
        warnings,
        converged: true,
        iterationCount: attempt - 1,
      });
    }

    const target = blocking[0];
    const outcome = applyRepairForIssue(working, slide, target, attempt, approveRisk);
    const next = outcome.deck;
    const nextHash = hashDeck(next);
    working = next;

    if (outcome.operation) operations.push(outcome.operation);
    if (outcome.command) commands.push(outcome.command);
    if (outcome.warning) warnings.push(outcome.warning);

    const afterSlide = working.slides.find((s) => s.id === slideId) ?? slide;
    const after = measureSlide(working, afterSlide);
    attempts.push({
      attempt,
      applied: [outcome.message],
      remainingErrors: after.filter((issue) => issue.severity === 'error').length,
    });

    if (outcome.applied) {
      if (nextHash === lastHash) {
        return finalize({
          deck: working,
          accepted: false,
          attempts,
          finalIssues: after,
          operations,
          commands,
          warnings,
          converged: true,
          iterationCount: attempt,
        });
      }
      if (seenHashes.has(nextHash)) {
        return finalize({
          deck: working,
          accepted: false,
          attempts,
          finalIssues: after,
          operations,
          commands,
          warnings,
          converged: false,
          iterationCount: attempt,
        });
      }
    }
    seenHashes.add(nextHash);
    lastHash = nextHash;
  }

  const slide = working.slides.find((s) => s.id === slideId);
  return finalize({
    deck: working,
    accepted: false,
    attempts,
    finalIssues: slide ? measureSlide(working, slide) : [],
    operations,
    commands,
    warnings,
    converged: false,
    iterationCount: attempts.length,
  });
}

/** Repair every slide in the deck; rejects any slide that stays invalid. */
export function repairDeck(deck: DeckProject, maxAttempts = 3, approveRisk = false): RepairResult[] {
  return deck.slides.map((slide) => repairSlide(deck, slide.id, maxAttempts, approveRisk));
}
