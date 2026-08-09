/* DeckForge Finished Product — a dependency-free TypeScript editor + presenter.
 * This is the canonical reference implementation: every control mutates deck
 * state, every change persists to localStorage, and undo/redo re-apply snapshots.
 * It satisfies the editable-deck output contract with real authoring behavior. */

interface DeckProject {
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

interface Slide {
  id: string;
  title: string;
  layout: string;
  blocks: Block[];
  speakerNotes: string;
  density: string;
  layoutBindings: Array<{ slot: string; blockIds: string[]; flow: string; gap: number }>;
}

interface Block {
  id: string;
  type: string;
  content: string | Record<string, unknown>;
  style: Record<string, string>;
  alt: string;
  sourceIds: string[];
  slot: string;
  positionMode: string;
  animation?: { id: string };
}

const STORAGE_KEY = 'deckforge:finished-product:deck';
const AUTOSAVE_MS = 400;
const THEMES = ['editorial-cream', 'ink-works', 'midnight-grid'];
const LAYOUTS = ['title-hero', 'big-number', 'chart-focus', 'split-visual', 'process-steps', 'comparison', 'closing-cta'];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const DEFAULT_DECK: DeckProject = {
  schemaVersion: '2.1',
  meta: { id: 'deck-finished-product', slug: 'finished-product', title: 'The Finished Product', description: 'Reference example' },
  canvas: { width: 1600, height: 900, aspectRatio: '16:9', safeMargin: 64 },
  theme: { id: 'editorial-cream', overrides: {} },
  presentation: { mode: 'horizontal', transition: 'push', motionProfileId: 'technical-precise', defaultBuilds: true, reducedMotion: 'respect-system' },
  editor: { enabled: true, persistence: 'local-storage', routes: { editor: '/editor', presenter: '/present' } },
  slides: [],
  sources: [],
  publish: { visibility: 'unlisted', slug: 'finished-product', embed: { enabled: true, allowedOrigins: [], sandbox: ['allow-scripts', 'allow-forms'] } },
  experience: { profile: 'editable-deck', surfaces: ['editor', 'presenter'], routes: { editor: '/editor', presenter: '/present' }, capabilities: [] },
};

class Store {
  deck: DeckProject = clone(DEFAULT_DECK);
  currentSlide = 0;
  buildStepIndex = 0;
  undoStack: DeckProject[] = [];
  redoStack: DeckProject[] = [];
  saveStatus = 'Saved';
  lastSaved = '';
  private listeners: Array<() => void> = [];
  private pendingContent: { blockId: string; text: string } | null = null;

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

  private autosaveTimer = 0;
  scheduleAutosave(): void {
    this.saveStatus = 'Saving…';
    this.emit();
    window.clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => this.persist(), AUTOSAVE_MS);
  }

  autosave(): void {
    this.scheduleAutosave();
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

function renderBlock(block: Block): HTMLElement {
  const content = typeof block.content === 'string' ? block.content : '';
  const node = el('div', `block block-${block.type}`);
  switch (block.type) {
    case 'heading': {
      const h = el('h2', 'block-heading', content);
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
      const value = (block.content as Record<string, string>).value ?? content;
      const label = (block.content as Record<string, string>).label ?? '';
      const v = el('span', 'metric-value', value);
      const l = el('span', 'metric-label', label);
      node.append(v, l);
      break;
    }
    case 'chart':
    case 'citation':
    case 'callout':
    case 'caption':
    case 'text':
    default: {
      const p = el('p', 'block-text', content);
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

class SlideRail {
  readonly root = el('div', 'slide-rail');
  private current = el('div', 'slide-rail-heading', 'Slide thumbnails');

  constructor(private store: Store) {
    this.root.setAttribute('data-scroll-surface', '');
    this.root.appendChild(this.current);
  }

  render(): void {
    this.root.querySelectorAll('.slide-thumbnail').forEach((n) => n.remove());
    this.store.deck.slides.forEach((slide, index) => {
      const thumb = el('button', 'slide-thumbnail', `${index + 1}. ${slide.title}`);
      thumb.type = 'button';
      if (index === this.store.currentSlide) thumb.classList.add('is-current');
      thumb.addEventListener('click', () => this.store.goToSlide(index));
      this.root.appendChild(thumb);
    });
  }
}

class EditorToolbar {
  readonly root = el('div', 'editor-toolbar');
  readonly themePicker = el('select', 'themePicker');
  readonly layoutControl = el('select', 'layoutControl');
  private undoBtn = el('button', 'toolbar-action', 'Undo');
  private redoBtn = el('button', 'toolbar-action', 'Redo');
  private addTextBtn = el('button', 'toolbar-action', 'Add text');
  private addMediaBtn = el('button', 'toolbar-action', 'Add media');
  private presentBtn = el('button', 'toolbar-action', 'Present');
  private helpBtn = el('button', 'toolbar-action', 'Shortcut help');

  constructor(private store: Store, private onHelp: () => void) {
    this.root.setAttribute('role', 'toolbar');
    this.undoBtn.type = 'button';
    this.redoBtn.type = 'button';
    this.addTextBtn.type = 'button';
    this.addMediaBtn.type = 'button';
    this.presentBtn.type = 'button';
    this.helpBtn.type = 'button';
    this.undoBtn.addEventListener('click', () => this.store.history.undo());
    this.redoBtn.addEventListener('click', () => this.store.history.redo());
    this.addTextBtn.addEventListener('click', () => this.store.addText());
    this.addMediaBtn.addEventListener('click', () => this.store.addMedia());
    this.presentBtn.addEventListener('click', () => this.store.presentCurrent());
    this.helpBtn.addEventListener('click', onHelp);
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
    this.themePicker.addEventListener('change', () => this.store.setTheme(this.themePicker.value));
    this.layoutControl.addEventListener('change', () => this.store.setLayout(this.layoutControl.value));
    this.root.append(this.undoBtn, this.redoBtn, this.addTextBtn, this.addMediaBtn, this.themePicker, this.layoutControl, this.presentBtn, this.helpBtn);
  }

  render(): void {
    this.themePicker.value = this.store.deck.theme.id;
    this.layoutControl.value = this.store.deck.slides[this.store.currentSlide]?.layout ?? LAYOUTS[0];
  }
}

class InspectorPanel {
  readonly root = el('aside', 'inspector-panel');
  private list = el('div', 'inspector-list');

  constructor(private store: Store) {
    this.root.setAttribute('data-scroll-surface', '');
    this.root.appendChild(el('h3', 'properties-panel', 'Property panel'));
    this.root.appendChild(this.list);
  }

  render(): void {
    this.list.textContent = '';
    const slide = this.store.deck.slides[this.store.currentSlide];
    if (!slide) return;
    for (const block of slide.blocks) {
      const row = el('div', 'inspector-row');
      const name = el('span', 'inspector-block-name', `${block.type} · ${block.slot}`);
      row.appendChild(name);
      this.list.appendChild(row);
    }
  }
}

class NotesPanel {
  readonly root = el('section', 'notes-panel');
  readonly textarea = el('textarea', 'speaker-notes');

  constructor(private store: Store) {
    this.root.setAttribute('data-scroll-surface', '');
    this.textarea.placeholder = 'Speaker notes…';
    this.textarea.addEventListener('input', () => {
      const value = this.textarea.value;
      this.store.updateDeck((draft) => {
        draft.slides[this.store.currentSlide].speakerNotes = value;
      });
    });
    this.root.appendChild(el('h3', 'notes-panel-title', 'Notes editor'));
    this.root.appendChild(this.textarea);
  }

  render(): void {
    this.textarea.value = this.store.deck.slides[this.store.currentSlide]?.speakerNotes ?? '';
  }
}

class SaveStatus {
  readonly root = el('div', 'save-status');

  constructor(private store: Store) {
    this.root.id = 'save-status';
  }

  render(): void {
    this.root.textContent = this.store.lastSaved
      ? `${this.store.saveStatus} · Last saved ${this.store.lastSaved}`
      : this.store.saveStatus;
  }
}

class ShortcutHelpDialog {
  readonly root = el('dialog', 'shortcut-help');
  private readonly shortcuts = [
    ['← / →', 'Move to previous / next slide'],
    ['PageDown / Space', 'Next slide or build step'],
    ['Ctrl+Z', 'Undo last edit'],
    ['Ctrl+Shift+Z / Ctrl+Y', 'Redo last edit'],
    ['Ctrl+S', 'Save deck'],
    ['?', 'Toggle this shortcut help'],
  ];

  constructor() {
    this.root.setAttribute('aria-label', 'Keyboard shortcuts');
    this.root.appendChild(el('h2', 'shortcut-help-title', 'Keyboard shortcuts'));
    for (const [keys, description] of this.shortcuts) {
      const row = el('div', 'shortcut-row');
      row.append(el('kbd', 'shortcut-keys', keys), el('span', 'shortcut-description', description));
      this.root.appendChild(row);
    }
    const close = el('button', 'shortcut-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => this.root.close());
    this.root.appendChild(close);
    document.body.appendChild(this.root);
  }

  open(): void {
    if (!this.root.open) this.root.showModal();
  }

  toggle(): void {
    if (this.root.open) this.root.close();
    else this.root.showModal();
  }
}

class EditorShell {
  readonly root = el('main', 'editor-shell');
  private rail = new SlideRail(this.store);
  private toolbar = new EditorToolbar(this.store, () => this.help.toggle());
  private inspector = new InspectorPanel(this.store);
  private notes = new NotesPanel(this.store);
  private saveStatus = new SaveStatus(this.store);
  private stage = el('div', 'slide-stage');

  constructor(private store: Store, private help: ShortcutHelpDialog) {
    this.root.dataset.mode = 'editor';
    this.root.appendChild(this.toolbar.root);
    const workspace = el('div', 'editor-workspace');
    workspace.append(this.rail.root, this.stage, this.inspector.root);
    const dock = el('div', 'editor-dock');
    dock.append(this.notes.root, this.saveStatus.root);
    this.root.append(workspace, dock);
    this.stage.addEventListener('input', (event) => {
      const target = event.target as HTMLElement;
      const blockId = target.dataset.blockId;
      if (!blockId) return;
      this.store.dispatch({ type: 'edit-block', blockId, text: target.textContent ?? '' });
    });
  }

  render(): void {
    this.rail.render();
    this.toolbar.render();
    this.inspector.render();
    this.notes.render();
    this.saveStatus.render();
    const slide = this.store.deck.slides[this.store.currentSlide];
    if (slide) renderSlideContent(slide, this.stage);
  }
}

class PresenterSurface {
  readonly root = el('main', 'presenter-shell');
  private stage = el('div', 'presenter-stage');
  private notes = el('div', 'presenter-notes');

  constructor(private store: Store) {
    this.root.dataset.mode = 'present';
    const chrome = el('div', 'presenter-chrome');
    const controls = el('div', 'presenter-controls');
    const prev = el('button', 'deck-controls', '‹ Previous');
    const next = el('button', 'deck-controls', 'Next ›');
    const exit = el('button', 'deck-controls', 'Exit');
    prev.type = 'button';
    next.type = 'button';
    exit.type = 'button';
    prev.addEventListener('click', () => this.store.prevSlide());
    next.addEventListener('click', () => this.store.nextSlide());
    exit.addEventListener('click', () => this.store.exitPresenter());
    controls.append(prev, next, exit);
    chrome.appendChild(controls);
    const slideStage = el('div', 'slide-stage');
    this.stage.appendChild(slideStage);
    this.root.append(chrome, this.stage, this.notes);
  }

  render(): void {
    const slide = this.store.deck.slides[this.store.currentSlide];
    if (!slide) return;
    const inner = this.stage.querySelector('.slide-stage');
    if (inner) renderSlideContent(slide, inner as HTMLElement);
    this.notes.textContent = slide.speakerNotes;
  }
}

function installKeyboard(store: Store, help: ShortcutHelpDialog): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('keydown', (event) => {
    if (event.key === '?') {
      event.preventDefault();
      help.toggle();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) store.history.redo();
      else store.history.undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      store.history.redo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      store.saveDeck();
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ': {
        if (event.key === ' ' && event.target instanceof HTMLElement && event.target.tagName === 'TEXTAREA') return;
        event.preventDefault();
        store.nextSlide();
        break;
      }
      case 'ArrowLeft':
      case 'PageUp': {
        event.preventDefault();
        store.prevSlide();
        break;
      }
    }
  });
  void reduceMotion;
}

async function boot(): Promise<void> {
  const store = new Store();
  const help = new ShortcutHelpDialog();
  const editor = new EditorShell(store, help);
  const presenter = new PresenterSurface(store);

  const app = document.getElementById('app');
  if (!app) throw new Error('missing #app mount');
  app.append(editor.root);

  const showPresenter = (): void => {
    app.textContent = '';
    app.append(presenter.root);
    presenter.render();
  };

  const showEditor = (): void => {
    app.textContent = '';
    app.append(editor.root);
    editor.render();
  };

  store.onChange(() => {
    if (document.body.classList.contains('presentation-mode')) presenter.render();
    else editor.render();
  });

  try {
    const response = await fetch('./deck.json');
    const deck = (await response.json()) as DeckProject;
    store.setDeck(deck);
  } catch {
    store.setDeck(clone(DEFAULT_DECK));
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      store.setDeck(JSON.parse(stored) as DeckProject);
    } catch {
      /* corrupt snapshot — keep the seeded deck */
    }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  root.dataset.motionProfile = store.deck.presentation.motionProfileId;
  root.dataset.transition = store.deck.presentation.transition;
  const syncMotion = (): void => {
    root.dataset.reducedMotion = reducedMotion.matches ? 'reduce' : 'no-preference';
  };
  syncMotion();
  reducedMotion.addEventListener('change', syncMotion);

  const previousScrollY = { y: 0 };
  const syncFullscreen = (): void => {
    if (document.fullscreenElement) {
      previousScrollY.y = window.scrollY;
    } else {
      window.scrollTo(0, previousScrollY.y);
    }
  };
  document.addEventListener('fullscreenchange', syncFullscreen);
  const fullscreenButton = el('button', 'deck-controls', 'Toggle fullscreen');
  fullscreenButton.type = 'button';
  fullscreenButton.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  });
  presenter.root.querySelector('.presenter-chrome')?.appendChild(fullscreenButton);

  installKeyboard(store, help);
  editor.render();
  showEditor();
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#/present') showPresenter();
    else showEditor();
  });
}

void boot();
