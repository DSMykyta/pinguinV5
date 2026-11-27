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
    const slide = node.querySelectorAll('.pg-focus-carousel__slide:not([data-pg-clone])')[i].getBoundingClientRect();
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
  const before = await track.evaluate(node => node.scrollLeft);
  await page.mouse.up();
  await expect(track).toHaveAttribute('data-pg-state', 'settling');
  const after = await track.evaluate(node => node.scrollLeft);
  expect(Math.abs(after - before)).toBeLessThan(box.width * .2);
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

test('ordinary vertical wheel moves horizontally and autoplay is optional', async ({ page }) => {
  const track = await openCarousel(page);
  await centered(track, 0);
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 100);
  await centered(track, 1);
  await expect(track).toHaveCSS('scroll-snap-type', 'x mandatory');
  const autoplay = page.getByRole('switch', { name: 'Автопрокрутка' });
  await expect(autoplay).not.toBeChecked();
  await autoplay.check();
  await page.mouse.move(1, 1);
  await centered(track, 2);
  await autoplay.uncheck();
  await expect(autoplay).not.toBeChecked();
  await expect(track.locator('img')).toHaveCount(5);
});

test('loop wraps in both directions and autoplay advances across the boundary', async ({ page }) => {
  const track = await openCarousel(page);
  const loop = page.getByRole('switch', { name: 'Зациклення' });
  await loop.check();
  await expect(track).toHaveAttribute('data-pg-loop', 'true');
  await centered(track, 0);
  await track.focus();
  await page.keyboard.press('ArrowLeft');
  await centered(track, 4);
  await page.keyboard.press('ArrowRight');
  await centered(track, 0);
  await page.keyboard.press('End');
  await centered(track, 4);
  const autoplay = page.getByRole('switch', { name: 'Автопрокрутка' });
  await autoplay.check();
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(3800);
  await centered(track, 4);
  await page.mouse.move(1, 1);
  await centered(track, 0);
  await autoplay.uncheck();
  await loop.uncheck();
  await expect(track.locator('[data-pg-clone]')).toHaveCount(0);
  await centered(track, 0);
});

test('autoplay pauses on hover and resumes after mouse focus leaves the scrollport', async ({ page }) => {
  const track = await openCarousel(page);
  const autoplay = page.getByRole('switch', { name: 'Автопрокрутка' });
  await autoplay.check();
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await centered(track, 0);
  await page.waitForTimeout(3900);
  await centered(track, 0);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(1, 1);
  await centered(track, 1);
  await expect(autoplay).toBeChecked();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(3900);
  await centered(track, 1);
  await page.mouse.move(1, 1);
  await centered(track, 2);
  await autoplay.uncheck();
});

test('keyboard focus ring stays inside the clipped carousel viewport', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const track = await openCarousel(page);
    await track.focus();
    await page.keyboard.press('ArrowRight');
    await centered(track, 1);
    await expect(track).toHaveCSS('outline-style', 'solid');
    await expect(track).toHaveCSS('outline-width', '2px');
    await expect(track).toHaveCSS('outline-offset', '-2px');
    await expect(track).toHaveCSS('border-top-left-radius', '16px');
    await expect(track).toHaveCSS('scroll-snap-type', 'x mandatory');
  }
});
