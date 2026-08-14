// e2e/tests/image-insert-upload.spec.ts
//
// Browser regression for the inserted-image feature:
//   1. A brand-new image block (not the seed b36) uploaded from the webapp must
//      actually RENDER on the canvas as an <img> — it used to stay stuck on the
//      ✕ "Image unavailable" error because ImageBlock's load state never
//      recovered when a placeholder block received an uploaded asset.
//   2. The exported PPTX must place that image at a real size. Sizing was fed
//      DOCUMENT PIXELS into pptxgenjs (which reads <100 as inches, >=100 as
//      EMU), producing an ~0.001"-wide picture in the slide XML.
//   3. The exported image must keep the source's aspect ratio (web-style
//      object-fit: cover) instead of being stretched to the frame: the slide
//      XML must carry a non-zero <a:srcRect> crop whenever the frame aspect
//      differs from the source aspect.

import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const EDITOR_PATH = '/deckforge/';

test('an inserted-then-uploaded image renders on the canvas and exports at a real size, cropped not stretched', async ({ page }) => {
  await page.goto(EDITOR_PATH);
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();

  // Build a real 16:9 (640x360) PNG in the page so the browser renders actual
  // pixels with a distinctive layout — a stretched vs. cropped export would
  // produce visibly different geometry in the slide XML.
  const pngDataUri = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#1b6ca8');
    gradient.addColorStop(1, '#0f3554');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(240, 100, 160, 160);
    return canvas.toDataURL('image/png');
  });

  // Insert a brand-new image block (slide 1 is active by default).
  await page.getByRole('button', { name: '+ Image', exact: true }).click();

  // Upload the generated PNG through the hidden file input on the block inspector.
  const fileInput = page.locator('.block-inspector input[type="file"]');
  await expect(fileInput).toHaveCount(1);
  const pngBuffer = Buffer.from(pngDataUri.split(',')[1], 'base64');
  await fileInput.setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: pngBuffer });

  // Upload completes -> the Image URL field shows the embedded data URI…
  await expect(page.getByLabel('Image URL')).toHaveValue(/^data:image\//, { timeout: 20_000 });

  // …and the canvas renders a real <img>, not the stale ✕ "Image unavailable".
  await expect(page.locator('.editor-canvas figure.block-image:not(.is-error)')).toHaveCount(1, {
    timeout: 20_000,
  });
  await expect(page.locator('.editor-canvas img')).toHaveCount(1);
  await expect(page.locator('.editor-canvas figure.block-image.is-error')).toHaveCount(0);

  // Export the deck.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog.getByText('Ready to export')).toBeVisible({ timeout: 20_000 });
  await expect(dialog).toContainText('Missing 0');

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await dialog.getByRole('button', { name: 'Export PPTX' }).click();
  await expect(dialog.getByText('Export complete!')).toBeVisible({ timeout: 60_000 });
  const download = await downloadPromise;
  const bytes = readFileSync(await download.path());
  expect(bytes.length).toBeGreaterThan(1024);

  // The new image block lives on slide 1. Its <p:pic> must carry a real size:
  // a sane ext is at least ~0.5 inch (457200 EMU) on each axis. The broken
  // export wrote cx=852 EMU (~0.001") and cy=76809600 EMU (~84") instead.
  // jszip is CJS and trips Node's "Unexpected module status 3" under
  // Playwright's module transform, so the zip is inspected in a plain child
  // node process that loads jszip from the app's node_modules directly.
  const { execFileSync } = await import('node:child_process');
  const slideXml = execFileSync(
    process.execPath,
    ['-e', `
      const fs = require('node:fs');
      const JSZip = require('jszip');
      JSZip.loadAsync(fs.readFileSync(process.argv[1]))
        .then((zip) => zip.file('ppt/slides/slide1.xml').async('string'))
        .then((xml) => process.stdout.write(xml));
    `, await download.path()],
    { encoding: 'utf8', timeout: 30_000 },
  ).trim();
  expect(slideXml.length).toBeGreaterThan(0);

  const extTags = slideXml.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/g) ?? [];
  const sane = extTags
    .map((tag) => /cx="(\d+)" cy="(\d+)"/.exec(tag))
    .filter((m): m is RegExpExecArray => !!m)
    .filter((m) => Number(m[1]) > 500_000 && Number(m[2]) > 500_000);
  expect(sane.length).toBeGreaterThanOrEqual(1);

  // Aspect preservation: the 16:9 source sits in a wide frame (the visual slot
  // split with the chart), so a faithful web-style cover crop must clip at
  // least one pair of edges (t/b or l/r). A full-frame <a:stretch/> with no
  // srcRect would mean the image was distorted to fit — the original bug.
  const srcRects = slideXml.match(/<a:srcRect([^/]*)\/>/g) ?? [];
  expect(srcRects.length).toBeGreaterThan(0);
  const cropped = srcRects.filter((tag) => /[ltrb]="[1-9][0-9]*"/.test(tag));
  expect(cropped.length).toBeGreaterThanOrEqual(1);
});
