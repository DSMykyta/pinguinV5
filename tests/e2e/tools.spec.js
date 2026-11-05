/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — UNIVERSAL PAGE TABS                                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Розміщення вкладок у основній області та контекст aside.                        ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і спільні UI-компоненти.                                            ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну схему без винятків для сторінок.                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('the universal header and tabs remain aligned while main preview is blank', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const title = page.getByRole('heading', { level: 1, name: 'Інструменти' });
  const tabs = page.locator('.pg-shell__local-nav')
    .getByRole('tablist', { name: 'Інструменти' });
  const main = page.locator('.pg-shell__content');

  await expect(title).toBeVisible();
  await expect(tabs).toBeVisible();
  await expect(page.locator('.pg-page')).toBeHidden();
  await expect(page.locator('.pg-sidebar').getByRole('tab')).toHaveCount(0);

  const [titleBox, tabsBox, mainBox] = await Promise.all([title,tabs,main].map(x => x.boundingBox()));
  const pad = await main.evaluate(node => parseFloat(getComputedStyle(node).paddingLeft));
  expect(Math.abs(titleBox.x - tabsBox.x)).toBeLessThan(1);
  expect(Math.abs(titleBox.x - mainBox.x)).toBeLessThan(1);
  expect(tabsBox.y).toBeGreaterThan(titleBox.y + titleBox.height);
  expect(mainBox.y).toBeGreaterThan(tabsBox.y);

  const text = tabs.getByRole('tab', { name: 'Текст' });
  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  await expect(title).toHaveText('Інструменти');
  await expect(main.locator('.pg-page')).toBeHidden();
  await expect(page.locator('#pg-aside-panel .pg-aside__heading')).toHaveText('Текст');
  await text.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Таблиці' })).toBeFocused();
});

test('tabs remain in workspace when sidebar collapses or on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const tabs = page.locator('.pg-shell__local-nav')
    .getByRole('tablist', { name: 'Інструменти' });
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await tabs.getByRole('tab', { name: 'Текст' }).click();
  await expect(tabs.getByRole('tab', { name: 'Текст' })).toHaveAttribute('aria-selected', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'Текст' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.pg-sidebar').getByRole('tab')).toHaveCount(0);
});

test('pinned aside preserves content geometry and independent tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const aside = page.locator('#pg-aside-panel');
  const workspace = page.locator('.pg-shell__workspace');
  const initialWidth = (await workspace.boundingBox()).width;
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(aside).toBeVisible();
  const initialStyle = await aside.evaluate(element => {
    const s = getComputedStyle(element);
    return [s.width, s.borderRadius, s.boxShadow, s.position, s.backgroundColor];
  });
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  await expect.poll(async () => (await workspace.boundingBox()).width)
    .toBeLessThan(initialWidth - 250);
  expect(await aside.evaluate(element => {
    const s = getComputedStyle(element);
    return [s.width, s.borderRadius, s.boxShadow, s.position, s.backgroundColor];
  })).toEqual(initialStyle);

  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(aside.locator('.pg-aside__heading')).toHaveText('Текст');
  await expect(aside).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aside).toBeVisible();
});
