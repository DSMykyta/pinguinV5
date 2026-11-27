/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WELCOME DIALOG BROWSER TESTS
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє вітання, рух і закриття.
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared Dialog.
 * ║ ПУБЛІЧНИЙ API: Browser E2E.
 * ║ ПРИНЦИП: Перевірка реального маршруту та reduced motion.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('welcome is a buttonless standard Dialog with moving independent fields', async ({ page }) => {
  await page.goto('/tools');
  const trigger = page.getByRole('button', { name: 'Вітання Pinguin V6' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Pinguin V6' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('button')).toHaveCount(0);
  await expect(dialog).toHaveCSS('border-top-width', '0px');
  await expect(dialog.locator('.pg-welcome-dialog__name')).toHaveText('pinguin');
  await expect(dialog.locator('.pg-welcome-dialog__version')).toHaveText('V6');
  const gradient = dialog.locator('.pg-animated-gradient');
  await expect(gradient).toHaveAttribute('data-pg-motion', 'running');
  const field = gradient.locator('[data-pg-tone="secondary"]');
  const initial = await field.evaluate(el => getComputedStyle(el).transform);
  await expect.poll(() => field.evaluate(el => getComputedStyle(el).transform)).not.toBe(initial);
  await expect(gradient).not.toHaveAttribute('data-pg-rate', '1.00', { timeout: 8000 });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('root entry shows welcome once; reduced motion stays static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Pinguin V6' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.pg-animated-gradient')).toHaveAttribute('data-pg-motion', 'paused');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.goto('/');
  await expect(dialog).toHaveCount(0);
});
