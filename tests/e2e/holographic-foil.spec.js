/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL E2E
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє спільне демо, керування та reduced motion.
 * ║ ЗАЛЕЖНОСТІ: Playwright; /tools.
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.
 * ║ ПРИНЦИП: Реальний сценарій користувача.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('foil has an independent tab and shared controls', async ({ page }) => {
  await page.goto('/tools');
  const panel = page.locator('#pg-tools-panel-effects');
  await expect(panel).toBeHidden();
  await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
  const samples = panel.locator('.pg-holographic-foil');
  await expect(samples).toHaveCount(3);
  await expect(samples.first()).toBeVisible();
  await expect(samples.first().locator('.pg-holographic-foil__layer')).toHaveCSS('mix-blend-mode', 'color-dodge');
  await panel.getByRole('radio', { name: 'Спектр' }).focus();
  await panel.getByRole('radio', { name: 'Спектр' }).press('Space');
  await expect(samples.first()).toHaveAttribute('data-pg-palette', 'spectrum');
  await panel.getByRole('slider', { name: 'Інтенсивність' }).press('Home');
  await expect(samples.first().locator('.pg-holographic-foil__layer')).toHaveCSS('opacity', '0');
  await panel.getByRole('switch', { name: 'Анімація' }).focus();
  await panel.getByRole('switch', { name: 'Анімація' }).press('Space');
  await expect(samples.first().locator('.pg-holographic-foil__layer')).toHaveCSS('animation-name', 'none');
  await page.getByRole('tab', { name: 'Таблиці', exact: true }).click();
  await expect(panel).toBeHidden();
  await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
  await expect(samples.first()).toHaveAttribute('data-pg-palette', 'spectrum');
});

test('foil is static with reduced motion and fits mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
  const sample = page.locator('#pg-tools-panel-effects .pg-holographic-foil').first();
  await expect(sample).toBeVisible();
  await expect(sample.locator('.pg-holographic-foil__layer')).toHaveCSS('animation-name', 'none');
  await expect(sample.locator('.pg-holographic-foil__surface')).toHaveCSS('animation-name', 'none');
  const width = await sample.evaluate(node => node.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(390);
});
