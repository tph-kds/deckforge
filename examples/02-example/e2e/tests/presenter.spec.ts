import { expect, test } from '@playwright/test';

const PRESENTER_PATH = '/deckforge/#/present';
const TOTAL_SLIDES = 7;

async function openPresenter(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(PRESENTER_PATH);
  await expect(page.locator('.presenter-shell')).toBeVisible();
  await expect(page.locator('.presenter-position')).toHaveText('1 / 7');
}

test('loads the presenter at the first slide', async ({ page }) => {
  await openPresenter(page);
  await expect(page.locator('.presenter-position')).toHaveText('1 / 7');
  await expect(page.locator('.presenter-stage')).toContainText('The page you ship has a weight.');
});

test('build reveal hides content until advanced, then moves to next slide', async ({ page }) => {
  await openPresenter(page);
  const hidden = page.locator('.presenter-stage .deck-block-wrap.build-hidden');
  await expect(hidden.first()).toBeVisible();
  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(hidden).toHaveCount(0);
  await expect(page.locator('.presenter-position')).toHaveText('1 / 7');
  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(page.locator('.presenter-position')).toHaveText('2 / 7');
});

test('first, last, and previous buttons navigate the deck', async ({ page }) => {
  await openPresenter(page);
  const position = page.locator('.presenter-position');
  await page.getByRole('button', { name: 'Last slide' }).click();
  await expect(position).toHaveText(`${TOTAL_SLIDES} / ${TOTAL_SLIDES}`);
  await page.getByRole('button', { name: 'First slide' }).click();
  await expect(position).toHaveText('1 / 7');
  await page.getByRole('button', { name: 'Next slide' }).click();
  await page.getByRole('button', { name: 'Next slide' }).click();
  await expect(position).toHaveText('2 / 7');
  await page.getByRole('button', { name: 'Previous slide' }).click();
  await expect(position).toHaveText('1 / 7');
});

test('overview grid opens, shows all slides, and jumps to a slide', async ({ page }) => {
  await openPresenter(page);
  await page.getByRole('button', { name: 'Toggle overview' }).click();
  const grid = page.locator('.presenter-overview');
  await expect(grid).toBeVisible();
  await expect(grid.locator('.overview-item')).toHaveCount(TOTAL_SLIDES);
  await grid.locator('.overview-item').nth(2).click();
  await expect(page.locator('.presenter-position')).toHaveText('3 / 7');
});

test('blackout overlays the stage and B resumes', async ({ page }) => {
  await openPresenter(page);
  await page.getByRole('button', { name: 'Blackout' }).click();
  const blackout = page.locator('.presenter-blackout');
  await expect(blackout).toBeVisible();
  await expect(blackout).toContainText('Paused');
  await page.keyboard.press('b');
  await expect(blackout).toHaveCount(0);
});

test('fullscreen toggles through the browser fullscreen API', async ({ page }) => {
  await openPresenter(page);
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)), { timeout: 4000 })
    .toBe(true);
  await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)), { timeout: 4000 })
    .toBe(false);
});

test('speaker view shows the current slide notes', async ({ page }) => {
  await openPresenter(page);
  await page.getByRole('button', { name: 'Speaker view' }).click();
  const panel = page.getByRole('dialog', { name: 'Speaker view' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Open with the physical reality');
  await panel.getByRole('button', { name: 'Close speaker view' }).click();
  await expect(panel).toHaveCount(0);
});

test('timer starts, pauses, and resets', async ({ page }) => {
  await openPresenter(page);
  const timerLabel = page.locator('.timer-label');
  await expect(timerLabel).toHaveText('0:00');
  await page.getByRole('button', { name: 'Start timer' }).click();
  const pause = page.getByRole('button', { name: 'Pause timer' });
  await expect(pause).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(timerLabel).not.toHaveText('0:00');
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume timer' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset timer' }).click();
  await expect(timerLabel).toHaveText('0:00');
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();
});

test('keyboard navigation advances and Home/End bound the deck', async ({ page }) => {
  await openPresenter(page);
  const position = page.locator('.presenter-position');
  await page.keyboard.press('ArrowRight');
  await expect(position).toHaveText('1 / 7');
  await page.keyboard.press('ArrowRight');
  await expect(position).toHaveText('2 / 7');
  await page.keyboard.press('End');
  await expect(position).toHaveText(`${TOTAL_SLIDES} / ${TOTAL_SLIDES}`);
  await page.keyboard.press('Home');
  await expect(position).toHaveText('1 / 7');
});

test('progress bar tracks slide position', async ({ page }) => {
  await openPresenter(page);
  const bar = page.locator('.presenter-progress-bar');
  await expect(bar).toHaveAttribute('style', /width: 0%/);
  await page.getByRole('button', { name: 'Last slide' }).click();
  await expect(bar).toHaveAttribute('style', /width: 100%/);
});

test('shortcut help opens with ? in the presenter', async ({ page }) => {
  await openPresenter(page);
  await page.keyboard.press('Shift+Slash');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await expect(help).toContainText('ArrowRight');
  await help.getByRole('button', { name: 'Close shortcuts' }).click();
  await expect(help).toHaveCount(0);
});

test('back to editor returns to the editor shell', async ({ page }) => {
  await openPresenter(page);
  await page.getByRole('button', { name: 'Back to editor' }).click();
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();
});
