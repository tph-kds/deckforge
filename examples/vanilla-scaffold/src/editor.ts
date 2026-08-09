/* DeckForge Vanilla Scaffold — editor surface.
 * Plain DOM + Web Components, no framework. Every control mutates DeckProject
 * state, every change persists to localStorage, and undo/redo re-apply
 * snapshots. Exports the shared DeckStore so the presenter can consume the
 * same state, plus the editor custom elements and the EditorShell host. */

export interface DeckProject {
  schemaVersion: string;
  meta: { id: string; slug: string; title: string; description: string };
  canvas: { width: number; height: number; aspectRatio: string; safeMargin: number };
  theme: { id: string; overrides: Record<string, string> };
  presentation: { mode: string; transition: string; motionProfileId: string; defaultBuilds: boolean; reducedMotion: string };
  editor: { enabled: boolean; persistence: string; routes: { editor: string; presenter: string } };
  slides: Slide[];
  sources: { id: string; title: string; url: string; publisher: string }[];
  publish: { visibility: string; slug: string; embed: { enabled: boolean; allowedOrigins: string[]; sandbox: string[] } };
  experience: { profile: string; surfaces: string[]; routes: { editor: string; presenter: string }; capabilities: string[] };
}

export interface Slide {
  id: string;
  title: string;
  layout: string;
  blocks: Block[];
  speakerNotes: string;
  density: string;
  layoutBindings: Array<{ slot: string; blockIds: string[]; flow: string; gap: number }>;
}

export interface Block {
  id: string;
  type: string;
  content: string | Record<string, unknown> | string[];
  style: Record<string, string>;
  alt: string;
  sourceIds: string[];
  slot: string;
  positionMode: string;
  animation?: { id: string };
}

export const STORAGE_KEY = 'deckforge:vanilla-scaffold:deck';
const AUTOSAVE_MS = 400;
const THEMES = ['editorial-cream', 'ink-works', 'midnight-grid'];
const LAYOUTS = ['title-hero', 'big-number', 'chart-focus', 'split-visual', 'process-steps', 'comparison', 'closing-cta'];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const DEFAULT_DECK: DeckProject = {
  schemaVersion: '2.1',
  meta: { id: 'deck-vanilla-scaffold', slug: 'vanilla-scaffold', title: 'Framework-Agnostic Scaffold', description: 'Reference example' },
  canvas: { width: 1600, height: 900, aspectRatio: '16:9', safeMargin: 64 },
  theme: { id: 'editorial-cream', overrides: {} },
  presentation: { mode: 'horizontal', transition: 'push', motionProfileId: 'technical-precise', defaultBuilds: true, reducedMotion: 'respect-system' },
  editor: { enabled: true, persistence: 'local-storage', routes: { editor: '/editor', presenter: '/present' } },
  slides: [],
  sources: [],
  publish: { visibility: 'unlisted', slug: 'vanilla-scaffold', embed: { enabled: true, allowedOrigins: [], sandbox: ['allow-scripts', 'allow-forms'] } },
  experience: { profile: 'editable-deck', surfaces: ['editor', 'presenter'], routes: { editor: '/editor', presenter: '/present' }, capabilities: [] },
};

/** Shared deck state. Mutations flow through updateDeck (undo snapshot), and
 * every change schedules an autosave to localStorage. */
export class DeckStore {
  deck: DeckProject = clone(DEFAULT_DECK);
  currentSlide = 0;
  buildStepIndex = 0;
  undoStack: DeckProject[] = [];
  redoStack: DeckProject[] = [];
  saveStatus = 'Saved';
  lastSaved = '';
  private listeners: Array<() => void> = [];
  private autosaveTimer = 0;

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  setDeck(deck: DeckProject): void {
    this.deck = deck;
    this.currentSlide = Math.min(this.currentSlide, deck.slides.length - 1);
    this.emit();
  }

  updateDeck(mutator: (draft: DeckProject) => void): void {
    this.undoStack.push(this.deck);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
    const draft = clone(this.deck);
    mutator(draft);
    this.setDeck(draft);
    this.buildStepIndex = 0;
    this.scheduleAutosave();
  }

  dispatch(action: { type: string; blockId?: string; text?: string }): void {
    if (action.type === 'edit-block' && action.blockId && action.text !== undefined) {
      this.updateDeck((draft) => {
        const slide = draft.slides[this.currentSlide];
        const block = slide.blocks.find((b) => b.id === action.blockId);
        if (block) block.content = action.text as string;
      });
    }
  }

  executeCommand(name: string, apply: (draft: DeckProject) => void): void {
    this.updateDeck(apply);
    void name;
  }

  history = {
    undo: (): void => {
      const previous = this.undoStack.pop();
      if (!previous) return;
      this.redoStack.push(this.deck);
      this.setDeck(previous);
      this.scheduleAutosave();
    },
    redo: (): void => {
      const next = this.redoStack.pop();
      if (!next) return;
      this.undoStack.push(this.deck);
      this.setDeck(next);
      this.scheduleAutosave();
    },
  };

  persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.deck));
    this.saveStatus = 'Saved';
    this.lastSaved = new Date().toLocaleTimeString();
    this.emit();
  }

  saveDeck(): void {
    this.saveStatus = 'Saving…';
    this.emit();
    window.setTimeout(() => this.persist(), 0);
  }

  scheduleAutosave(): void {
    this.saveStatus = 'Saving…';
    this.emit();
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => this.persist(), AUTOSAVE_MS);
  }

  autosave(): void {
    this.scheduleAutosave();
  }

  advanceBuild(): void {
    const slide = this.deck.slides[this.currentSlide];
    const blockCount = slide?.blocks.length ?? 0;
    if (this.buildStepIndex < blockCount - 1) {
      this.buildStepIndex += 1;
      this.emit();
    }
  }

  setTheme(themeId: string): void {
    this.executeCommand('set-theme', (draft) => {
      draft.theme.id = themeId;
      draft.theme.overrides = {};
    });
  }

  setLayout(layoutId: string): void {
    this.executeCommand('set-layout', (draft) => {
      const slide = draft.slides[this.currentSlide];
      slide.layout = layoutId;
      slide.layoutBindings = slide.blocks.map((b) => ({
        slot: b.slot,
        blockIds: [b.id],
        flow: 'stack',
        gap: 8,
      }));
    });
  }

  insertText(): void {
    this.executeCommand('add-text', (draft) => {
      const slide = draft.slides[this.currentSlide];
      const id = `b${Date.now().toString(36)}`;
      slide.blocks.push({ id, type: 'text', content: 'New text block', style: {}, alt: '', sourceIds: [], slot: slide.blocks[0]?.slot ?? 'subtitle', positionMode: 'slot' });
    });
  }

  addText(): void {
    this.insertText();
  }

  insertImage(url: string): void {
    this.executeCommand('add-media', (draft) => {
      const slide = draft.slides[this.currentSlide];
      const id = `b${Date.now().toString(36)}`;
      slide.blocks.push({ id, type: 'image', content: { assetId: url, fit: 'cover' }, style: {}, alt: 'Inserted image', sourceIds: [], slot: 'visual', positionMode: 'slot' });
    });
  }

  addMedia(): void {
    this.insertImage('https://images.unsplash.com/photo-1519326844852-704caea5675e?auto=format&fit=crop&w=720&q=70');
  }

  presentCurrent(): void {
    this.enterPresenter();
  }

  presentFromSlide(index: number): void {
    this.currentSlide = index;
    this.emit();
    this.enterPresenter();
  }

  enterPresenter(): void {
    document.body.classList.add('presentation-mode');
    this.emit();
  }

  exitPresenter(): void {
    document.body.classList.remove('presentation-mode');
    this.emit();
  }

  goToSlide(index: number): void {
    this.currentSlide = Math.max(0, Math.min(this.deck.slides.length - 1, index));
    this.buildStepIndex = 0;
    this.emit();
  }

  nextSlide(): void {
    this.goToSlide(this.currentSlide + 1);
  }

  prevSlide(): void {
    this.goToSlide(this.currentSlide - 1);
  }
}

/** Renders a block's content element. Text-bearing blocks are contenteditable
 * and report edits back through the store's dispatch (state mutation). */
export function renderBlock(block: Block): HTMLElement {
  const node = el('div', `block block-${block.type}`);
  if (block.animation) node.classList.add('anim-in');
  switch (block.type) {
    case 'heading': {
      const h = el('h2', 'block-heading', String(block.content));
      h.contentEditable = 'true';
      h.dataset.blockId = block.id;
      node.appendChild(h);
      break;
    }
    case 'bullets': {
      const list = el('ul', 'block-bullets');
      const items = Array.isArray(block.content) ? (block.content as string[]) : [];
      for (const item of items) {
        const li = el('li', '', item);
        li.contentEditable = 'true';
        li.dataset.blockId = block.id;
        list.appendChild(li);
      }
      node.appendChild(list);
      break;
    }
    case 'metric': {
      const value = (block.content as Record<string, string>).value ?? '';
      const label = (block.content as Record<string, string>).label ?? '';
      node.append(el('span', 'metric-value', value), el('span', 'metric-label', label));
      break;
    }
    case 'chart': {
      const title = (block.content as Record<string, string>).title ?? '';
      node.appendChild(el('div', 'block-chart-title', title));
      break;
    }
    case 'citation':
    case 'callout':
    case 'caption':
    case 'text':
    default: {
      const p = el('p', 'block-text', String(block.content));
      p.contentEditable = 'true';
      p.dataset.blockId = block.id;
      node.appendChild(p);
    }
  }
  return node;
}

function renderSlideContent(slide: Slide, stage: HTMLElement): void {
  stage.textContent = '';
  for (const block of slide.blocks) {
    stage.appendChild(renderBlock(block));
  }
}

class SlideRail extends HTMLElement {
  connectedCallback(): void {
    this.className = 'slide-rail';
    this.setAttribute('data-scroll-surface', '');
    this.appendChild(el('div', 'slide-rail-heading', 'Slide thumbnails'));
    const store = (this as unknown as { store: DeckStore }).store;
    store.onChange(() => this.render());
    this.render();
  }

  render(): void {
    const store = (this as unknown as { store: DeckStore }).store;
    this.querySelectorAll('.slide-thumbnail').forEach((n) => n.remove());
    store.deck.slides.forEach((slide, index) => {
      const thumb = el('button', 'slide-thumbnail', `${index + 1}. ${slide.title}`);
      thumb.type = 'button';
      if (index === store.currentSlide) thumb.classList.add('is-current');
      thumb.addEventListener('click', () => store.goToSlide(index));
      this.appendChild(thumb);
    });
  }
}

class EditorToolbar extends HTMLElement {
  readonly themePicker = el('select', 'themePicker');
  readonly layoutControl = el('select', 'layoutControl');

  connectedCallback(): void {
    this.className = 'editor-toolbar';
    this.setAttribute('role', 'toolbar');
    const store = (this as unknown as { store: DeckStore }).store;

    const undoBtn = el('button', 'toolbar-action', 'Undo');
    const redoBtn = el('button', 'toolbar-action', 'Redo');
    const addTextBtn = el('button', 'toolbar-action', 'Add text');
    const addMediaBtn = el('button', 'toolbar-action', 'Add media');
    const presentBtn = el('button', 'toolbar-action', 'Present');
    const helpBtn = el('button', 'toolbar-action', 'Shortcut help');
    for (const b of [undoBtn, redoBtn, addTextBtn, addMediaBtn, presentBtn, helpBtn]) b.type = 'button';

    undoBtn.addEventListener('click', () => store.history.undo());
    redoBtn.addEventListener('click', () => store.history.redo());
    addTextBtn.addEventListener('click', () => store.addText());
    addMediaBtn.addEventListener('click', () => store.addMedia());
    presentBtn.addEventListener('click', () => store.presentCurrent());
    helpBtn.addEventListener('click', () => this.showShortcutHelp());

    for (const theme of THEMES) {
      const option = el('option', '', theme);
      option.value = theme;
      this.themePicker.appendChild(option);
    }
    for (const layout of LAYOUTS) {
      const option = el('option', '', layout);
      option.value = layout;
      this.layoutControl.appendChild(option);
    }
    this.themePicker.addEventListener('change', () => store.setTheme(this.themePicker.value));
    this.layoutControl.addEventListener('change', () => store.setLayout(this.layoutControl.value));

    this.append(undoBtn, redoBtn, addTextBtn, addMediaBtn, this.themePicker, this.layoutControl, presentBtn, helpBtn);
    store.onChange(() => this.render());
    this.render();
  }

  private showShortcutHelp(): void {
    const dialog = document.querySelector('shortcut-help') as ShortcutHelpDialog | null;
    dialog?.toggle();
  }

  render(): void {
    const store = (this as unknown as { store: DeckStore }).store;
    this.themePicker.value = store.deck.theme.id;
    this.layoutControl.value = store.deck.slides[store.currentSlide]?.layout ?? LAYOUTS[0];
  }
}

class InspectorPanel extends HTMLElement {
  private list: HTMLElement;

  constructor() {
    super();
    this.list = el('div', 'inspector-list');
  }

  connectedCallback(): void {
    this.className = 'inspector-panel';
    this.setAttribute('data-scroll-surface', '');
    this.appendChild(el('h3', 'properties-panel', 'Property panel'));
    this.appendChild(this.list);
    const store = (this as unknown as { store: DeckStore }).store;
    store.onChange(() => this.render());
    this.render();
  }

  render(): void {
    const store = (this as unknown as { store: DeckStore }).store;
    this.list.textContent = '';
    const slide = store.deck.slides[store.currentSlide];
    if (!slide) return;
    for (const block of slide.blocks) {
      const row = el('div', 'inspector-row');
      row.appendChild(el('span', 'inspector-block-name', `${block.type} · ${block.slot}`));
      this.list.appendChild(row);
    }
  }
}

class NotesPanel extends HTMLElement {
  readonly textarea = el('textarea', 'speaker-notes');

  connectedCallback(): void {
    this.className = 'notes-panel';
    this.setAttribute('data-scroll-surface', '');
    const store = (this as unknown as { store: DeckStore }).store;
    this.textarea.placeholder = 'Speaker notes…';
    this.textarea.addEventListener('input', () => {
      const value = this.textarea.value;
      store.updateDeck((draft) => {
        draft.slides[store.currentSlide].speakerNotes = value;
      });
    });
    this.appendChild(el('h3', 'notes-panel-title', 'Notes editor'));
    this.appendChild(this.textarea);
    store.onChange(() => this.render());
    this.render();
  }

  render(): void {
    const store = (this as unknown as { store: DeckStore }).store;
    this.textarea.value = store.deck.slides[store.currentSlide]?.speakerNotes ?? '';
  }
}

class SaveStatusBar extends HTMLElement {
  connectedCallback(): void {
    this.className = 'save-status';
    this.id = 'save-status';
    const store = (this as unknown as { store: DeckStore }).store;
    store.onChange(() => this.render());
    this.render();
  }

  render(): void {
    const store = (this as unknown as { store: DeckStore }).store;
    this.textContent = store.lastSaved
      ? `${store.saveStatus} · Last saved ${store.lastSaved}`
      : store.saveStatus;
  }
}

export class ShortcutHelpDialog extends HTMLElement {
  connectedCallback(): void {
    this.className = 'shortcut-help';
    this.setAttribute('aria-label', 'Keyboard shortcuts');
    const rows: Array<[string, string]> = [
      ['← / →', 'Move to previous / next slide'],
      ['PageDown / Space', 'Next slide or build step'],
      ['Ctrl+Z', 'Undo last edit'],
      ['Ctrl+Shift+Z / Ctrl+Y', 'Redo last edit'],
      ['Ctrl+S', 'Save deck'],
      ['F', 'Toggle fullscreen'],
      ['?', 'Toggle this shortcut help'],
    ];
    this.appendChild(el('h2', 'shortcut-help-title', 'Keyboard shortcuts'));
    for (const [keys, description] of rows) {
      const row = el('div', 'shortcut-row');
      row.append(el('kbd', 'shortcut-keys', keys), el('span', 'shortcut-description', description));
      this.appendChild(row);
    }
    const close = el('button', 'shortcut-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    this.appendChild(close);
  }

  toggle(): void {
    if (this.hasAttribute('open')) this.close();
    else this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }
}

export class EditorShell extends HTMLElement {
  private stage = el('div', 'slide-stage');

  connectedCallback(): void {
    this.className = 'editor-shell';
    this.dataset.mode = 'editor';
    const store = (this as unknown as { store: DeckStore }).store;

    const rail = new SlideRail();
    (rail as unknown as { store: DeckStore }).store = store;
    const toolbar = new EditorToolbar();
    (toolbar as unknown as { store: DeckStore }).store = store;
    const inspector = new InspectorPanel();
    (inspector as unknown as { store: DeckStore }).store = store;
    const notes = new NotesPanel();
    (notes as unknown as { store: DeckStore }).store = store;
    const saveStatus = new SaveStatusBar();
    (saveStatus as unknown as { store: DeckStore }).store = store;

    const workspace = el('div', 'editor-workspace');
    workspace.append(rail, this.stage, inspector);
    const dock = el('div', 'editor-dock');
    dock.append(notes, saveStatus);
    this.append(toolbar, workspace, dock);

    this.stage.addEventListener('input', (event) => {
      const target = event.target as HTMLElement;
      const blockId = target.dataset.blockId;
      if (!blockId) return;
      store.dispatch({ type: 'edit-block', blockId, text: target.textContent ?? '' });
    });

    store.onChange(() => this.render());
    this.render();
  }

  render(): void {
    const store = (this as unknown as { store: DeckStore }).store;
    const slide = store.deck.slides[store.currentSlide];
    if (slide) renderSlideContent(slide, this.stage);
  }
}

customElements.define('slide-rail', SlideRail);
customElements.define('editor-toolbar', EditorToolbar);
customElements.define('inspector-panel', InspectorPanel);
customElements.define('notes-panel', NotesPanel);
customElements.define('save-status', SaveStatusBar);
customElements.define('shortcut-help', ShortcutHelpDialog);
customElements.define('editor-shell', EditorShell);
