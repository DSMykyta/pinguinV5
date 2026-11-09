/**
 * PINGUIN NEXT — second independent CollectionView and image cells.
 * Tests data isolation, pagination, selection, FAB and tile actions across tabs.
 */
import { test, expect } from '@playwright/test';

const tab = (page, name) => page.getByRole('tab', { name, exact: true });
const brands = page => page.locator('#pg-tools-panel-data-views .pg-collection-view');
const media = page => page.locator('#pg-tools-panel-media-library .pg-collection-view');
const status = page => page.locator('.pg-shell__footer .pg-pagination__status');
const sizeFab = page => page.locator('[data-pg-action="page-fab-toggle"]');
const sizeLabel = page => sizeFab(page).locator('.pg-fab__trigger-value');

test('same media artwork is visible in tiles AND in the table preview column', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  await expect(media(page)).toHaveAttribute('data-pg-view', 'tiles');
  const tilePictures = media(page).locator('.pg-collection-view__tile img.pg-media-library__image');
  await expect(tilePictures).toHaveCount(10);
  const expectedSource = await tilePictures.first().getAttribute('src');
  expect(expectedSource).toMatch(/^data:image\/svg\+xml/);

  await page.locator('.pg-view-switch .pg-segment-switch__label[title="Таблиця"]').click();
  await expect(media(page)).toHaveAttribute('data-pg-view', 'table');
  const headers = media(page).locator('.pg-collection-view__table thead th');
  await expect(headers).toHaveCount(6); // checkbox, preview, name, format, size, actions
  await expect(headers.nth(1)).toHaveText('Зображення');
  const pictures = media(page).locator('.pg-collection-view__table tbody img.pg-media-library__table-thumb');
  await expect(pictures).toHaveCount(10);
  await expect(pictures.first()).toHaveAttribute('src', expectedSource);
  // An SVG viewBox declares an aspect ratio; intrinsic pixel width is browser-defined.
  await expect.poll(() => pictures.first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const box = await pictures.first().boundingBox();
  expect(box.width).toBe(72);
  expect(box.height).toBe(45);
});

test('page index, page size, and selection do not leak between brand and media tabs', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Макети даних').click();
  await expect(status(page)).toHaveText('Показано 25 з 32');
  await expect(sizeLabel(page)).toHaveText('25');
  await brands(page).locator('.pg-collection-view__table tbody tr').first()
    .locator('.pg-checkbox__row').click();
  await expect(brands(page)).toHaveAttribute('data-pg-selected-count', '1');
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect(status(page)).toHaveText('Показано 7 з 32');

  await tab(page, 'Медіатека').click();
  await expect(status(page)).toHaveText('Показано 10 з 19');
  await expect(sizeLabel(page)).toHaveText('10');
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '0');
  await media(page).locator('.pg-collection-view__tile').first().locator('.pg-checkbox__row').click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect(status(page)).toHaveText('Показано 9 з 19');

  await tab(page, 'Макети даних').click();
  await expect(status(page)).toHaveText('Показано 7 з 32');
  await expect(brands(page)).toHaveAttribute('data-pg-selected-count', '1');
  await expect(sizeLabel(page)).toHaveText('25');
  await tab(page, 'Медіатека').click();
  await expect(status(page)).toHaveText('Показано 9 з 19');
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await expect(sizeLabel(page)).toHaveText('10');
});

test('changing media page-size FAB keeps brands pagination and numeric trigger intact', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  await expect(sizeLabel(page)).toHaveText('10');
  await sizeFab(page).click();
  await page.locator('#pg-page-fab-actions [data-pg-fab-value="25"]').click();
  await expect(status(page)).toHaveText('Показано 19 з 19');
  await expect(sizeLabel(page)).toHaveText('25');
  await tab(page, 'Макети даних').click();
  await expect(status(page)).toHaveText('Показано 25 з 32');
  await expect(sizeLabel(page)).toHaveText('25');
  await sizeFab(page).click();
  await page.locator('#pg-page-fab-actions [data-pg-fab-value="50"]').click();
  await expect(sizeLabel(page)).toHaveText('50');
  await expect(status(page)).toHaveText('Показано 32 з 32');
  await tab(page, 'Медіатека').click();
  await expect(sizeLabel(page)).toHaveText('25');
  await expect(status(page)).toHaveText('Показано 19 з 19');
  await expect(page.locator('[data-pg-action="page-fab-toggle"]')).toHaveCount(1);
});

test('tile checkbox, action menu, and clicking tile body stay independent', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  const tile = media(page).locator('.pg-collection-view__tile').first();
  await tile.locator('.pg-checkbox__row').click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await tile.locator('.pg-collection-view__tile-menu .pg-menu__trigger').click();
  await expect(page.getByRole('menuitem', { name: 'Дублювати' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await tile.locator('.pg-collection-view__tile-open').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Редагування зображення');
  await page.getByRole('button', { name: 'Скасувати' }).click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
});
