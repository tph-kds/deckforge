import { useMemo, useRef, useState } from 'react';
import type { DeckStore } from '../deck/useDeck';
import { listLayouts, auditSlideLayout, suggestSlotForBlock } from '../deck/layout';
import { listThemes, getTheme } from '../deck/themes';
import { listMotionProfiles } from '../deck/motion';
import { newId } from '../deck/seed';
import type { Block } from '../deck/types';
import { measureSlide, summarizeIssues } from '../deck/measure';
import { repairSlide } from '../deck/repair';
import { EditorSlideRenderer } from '../render/SlideRenderer';
import { SlideViewport, type SlideViewportHandle, type ViewState } from '../render/SlideViewport';
import { SaveStatus } from '../ui/SaveStatus';
import { CommandPalette, type CommandItem } from '../ui/CommandPalette';
import { ShortcutHelpDialog } from '../ui/ShortcutHelpDialog';
import { useHotkeys } from '../ui/hotkeys';
import { ScrollSurface } from '../deck/scrollbars/ScrollSurface';
import { useResolvedScrollbarStyle } from '../deck/scrollbars/useResolvedScrollbarStyle';

interface EditorAppProps {
  store: DeckStore;
  navigate: (route: 'editor' | 'present') => void;
  onExport?: () => void;
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

const CANVAS_PRESETS = [
  { id: '16:9', label: '16:9 · 1600×900', width: 1600, height: 900 },
  { id: '16:9-wide', label: '16:9 · 1920×1080', width: 1920, height: 1080 },
  { id: '4:3', label: '4:3 · 1440×1080', width: 1440, height: 1080 },
  { id: 'square', label: '1:1 · 1080×1080', width: 1080, height: 1080 },
  { id: 'wide', label: 'Wide · 1920×800', width: 1920, height: 800 },
  { id: 'a4', label: 'A4 · 1240×1754', width: 1240, height: 1754 },
] as const;

function presetForCanvas(canvas: { aspectRatio: string; width: number; height: number }): string {
  const match = CANVAS_PRESETS.find((p) => p.width === canvas.width && p.height === canvas.height);
  return match ? match.id : 'custom';
}

function aspectRatioForPreset(id: string): '16:9' | '4:3' | 'custom' {
  if (id === '16:9' || id === '16:9-wide') return '16:9';
  if (id === '4:3') return '4:3';
  return 'custom';
}

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
          isTemplate: true,
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
      return { id, type, content: { assetId: '', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 } }, style: {}, alt: 'Image', sourceIds: [], positionMode: 'slot' };
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

export function EditorApp({ store, navigate, onExport }: EditorAppProps) {
  const { deck, selection, saveState, canUndo, canRedo, select, selectSlide, selectBlock, selectNone, commit, undo, redo, saveNow } = store;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [zoom, setZoom] = useState<ViewState>({ zoom: 1, fit: 1, atFit: true });
  const viewportRef = useRef<SlideViewportHandle>(null);
  const [notesOpen, setNotesOpen] = useState(true);
  const [railOpen, setRailOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  const notesScrollbar = useResolvedScrollbarStyle('speaker-notes');

  const activeSlide = deck.slides.find((slide) => slide.id === selection.slideId) ?? deck.slides[0];
  const activeBlock = activeSlide.blocks.find((block) => block.id === selection.blockIds[0]);
  const activeImageSource =
    activeBlock?.type === 'image'
      ? (() => {
          const content = activeBlock.content as { assetId?: string; src?: string } | undefined;
          const asset = content?.assetId
            ? (deck.assets ?? []).find((a) => a.id === content.assetId)
            : undefined;
          return content?.src ?? asset?.src ?? '';
        })()
      : '';
  const layouts = listLayouts();
  const themes = listThemes();
  const motionProfiles = listMotionProfiles();
  const issues = useMemo(() => auditSlideLayout(activeSlide, deck.canvas), [activeSlide, deck.canvas]);
  const measured = useMemo(() => measureSlide(deck, activeSlide), [deck, activeSlide]);
  const measuredCounts = useMemo(() => summarizeIssues(measured), [measured]);

  const repairActiveSlide = () => {
    const result = repairSlide(deck, activeSlide.id);
    if (result.accepted) {
      commit({ type: 'replaceDeck', deck: result.deck });
    } else {
      window.alert(
        `Could not repair this slide automatically.\n\n${result.finalIssues
          .map((issue) => `• ${issue.code}: ${issue.message}`)
          .join('\n')}`,
      );
    }
  };

  const enterFocusMode = () => {
    setFocusMode(true);
    setRailOpen(false);
    setInspectorOpen(false);
    setNotesOpen(false);
  };

  const exitFocusMode = () => {
    setFocusMode(false);
    setRailOpen(true);
    setInspectorOpen(true);
    setNotesOpen(true);
  };

  const editFromFocusMode = () => {
    setFocusMode(false);
    setInspectorOpen(true);
    setRailOpen(false);
    setNotesOpen(false);
  };

  const setCanvasPreset = (id: string) => {
    const preset = CANVAS_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    commit({
      type: 'setCanvas',
      canvas: {
        ...deck.canvas,
        width: preset.width,
        height: preset.height,
        aspectRatio: aspectRatioForPreset(preset.id),
      },
    });
  };

  const insertBlock = (type: string) => {
    const block = makeBlockForType(type);
    const slot = suggestSlotForBlock(activeSlide, block);
    commit({ type: 'addBlock', slideId: activeSlide.id, block, slot });
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

  const duplicateSlide = (slideId: string) => {
    const outcome = commit({ type: 'duplicateSlide', slideId });
    const createdSlideId = outcome?.createdIds[0];
    if (createdSlideId) selectSlide(createdSlideId);
  };

  const addSlide = (afterIndex?: number) => {
    const outcome = commit({ type: 'addSlide', afterIndex });
    const createdSlideId = outcome?.createdIds[0];
    if (createdSlideId) selectSlide(createdSlideId);
  };

  const duplicateSelection = () => {
    if (selection.mode === 'block' && selection.blockIds[0]) {
      const first = selection.blockIds[0];
      const outcome = commit({ type: 'duplicateBlock', slideId: activeSlide.id, blockId: first });
      const createdId = outcome?.createdIds[0];
      if (createdId) selectBlock(activeSlide.id, createdId);
    }
  };

  const present = () => {
    navigate('present');
  };

  const paletteCommands = useMemo<CommandItem[]>(
    () => [
      { id: 'save', label: 'Save deck', group: 'Deck', hint: 'Ctrl+S', run: () => saveNow() },
      { id: 'present', label: 'Present from current slide', group: 'Deck', hint: 'Ctrl+Enter', run: () => present() },
      { id: 'add-slide', label: 'Add slide', group: 'Slides', run: () => addSlide(deck.slides.findIndex((s) => s.id === activeSlide.id)) },
      { id: 'duplicate-slide', label: 'Duplicate current slide', group: 'Slides', run: () => duplicateSlide(activeSlide.id) },
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
    [deck, activeSlide.id, canUndo, canRedo, selection, focusMode],
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
    { keys: ['escape'], handler: () => { if (focusMode) exitFocusMode(); } },
    { keys: ['ctrl+a'], handler: (event) => { event.preventDefault(); select(activeSlide.id, activeSlide.blocks.map((block) => block.id)); } },
  ]);

  const theme = getTheme(deck.theme.id);

  return (
    <div
      className={`editor-shell ${notesOpen ? '' : 'notes-collapsed'} ${railOpen ? '' : 'rail-collapsed'} ${inspectorOpen ? '' : 'inspector-collapsed'} ${focusMode ? 'focus-mode' : ''}`}
      data-testid="deck-editor-shell"
    >
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
          {onExport && (
            <button type="button" className="secondary" onClick={onExport}>Export</button>
          )}
          <button type="button" className="primary" onClick={() => present()}>Present</button>
        </div>
      </header>

      <ScrollSurface as="nav" surface="slide-list" className="editor-slide-rail" aria-label="Slides">
        <div className="editor-rail-head">
          <strong>Slides</strong>
          <button type="button" onClick={() => addSlide(deck.slides.length - 1)} aria-label="Add slide">＋</button>
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
              <span className="thumb-main">
                <span className="thumb-title">{slide.title}</span>
                <span className="thumb-meta">
                  {slide.blocks.length} block{slide.blocks.length === 1 ? '' : 's'}
                  {slide.speakerNotes ? ' · notes' : ''}
                  {slide.hidden ? ' · hidden' : ''}
                </span>
              </span>
            </button>
            <div className="editor-slide-row-actions">
              <button type="button" onClick={() => duplicateSlide(slide.id)} aria-label={`Duplicate ${slide.title}`}>⧉</button>
              <button type="button" onClick={() => commit({ type: 'removeSlide', slideId: slide.id })} aria-label={`Delete ${slide.title}`}>×</button>
            </div>
          </div>
        ))}
      </ScrollSurface>

      {!focusMode && (
        <div className="editor-lhandle" role="separator" aria-orientation="vertical">
          <button
            type="button"
            className="editor-handle-button"
            onClick={() => setRailOpen((value) => !value)}
            aria-label={railOpen ? 'Collapse slides panel' : 'Expand slides panel'}
            title={railOpen ? 'Collapse slides panel' : 'Expand slides panel'}
          >
            {railOpen ? '‹' : '›'}
          </button>
        </div>
      )}

      <main className="editor-canvas" aria-label="Slide canvas">
        <div className="editor-canvas-controls">
          <span className="slide-indicator" title={activeSlide.title}>
            <strong>{deck.slides.findIndex((s) => s.id === activeSlide.id) + 1}</strong>
            <span>/ {deck.slides.length}</span>
            <span className="slide-indicator-title">{activeSlide.title}</span>
          </span>
          <span className="zoom-label">Zoom {Math.round(zoom.zoom * 100)}%</span>
          <button type="button" onClick={() => viewportRef.current?.zoomOut()} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => viewportRef.current?.fit()} aria-label="Fit to screen">Fit</button>
          <button type="button" onClick={() => viewportRef.current?.zoomIn()} aria-label="Zoom in">+</button>
          <label className="canvas-size-field">
            <span>Canvas</span>
            <select
              value={presetForCanvas(deck.canvas)}
              onChange={(event) => setCanvasPreset(event.target.value)}
              aria-label="Canvas size"
            >
              {CANVAS_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
              <option value="custom">Custom · {deck.canvas.width}×{deck.canvas.height}</option>
            </select>
          </label>
          <span className="layout-name">
            Layout: <strong>{activeSlide.layout}</strong>
          </span>
          {issues.length ? (
            <span className="layout-issues" title={issues.map((issue) => `${issue.slot}: ${issue.message}`).join('\n')}>
              ⚠ {issues.length} layout issue{issues.length > 1 ? 's' : ''}
            </span>
          ) : null}
          {measuredCounts.errors > 0 ? (
            <span
              className="layout-issues layout-issues-error"
              title={measured.filter((issue) => issue.severity === 'error').map((issue) => `${issue.code}: ${issue.message}`).join('\n')}
            >
              ⛔ {measuredCounts.errors} blocking issue{measuredCounts.errors > 1 ? 's' : ''}
            </span>
          ) : null}
          {measuredCounts.warnings > 0 ? (
            <span
              className="layout-issues"
              title={measured.filter((issue) => issue.severity === 'warning').map((issue) => `${issue.code}: ${issue.message}`).join('\n')}
            >
              ⚠ {measuredCounts.warnings} warning{measuredCounts.warnings > 1 ? 's' : ''}
            </span>
          ) : null}
          <button
            type="button"
            className="repair-button"
            disabled={measuredCounts.errors === 0}
            onClick={repairActiveSlide}
          >
            ✨ Repair slide
          </button>
          <button
            type="button"
            className={focusMode ? 'focus-toggle is-active' : 'focus-toggle'}
            aria-pressed={focusMode}
            onClick={focusMode ? editFromFocusMode : enterFocusMode}
            title={focusMode ? 'Exit focus mode (Esc)' : 'Focus on the slide — hides side panels'}
          >
            {focusMode ? '✕ Edit' : '⛶ Focus'}
          </button>
        </div>
        <SlideViewport
          ref={viewportRef}
          deck={deck}
          slide={activeSlide}
          className="canvas-stage"
          onViewChange={setZoom}
          onBackgroundClick={() => selectNone()}
          renderSlide={() => (
            <EditorSlideRenderer
              deck={deck}
              slide={activeSlide}
              interactive
              selectedBlockIds={selection.blockIds}
              onBlockSelect={(blockId, additive) => selectBlock(activeSlide.id, blockId, additive)}
            />
          )}
        />
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
          className="scroll-surface"
          data-scroll-surface="speaker-notes"
          data-scrollbar-style={notesScrollbar.styleId}
          data-scroll-axis="vertical"
          value={activeSlide.speakerNotes ?? ''}
          placeholder="Notes for this slide (visible in presenter view)."
          onChange={(event) => updateActiveSlide({ notes: event.target.value })}
        />
      </div>

      {!focusMode && (
        <div className="editor-rhandle" role="separator" aria-orientation="vertical">
          <button
            type="button"
            className="editor-handle-button"
            onClick={() => setInspectorOpen((value) => !value)}
            aria-label={inspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
            title={inspectorOpen ? 'Collapse inspector' : 'Expand inspector'}
          >
            {inspectorOpen ? '›' : '‹'}
          </button>
        </div>
      )}

      <ScrollSurface as="aside" surface="inspector" className="editor-inspector" aria-label="Inspector">
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
          <label>
            Motion profile
            <select
              value={deck.presentation.motionProfileId ?? ''}
              onChange={(event) => commit({ type: 'setMotionProfile', motionProfileId: event.target.value })}
            >
              {motionProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reduced motion
            <select
              value={deck.presentation.reducedMotion ?? 'respect-system'}
              onChange={(event) => commit({ type: 'setReducedMotion', reducedMotion: event.target.value as 'respect-system' | 'always' | 'never' })}
            >
              <option value="respect-system">Respect system setting</option>
              <option value="always">Always reduced</option>
              <option value="never">Always animated</option>
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
              imageSource={activeImageSource}
              onImageSourceChange={(src) =>
                commit({ type: 'updateImageSource', slideId: activeSlide.id, blockId: activeBlock.id, src })
              }
            />
          ) : (
            <p className="inspector-empty">
              {selection.mode === 'slide'
                ? 'Select a block on the slide to edit its content.'
                : 'Select a block to edit its content, style, and accessibility fields.'}
            </p>
          )}
        </div>
      </ScrollSurface>

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
  imageSource?: string;
  onImageSourceChange?: (src: string) => void;
}

function BlockInspector({ block, update, imageSource, onImageSourceChange }: BlockInspectorProps) {
  const style = block.style ?? {};
  return (
    <div className="block-inspector">
      <div className="inspector-tabs" role="tablist" aria-label="Block inspector tabs">
        <button type="button" className="tab is-active" role="tab" aria-selected="true">Content</button>
        <button type="button" className="tab" role="tab" aria-selected="false" disabled>Style</button>
        <button type="button" className="tab" role="tab" aria-selected="false" disabled>Accessibility</button>
      </div>
      <ContentInspector block={block} update={update} imageSource={imageSource} onImageSourceChange={onImageSourceChange} />
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

function ContentInspector({
  block,
  update,
  imageSource,
  onImageSourceChange,
}: {
  block: Block;
  update: (patch: { content?: unknown; style?: Record<string, unknown>; alt?: string }) => void;
  imageSource?: string;
  onImageSourceChange?: (src: string) => void;
}) {
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
      const content = (block.content as { fit?: string }) ?? {};
      return (
        <div className="inspector-fields">
          <label>Image URL<input type="text" value={imageSource ?? ''} onChange={(event) => onImageSourceChange?.(event.target.value)} placeholder="https://… or data:image/…" /></label>
          <label>
            Fit
            <select value={content.fit ?? 'cover'} onChange={(event) => update({ content: { ...(block.content as object), fit: event.target.value } })}>
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
