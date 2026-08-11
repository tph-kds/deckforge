// Regression: the presenter must always contain-fit the full logical slide —
// no right/bottom clipping, regardless of viewport, reduced-motion setting,
// or slide-transition animation. Root cause fixed: the contain-fit scale now
// lives on `.slide-stage-origin` (never `.deck-slide`), so reduced-motion
// rules and transition keyframes cannot clobber it.
import { expect, test } from '@playwright/test';

const PRESENTER_PATH = '/deckforge/#/present';
const TOTAL_SLIDES = 7;

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 2560, height: 1080 },
];

interface Geometry {
  viewport: { w: number; h: number };
  stage: { left: number; top: number; right: number; bottom: number };
  frame: { left: number; top: number; right: number; bottom: number };
  slide: { left: number; top: number; right: number; bottom: number };
  originTransform: string;
  slideTransform: string;
}

async function measure(page: import('@playwright/test').Page): Promise<Geometry> {
  return page.evaluate(() => {
    const stage = document.querySelector('.presenter-stage')!.getBoundingClientRect();
    const frame = document.querySelector('.deck-slide-frame')!.getBoundingClientRect();
    const slideEl = document.querySelector('.deck-slide')!;
    const slide = slideEl.getBoundingClientRect();
    const origin = document.querySelector('.slide-stage-origin')!;
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      stage: { left: stage.left, top: stage.top, right: stage.right, bottom: stage.bottom },
      frame: { left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom },
      slide: { left: slide.left, top: slide.top, right: slide.right, bottom: slide.bottom },
      originTransform: getComputedStyle(origin).transform,
      slideTransform: getComputedStyle(slideEl).transform,
    };
  });
}

async function gotoSlide(page: import('@playwright/test').Page, n: number): Promise<void> {
  const pos = page.locator('.presenter-position');
  await page.getByRole('button', { name: 'Toggle overview' }).click();
  const grid = page.locator('.presenter-overview');
  await expect(grid).toBeVisible();
  await grid.locator('.overview-item').nth(n - 1).click();
  await expect(pos).toHaveText(`${n} / ${TOTAL_SLIDES}`);
}

function assertFullyVisible(g: Geometry, label: string): void {
  const tol = 1.5;
  // The frame (containing the slide) must sit entirely inside the stage.
  expect(g.frame.left, `${label}: frame left`).toBeGreaterThanOrEqual(g.stage.left - tol);
  expect(g.frame.top, `${label}: frame top`).toBeGreaterThanOrEqual(g.stage.top - tol);
  expect(g.frame.right, `${label}: frame right inside stage`).toBeLessThanOrEqual(g.stage.right + tol);
  expect(g.frame.bottom, `${label}: frame bottom inside stage`).toBeLessThanOrEqual(g.stage.bottom + tol);
  // The frame must not exceed the viewport either (no page-level clipping).
  expect(g.frame.right, `${label}: frame right inside viewport`).toBeLessThanOrEqual(g.viewport.w + tol);
  expect(g.frame.bottom, `${label}: frame bottom inside viewport`).toBeLessThanOrEqual(g.viewport.h + tol);
  // The slide and frame must coincide exactly (the fit transform is the only
  // scale; the slide is otherwise identity).
  expect(Math.abs(g.slide.left - g.frame.left), `${label}: slide.left == frame.left`).toBeLessThan(tol);
  expect(Math.abs(g.slide.top - g.frame.top), `${label}: slide.top == frame.top`).toBeLessThan(tol);
  expect(Math.abs(g.slide.right - g.frame.right), `${label}: slide.right == frame.right`).toBeLessThan(tol);
  expect(Math.abs(g.slide.bottom - g.frame.bottom), `${label}: slide.bottom == frame.bottom`).toBeLessThan(tol);
  // The scale must live on the origin wrapper, NOT on the slide element.
  expect(g.originTransform, `${label}: origin carries the fit scale`).not.toBe('none');
  // The slide itself must be identity (none, or an identity matrix left by a
  // finished transition's fill-mode) — never a scale that CSS could clobber.
  const isIdentity = g.slideTransform === 'none' || g.slideTransform === 'matrix(1, 0, 0, 1, 0, 0)';
  expect(isIdentity, `${label}: slide itself is unscaled (got ${g.slideTransform})`).toBe(true);
}

for (const reduced of ['no-preference', 'reduce'] as const) {
  test.describe(`reduced-motion: ${reduced}`, () => {
    for (const vp of VIEWPORTS) {
      test(`all ${TOTAL_SLIDES} slides fit at ${vp.width}x${vp.height}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.emulateMedia({ reducedMotion: reduced });
        await page.goto(PRESENTER_PATH);
        await expect(page.locator('.presenter-shell')).toBeVisible();
        await page.waitForTimeout(300);
        for (let n = 1; n <= TOTAL_SLIDES; n++) {
          await gotoSlide(page, n);
          await page.waitForTimeout(350); // let the slide transition finish
          const g = await measure(page);
          assertFullyVisible(g, `slide ${n} @ ${vp.width}x${vp.height}`);
        }
      });
    }
  });
}

test('fullscreen keeps every slide fully visible', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PRESENTER_PATH);
  await expect(page.locator('.presenter-shell')).toBeVisible();
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await page.waitForTimeout(500);

  for (let n = 1; n <= TOTAL_SLIDES; n++) {
    await gotoSlide(page, n);
    await page.waitForTimeout(250);
    const g = await measure(page);
    assertFullyVisible(g, `fullscreen slide ${n}`);
  }
});
