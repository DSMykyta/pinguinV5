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

test('welcome is a buttonless standard Dialog with the shared CloudGradient', async ({ page }) => {
  await page.goto('/tools');
  const trigger = page.getByRole('button', { name: 'Вітання Pinguin V6' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Pinguin V6' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('button')).toHaveCount(0);
  await expect(dialog).toHaveCSS('border-top-width', '0px');
  await expect(dialog.locator('.pg-welcome-dialog__name')).toHaveText('pinguin');
  await expect(dialog.locator('.pg-welcome-dialog__version')).toHaveText('V6');
  const gradient = dialog.locator('.pg-cloud-gradient');
  await expect(gradient.locator('canvas')).toHaveCount(1);
  await expect(gradient).toHaveAttribute('data-pg-renderer', /webgl|fallback/);
  expect(await gradient.evaluate(el => el.style.getPropertyValue('--pg-cloud-gradient-base')))
    .toBe('var(--pg-color-gradient-base)');
  if (await gradient.getAttribute('data-pg-renderer') === 'webgl') {
    await expect(gradient).toHaveAttribute('data-pg-motion', 'running');
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('root entry shows welcome once; reduced motion stays static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Pinguin V6' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.pg-cloud-gradient')).toHaveAttribute('data-pg-motion', 'paused');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.goto('/');
  await expect(dialog).toHaveCount(0);
});
