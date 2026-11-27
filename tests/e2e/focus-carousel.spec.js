/*
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FOCUS CAROUSEL E2E
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевірка snap, drag, keyboard та reduced motion.
 * ║ ЗАЛЕЖНОСТІ: DOM, CSS і спільні токени.
 * ║ ПУБЛІЧНИЙ API: Playwright.
 * ║ ПРИНЦИП: Незалежний екземпляр, без глобального стану.
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function openCarousel(page) {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Ефекти', exact: true }).click();
  const track = page.locator('.pg-focus-carousel');
  await track.scrollIntoViewIfNeeded();
  return track;
}

async function centered(track, index) {
  await expect.poll(() => track.evaluate((node, i) => {
    const rect = node.getBoundingClientRect();
    const slide = node.children[i].getBoundingClientRect();
    return Math.abs(rect.left + node.clientWidth / 2 - slide.left - slide.width / 2);
  }, index)).toBeLessThan(3);
}

test('first and last cards center, keyboard and mouse drag work', async ({ page }) => {
  const track = await openCarousel(page);
  await centered(track, 0);
  await track.focus();
  await page.keyboard.press('ArrowRight');
  await centered(track, 1);
  await page.keyboard.press('End');
  await centered(track, 4);
  await page.keyboard.press('Home');
  await centered(track, 0);
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width * .82, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5, { steps: 12 });
  await page.mouse.up();
  await centered(track, 1);
  await expect(track).toHaveCSS('scroll-snap-type', 'x mandatory');
  await expect(track.locator('.pg-focus-carousel__surface').nth(1)).toHaveCSS('opacity', '1');
});

test('narrow reduced-motion carousel keeps full opacity and stays within workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const track = await openCarousel(page);
  await track.focus();
  await page.keyboard.press('End');
  await centered(track, 4);
  await expect(track.locator('.pg-focus-carousel__surface').first()).toHaveCSS('transform', 'none');
  await expect(track.locator('.pg-focus-carousel__surface').first()).toHaveCSS('opacity', '1');
  expect((await track.boundingBox()).width).toBeLessThanOrEqual(390);
});
