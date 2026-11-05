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

test('page title, tabs and content align in one workspace column', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const title = page.getByRole('heading', { level: 1, name: 'Інструменти' });
  const tabs = page.locator('.pg-shell__local-nav')
    .getByRole('tablist', { name: 'Інструменти' });
  const section = page.getByRole('heading', { level: 2, name: 'Таблиці' });
  await expect(tabs).toBeVisible();
  await expect(page.locator('.pg-sidebar').getByRole('tab')).toHaveCount(0);
  await expect(page.locator('.pg-shell__header').getByRole('tab')).toHaveCount(0);

  const surface = page.locator('.pg-page');
  await surface.evaluate(element => Promise.all(element.getAnimations()
    .map(animation => animation.finished.catch(() => {}))));
  const [t, n, c] = await Promise.all([title, tabs, section].map(x => x.boundingBox()));
  expect(n.y).toBeGreaterThan(t.y + t.height);
  expect(c.y).toBeGreaterThan(n.y + n.height);
  expect(Math.abs(t.x - n.x)).toBeLessThan(1);
  expect(Math.abs(t.x - c.x)).toBeLessThan(1);

  const text = tabs.getByRole('tab', { name: 'Текст' });
  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  await expect(title).toHaveText('Інструменти');
  await expect(page.getByRole('heading', { level: 2, name: 'Текст' })).toBeVisible();
  await expect(page.locator('#pg-aside-panel .pg-aside__heading')).toHaveText('Текст');
  await text.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Таблиці' })).toBeFocused();
  await expect(section).toBeVisible();
});

test('tabs remain in workspace when sidebar collapses or on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const tabs = page.locator('.pg-shell__local-nav')
    .getByRole('tablist', { name: 'Інструменти' });
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await tabs.getByRole('tab', { name: 'Текст' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Текст' })).toBeVisible();

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
