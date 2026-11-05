/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — UNIVERSAL SIDEBAR TABS E2E                                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Вкладки під активним пунктом меню і контекст aside.                              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і модульна оболонка.                                                   ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну поведінку, не декоративні заглушки.                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('all local navigation lives beneath the selected sidebar item, never in the header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const sidebar = page.locator('.pg-sidebar');
  const link = sidebar.getByRole('link', { name: 'Інструменти' });
  const nav = sidebar.getByRole('tablist', { name: 'Інструменти' });

  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.pg-shell__header').getByRole('tab')).toHaveCount(0);
  await expect(page.locator('.pg-shell__local-nav')).toHaveCount(0);
  await expect(nav).toBeVisible();

  const location = await nav.boundingBox();
  const linkBox = await link.boundingBox();
  expect(location.y).toBeGreaterThan(linkBox.y + linkBox.height - 2);
  expect(location.x).toBeLessThan(240);

  const tables = nav.getByRole('tab', { name: 'Таблиці' });
  const text = nav.getByRole('tab', { name: 'Текст' });
  await expect(tables).toHaveAttribute('aria-selected', 'true');
  await expect(text).toHaveAttribute('aria-selected', 'false');
  await expect(tables).toHaveCSS('border-radius', '9999px');

  await text.click();
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Інструменти · Текст');
  await expect(page.getByRole('heading', { name: 'Текст', exact: true })).toBeVisible();
  await expect(page.locator('#pg-aside-panel .pg-aside__heading')).toHaveText('Текст');

  await text.press('ArrowLeft');
  await expect(tables).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Таблиці', exact: true })).toBeVisible();
});

test('global tab slot remains usable collapsed, expanded and on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const shell = page.locator('.pg-shell');
  const nav = page.getByRole('tablist', { name: 'Інструменти' });
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await expect(shell).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  const tab = nav.getByRole('tab', { name: 'Текст' });
  await expect(tab).toBeVisible();
  await expect(tab).toHaveCSS('max-width', '32px');
  await tab.click();
  await expect(page.getByRole('heading', { name: 'Текст', exact: true })).toBeVisible();

  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await expect(shell).toHaveAttribute('data-pg-sidebar-state', 'expanded');
  await expect(tab).toHaveAttribute('aria-selected', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await expect(nav).toBeVisible();
  await expect(nav).toHaveCSS('flex-direction', 'row');
});

test('pinned aside keeps its visual geometry while tab context changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const aside = page.locator('#pg-aside-panel');
  const main = page.locator('.pg-shell__workspace');
  const width = (await main.boundingBox()).width;
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(aside).toBeVisible();
  const appearance = await aside.evaluate(node => {
    const s = getComputedStyle(node);
    return [s.width, s.borderRadius, s.boxShadow, s.backgroundColor, s.position];
  });
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  await expect.poll(async () => (await main.boundingBox()).width).toBeLessThan(width - 250);
  expect(await aside.evaluate(node => {
    const s = getComputedStyle(node);
    return [s.width, s.borderRadius, s.boxShadow, s.backgroundColor, s.position];
  })).toEqual(appearance);

  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(aside.locator('.pg-aside__heading')).toHaveText('Текст');
  await expect(aside).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aside).toBeVisible();

  await page.reload();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  await expect(aside).toBeVisible();
});
