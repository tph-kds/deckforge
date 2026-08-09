import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'test-results/goldens');
const CANVAS = { width: 1600, height: 900 };
const SLIDES = [
  { id: 's1', file: 'slide-01.png' },
  { id: 's2', file: 'slide-02.png' },
  { id: 's3', file: 'slide-03.png' },
  { id: 's4', file: 'slide-04.png' },
  { id: 's5', file: 'slide-05.png' },
  { id: 's6', file: 'slide-06.png' },
  { id: 's7', file: 'slide-07.png' },
];

// Pin the stage to the deck canvas so screenshots render at native size, hide
// presenter chrome, and kill motion (reduced-motion emulation also forces every
// build-hidden block visible). The result is a deterministic 1600x900 render of
// each fully-revealed slide.
const GOLDEN_CSS = `
.presenter-chrome, .presenter-timer, .presenter-progress,
.presenter-overview, .presenter-blackout, .speaker-panel { display: none !important; }
.presenter-stage { padding: 0 !important; }
.presenter-stage .slide-stage { flex: none !important; width: ${CANVAS.width}px !important; height: ${CANVAS.height}px !important; }
.presenter-stage-slide { width: ${CANVAS.width}px !important; height: ${CANVAS.height}px !important; }
.deck-slide-frame { box-shadow: none !important; }
`;

test('captures deterministic slide export goldens', async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  await page.setViewportSize(CANVAS);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  mkdirSync(OUT_DIR, { recursive: true });

  const slides: Array<Record<string, unknown>> = [];
  for (const { id, file } of SLIDES) {
    await page.goto(`/deckforge/#/present/slide/${id}`);
    const frame = page.locator('.deck-slide-frame');
    await expect(frame).toBeVisible();
    await page.addStyleTag({ content: GOLDEN_CSS });
    await page.waitForTimeout(400);
    const box = await frame.boundingBox();
    expect(box).not.toBeNull();
    await frame.screenshot({ path: resolve(OUT_DIR, file) });
    slides.push({ id, file, width: Math.round(box!.width), height: Math.round(box!.height) });
  }

  const manifest = {
    format: 'deckforge-export-golden',
    schemaVersion: 1,
    deck: { slug: 'weight-of-the-web', canvas: CANVAS },
    export: { type: 'png-screenshots', renderer: 'playwright', slides },
  };
  writeFileSync(resolve(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
});
