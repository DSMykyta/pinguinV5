/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT E2E                                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Захист безшовної колірної поверхні, модальної поведінки й станів рендера.           ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Dialog, AnimatedGradient, Canvas 2D.                                    ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                                        ║
 * ║ ПРИНЦИП: Рендер без прямокутних країв; фон паузиться, foreground продовжує рух.                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

function canvasSample(locator) {
  return locator.evaluate(canvas => {
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    let sum = 0, maxAdjacent = 0, minR = 255, maxR = 0, minB = 255, maxB = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = pixels[i], b = pixels[i + 2];
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minB = Math.min(minB, b); maxB = Math.max(maxB, b);
        sum += r + pixels[i + 1] + b;
        if (x > 0) {
          const left = i - 4;
          maxAdjacent = Math.max(maxAdjacent,
            Math.abs(r - pixels[left]),
            Math.abs(pixels[i + 1] - pixels[left + 1]),
            Math.abs(b - pixels[left + 2]));
        }
        if (y > 0) {
          const upper = i - width * 4;
          maxAdjacent = Math.max(maxAdjacent,
            Math.abs(r - pixels[upper]),
            Math.abs(pixels[i + 1] - pixels[upper + 1]),
            Math.abs(b - pixels[upper + 2]));
        }
      }
    }
    return { sum, width, height, maxAdjacent, redRange: maxR - minR, blueRange: maxB - minB };
  });
}

test('Gradient fills the same Dialog without borders, clipped CSS blobs or extra chrome', async ({ page }) => {
  await page.goto('/tools');
  const trigger = page.locator('#pg-tools-panel-tables [data-pg-action="animated-gradient-demo"]');
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect(modal).toHaveAttribute('data-pg-presentation', 'edge-to-edge');
  await expect(modal.locator('header, footer, .pg-animated-gradient__title')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();

  const surface = modal.locator('.pg-animated-gradient');
  await expect(surface).toHaveAttribute('data-pg-gradient-ready', 'true');
  await expect(surface.locator('.pg-animated-gradient__glow, svg')).toHaveCount(0);
  const canvas = surface.locator('canvas.pg-animated-gradient__canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveCSS('opacity', '1');

  const coverage = await modal.evaluate(dialog => {
    const parent = dialog.getBoundingClientRect();
    const surface = dialog.querySelector('.pg-animated-gradient').getBoundingClientRect();
    const canvas = dialog.querySelector('canvas').getBoundingClientRect();
    return [parent.width - surface.width, parent.height - surface.height,
      parent.x - surface.x, parent.y - surface.y,
      surface.width - canvas.width, surface.height - canvas.height];
  });
  for (const delta of coverage) expect(Math.abs(delta)).toBeLessThanOrEqual(2);

  const sample = await canvasSample(canvas);
  expect(sample.width).toBeLessThanOrEqual(140);
  expect(sample.height).toBeLessThanOrEqual(140);
  expect(sample.redRange).toBeGreaterThan(35);
  expect(sample.blueRange).toBeGreaterThan(35);
  // Sharp straight stripes in previous versions caused >100 channel jumps
  // across adjacent pixels. The normalized field must stay smooth everywhere.
  expect(sample.maxAdjacent).toBeLessThan(28);

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Gradient flows, responds to theme changes, and becomes static in reduced motion', async ({ page }) => {
  await page.goto('/tools');
  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const modal = page.getByRole('dialog', { name: 'Анімований градієнт' });
  const canvas = modal.locator('canvas');
  await expect(modal.locator('.pg-animated-gradient')).toHaveAttribute('data-pg-gradient-ready', 'true');
  const start = await canvasSample(canvas);
  await page.waitForTimeout(800);
  const moved = await canvasSample(canvas);
  expect(moved.sum).not.toBe(start.sum);

  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect.poll(async () => (await canvasSample(canvas)).sum).not.toBe(moved.sum);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  const staticStart = await canvasSample(canvas);
  await page.waitForTimeout(650);
  const staticEnd = await canvasSample(canvas);
  expect(staticEnd.sum).toBe(staticStart.sum);
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
});

test('Background Canvas stops working when Dialog opens and resumes afterward', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createAnimatedGradient } = await import('/src/ui/animated-gradient/animated-gradient.js');
    document.querySelector('#pg-tools-panel-tables').append(createAnimatedGradient({ text: null }));
  });
  const backgroundSurface = page.locator('#pg-tools-panel-tables > .pg-animated-gradient');
  await expect(backgroundSurface).toHaveAttribute('data-pg-gradient-ready', 'true');
  const background = backgroundSurface.locator('canvas');
  const before = await canvasSample(background);
  await page.waitForTimeout(500);
  expect((await canvasSample(background)).sum).not.toBe(before.sum);

  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const modal = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect(modal).toBeVisible();
  const paused = await canvasSample(background);
  const foreground = modal.locator('canvas');
  const foregroundBefore = await canvasSample(foreground);
  await page.waitForTimeout(650);
  expect((await canvasSample(background)).sum).toBe(paused.sum);
  expect((await canvasSample(foreground)).sum).not.toBe(foregroundBefore.sum);

  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
  const resumed = await canvasSample(background);
  await page.waitForTimeout(650);
  expect((await canvasSample(background)).sum).not.toBe(resumed.sum);
});

test('Generic edge-to-edge Dialog is reusable with arbitrary content', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showDialog } = await import('/src/ui/dialog/dialog.js');
    const visual = document.createElement('div');
    visual.textContent = 'Довільний вміст';
    visual.setAttribute('data-pg-test-visual', '');
    visual.style.display = 'grid';
    void showDialog({ title: 'Перегляд матеріалу', presentation: 'edge-to-edge', content: visual });
  });
  const modal = page.getByRole('dialog', { name: 'Перегляд матеріалу' });
  await expect(modal).toHaveAttribute('open', '');
  await expect(modal.locator('[data-pg-test-visual]')).toHaveCSS('display', 'grid');
  await expect(modal.locator('header, footer, .pg-animated-gradient')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
