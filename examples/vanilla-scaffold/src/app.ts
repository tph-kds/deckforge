/* DeckForge Vanilla Scaffold — framework-free bootstrap.
 * Reads deck.json, instantiates the editor or presenter based on location.hash
 * (#/editor, #/present), wires keyboard shortcuts (including ? for the
 * shortcut-help dialog), and reacts to prefers-reduced-motion. */

import { DeckStore, EditorShell, ShortcutHelpDialog, el } from './editor';
import { PresenterStage } from './presenter';

const THEMES = ['editorial-cream', 'ink-works', 'midnight-grid'];

async function boot(): Promise<void> {
  const store = new DeckStore();
  const help = new ShortcutHelpDialog();
  document.body.appendChild(help);

  const editor = new EditorShell();
  (editor as unknown as { store: DeckStore }).store = store;
  const presenter = new PresenterStage();
  (presenter as unknown as { store: DeckStore }).store = store;

  const app = document.getElementById('app');
  if (!app) throw new Error('missing #app mount');
  app.append(editor);

  const showPresenter = (): void => {
    app.textContent = '';
    app.append(presenter);
    presenter.render();
  };

  const showEditor = (): void => {
    app.textContent = '';
    app.append(editor);
    editor.render();
  };

  store.onChange(() => {
    if (document.body.classList.contains('presentation-mode')) presenter.render();
    else editor.render();
  });

  try {
    const response = await fetch('./deck.json');
    const deck = await response.json();
    store.setDeck(deck);
  } catch {
    /* fall back to the seeded default */
  }

  const stored = localStorage.getItem('deckforge:vanilla-scaffold:deck');
  if (stored) {
    try {
      store.setDeck(JSON.parse(stored) as DeckStore['deck']);
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

  installKeyboard(store, help, presenter);
  editor.render();
  showEditor();
  if (window.location.hash === '#/present') showPresenter();
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#/present') showPresenter();
    else showEditor();
  });
}

function installKeyboard(store: DeckStore, help: ShortcutHelpDialog, presenter: PresenterStage): void {
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
    if (event.key.toLowerCase() === 'f' && document.body.classList.contains('presentation-mode')) {
      event.preventDefault();
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ': {
        if (event.key === ' ' && event.target instanceof HTMLElement && event.target.tagName === 'TEXTAREA') return;
        event.preventDefault();
        if (document.body.classList.contains('presentation-mode')) advanceBuildOrSlide(store);
        else store.nextSlide();
        break;
      }
      case 'ArrowLeft':
      case 'PageUp': {
        event.preventDefault();
        store.prevSlide();
        break;
      }
      case 'Home': {
        event.preventDefault();
        store.goToSlide(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        store.goToSlide(store.deck.slides.length - 1);
        break;
      }
    }
  });
  void presenter;
}

function advanceBuildOrSlide(store: DeckStore): void {
  const slide = store.deck.slides[store.currentSlide];
  const blockCount = slide?.blocks.length ?? 0;
  if (store.buildStepIndex < blockCount - 1) {
    store.advanceBuild();
  } else {
    store.nextSlide();
  }
}

void boot();
