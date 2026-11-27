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

test('one printed card follows the pointer without an autonomous loop', async ({ page }) => {
  await page.goto('/tools');
  const panel = page.locator('#pg-tools-panel-effects');
  await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
  const card = panel.locator('.pg-holographic-foil');
  const layer = card.locator('.pg-holographic-foil__layer');
  const surface = card.locator('.pg-holographic-foil__surface');
  await expect(card).toHaveCount(1);
  await expect(card.getByText('PINGUIN', { exact: true })).toBeVisible();
  await expect(layer).toHaveCSS('background-size', '300% 200%');
  await expect(layer).toHaveCSS('mix-blend-mode', 'color-dodge');
  await expect(layer).toHaveCSS('animation-name', 'none');
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * .15, box.y + box.height * .3);
  await expect(card).toHaveAttribute('data-pg-tracking', 'true');
  const left = await layer.evaluate(node => getComputedStyle(node).backgroundPositionX);
  await page.mouse.move(box.x + box.width * .85, box.y + box.height * .7);
  await expect.poll(() => layer.evaluate(node => parseFloat(getComputedStyle(node).backgroundPositionX))).toBeGreaterThan(parseFloat(left) + 30);
  await expect.poll(() => surface.evaluate(node => getComputedStyle(node).transform)).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
  const bounds = await layer.evaluate(node => ({ width: node.offsetWidth, parent: node.parentElement.clientWidth, left: node.offsetLeft }));
  expect(bounds.width).toBe(bounds.parent);
  expect(bounds.left).toBe(0);
  await page.mouse.move(1, 1);
  await expect(card).not.toHaveAttribute('data-pg-tracking', 'true');
  await expect(layer).toHaveCSS('background-position', '50% 50%');
  await panel.getByRole('radio', { name: 'Pinguin', exact: true }).focus();
  await panel.getByRole('radio', { name: 'Pinguin', exact: true }).press('Space');
  await expect(card).toHaveAttribute('data-pg-palette', 'theme');
  await panel.getByRole('switch', { name: 'Реакція на курсор' }).focus();
  await panel.getByRole('switch', { name: 'Реакція на курсор' }).press('Space');
  await expect(card).toHaveAttribute('data-pg-interactive', 'false');
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .6);
  await expect(card).not.toHaveAttribute('data-pg-tracking', 'true');
});

test('reduced motion and narrow viewport keep the card static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
  const card = page.locator('#pg-tools-panel-effects .pg-holographic-foil');
  await expect(card).toBeVisible();
  await card.hover();
  await expect(card).not.toHaveAttribute('data-pg-tracking', 'true');
  await expect(card.locator('.pg-holographic-foil__surface')).toHaveCSS('transform', 'none');
  await expect(card.locator('.pg-holographic-foil__layer')).toHaveCSS('background-position', '50% 50%');
  expect((await card.boundingBox()).width).toBeLessThanOrEqual(390);
});
