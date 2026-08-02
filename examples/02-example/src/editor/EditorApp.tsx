import { useMemo, useState } from 'react';
import type { DeckStore } from '../deck/useDeck';
import { listLayouts, auditSlideLayout } from '../deck/layout';
import { listThemes, getTheme } from '../deck/themes';
import { newId } from '../deck/seed';
import type { Block } from '../deck/types';
import { EditorSlideRenderer } from '../render/SlideRenderer';
import { SaveStatus } from '../ui/SaveStatus';
import { CommandPalette, type CommandItem } from '../ui/CommandPalette';
import { ShortcutHelpDialog } from '../ui/ShortcutHelpDialog';
import { useHotkeys } from '../ui/hotkeys';

interface EditorAppProps {
  store: DeckStore;
  navigate: (route: 'editor' | 'present') => void;
}

const HELP_ROWS = [
  { keys: 'Ctrl+S', label: 'Save deck' },
  { keys: 'Ctrl+Z', label: 'Undo' },
  { keys: 'Ctrl+Shift+Z', label: 'Redo' },
  { keys: 'Ctrl+D', label: 'Duplicate selection or slide' },
  { keys: 'Delete', label: 'Delete selection' },
  { keys: 'Arrow keys', label: 'Nudge selection' },
  { keys: 'Ctrl+A', label: 'Select all in current context' },
  { keys: 'Ctrl+K', label: 'Open command palette' },
  { keys: 'Ctrl+Enter', label: 'Present from current slide' },
  { keys: '?', label: 'Open keyboard shortcuts' },
];

const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: 'Heading',
  text: 'Text',
  bullets: 'Bullets',
  metric: 'Metric',
  chart: 'Chart',
  image: 'Image',
  callout: 'Callout',
  caption: 'Caption',
  citation: 'Citation',
  process: 'Process',
};

function makeBlockForType(type: string): Block {
  const id = newId('b');
  switch (type) {
    case 'heading':
      return { id, type, content: 'New heading', style: { level: 3 }, sourceIds: [], positionMode: 'slot' };
    case 'bullets':
      return { id, type, content: ['First bullet', 'Second bullet'], style: {}, sourceIds: [], positionMode: 'slot' };
    case 'metric':
      return { id, type, content: { value: '100%', label: 'New metric', delta: '' }, style: {}, sourceIds: [], positionMode: 'slot' };
    case 'chart':
      return {
        id,
        type,
        content: {
          type: 'bar',
          title: 'New chart',
          unit: '',
          values: [
            { label: 'A', value: 40 },
            { label: 'B', value: 60 },
          ],
          summary: '',
        },
        style: {},
        sourceIds: [],
        positionMode: 'slot',
      };
    case 'image':
      return { id, type, content: { src: '', fit: 'cover' }, style: {}, alt: 'Image', sourceIds: [], positionMode: 'slot' };
    case 'callout':
      return { id, type, content: 'Add a callout.', style: {}, sourceIds: [], positionMode: 'slot' };
    case 'citation':
      return { id, type, content: 'Source citation.', style: {}, sourceIds: [], positionMode: 'slot' };
    case 'caption':
      return { id, type, content: 'Caption', style: { variant: 'caption' }, sourceIds: [], positionMode: 'slot' };
    case 'process':
      return {
        id,
        type,
        content: { steps: [{ title: 'Step one', detail: 'Describe it.' }, { title: 'Step two', detail: 'Describe it.' }] },
        style: {},
        sourceIds: [],
        positionMode: 'slot',
      };
    default:
      return { id, type: 'text', content: 'New text block', style: {}, sourceIds: [], positionMode: 'slot' };
  }
}

export function EditorApp({ store, navigate }: EditorAppProps) {
  const { deck, selection, saveState, canUndo, canRedo, select, selectSlide, selectBlock, selectNone, commit, undo, redo, saveNow } = store;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [zoom, setZoom] = useState(0.62);
  const [notesOpen, setNotesOpen] = useState(true);

  const activeSlide = deck.slides.find((slide) => slide.id === selection.slideId) ?? deck.slides[0];
  const activeBlock = activeSlide.blocks.find((block) => block.id === selection.blockIds[0]);
  const layouts = listLayouts();
  const themes = listThemes();
  const issues = useMemo(() => auditSlideLayout(activeSlide, deck.canvas), [activeSlide, deck.canvas]);

  const insertBlock = (type: string) => {
    const block = makeBlockForType(type);
    commit({ type: 'addBlock', slideId: activeSlide.id, block });
    selectBlock(activeSlide.id, block.id);
  };

  const insertText = () => insertBlock('text');

  const updateBlock = (blockId: string, patch: { content?: unknown; style?: Record<string, unknown>; alt?: string }) => {
    if ('content' in patch && patch.content !== undefined) {
      commit({ type: 'updateBlockContent', slideId: activeSlide.id, blockId, content: patch.content });
    }
    if (patch.style !== undefined) {
      commit({ type: 'updateBlockStyle', slideId: activeSlide.id, blockId, style: patch.style });
    }
    if (patch.alt !== undefined) {
      commit({ type: 'updateBlockAlt', slideId: activeSlide.id, blockId, alt: patch.alt });
    }
  };

  const updateActiveSlide = (patch: { title?: string; notes?: string; layout?: string }) => {
    const slideId = activeSlide.id;
    if (patch.title !== undefined) commit({ type: 'updateSlideTitle', slideId, title: patch.title });
    if (patch.notes !== undefined) commit({ type: 'updateSlideNotes', slideId, notes: patch.notes });
    if (patch.layout !== undefined) commit({ type: 'updateSlideLayout', slideId, layout: patch.layout });
  };

  const deleteSelection = () => {
    if (selection.mode === 'block') {
      for (const blockId of selection.blockIds) commit({ type: 'removeBlock', slideId: activeSlide.id, blockId });
      selectNone();
    }
  };

  const duplicateSelection = () => {
    if (selection.mode === 'block' && selection.blockIds[0]) {
      const first = selection.blockIds[0];
      commit({ type: 'duplicateBlock', slideId: activeSlide.id, blockId: first });
      const nextBlock = activeSlide.blocks.find((block) => block.id === first);
      if (nextBlock) selectBlock(activeSlide.id, nextBlock.id);
    }
  };

  const present = () => {
    navigate('present');
  };

  const paletteCommands = useMemo<CommandItem[]>(
    () => [
      { id: 'save', label: 'Save deck', group: 'Deck', hint: 'Ctrl+S', run: () => saveNow() },
      { id: 'present', label: 'Present from current slide', group: 'Deck', hint: 'Ctrl+Enter', run: () => present() },
      { id: 'add-slide', label: 'Add slide', group: 'Slides', run: () => commit({ type: 'addSlide', afterIndex: deck.slides.findIndex((s) => s.id === activeSlide.id) }) },
      { id: 'duplicate-slide', label: 'Duplicate current slide', group: 'Slides', run: () => commit({ type: 'duplicateSlide', slideId: activeSlide.id }) },
      { id: 'undo', label: 'Undo', group: 'History', hint: 'Ctrl+Z', disabled: !canUndo, run: () => undo() },
      { id: 'redo', label: 'Redo', group: 'History', hint: 'Ctrl+Shift+Z', disabled: !canRedo, run: () => redo() },
      ...Object.keys(BLOCK_TYPE_LABELS).map((type) => ({
        id: `insert-${type}`,
        label: `Insert ${BLOCK_TYPE_LABELS[type]}`,
        group: 'Insert block',
        run: () => insertBlock(type),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck, activeSlide.id, canUndo, canRedo, selection],
  );

  useHotkeys([
    { keys: ['ctrl+s'], handler: (event) => { event.preventDefault(); saveNow(); } },
    { keys: ['ctrl+z'], handler: () => undo() },
    { keys: ['ctrl+shift+z'], handler: () => redo() },
    { keys: ['ctrl+k'], handler: () => setPaletteOpen(true) },
    { keys: ['?'], handler: () => setHelpOpen(true) },
    { keys: ['ctrl+enter'], handler: () => present() },
    { keys: ['ctrl+d'], handler: () => duplicateSelection() },
    { keys: ['delete', 'backspace'], handler: () => deleteSelection() },
    { keys: ['ctrl+a'], handler: (event) => { event.preventDefault(); select(activeSlide.id, activeSlide.blocks.map((block) => block.id)); } },
  ]);

  const theme = getTheme(deck.theme.id);

  return (
    <div className={`editor-shell ${notesOpen ? '' : 'notes-collapsed'}`} data-testid="deck-editor-shell">
      <header className="editor-appbar">
        <div className="editor-document-title">
          <strong>{deck.meta.title}</strong>
          <span className="editor-slug">· {deck.meta.slug}</span>
          <SaveStatus state={saveState} onSave={() => saveNow()} />
        </div>
        <div className="editor-toolbar" role="toolbar" aria-label="Deck editing tools">
          <div className="toolbar-group">
            <button type="button" disabled={!canUndo} onClick={() => undo()} title="Undo (Ctrl+Z)" aria-label="Undo">↩ Undo</button>
            <button type="button" disabled={!canRedo} onClick={() => redo()} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↪ Redo</button>
          </div>
          <div className="toolbar-group" aria-label="Insert">
            {Object.keys(BLOCK_TYPE_LABELS).map((type) => (
              <button
                key={type}
                type="button"
                onClick={type === 'text' ? () => insertText() : () => insertBlock(type)}
                title={`Insert ${BLOCK_TYPE_LABELS[type]}`}
              >
                + {BLOCK_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <div className="toolbar-group">
            <button type="button" onClick={() => setPaletteOpen(true)} title="Command palette (Ctrl+K)">⌘</button>
            <button type="button" onClick={() => setHelpOpen(true)} title="Keyboard shortcuts (?)">?</button>
          </div>
        </div>
        <div className="editor-app-actions">
          <button type="button" className="primary" onClick={() => present()}>Present</button>
        </div>
      </header>

      <nav className="editor-slide-rail" aria-label="Slides">
        <div className="editor-rail-head">
          <strong>Slides</strong>
          <button type="button" onClick={() => commit({ type: 'addSlide', afterIndex: deck.slides.length - 1 })} aria-label="Add slide">＋</button>
        </div>
        {deck.slides.map((slide, index) => (
          <div key={slide.id} className="editor-slide-row" data-active={slide.id === activeSlide.id}>
            <button
              type="button"
              className="editor-thumbnail"
              aria-current={slide.id === activeSlide.id ? 'page' : undefined}
              onClick={() => selectSlide(slide.id)}
            >
              <span className="thumb-index">{index + 1}</span>
              <span className="thumb-title">{slide.title}</span>
            </button>
            <div className="editor-slide-row-actions">
              <button type="button" onClick={() => commit({ type: 'duplicateSlide', slideId: slide.id })} aria-label={`Duplicate ${slide.title}`}>⧉</button>
              <button type="button" onClick={() => commit({ type: 'removeSlide', slideId: slide.id })} aria-label={`Delete ${slide.title}`}>×</button>
            </div>
          </div>
        ))}
      </nav>

      <main className="editor-canvas">
        <div className="editor-canvas-controls">
          <span className="zoom-label">Zoom {Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.25, z - 0.08))} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setZoom(0.62)} aria-label="Reset zoom">Fit</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(1.5, z + 0.08))} aria-label="Zoom in">+</button>
          <span className="layout-name">
            Layout: <strong>{activeSlide.layout}</strong>
          </span>
          {issues.length ? (
            <span className="layout-issues" title={issues.map((issue) => `${issue.slot}: ${issue.message}`).join('\n')}>
              ⚠ {issues.length} layout issue{issues.length > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <div className="canvas-stage" onClick={() => selectNone()}>
          <EditorSlideRenderer
            deck={deck}
            slide={activeSlide}
            scale={zoom}
            interactive
            selectedBlockIds={selection.blockIds}
            onBlockSelect={(blockId, additive) => selectBlock(activeSlide.id, blockId, additive)}
          />
        </div>
      </main>

      <div className={`editor-notes-area ${notesOpen ? '' : 'is-collapsed'}`}>
        <div className="editor-notes-toggle">
          <label htmlFor="speaker-notes">Speaker notes</label>
          <button
            type="button"
            className="editor-notes-toggle-button"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((value) => !value)}
          >
            {notesOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        <textarea
          id="speaker-notes"
          value={activeSlide.speakerNotes ?? ''}
          placeholder="Notes for this slide (visible in presenter view)."
          onChange={(event) => updateActiveSlide({ notes: event.target.value })}
        />
      </div>

      <aside className="editor-inspector" aria-label="Inspector">
        <div className="inspector-section">
          <h3>Slide</h3>
          <label>
            Title
            <input type="text" value={activeSlide.title} onChange={(event) => updateActiveSlide({ title: event.target.value })} />
          </label>
          <label>
            Layout
            <select value={activeSlide.layout} onChange={(event) => updateActiveSlide({ layout: event.target.value })}>
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Theme
            <select
              value={deck.theme.id}
              onChange={(event) => commit({ type: 'setTheme', themeId: event.target.value })}
            >
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="inspector-section">
          <h3>
            Block
            <button type="button" className="inspector-clear" disabled={selection.mode !== 'block'} onClick={() => selectNone()}>
              Clear
            </button>
          </h3>
          {selection.mode === 'block' && activeBlock ? (
            <BlockInspector
              block={activeBlock}
              themeId={deck.theme.id}
              update={(patch) => updateBlock(activeBlock.id, patch)}
            />
          ) : (
            <p className="inspector-empty">
              {selection.mode === 'slide'
                ? 'Select a block on the slide to edit its content.'
                : 'Select a block to edit its content, style, and accessibility fields.'}
            </p>
          )}
        </div>
      </aside>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} />
      <ShortcutHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} groups={[]} rows={HELP_ROWS} />
      <style>{`${themeFontsCss(theme.typography)}`}</style>
    </div>
  );
}

function themeFontsCss(typography: { headingFont: string; bodyFont: string; codeFont: string }): string {
  return `:root{--font-heading:'${typography.headingFont}',serif;--font-body:'${typography.bodyFont}',sans-serif;--font-code:'${typography.codeFont}',monospace}`;
}

interface BlockInspectorProps {
  block: Block;
  themeId: string;
  update: (patch: { content?: unknown; style?: Record<string, unknown>; alt?: string }) => void;
}

function BlockInspector({ block, update }: BlockInspectorProps) {
  const style = block.style ?? {};
  return (
    <div className="block-inspector">
      <div className="inspector-tabs" role="tablist" aria-label="Block inspector tabs">
        <button type="button" className="tab is-active" role="tab" aria-selected="true">Content</button>
        <button type="button" className="tab" role="tab" aria-selected="false" disabled>Style</button>
        <button type="button" className="tab" role="tab" aria-selected="false" disabled>Accessibility</button>
      </div>
      <ContentInspector block={block} update={update} />
      <label>
        Style variant
        <select
          value={typeof style.variant === 'string' ? style.variant : ''}
          onChange={(event) => update({ style: { ...style, variant: event.target.value } })}
        >
          <option value="">Default</option>
          <option value="kicker">Kicker</option>
          <option value="meta">Meta</option>
          <option value="caption">Caption</option>
          <option value="callout">Callout</option>
        </select>
      </label>
      {block.type === 'heading' ? (
        <label>
          Level
          <select
            value={typeof style.level === 'number' ? style.level : 1}
            onChange={(event) => update({ style: { ...style, level: Number(event.target.value) } })}
          >
            <option value={1}>1 — Slide heading</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
      ) : null}
      <label>
        Alt text (accessibility)
        <textarea value={block.alt ?? ''} onChange={(event) => update({ alt: event.target.value })} placeholder="Describe the block for screen readers." />
      </label>
    </div>
  );
}

function ContentInspector({ block, update }: { block: Block; update: (patch: { content?: unknown; style?: Record<string, unknown>; alt?: string }) => void }) {
  switch (block.type) {
    case 'heading':
    case 'text':
    case 'callout':
    case 'caption':
    case 'citation':
      return (
        <label>
          Content
          <textarea
            value={typeof block.content === 'string' ? block.content : ''}
            onChange={(event) => update({ content: event.target.value })}
          />
        </label>
      );
    case 'bullets':
      return (
        <label>
          Bullets (one per line)
          <textarea
            value={Array.isArray(block.content) ? block.content.join('\n') : ''}
            onChange={(event) => update({ content: event.target.value.split('\n') })}
          />
        </label>
      );
    case 'metric': {
      const content = (block.content as { value?: string; label?: string; delta?: string }) ?? {};
      return (
        <div className="inspector-fields">
          <label>Value<input type="text" value={content.value ?? ''} onChange={(event) => update({ content: { ...content, value: event.target.value } })} /></label>
          <label>Label<input type="text" value={content.label ?? ''} onChange={(event) => update({ content: { ...content, label: event.target.value } })} /></label>
          <label>Delta<input type="text" value={content.delta ?? ''} onChange={(event) => update({ content: { ...content, delta: event.target.value } })} /></label>
        </div>
      );
    }
    case 'image': {
      const content = (block.content as { src?: string; fit?: string }) ?? {};
      return (
        <div className="inspector-fields">
          <label>Image URL<input type="text" value={content.src ?? ''} onChange={(event) => update({ content: { ...content, src: event.target.value } })} /></label>
          <label>
            Fit
            <select value={content.fit ?? 'cover'} onChange={(event) => update({ content: { ...content, fit: event.target.value } })}>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
        </div>
      );
    }
    case 'process': {
      const content = (block.content as { steps?: Array<{ title: string; detail?: string }> }) ?? {};
      const steps = content.steps ?? [];
      return (
        <div className="inspector-fields">
          {steps.map((step, index) => (
            <div key={index} className="process-step-field">
              <label>Step {index + 1} title<input value={step.title} onChange={(event) => {
                const next = steps.map((s, i) => (i === index ? { ...s, title: event.target.value } : s));
                update({ content: { ...content, steps: next } });
              }} /></label>
              <label>Detail<input value={step.detail ?? ''} onChange={(event) => {
                const next = steps.map((s, i) => (i === index ? { ...s, detail: event.target.value } : s));
                update({ content: { ...content, steps: next } });
              }} /></label>
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
