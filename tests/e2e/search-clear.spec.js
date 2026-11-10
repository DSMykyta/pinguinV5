/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SEARCH CLEAR REGRESSION                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдина Google Material clear-іконка замість синьої нативної кнопки.    ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, shared createSearch() і createIconButton().         ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/search-clear.spec.js.                    ║
 * ║ ПРИНЦИП: Нативний search input і контекстна фільтрація не змінюються.               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('one shared Material clear icon clears contextual search without changing native input', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createSearch } = await import('/src/shell/search/search.js');
    window.pgSearchQueries = [];
    const search = createSearch();
    search.setContext({ onQuery: value => window.pgSearchQueries.push(value) });
    const host = document.createElement('div');
    host.id = 'pg-search-clear-test';
    host.style.cssText = 'position:fixed;top:100px;left:20px;width:320px;z-index:100;background:white';
    host.append(search.element);
    document.body.append(host);
    window.pgSearchClearTest = search;
  });

  const input = page.locator('#pg-search-clear-test input[type="search"]');
  const clear = page.locator('#pg-search-clear-test [data-pg-action="site-search-clear"]');
  await expect(clear).toBeHidden();
  await input.fill('мм');
  await expect(clear).toBeVisible();
  await expect(clear).toHaveAttribute('aria-label', 'Очистити пошук');
  await expect(clear.locator('svg.pg-icon')).toHaveCount(1);
  await clear.click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(clear).toBeHidden();
  expect(await page.evaluate(() => window.pgSearchQueries)).toEqual(['мм', '']);
});

test('native search-cancel affordance is suppressed while clear button stays within field', async ({ page }) => {
  await page.goto('/tools');
  const input = page.locator('.pg-search__input').first();
  await expect(input).toHaveAttribute('type', 'search');
  await input.fill('test');
  const clear = page.locator('.pg-search__clear').first();
  await expect(clear).toBeVisible();
  const [fieldBox, clearBox] = await Promise.all([
    page.locator('.pg-search__field').first().boundingBox(), clear.boundingBox(),
  ]);
  expect(clearBox.x).toBeGreaterThanOrEqual(fieldBox.x);
  expect(clearBox.x + clearBox.width).toBeLessThanOrEqual(fieldBox.x + fieldBox.width + 1);
  await clear.click();
  await expect(input).toHaveValue('');
});
