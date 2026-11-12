/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT E2E                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє кнопку у «Таблицях», рух і доступність Dialog.              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared Dialog, tools/animated-gradient-demo.             ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/animated-gradient.spec.js.                               ║
 * ║ ПРИНЦИП: Перевірка реальної інтеграції без тестової підміни модалки.               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Tables opens the shared dialog with a branded animated gradient', async ({ page }) => {
  await page.goto('/tools');
  const tables = page.locator('#pg-tools-panel-tables');
  const trigger = tables.locator('[data-pg-action="animated-gradient-demo"]');
  await expect(trigger).toBeVisible();
  await expect(page.locator('#pg-tools-panel-text [data-pg-action="animated-gradient-demo"]')).toHaveCount(0);

  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const gradient = dialog.locator('.pg-animated-gradient');
  await expect(gradient.locator('.pg-animated-gradient__title')).toHaveText('pinguin V6');
  await expect(gradient.locator('.pg-animated-gradient__glow')).toHaveCount(3);
  await expect(gradient.locator('.pg-animated-gradient__grain')).toHaveAttribute('aria-hidden', 'true');
  await expect(gradient.locator('.pg-animated-gradient__glow--main')).toHaveCSS('animation-name', 'pg-gradient-main-flow');
  const themeTone = await gradient.evaluate(el => ({
    main: getComputedStyle(el).getPropertyValue('--pg-tone-main-base').trim(),
    secondary: getComputedStyle(el).getPropertyValue('--pg-tone-secondary-base').trim(),
    tertiary: getComputedStyle(el).getPropertyValue('--pg-tone-tertiary-base').trim(),
  }));
  expect(themeTone.main).toBeTruthy();
  expect(themeTone.secondary).toBeTruthy();
  expect(themeTone.tertiary).toBeTruthy();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Reduced motion stops background and grain while dialog remains usable on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.pg-animated-gradient__glow--main')).toHaveCSS('animation-name', 'none');
  await expect(dialog.locator('.pg-animated-gradient__grain')).toHaveCSS('animation-name', 'none');
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
});
