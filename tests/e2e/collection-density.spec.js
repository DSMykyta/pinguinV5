/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — COLLECTION DENSITY E2E                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевірити два режими щільності таблиці/плиток і незалежне збереження.                 ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, /tools, CollectionView, SegmentSwitch, StoredChoice.                        ║
 * ║ ПУБЛІЧНИЙ API: Browser E2E tests.                                                                  ║
 * ║ ПРИНЦИП: Лише CSS-щільність усередині колекції; без зміни Shell, даних або render lifecycle.       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const brands = page => page.locator('#pg-tools-panel-data-views .pg-collection-view');
const media = page => page.locator('#pg-tools-panel-media-library .pg-collection-view');
const setDensity = async (page, name) => {
  const aside = page.locator('#pg-aside-panel');
  const density = aside.getByRole('radiogroup', { name: 'Щільність відображення' });
  await expect(density).toBeVisible();
  await density.locator('.pg-segment-switch__label[title="' + name + '"]').click();
  await expect(density.getByRole('radio', { name })).toBeChecked();
};

test('density expands the current table without rerendering, moving controls or changing selection', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const collection = brands(page);
  const first = collection.locator('tbody tr').first();
  await expect(collection).toHaveAttribute('data-pg-density', 'compact');
  const compact = await first.locator('td[data-pg-column="name"]').evaluate(node => node.getBoundingClientRect().height);
  const before = await page.locator('.pg-shell__page-actions .pg-view-switch').boundingBox();
  const footer = await page.locator('.pg-shell__footer').boundingBox();

  await first.hover();
  await first.locator('.pg-checkbox__row').click();
  await expect(collection).toHaveAttribute('data-pg-selected-count', '1');
  await collection.evaluate(node => { window.__pgDensityRow = node.querySelector('tbody tr'); });
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await setDensity(page, 'Комфортно');
  await expect(collection).toHaveAttribute('data-pg-density', 'comfortable');

  const comfortable = await first.locator('td[data-pg-column="name"]').evaluate(node => node.getBoundingClientRect().height);
  expect(comfortable).toBeGreaterThan(compact);
  expect(await collection.evaluate(node => node.querySelector('tbody tr') === window.__pgDensityRow)).toBe(true);
  await expect(collection).toHaveAttribute('data-pg-selected-count', '1');
  await expect(first.getByRole('checkbox')).toBeChecked();
  await expect(collection.locator('tbody tr')).toHaveCount(25);
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 25 з 32');
  const after = await page.locator('.pg-shell__page-actions .pg-view-switch').boundingBox();
  const footerAfter = await page.locator('.pg-shell__footer').boundingBox();
  expect(Math.abs(before.x - after.x)).toBeLessThan(2);
  expect(Math.abs(before.y - after.y)).toBeLessThan(2);
  expect(Math.abs(footer.y - footerAfter.y)).toBeLessThan(2);

  // Comfortable survives switching the same data model to tiles and back.
  await page.locator('.pg-shell__page-actions .pg-view-switch .pg-segment-switch__label[title="Плитки"]').click();
  await expect(collection).toHaveAttribute('data-pg-view', 'tiles');
  expect(await collection.locator('.pg-collection-view__tiles').evaluate(node => getComputedStyle(node).gap)).toBe('20px');
  await expect(collection.locator('.pg-collection-view__tile[data-pg-selected="true"]')).toHaveCount(1);
  await page.locator('.pg-shell__page-actions .pg-view-switch .pg-segment-switch__label[title="Таблиця"]').click();
  await expect(collection).toHaveAttribute('data-pg-density', 'comfortable');

  await setDensity(page, 'Компактно');
  await expect(collection).toHaveAttribute('data-pg-density', 'compact');
  const restored = await collection.locator('tbody tr').first().locator('td[data-pg-column="name"]')
    .evaluate(node => node.getBoundingClientRect().height);
  expect(restored).toBeCloseTo(compact, 0);
});

test('density is stored per collection and survives returning to tabs and reloading', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await setDensity(page, 'Комфортно');
  await expect(brands(page)).toHaveAttribute('data-pg-density', 'comfortable');

  await page.getByRole('tab', { name: 'Медіатека' }).click();
  await expect(media(page)).toHaveAttribute('data-pg-density', 'compact');
  await expect(page.locator('#pg-aside-panel')
    .getByRole('radiogroup', { name: 'Щільність відображення' })
    .getByRole('radio', { name: 'Компактно' })).toBeChecked();
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(brands(page)).toHaveAttribute('data-pg-density', 'comfortable');
  const values = await page.evaluate(() => ({
    brands: JSON.parse(localStorage.getItem('pg:v1:tools-data-views:view:density')),
    media: localStorage.getItem('pg:v1:tools-media-library:view:density'),
  }));
  expect(values).toEqual({ brands: 'comfortable', media: null });

  await page.reload();
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(brands(page)).toHaveAttribute('data-pg-density', 'comfortable');
  await page.getByRole('tab', { name: 'Медіатека' }).click();
  await expect(media(page)).toHaveAttribute('data-pg-density', 'compact');
});

test('standalone CollectionView validates density and keeps references to existing row DOM', async ({ page }) => {
  await page.goto('/tools');
  const state = await page.evaluate(async () => {
    const { createCollectionView } = await import('/src/ui/collection-view/collection-view.js');
    const view = createCollectionView({
      label: 'Density API',
      columns: [{ key: 'name', label: 'Назва' }],
      rows: [{ id: 'record', name: 'Один' }],
      modes: ['table'],
    });
    const row = view.element.querySelector('tbody tr');
    const initial = view.getDensity();
    const changed = view.setDensity('comfortable');
    const sameNode = view.element.querySelector('tbody tr') === row;
    const noDuplicateChange = view.setDensity('comfortable');
    let invalid = false;
    try { view.setDensity('unknown'); } catch (error) { invalid = error instanceof RangeError; }
    const viewMode = view.getMode();
    const count = view.getVisibleRows().length;
    view.destroy();
    return { initial, changed, sameNode, noDuplicateChange, invalid, viewMode, count };
  });
  expect(state).toEqual({
    initial: 'compact', changed: true, sameNode: true,
    noDuplicateChange: false, invalid: true, viewMode: 'table', count: 1,
  });
});

test('compact density keeps existing menu and checkbox dimensions even on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const collection = brands(page);
  const selection = collection.locator('tbody td.pg-collection-view__selection-cell').first();
  const menu = collection.locator('tbody td.pg-collection-view__actions-cell').first();
  const compact = await Promise.all([selection.boundingBox(), menu.boundingBox()]);
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await setDensity(page, 'Комфортно');
  const comfortable = await Promise.all([selection.boundingBox(), menu.boundingBox()]);
  expect(comfortable[0].width).toBeCloseTo(compact[0].width, 0);
  expect(comfortable[1].width).toBeCloseTo(compact[1].width, 0);
  await expect(page.locator('.pg-shell__content')).not.toHaveAttribute('data-pg-density', /.+/);
});
