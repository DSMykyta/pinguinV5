/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — NAVIGATION & SEARCH                                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Маршрути й реальний пошук у правій частині шапки.                               ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і спільні UI-компоненти.                                            ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну схему без винятків для сторінок.                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('root redirects to Tools, without an Overview page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Інструменти' })).toBeVisible();
  await expect(page.locator('.pg-page')).toBeHidden(); // Empty main workspace during geometry review
  const links = page.getByRole('navigation', { name: 'Інструменти' }).getByRole('link');
  await expect(links).toHaveCount(1);
  await expect(links.first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Огляд' })).toHaveCount(0);
});

test('unknown route offers a working return to Tools', async ({ page }) => {
  await page.goto('/unknown-page');
  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  await page.getByRole('link', { name: 'До інструментів' }).click();
  await expect(page).toHaveURL(/\/tools$/);
});

test('visible right search finds and activates actual tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const search = page.getByRole('searchbox', { name: 'Пошук розділів' });
  const aside = page.locator('[data-pg-action="aside-toggle"]');
  await expect(search).toBeVisible();
  const a = await search.boundingBox();
  const b = await aside.boundingBox();
  expect(a.x + a.width).toBeLessThan(b.x);
  expect(Math.abs(a.y + a.height / 2 - b.y - b.height / 2)).toBeLessThan(3);

  await search.click();
  await search.fill('Текст');
  await expect(page.locator('.pg-search__results')).toHaveCount(0);
  await expect(page.locator('#pg-search-panel')).toHaveCount(0);
  await search.press('Enter');
  await expect(page.getByRole('tab', { name: 'Текст' })).toHaveAttribute('aria-selected', 'true');
  await expect(search).toHaveValue('');

  await page.keyboard.press('Control+k');
  await expect(search).toBeFocused();
  await search.fill('Таблиці');
  await search.press('Enter');
  await expect(page.getByRole('tab', { name: 'Таблиці' })).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Control+k');
  await search.fill('Невідомий розділ');
  await search.press('Enter');
  await expect(page.locator('.pg-search__status')).toHaveText('Нічого не знайдено');
  await expect(page.locator('.pg-search__results')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(page.locator('.pg-search__status')).toBeEmpty();
});

test('mobile sidebar does not contain local content tabs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const shell = page.locator('.pg-shell');
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'open');
  await expect(page.locator('.pg-sidebar').getByRole('tab')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');
  await expect(page.getByRole('tablist', { name: 'Інструменти' })).toBeVisible();
});
