/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ISOLATED TOAST DEMO E2E                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє робочу тестову кнопку в блоці Tools.                        ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, src/features/tools/toast-demo.js, shared Toast.            ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                     ║
 * ║ ПРИНЦИП: Тестова дія не порушує геометрії погодженого Shell.                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Tools canvas exposes a real isolated Toast trigger without changing Shell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const main = page.locator('.pg-shell__content');
  const demo = main.locator('.pg-tools-toast-demo');
  const trigger = demo.locator('[data-pg-action="toast-demo"]');

  await expect(main.locator('.pg-page')).toBeHidden();
  await expect(demo).toBeVisible();
  await expect(demo.locator('.pg-tools-toast-demo__label')).toHaveText('Тест Toast');
  await expect(trigger).toHaveAttribute('aria-label', 'Показати Toast');
  await expect(page.locator('.pg-toast')).toHaveCount(0);

  const canvasBefore = await main.boundingBox();
  await trigger.click();
  await expect(page.locator('.pg-toast__message')).toHaveText('Зміни збережено');
  await expect(page.locator('.pg-toast')).toHaveAttribute('data-pg-type', 'success');
  await expect(page.locator('.pg-toast__host')).toHaveCSS('left', '20px');
  await expect(page.locator('.pg-toast__host')).toHaveCSS('bottom', '20px');
  expect(await main.boundingBox()).toEqual(canvasBefore);

  await page.locator('[data-pg-action="toast-dismiss"]').click();
  await expect(page.locator('.pg-toast')).toHaveCount(0);
  await trigger.click();
  await expect(page.locator('.pg-toast__message')).toHaveText('Зміни збережено');
});

test('Toast demo stays inside canvas on mobile, independent from tab selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const trigger = page.locator('[data-pg-action="toast-demo"]');
  await expect(trigger).toBeVisible();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.locator('.pg-toast__message')).toHaveText('Зміни збережено');
  const demoBox = await page.locator('.pg-tools-toast-demo').boundingBox();
  const canvasBox = await page.locator('.pg-shell__content').boundingBox();
  expect(demoBox.x).toBeGreaterThanOrEqual(canvasBox.x);
  expect(demoBox.x + demoBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width);
});
