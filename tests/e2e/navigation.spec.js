/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — GLOBAL NAVIGATION E2E                                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Відкриття `/tools`, маршрути, меню та пошук.                                     ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і модульна оболонка.                                                   ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну поведінку, не декоративні заглушки.                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('root replaces Overview with the single functional Tools route', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page).toHaveTitle('Інструменти · Pinguin');
  await expect(page.getByRole('heading', { name: 'Таблиці', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Огляд' })).toHaveCount(0);

  const nav = page.getByRole('navigation', { name: 'Інструменти' });
  const links = nav.locator('a');
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveAttribute('href', '/tools');
  await expect(links.first()).toHaveAttribute('aria-current', 'page');
});

test('404 has a working return path without a hidden overview', async ({ page }) => {
  await page.goto('/not-found');
  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  await page.getByRole('link', { name: 'До інструментів' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.getByRole('heading', { name: 'Таблиці', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
});

test('global search sits beside the aside button and selects real tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const search = page.locator('[data-pg-action="site-search-toggle"]');
  const aside = page.locator('[data-pg-action="aside-toggle"]');
  const searchBox = await search.boundingBox();
  const asideBox = await aside.boundingBox();
  expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(asideBox.x);
  expect(Math.abs(searchBox.y - asideBox.y)).toBeLessThan(1);

  await search.click();
  const input = page.getByRole('searchbox', { name: 'Пошук розділів' });
  await expect(input).toBeFocused();
  await input.fill('Текст');
  await expect(page.locator('[data-pg-search-result="tab:text"]')).toHaveCount(1);
  await expect(page.locator('[data-pg-search-result="tab:tables"]')).toHaveCount(0);
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Текст', exact: true })).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('Таблиці');
  await input.press('Enter');
  await expect(page.getByRole('heading', { name: 'Таблиці', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
});

test('mobile navigation is still available under the shared Shell', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const shell = page.locator('.pg-shell');
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'open');
  await expect(page.locator('.pg-sidebar__local-nav').getByRole('tab', { name: 'Текст' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');
});
