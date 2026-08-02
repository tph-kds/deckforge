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
