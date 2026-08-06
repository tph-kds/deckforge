import { expect, test } from '@playwright/test';

const EDITOR_PATH = '/deckforge/';
const SEED_SLIDE_COUNT = 7;

async function openEditor(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(EDITOR_PATH);
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();
}

test('loads the editor shell with the seed deck', async ({ page }) => {
  await openEditor(page);
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();
  await expect(page.locator('.editor-thumbnail')).toHaveCount(SEED_SLIDE_COUNT);
  await expect(page.locator('[aria-current="page"] .thumb-title')).toHaveText('The page you ship has a weight');
});

test('navigates slides from the rail and syncs the inspector', async ({ page }) => {
  await openEditor(page);
  await page.locator('.editor-thumbnail').nth(1).click();
  await expect(page.locator('[aria-current="page"] .thumb-title')).toHaveText('The median page weighs 2.4 MB');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('The median page weighs 2.4 MB');
});

test('adds a slide and selects it', async ({ page }) => {
  await openEditor(page);
  await expect(page.locator('.editor-thumbnail')).toHaveCount(SEED_SLIDE_COUNT);
  await page.getByRole('button', { name: 'Add slide' }).click();
  await expect(page.locator('.editor-thumbnail')).toHaveCount(SEED_SLIDE_COUNT + 1);
  await page.locator('.editor-thumbnail').last().click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Untitled slide');
});

test('inserts a text block and edits its content', async ({ page }) => {
  await openEditor(page);
  const canvasBlocks = page.locator('.editor-canvas [data-block-id]');
  await expect(canvasBlocks).toHaveCount(5);
  await page.getByRole('button', { name: '+ Text' }).click();
  await expect(canvasBlocks).toHaveCount(6);
  const content = page.getByRole('textbox', { name: 'Content' });
  await expect(content).toHaveValue('New text block');
  await content.fill('Hello from e2e');
  await expect(page.locator('.editor-canvas')).toContainText('Hello from e2e');
});

test('applies bulk edits across title, layout, theme, and notes', async ({ page }) => {
  await openEditor(page);
  await page.getByLabel('Title', { exact: true }).fill('Bulk-edited title');
  await page.getByRole('combobox', { name: 'Layout' }).selectOption('big-number');
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('oceanic-blueprint');
  await page.getByRole('combobox', { name: 'Reduced motion' }).selectOption('always');
  await page.locator('#speaker-notes').fill('Bulk-edited notes');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Bulk-edited title');
  await expect(page.getByRole('combobox', { name: 'Layout' })).toHaveValue('big-number');
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('oceanic-blueprint');
  await expect(page.getByRole('combobox', { name: 'Reduced motion' })).toHaveValue('always');
  await expect(page.locator('#speaker-notes')).toHaveValue('Bulk-edited notes');
});

test('undo and redo revert and reapply an edit', async ({ page }) => {
  await openEditor(page);
  const title = page.getByLabel('Title', { exact: true });
  await title.fill('Undo me');
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(title).toHaveValue('The page you ship has a weight');
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(title).toHaveValue('Undo me');
});

test('autosaves and restores an edit after reload', async ({ page }) => {
  await openEditor(page);
  await page.getByLabel('Title', { exact: true }).fill('Persisted title');
  const saveStatus = page.locator('.save-status-text');
  await expect(saveStatus).toHaveText('Saved just now', { timeout: 4000 });
  await page.reload();
  await expect(page.getByTestId('deck-editor-shell')).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Persisted title');
});

test('command palette inserts a block via keyboard shortcut', async ({ page }) => {
  await openEditor(page);
  const canvasBlocks = page.locator('.editor-canvas [data-block-id]');
  await expect(canvasBlocks).toHaveCount(5);
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette).toBeVisible();
  await palette.getByText('Insert Heading', { exact: true }).click();
  await expect(canvasBlocks).toHaveCount(6);
});

test('shortcut help opens with ? and lists core bindings', async ({ page }) => {
  await openEditor(page);
  await page.keyboard.press('Shift+Slash');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await expect(help).toContainText('Ctrl+Z');
  await expect(help).toContainText('Ctrl+Enter');
});

test('export dialog opens with a preflight report', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Ready to export');
  await expect(dialog.getByRole('button', { name: 'Export PPTX' })).toBeEnabled();
});

test('present button routes to the presenter', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.locator('.presenter-shell')).toBeVisible();
  await expect(page.locator('.presenter-position')).toHaveText('1 / 7');
});

test('collapses and expands the left slide rail', async ({ page }) => {
  await openEditor(page);
  await expect(page.locator('.editor-slide-rail')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse slides panel' }).click();
  await expect(page.locator('.editor-shell')).toHaveClass(/rail-collapsed/);
  await expect(page.locator('.editor-slide-rail')).toBeHidden();
  await page.getByRole('button', { name: 'Expand slides panel' }).click();
  await expect(page.locator('.editor-slide-rail')).toBeVisible();
});

test('collapses and expands the right inspector', async ({ page }) => {
  await openEditor(page);
  await expect(page.locator('.editor-inspector')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse inspector' }).click();
  await expect(page.locator('.editor-shell')).toHaveClass(/inspector-collapsed/);
  await expect(page.locator('.editor-inspector')).toBeHidden();
  await page.getByRole('button', { name: 'Expand inspector' }).click();
  await expect(page.locator('.editor-inspector')).toBeVisible();
});

test('focus mode hides side panels and exits via Esc', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: '⛶ Focus' }).click();
  await expect(page.locator('.editor-shell')).toHaveClass(/focus-mode/);
  await expect(page.locator('.editor-slide-rail')).toBeHidden();
  await expect(page.locator('.editor-inspector')).toBeHidden();
  await expect(page.locator('.editor-notes-area')).toBeHidden();
  await expect(page.locator('.editor-canvas [data-block-id]')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(page.locator('.editor-inspector')).toBeVisible();
});

test('changes the slide canvas to a 4:3 preset', async ({ page }) => {
  await openEditor(page);
  const canvasSize = page.getByRole('combobox', { name: 'Canvas size' });
  await expect(canvasSize).toHaveValue('16:9');
  await canvasSize.selectOption('4:3');
  await expect(canvasSize).toHaveValue('4:3');
  await expect(page.locator('.editor-canvas-controls')).toContainText('4:3 · 1440×1080');
});
