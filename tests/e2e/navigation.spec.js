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
  await expect(page.locator('#pg-tools-panel-tables .pg-page')).toBeVisible();
  await expect(page.locator('#pg-tools-panel-elements .pg-page')).toBeHidden();
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

test('search appears only for records that can be searched', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const search = page.locator('.pg-search');
  await expect(search).toBeHidden();
  await page.keyboard.press('Control+k');
  await expect(page.locator('.pg-search__input')).not.toBeFocused();
  await page.getByRole('tab', {name:'Макети даних'}).click();
  const input=page.getByRole('searchbox',{name:'Шукати у таблиці брендів'});
  await expect(input).toBeVisible();
  const aside=page.locator('[data-pg-action="aside-toggle"]');
  const a=await input.boundingBox();
  const b=await aside.boundingBox();
  expect(a.x+a.width).toBeLessThan(b.x);
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('Pinguin');
  await expect(page.locator('#pg-tools-panel-data-views .pg-collection-view__table tbody tr')).toHaveCount(1);
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await expect(page.locator('#pg-tools-panel-data-views .pg-collection-view__table tbody tr')).toHaveCount(25);
  await page.getByRole('tab',{name:'Елементи'}).click();
  await expect(search).toBeHidden();
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
