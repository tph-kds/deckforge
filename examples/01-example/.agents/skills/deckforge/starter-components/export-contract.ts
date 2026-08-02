import type { DeckProject } from './deck-types';

export type ExportTarget = 'standalone-html' | 'pdf' | 'pptx-editable' | 'pptx-screenshot' | 'png';

export type ExportAdapter = {
  target: ExportTarget;
  validate(deck: DeckProject): Promise<string[]>;
  export(deck: DeckProject): Promise<{ filename: string; mimeType: string; bytes: Uint8Array }>;
};
