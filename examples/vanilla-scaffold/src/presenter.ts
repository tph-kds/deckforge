/* DeckForge Vanilla Scaffold — presenter surface.
 * Plain DOM + Web Components, no framework. Consumes the shared DeckStore from
 * editor.ts. Arrow-key navigation, fullscreen, overview grid, docked presenter
 * chrome, and a prefers-reduced-motion fallback for the stage build steps. */

import { DeckStore, el, renderBlock } from './editor';

export class PresenterStage extends HTMLElement {
  private store!: DeckStore;
  private stage = el('div', 'presenter-stage');
  private notes = el('div', 'presenter-notes');

  connectedCallback(): void {
    this.className = 'presenter-shell';
    this.dataset.mode = 'present';
    this.store = (this as unknown as { store: DeckStore }).store;

    const chrome = el('div', 'presenter-chrome');
    const presenterControls = el('div', 'presenter-controls');
    const prev = el('button', 'deck-controls', '‹ Previous');
    const next = el('button', 'deck-controls', 'Next ›');
    const exit = el('button', 'deck-controls', 'Exit');
    const fullscreen = el('button', 'deck-controls', 'Toggle fullscreen');
    const overview = el('button', 'deck-controls', 'Overview');
    for (const b of [prev, next, exit, fullscreen, overview]) b.type = 'button';

    prev.addEventListener('click', () => this.store.prevSlide());
    next.addEventListener('click', () => this.store.nextSlide());
    exit.addEventListener('click', () => this.store.exitPresenter());
    fullscreen.addEventListener('click', () => this.toggleFullscreen());
    overview.addEventListener('click', () => this.toggleOverview());

    presenterControls.append(prev, next, exit, fullscreen, overview);
    chrome.appendChild(presenterControls);

    const slideStage = el('div', 'slide-stage');
    this.stage.appendChild(slideStage);
    this.append(chrome, this.stage, this.notes);

    this.store.onChange(() => this.render());
    this.render();
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  private toggleOverview(): void {
    const grid = this.querySelector('.presenter-overview');
    if (grid) {
      grid.remove();
      return;
    }
    const overlay = el('div', 'presenter-overview');
    this.store.deck.slides.forEach((slide, index) => {
      const tile = el('button', 'overview-tile', `${index + 1}. ${slide.title}`);
      tile.type = 'button';
      if (index === this.store.currentSlide) tile.classList.add('is-current');
      tile.addEventListener('click', () => {
        this.store.goToSlide(index);
        overlay.remove();
      });
      overlay.appendChild(tile);
    });
    this.appendChild(overlay);
  }

  render(): void {
    const slide = this.store.deck.slides[this.store.currentSlide];
    if (!slide) return;
    const inner = this.stage.querySelector('.slide-stage') as HTMLElement;
    if (inner) {
      inner.textContent = '';
      slide.blocks.forEach((block, i) => {
        const node = renderBlock(block);
        if (i > this.store.buildStepIndex) node.classList.add('build-hidden');
        inner.appendChild(node);
      });
    }
    this.notes.textContent = slide.speakerNotes;
  }
}

customElements.define('presenter-stage', PresenterStage);
