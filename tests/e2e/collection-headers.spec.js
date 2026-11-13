/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — COLLECTION HEADER E2E                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Header geometry, hover, filters, keyboard and lifecycle.      ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, running /tools and CollectionView.            ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/collection-headers.spec.js.        ║
 * ║ ПРИНЦИП: Real user interactions and independent collection instances.     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const root = page => page.locator('#pg-tools-panel-data-views .pg-collection-view');
const header = (page, key) => root(page).locator('th[data-pg-column="' + key + '"]');
const panel = page => page.getByRole('dialog', { name: 'Фільтр: Країна', exact: true });
const openCountry = async page => {
  await header(page, 'country').getByRole('button', { name: /^Фільтр:/ }).press('ArrowDown');
  await expect(panel(page)).toBeVisible();
};
test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
});

test('idle headers are quiet; hover, focus and active sorting keep stable widths', async ({ page }) => {
  const headings = root(page).locator('thead th');
  const geometry = () => headings.evaluateAll(nodes => nodes.map(node => {
    const { x, width } = node.getBoundingClientRect(); return { x, width };
  }));
  const initial = await geometry();
  const marker = header(page, 'products').locator('.pg-collection-view__sort-mark');
  await page.mouse.move(1, 1);
  await expect(marker).toHaveCSS('opacity', '0');
  await header(page, 'products').hover();
  await expect(marker).toHaveCSS('opacity', '1');
  await header(page, 'products').getByRole('button').click();
  await page.getByRole('searchbox', { name: 'Шукати у таблиці брендів' }).focus();
  await page.mouse.move(1, 1);
  await expect(marker).toHaveCSS('opacity', '1');
  await expect(header(page, 'products')).toHaveAttribute('aria-sort', 'ascending');
  expect(await geometry()).toEqual(initial);
  await header(page, 'products').getByRole('button').press('Enter');
  await expect(header(page, 'products')).toHaveAttribute('aria-sort', 'descending');
});

test('hover opens after the delay without sorting and allows entering its panel', async ({ page }) => {
  const country = header(page, 'country');
  await country.hover();
  await expect(panel(page)).toBeHidden({ timeout: 150 });
  await expect(panel(page)).toBeVisible();
  await expect(country).not.toHaveAttribute('aria-sort');
  await panel(page).hover();
  await expect(panel(page)).toBeVisible();
  await page.mouse.move(1, 1);
  await expect(panel(page)).toBeHidden();
});

test('zero results keep the header reachable and reset restores every record', async ({ page }) => {
  await openCountry(page);
  await expect(panel(page).getByRole('searchbox')).toBeHidden();
  await panel(page).getByRole('checkbox', { name: 'Всі', exact: true }).press('Space');
  await expect(root(page).locator('tbody tr')).toHaveCount(0);
  await expect(header(page, 'country')).toBeVisible();
  await expect(header(page, 'country')).toHaveAttribute('data-pg-filtered', 'true');
  await expect(panel(page)).toBeVisible();
  await panel(page).getByText('Україна', { exact: true }).click();
  await expect(root(page).locator('tbody tr')).toHaveCount(7);
  await expect(root(page).locator('tbody td[data-pg-column="country"]')).toHaveText(Array(7).fill('Україна'));
  await panel(page).getByRole('button', { name: 'Скинути', exact: true }).click();
  await expect(root(page).locator('tbody tr')).toHaveCount(25);
  await expect(header(page, 'country')).toHaveAttribute('data-pg-filtered', 'false');
});

test('filters span all pages, combine across columns and preserve selected IDs and tiles', async ({ page }) => {
  await root(page).locator('tbody tr').first().locator('.pg-checkbox__row').click();
  await page.getByRole('button', { name: 'Сторінка 2', exact: true }).click();
  await openCountry(page);
  await panel(page).getByRole('checkbox', { name: 'Всі', exact: true }).press('Space');
  await panel(page).getByText('Україна', { exact: true }).click();
  await expect(root(page).locator('tbody tr')).toHaveCount(7);
  await expect(root(page)).toHaveAttribute('data-pg-selected-count', '1');
  await panel(page).getByRole('checkbox', { name: 'Україна', exact: true }).press('Escape');
  await header(page, 'status').getByRole('button', { name: /^Фільтр:/ }).press('ArrowDown');
  const status = page.getByRole('dialog', { name: 'Фільтр: Статус', exact: true });
  await status.getByRole('checkbox', { name: 'Всі', exact: true }).press('Space');
  await expect(root(page).locator('tbody tr')).toHaveCount(0);
  await status.getByText('Активний', { exact: true }).click();
  await expect(root(page).locator('tbody tr')).toHaveCount(7);
  await status.getByRole('checkbox', { name: 'Активний', exact: true }).press('Escape');
  await page.locator('.pg-shell__page-actions .pg-view-switch .pg-segment-switch__label[title="Плитки"]').click();
  await expect(root(page).locator('.pg-collection-view__tile')).toHaveCount(7);
  await expect(root(page)).toHaveAttribute('data-pg-selected-count', '1');
});

test('Escape restores trigger focus; scroll and tab changes dismiss the popover', async ({ page }) => {
  await openCountry(page);
  await panel(page).getByRole('checkbox', { name: 'Всі', exact: true }).press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(header(page, 'country').getByRole('button', { name: /^Фільтр:/ })).toBeFocused();
  await openCountry(page);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await root(page).locator('.pg-collection-view__table-scroll').evaluate(node => node.scrollTop = 100);
  await expect(panel(page)).toBeHidden();
  await openCountry(page);
  await page.getByRole('tab', { name: 'Медіатека' }).click();
  await expect(page.locator('.pg-collection-view__filter-panel:popover-open')).toHaveCount(0);
});

test('large facets reuse search, escape text safely and clean up independent instances', async ({ page }) => {
  await page.evaluate(async () => {
    const { createCollectionView } = await import('/src/ui/collection-view/collection-view.js');
    const host = document.querySelector('#pg-tools-panel-data-views');
    const rows = Array.from({ length: 30 }, (_, index) => ({ id: String(index), name: 'Значення ' + index }));
    rows[0].name = '<img src=x onerror=alert(1)>';
    const config = { label: 'Фільтр тест', rows, columns: [{ key: 'name', label: 'Назва', filterable: true }] };
    const first = createCollectionView(config), second = createCollectionView({ ...config, label: 'Друга колекція' });
    host.replaceChildren(first.element);
    first.setFilter('name', ['Значення 1']);
    if (first.getRows().length !== 1 || second.getRows().length !== 30) throw new Error('Leaked filter state');
    const snapshot = first.getFilters(); snapshot.name.push('Значення 2');
    if (first.getRows().length !== 1) throw new Error('Mutable state escaped');
    first.clearFilters();
    const cleanup = document.createElement('button');
    cleanup.textContent = 'Прибрати тестові колекції';
    cleanup.addEventListener('click', () => { first.destroy(); second.destroy(); });
    first.element.prepend(cleanup);
  });
  const fixture = page.getByRole('region', { name: 'Фільтр тест', exact: true });
  await fixture.getByRole('button', { name: 'Фільтр: Назва', exact: true }).press('ArrowDown');
  const popup = fixture.getByRole('dialog');
  await popup.getByRole('searchbox').fill('Значення 29');
  await expect(popup.locator('.pg-collection-view__filter-option:visible')).toHaveCount(1);
  await expect(popup.getByRole('checkbox', { name: 'Значення 29', exact: true })).toBeVisible();
  await expect(popup.locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Прибрати тестові колекції', exact: true }).click();
  await expect(page.locator('.pg-collection-view__filter-panel:popover-open')).toHaveCount(0);
});
