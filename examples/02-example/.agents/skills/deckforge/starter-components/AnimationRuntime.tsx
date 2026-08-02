import React, { useMemo } from 'react';
import type { DeckBlock } from './deck-types';

export function useBuildSequence(blocks: DeckBlock[]) {
  return useMemo(() => blocks.filter((block) => block.animation).sort((a, b) => (a.animation?.order ?? 0) - (b.animation?.order ?? 0)), [blocks]);
}

export function AnimatedBlock({ block, revealed, children }: { block: DeckBlock; revealed: boolean; children: React.ReactNode }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const id = block.animation?.id ?? 'none';
  return <div data-animation={reduce ? 'none' : id} data-revealed={revealed}>{children}</div>;
}

export type BuildStep = { blockId: string; order: number };

export function buildStepsForSlide(blocks: DeckBlock[], defaultBuilds: boolean): BuildStep[] {
  const steps = blocks
    .filter((b) => b.animation || defaultBuilds)
    .sort((a, b) => (a.animation?.order ?? 0) - (b.animation?.order ?? 0))
    .map((b) => ({ blockId: b.id, order: b.animation?.order ?? 0 }));
  return defaultBuilds ? steps : steps.filter((s) => blocks.find((b) => b.id === s.blockId)?.animation);
}

export function isBlockRevealed(blockId: string, blocks: DeckBlock[], buildIndex: number, defaultBuilds: boolean): boolean {
  const steps = buildStepsForSlide(blocks, defaultBuilds);
  const idx = steps.findIndex((s) => s.blockId === blockId);
  return idx === -1 ? true : buildIndex >= idx;
}
