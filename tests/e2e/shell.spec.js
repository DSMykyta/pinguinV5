/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHELL E2E                                                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє теми, панелі та кнопки.                                                     ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, тестовий Vite.                                                             ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевірка desktop та mobile.                                                              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('desktop: uniform canvas, compact context popover and moving round controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Робочий простір' })).toBeVisible();

  const shell = page.locator('.pg-shell');
  const sidebar = page.locator('.pg-sidebar');
  const aside = page.locator('#pg-aside-panel');
  const nav = page.locator('[data-pg-action="sidebar-toggle"]');
  const context = page.locator('[data-pg-action="aside-toggle"]');
  const theme = page.locator('[data-pg-action="theme-cycle"]');

  const columns = await shell.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(2);

  const sidebarBackground = await sidebar.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(sidebarBackground).toBe('rgba(0, 0, 0, 0)');
  await expect(aside).toBeHidden();

  for (const button of [nav, context, theme]) {
    await expect(button).toHaveCSS('border-radius', '9999px');
  }

  const navBox = await nav.boundingBox();
  const contextBox = await context.boundingBox();
  const themeBox = await theme.boundingBox();
  expect(navBox.x).toBeLessThan(48);
  expect(navBox.y).toBeLessThan(48);
  expect(contextBox.x).toBeGreaterThan(1380);
  expect(contextBox.y).toBeLessThan(48);
  expect(themeBox.x).toBeLessThan(48);
  expect(themeBox.y).toBeGreaterThan(800);

  await nav.click();
  await expect(shell).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await nav.click();
  await expect(shell).toHaveAttribute('data-pg-sidebar-state', 'expanded');

  await context.click();
  await expect(aside).toBeVisible();
  await expect(aside).toHaveAttribute('aria-hidden', 'false');
  await expect(aside.getByRole('link', { name: 'Код проєкту' })).toHaveAttribute('href', /github.com/);
  await expect(aside.getByRole('link', { name: 'Правила компонентів' })).toHaveAttribute('href', /github.com/);

  const asideBox = await aside.boundingBox();
  expect(asideBox.x).toBeGreaterThan(1100);
  expect(asideBox.y).toBeGreaterThanOrEqual(55);
  expect(asideBox.width).toBeLessThan(320);

  await page.keyboard.press('Escape');
  await expect(aside).toBeHidden();
  await context.click();
  await page.getByRole('heading', { name: 'Робочий простір' }).click();
  await expect(aside).toBeHidden();
  expect(errors).toEqual([]);
});

test('theme control matches legacy cycle and storage behavior', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await expect(theme).toHaveAttribute('data-pg-theme', 'system');

  // Same order as legacy: light -> dark -> system -> light.
  await theme.click();
  await expect(theme).toHaveAttribute('data-pg-theme', 'light');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
  await theme.click();
  await expect(theme).toHaveAttribute('data-pg-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await theme.click();
  await expect(theme).toHaveAttribute('data-pg-theme', 'system');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

  const legacyStorageValue = await page.evaluate(() => localStorage.getItem('theme-mode'));
  expect(legacyStorageValue).toBe('system');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(theme).toHaveAttribute('data-pg-theme', 'system');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('mobile: sliding navigation and anchored menu without colored side panel', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const shell = page.locator('.pg-shell');
  const mobileMenu = page.locator('[data-pg-action="mobile-menu-toggle"]');
  const context = page.locator('[data-pg-action="aside-toggle"]');
  const aside = page.locator('#pg-aside-panel');

  await mobileMenu.click();
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'open');
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');

  await context.click();
  await expect(aside).toBeVisible();
  const size = await aside.boundingBox();
  expect(size.width).toBeLessThan(350);
  await expect(aside).toHaveCSS('top', '58px');
  await context.click();
  await expect(aside).toBeHidden();

  await mobileMenu.click();
  await page.locator('.pg-shell__backdrop').click({ position: { x: 350, y: 400 } });
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');
  expect(errors).toEqual([]);
});

test('reduced motion disables layout and popover transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const transition = await page.locator('.pg-shell')
    .evaluate(element => getComputedStyle(element).transitionDuration);
  expect(transition).toBe('0s');

  await page.locator('[data-pg-action="aside-toggle"]').click();
  const asideTransition = await page.locator('#pg-aside-panel')
    .evaluate(element => getComputedStyle(element).transitionDuration);
  expect(asideTransition.split(',').every(x => x.trim() === '0s')).toBe(true);
});
