/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — HOLOGRAPHIC FOIL E2E
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє картку, палітру теми, реакцію на курсор та reduced motion.
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
  await expect(card).toHaveAttribute('data-pg-palette', 'theme');
  await expect(panel.locator('input, button, select, textarea')).toHaveCount(0);
  const colors = await layer.evaluate(node => {
    const css = getComputedStyle(node);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    return ['main', 'secondary', 'tertiary'].map(tone => {
      ctx.fillStyle = css.getPropertyValue('--pg-tone-' + tone + '-base').trim();
      const hex = ctx.fillStyle.slice(1);
      const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
      return css.backgroundImage.includes('rgb(' + rgb.join(', ') + ')');
    });
  });
  expect(colors).toEqual([true, true, true]);
  await expect(card.getByText('PINGUIN', { exact: true })).toBeVisible();
  await expect(layer).toHaveCSS('background-size', '300% 200%');
  await expect(layer).toHaveCSS('mix-blend-mode', 'normal');
  await expect(layer).toHaveCSS('opacity', '1');
  await expect(layer).toHaveCSS('animation-name', 'none');
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width * .15, box.y + box.height * .3);
  await expect(card).toHaveAttribute('data-pg-tracking', 'true');
  await expect.poll(() => layer.evaluate(node => parseFloat(getComputedStyle(node).backgroundPositionX))).toBeLessThan(27);
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

test('card stays inside its reserved region and tracking transitions remain interruptible', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tools');
    await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
    const card = page.locator('#pg-tools-panel-effects .pg-holographic-foil');
    const surface = card.locator('.pg-holographic-foil__surface');
    const layer = card.locator('.pg-holographic-foil__layer');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    for (const [x, y] of [[.08,.08],[.92,.08],[.92,.92],[.08,.92]]) {
      await page.mouse.move(box.x + box.width*x, box.y + box.height*y);
      await expect(card).toHaveAttribute('data-pg-tracking', 'true');
      await expect(surface).toHaveCSS('transition-duration', '0.15s');
      await expect(layer).toHaveCSS('transition-duration', '0.15s');
      await page.waitForTimeout(180);
      const inner = await surface.boundingBox();
      const outer = await card.boundingBox();
      expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1);
      expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1);
      expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
      expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 1);
    }
    await page.mouse.move(1, 1);
    await expect(card).not.toHaveAttribute('data-pg-tracking', 'true');
    await expect(surface).toHaveCSS('transition-duration', '0.34s');
    await page.mouse.move(box.x + box.width*.85, box.y + box.height*.5);
    await expect(card).toHaveAttribute('data-pg-tracking', 'true');
    await expect(surface).toHaveCSS('transition-duration', '0.15s');
    await page.mouse.move(1, 1);
    await expect(layer).toHaveCSS('background-position', '50% 50%');
  }
});
