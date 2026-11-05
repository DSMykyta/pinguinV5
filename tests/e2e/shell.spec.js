/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHELL CORNERS & PANELS                                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Теми, бокові панелі, заголовок та мобільний Shell.                              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і спільні UI-компоненти.                                            ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну схему без винятків для сторінок.                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('layout uses restrained shared header controls, floating aside and empty footer rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const aside = page.locator('#pg-aside-panel');
  const sidebar = page.locator('.pg-sidebar');
  const nav = page.locator('[data-pg-action="sidebar-toggle"]');
  const context = page.locator('[data-pg-action="aside-toggle"]');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await expect(sidebar).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(aside).toBeHidden();
  await expect(page.locator('.pg-shell__footer')).toBeVisible();
  await expect(page.locator('.pg-shell__footer')).toHaveCSS('height', '56px');
  for (const button of [nav, context, theme])
    await expect(button).toHaveCSS('border-radius', '9999px');
  const positions = await Promise.all([nav, context, theme].map(x => x.boundingBox()));
  expect(positions[0].x).toBeLessThan(48);
  expect(positions[0].y).toBeLessThan(48);
  expect(positions[1].x).toBeGreaterThan(1100);
  expect(positions[2].y).toBeGreaterThan(800);

  await context.click();
  await expect(aside).toBeVisible();
  await expect(aside.locator('.pg-aside__heading')).toHaveText('Таблиці');
  await page.keyboard.press('Escape');
  await expect(aside).toBeHidden();
});

test('theme cycle keeps legacy behavior', async ({ page }) => {
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
});

test('sidebar icons keep aligned through collapsed state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const toggle = page.locator('[data-pg-action="sidebar-toggle"]');
  const icon = page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).locator('.pg-icon');
  const theme = page.locator('[data-pg-action="theme-cycle"]');

  async function centers() {
    const boxes = await Promise.all([toggle, icon, theme].map(el => el.boundingBox()));
    return boxes.map(box => box.x + box.width / 2);
  }

  const before = await centers();
  expect(Math.max(...before) - Math.min(...before)).toBeLessThan(1);
  await toggle.click();
  const after = await centers();
  expect(Math.max(...after) - Math.min(...after)).toBeLessThan(1);
  for (const x of after) expect(Math.abs(x - before[0])).toBeLessThan(1);
});

test('mobile navigation and context panel stay separate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const shell = page.locator('.pg-shell');
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'open');
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');

  const button = page.locator('[data-pg-action="aside-toggle"]');
  await button.click();
  await expect(page.locator('#pg-aside-panel')).toBeVisible();
  await expect(page.locator('[data-pg-action="aside-pin"]')).toBeHidden();
  await button.click();
  await expect(page.locator('#pg-aside-panel')).toBeHidden();
});

test('reduced motion disables shell transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await expect(page.locator('.pg-shell')).toHaveCSS('transition-duration', '0s');
});

test('fourth corner FAB is always visible and aligned with the other shell controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const fab = page.locator('[data-pg-action="aside-fab-toggle"]');
  const context = page.locator('[data-pg-action="aside-toggle"]');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  const aside = page.locator('#pg-aside-panel');

  await expect(aside).toBeHidden();
  await expect(fab).toBeVisible();
  await expect(fab).toHaveCSS('border-radius', '9999px');

  async function cornerAlignment() {
    const [fabBox, contextBox, themeBox] = await Promise.all(
      [fab, context, theme].map(el => el.boundingBox()));
    expect(Math.abs((fabBox.x + fabBox.width / 2) -
      (contextBox.x + contextBox.width / 2))).toBeLessThan(1);
    expect(Math.abs((fabBox.y + fabBox.height / 2) -
      (themeBox.y + themeBox.height / 2))).toBeLessThan(2);
  }

  await cornerAlignment();
  await fab.click();
  await expect(fab).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.pg-aside-fab__actions')).toBeVisible();
  await expect(page.locator('.pg-aside-fab__item')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(fab).toHaveAttribute('aria-expanded', 'false');
  await expect(fab).toBeFocused();

  await context.click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(fab).toBeVisible();
  await cornerAlignment();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await fab.click();
  await expect(page.locator('.pg-aside-fab__item').first())
    .toContainText('Редактор у legacy');
  await page.locator('.pg-shell__content').click({ position: { x: 20, y: 20 } });
  await expect(fab).toHaveAttribute('aria-expanded', 'false');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(aside).toBeHidden();
  await expect(fab).toBeVisible();
  const [mobileFab, mobileContext] = await Promise.all(
    [fab, context].map(el => el.boundingBox()));
  expect(Math.abs((mobileFab.x + mobileFab.width / 2) -
    (mobileContext.x + mobileContext.width / 2))).toBeLessThan(1);
  expect(Math.abs(mobileFab.y + mobileFab.height - (844 - 12))).toBeLessThan(1);
});
