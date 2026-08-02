import React from 'react';
import type { DeckBlock } from './deck-types';

export type BlockRenderContext = {
  mode: 'editor' | 'presenter' | 'viewer';
  selected: boolean;
  reducedMotion: boolean;
};

export type BlockRenderer = (block: DeckBlock, context: BlockRenderContext) => React.ReactNode;
export type BlockRegistry = Readonly<Record<string, BlockRenderer>>;

export function renderRegisteredBlock(
  registry: BlockRegistry,
  block: DeckBlock,
  context: BlockRenderContext,
): React.ReactNode {
  const renderer = registry[block.type];
  if (!renderer) {
    return (
      <div role="note" data-unknown-block={block.type}>
        Unsupported block type: {block.type}
      </div>
    );
  }
  return renderer(block, context);
}

export function assertBlockRegistry(registry: BlockRegistry, allowedTypes: string[]): string[] {
  return allowedTypes.filter((type) => !registry[type]);
}
