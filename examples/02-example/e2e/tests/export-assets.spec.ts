// e2e/tests/export-assets.spec.ts
//
// Browser verification of the unified asset-resolution export flow (P2-004).
//
// Regression asserted here: preflight ("Ready to export", Missing 0) and the
// PPTX exporter must consume the SAME prepared asset result. The old pipeline
// printed "Ready to export / Coverage 100% / Missing 0" while the exporter's
// separate pass failed with a synthetic "inline-image" id. Now:
//   - a valid image      → READY, Missing 0, export embeds real media
//   - a dead image URL   → BLOCKED with the block id + URL in the message
//     (never a generic "inline-image" failure)
//   - fixing the URL     → READY again, export embeds the image

import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const EDITOR_PATH = '/deckforge/';
const DEAD_URL =
  'https://images.unsplash.com/photo-1519326844852-704caea5675e?auto=format&fit=crop&w=720&q=70';
const LIVE_URL =
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=720&q=70';
const DATA_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function selectSeedImageBlock(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(EDITOR_PATH);
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();
  // Slide 7 (closing-cta) carries the image block b36.
  await page.locator('.editor-thumbnail').nth(6).click();
  const image = page.locator('.editor-canvas [data-block-id="b36"]');
  await expect(image).toBeVisible();
  await image.click();
  await expect(page.getByLabel('Image URL')).toBeVisible();
}

async function openExportDialog(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return page.getByRole('dialog', { name: 'Export' });
}

test('seed deck: preflight is READY with Missing 0 and the export embeds the image', async ({ page }) => {
  await page.goto(EDITOR_PATH);
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();

  const dialog = await openExportDialog(page);
  await expect(dialog.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });
  await expect(dialog).toContainText('Missing 0');

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export PPTX' }).click();
  await expect(dialog.getByText('Export complete!')).toBeVisible({ timeout: 60_000 });

  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).toBeTruthy();

  // The exported PPTX must contain real media: zip archive file names live
  // UNCOMPRESSED in the central directory, so the raw bytes reveal whether an
  // image part was embedded (the resolved book-cover image).
  const bytes = readFileSync(filePath);
  expect(bytes.length).toBeGreaterThan(1024);
  expect(bytes.includes(Buffer.from('ppt/media/'))).toBe(true);
});

test('a dead image URL blocks export naming the block, never a generic inline-image id', async ({ page }) => {
  await selectSeedImageBlock(page);
  await page.getByLabel('Image URL').fill(DEAD_URL);

  const dialog = await openExportDialog(page);
  await expect(dialog.getByText('Export blocked')).toBeVisible({ timeout: 20_000 });

  // The blocking issue names the actual block and source URL…
  await dialog.getByRole('button', { name: 'View details' }).click();
  await expect(dialog).toContainText('b36');
  await expect(dialog).toContainText('photo-1519326844852');

  // …and never the old synthetic "inline-image" id that hid the failure.
  await expect(dialog).not.toContainText('inline-image');

  // The export button is disabled while blocked.
  await expect(dialog.getByRole('button', { name: 'Export PPTX' })).toBeDisabled();
});

test('fixing the image URL unblocks the export and embeds the image', async ({ page }) => {
  await selectSeedImageBlock(page);
  await page.getByLabel('Image URL').fill(DEAD_URL);
  await page.getByLabel('Image URL').fill(DATA_PNG);

  const dialog = await openExportDialog(page);
  await expect(dialog.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });
  await expect(dialog).toContainText('Missing 0');

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export PPTX' }).click();
  await expect(dialog.getByText('Export complete!')).toBeVisible({ timeout: 60_000 });

  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).toBeTruthy();

  // Media part embedded (see test above for the central-directory rationale).
  const bytes = readFileSync(filePath);
  expect(bytes.length).toBeGreaterThan(1024);
  expect(bytes.includes(Buffer.from('ppt/media/'))).toBe(true);
});

test('a blocked export can be fixed inline in the dialog and then exported', async ({ page }) => {
  await selectSeedImageBlock(page);
  await page.getByLabel('Image URL').fill(DEAD_URL);

  const dialog = await openExportDialog(page);
  await expect(dialog.getByText('Export blocked')).toBeVisible({ timeout: 20_000 });

  // The inline fix row for b36 appears with the current (dead) source prefilled.
  const fixInput = dialog.getByLabel('Image source for b36');
  await expect(fixInput).toBeVisible();
  await expect(fixInput).toHaveValue(DEAD_URL);

  await fixInput.fill(DATA_PNG);
  await dialog.getByRole('button', { name: 'Apply image fix for b36' }).click();

  // Preflight re-runs automatically after the commit → READY.
  await expect(dialog.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });
  await expect(dialog).toContainText('Missing 0');

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export PPTX' }).click();
  await expect(dialog.getByText('Export complete!')).toBeVisible({ timeout: 60_000 });
  const download = await downloadPromise;
  const bytes = readFileSync(await download.path());
  expect(bytes.includes(Buffer.from('ppt/media/'))).toBe(true);
});

test('make deck self-contained bundles the remote image and the deck exports offline', async ({ page }) => {
  // Give the seed image block b36 a live remote URL so there is something real
  // to embed — a committed all-data-URI seed deck would make this test vacuous.
  await selectSeedImageBlock(page);
  await page.getByLabel('Image URL').fill(LIVE_URL);

  const dialog = await openExportDialog(page);
  await expect(dialog.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });

  await dialog.getByRole('button', { name: 'Make deck self-contained' }).click();

  // Preflight re-runs after the replaceDeck commit → READY again.
  await expect(dialog.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });

  // The persisted deck now carries the embedded data URI — and the remote URL
  // is gone. This only holds if saveNow persisted the POST-embed deck.
  const stored = await page.evaluate(() => localStorage.getItem('deckforge:deck:v1') ?? '');
  expect(stored).toContain('data:image/jpeg;base64,');
  expect(stored).not.toContain('images.unsplash.com');

  // The embed survives a reload because it was actually persisted (not just
  // left in React state for the debounced autosave to lose).
  await page.reload();
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();
  const dialogAfterReload = await openExportDialog(page);
  await expect(dialogAfterReload.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await dialogAfterReload.getByRole('button', { name: 'Export PPTX' }).click();
  await expect(dialogAfterReload.getByText('Export complete!')).toBeVisible({ timeout: 60_000 });
  const download = await downloadPromise;
  const bytes = readFileSync(await download.path());
  expect(bytes.includes(Buffer.from('ppt/media/'))).toBe(true);
});
