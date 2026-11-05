/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHELL LAYOUT E2E                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє кнопки кутів, теми, aside та мобільні стани.                           ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і модульна оболонка.                                                   ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну поведінку, не декоративні заглушки.                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('clean shell keeps a uniform canvas and right-hand global controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/tools');

  const shell = page.locator('.pg-shell');
  const sidebar = page.locator('.pg-sidebar');
  const aside = page.locator('#pg-aside-panel');
  const nav = page.locator('[data-pg-action="sidebar-toggle"]');
  const context = page.locator('[data-pg-action="aside-toggle"]');
  const search = page.locator('[data-pg-action="site-search-toggle"]');
  const theme = page.locator('[data-pg-action="theme-cycle"]');

  await expect(sidebar).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(aside).toBeHidden();
  for (const button of [nav, context, search, theme]) {
    await expect(button).toHaveCSS('border-radius', '9999px');
  }
  const positions = await Promise.all([nav, search, context, theme].map(x => x.boundingBox()));
  expect(positions[0].x).toBeLessThan(48);
  expect(positions[0].y).toBeLessThan(48);
  expect(positions[1].x).toBeGreaterThan(1300);
  expect(positions[2].x).toBeGreaterThan(1380);
  expect(positions[3].y).toBeGreaterThan(800);

  await context.click();
  await expect(aside).toBeVisible();
  await expect(aside.locator('.pg-aside__heading')).toHaveText('Таблиці');
  await page.keyboard.press('Escape');
  await expect(aside).toBeHidden();
  await expect(shell).toHaveAttribute('data-pg-aside-mode', 'floating');
});

test('legacy theme toggle still cycles light, dark and system', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/tools');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await expect(theme).toHaveAttribute('data-pg-theme', 'system');
  await theme.click();
  await expect(theme).toHaveAttribute('data-pg-theme', 'light');
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await theme.click();
  await expect(theme).toHaveAttribute('data-pg-theme', 'system');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('system');
});

test('sidebar icon alignment remains stable through collapse', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const toggle = page.locator('[data-pg-action="sidebar-toggle"]');
  const toolIcon = page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).locator('.pg-icon');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  async function centers() {
    const boxes = await Promise.all([toggle, toolIcon, theme].map(x => x.boundingBox()));
    return boxes.map(box => box.x + box.width / 2);
  }
  const before = await centers();
  expect(Math.max(...before) - Math.min(...before)).toBeLessThan(1);
  await toggle.click();
  const after = await centers();
  expect(Math.max(...after) - Math.min(...after)).toBeLessThan(1);
  for (const x of after) expect(Math.abs(x - before[0])).toBeLessThan(1);
});

test('mobile nav and floating aside remain independent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const shell = page.locator('.pg-shell');
  const menu = page.locator('[data-pg-action="mobile-menu-toggle"]');
  const aside = page.locator('[data-pg-action="aside-toggle"]');
  await menu.click();
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'open');
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');
  await aside.click();
  await expect(page.locator('#pg-aside-panel')).toBeVisible();
  await expect(page.locator('[data-pg-action="aside-pin"]')).toBeHidden();
  await aside.click();
  await expect(page.locator('#pg-aside-panel')).toBeHidden();
});

test('reduced motion disables Shell transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await expect(page.locator('.pg-shell')).toHaveCSS('transition-duration', '0s');
  await page.locator('[data-pg-action="aside-toggle"]').click();
  const duration = await page.locator('#pg-aside-panel')
    .evaluate(node => getComputedStyle(node).transitionDuration);
  expect(duration.split(',').every(x => x.trim() === '0s')).toBe(true);
});
