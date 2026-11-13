/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — THINKING PROGRESS BROWSER TESTS                                    ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє рух, геометрію, доступність і теми «Думання».              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, справжній Tools і спільний Thinking Progress.              ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/thinking-progress.spec.js.                              ║
 * ║ ПРИНЦИП: Перевіряємо видимий компонент у Shell, без дубльованої розмітки.         ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Tables adds Thinking beside Wave, with an accessible unknown progress and shared palette', async ({ page }) => {
  await page.goto('/tools');
  const demo = page.locator('#pg-tools-panel-tables .pg-tools-thinking-progress-demo');
  const bar = demo.getByRole('progressbar', { name: 'Думання', exact: true });
  await expect(demo.getByRole('heading', { name: 'Думання', exact: true })).toBeVisible();
  await expect(bar).toBeVisible();
  await expect(bar).not.toHaveAttribute('aria-valuenow');
  await expect(bar).toHaveAttribute('data-pg-state', 'indeterminate');
  await expect(page.locator('.pg-tools-wave-demo')).toBeVisible();
  await expect(bar).toHaveCSS('height', '4px');

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    const palette = await bar.evaluate(element => {
      const flow = getComputedStyle(element.firstElementChild);
      const colors = ['main', 'secondary', 'tertiary'].map(tone => {
        const swatch = document.createElement('span');
        swatch.style.color = 'var(--pg-tone-' + tone + '-base)';
        element.append(swatch);
        const color = getComputedStyle(swatch).color;
        swatch.remove();
        return color;
      });
      return { gradient: flow.backgroundImage, colors, mask: getComputedStyle(element).maskImage };
    });
    for (const color of palette.colors) expect(palette.gradient).toContain(color);
    expect(palette.mask).toContain('15%');
    expect(palette.mask).toContain('85%');
  }

  await page.getByRole('tab', { name: 'Елементи', exact: true }).click();
  await expect(demo).toBeHidden();
  await page.getByRole('tab', { name: 'Таблиці', exact: true }).click();
  await expect(bar).toBeVisible();
  await expect(page.locator('.pg-thinking-progress')).toHaveCount(1);
});

test('flow moves one complete color period at constant speed without moving its mask or layout', async ({ page }) => {
  await page.goto('/tools');
  const bar = page.getByRole('progressbar', { name: 'Думання', exact: true });
  await expect(bar).toBeVisible();
  const motion = await bar.evaluate(element => {
    const flow = element.firstElementChild;
    const animation = flow.getAnimations()[0];
    animation.pause();
    const timing = animation.effect.getTiming();
    const width = element.getBoundingClientRect().width;
    const samples = [0, .25, .5, .999, 1].map(progress => {
      animation.currentTime = timing.duration * progress;
      return {
        shift: new DOMMatrixReadOnly(getComputedStyle(flow).transform).m41,
        width: element.getBoundingClientRect().width,
        mask: getComputedStyle(element).maskImage,
      };
    });
    return { width, timing, samples, stripWidth: flow.getBoundingClientRect().width };
  });
  expect(motion.timing.easing).toBe('linear');
  expect(motion.timing.iterations).toBe(Infinity);
  expect(motion.stripWidth).toBeCloseTo(motion.width * 3, 1);
  for (const [index, fraction] of [[0, 0], [1, .25], [2, .5], [3, .999], [4, 0]]) {
    expect(motion.samples[index].shift).toBeCloseTo(-motion.width * fraction, 1);
    expect(motion.samples[index].width).toBe(motion.width);
    expect(motion.samples[index].mask).toBe(motion.samples[0].mask);
  }
});

test('bar fits mobile and pinned aside without changing its shared thickness', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const bar = page.getByRole('progressbar', { name: 'Думання', exact: true });
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await bar.scrollIntoViewIfNeeded();
    const area = await page.locator('.pg-shell__content').boundingBox();
    const box = await bar.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(area.x);
    expect(box.x + box.width).toBeLessThanOrEqual(area.x + area.width + 1);
    expect(box.height).toBe(4);
    expect(box.width).toBeGreaterThan(100);
  }
});

test('reduced motion keeps the gradient visible and forced colors provides a visible system line', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  const bar = page.getByRole('progressbar', { name: 'Думання', exact: true });
  const flow = bar.locator('.pg-thinking-progress__flow');
  await expect(bar).toBeVisible();
  await expect(flow).toHaveCSS('animation-name', 'none');
  await expect(flow).not.toHaveCSS('background-image', 'none');

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'no-preference' });
  await expect(bar).toHaveCSS('mask-image', 'none');
  await expect(flow).toHaveCSS('animation-name', 'none');
  await expect(flow).toHaveCSS('background-image', 'none');
  const contrast = await flow.evaluate(element => ({
    ink: getComputedStyle(element).backgroundColor,
    surface: getComputedStyle(document.body).backgroundColor,
  }));
  expect(contrast.ink).not.toBe(contrast.surface);
  expect(contrast.ink).not.toBe('rgba(0, 0, 0, 0)');
});

test('separate instances and destroy leave the original demo intact', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.getByRole('progressbar', { name: 'Думання', exact: true })).toBeVisible();
  const result = await page.evaluate(async () => {
    const { createThinkingProgress } = await import('/src/ui/thinking-progress/thinking-progress.js');
    const original = document.querySelector('.pg-thinking-progress');
    const first = createThinkingProgress({ label: 'Обробка першої операції' });
    const second = createThinkingProgress({ label: 'Обробка другої операції' });
    document.querySelector('.pg-tools-thinking-progress-demo').append(first.element, second.element);
    const count = document.querySelectorAll('.pg-thinking-progress').length;
    first.destroy();
    first.destroy();
    const secondRemains = second.element.isConnected;
    second.destroy();
    let invalidRejected = false;
    try { createThinkingProgress({ label: '  ' }); } catch (error) {
      invalidRejected = error instanceof TypeError;
    }
    return { count, secondRemains, invalidRejected, originalRemains: original.isConnected };
  });
  expect(result).toEqual({ count: 3, secondRemains: true, invalidRejected: true, originalRemains: true });
  await expect(page.getByRole('progressbar', { name: 'Думання', exact: true })).toBeVisible();
});
