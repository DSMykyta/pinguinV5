/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WAVE PROGRESS BROWSER TESTS                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє маску, доступність, повзунок і життєвий цикл демо.        ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Tools, WaveProgress та спільний Slider.                  ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/wave-progress.spec.js.                                  ║
 * ║ ПРИНЦИП: Перевірка реальних вкладок, без тимчасових дубльованих компонентів.      ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Tables shows the seamless wave and two accessible loading states', async ({ page }) => {
  await page.goto('/tools');
  const tables = page.locator('#pg-tools-panel-tables');
  const demo = tables.locator('.pg-tools-wave-demo');
  const known = demo.getByRole('progressbar', { name: 'Демонстраційний прогрес' });
  const unknown = demo.getByRole('progressbar', { name: 'Завантаження без визначеного відсотка' });

  await expect(demo).toBeVisible();
  await expect(known).toHaveAttribute('aria-valuenow', '61');
  await expect(known).toHaveAttribute('data-pg-state', 'determinate');
  await expect(unknown).toHaveAttribute('data-pg-state', 'indeterminate');
  await expect(unknown).not.toHaveAttribute('aria-valuenow', /.+/);
  await expect(demo.locator('.pg-tools-wave-demo__percent')).toHaveText('61%');

  const wave = known.locator('.pg-wave-progress__wave');
  const computed = await wave.evaluate(el => {
    const style = getComputedStyle(el);
    return { size: style.maskSize, image: style.maskImage, animation: style.animationName };
  });
  expect(computed.size).toContain('20px');
  expect(computed.image).toContain('data:image/svg+xml');
  expect(computed.animation).toContain('pg-wave-progress-flow');
  await expect(known.locator('svg')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(demo).toBeHidden();
  await page.getByRole('tab', { name: 'Таблиці' }).click();
  await expect(demo).toBeVisible();
});

test('Slider changes percentage and the correct empty/complete track geometry', async ({ page }) => {
  await page.goto('/tools');
  const demo = page.locator('.pg-tools-wave-demo');
  const progress = demo.getByRole('progressbar', { name: 'Демонстраційний прогрес' });
  const slider = demo.getByRole('slider', { name: 'Прогрес' });

  await slider.focus();
  await page.keyboard.press('Home');
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(progress).toHaveAttribute('data-pg-state', 'empty');
  await expect(progress.locator('.pg-wave-progress__wave')).toHaveCSS('display', 'none');

  await page.keyboard.press('End');
  await expect(progress).toHaveAttribute('aria-valuenow', '100');
  await expect(progress).toHaveAttribute('data-pg-state', 'complete');
  await expect(progress.locator('.pg-wave-progress__rest')).toHaveCSS('display', 'none');
  await expect(demo.locator('.pg-tools-wave-demo__percent')).toHaveText('100%');
});

test('Replay animates progress through the same component API', async ({ page }) => {
  await page.goto('/tools');
  const demo = page.locator('.pg-tools-wave-demo');
  const progress = demo.getByRole('progressbar', { name: 'Демонстраційний прогрес' });

  await demo.locator('[data-pg-action="wave-progress-demo-play"]').click();
  // The first animation frame may already have advanced on a busy CI runner.
  await expect(progress).toHaveAttribute('aria-valuenow', '100', { timeout: 7000 });
  await expect(demo.getByRole('slider', { name: 'Прогрес' })).toHaveValue('100');
});

test('Reduced motion and mobile preserve visible progress without animating', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');

  const demo = page.locator('.pg-tools-wave-demo');
  const known = demo.getByRole('progressbar', { name: 'Демонстраційний прогрес' });
  const unknown = demo.getByRole('progressbar', { name: 'Завантаження без визначеного відсотка' });
  await expect(known.locator('.pg-wave-progress__wave')).toHaveCSS('animation-name', 'none');
  await expect(unknown.locator('.pg-wave-progress__wave')).toHaveCSS('animation-name', 'none');

  const canvas = await page.locator('.pg-shell__content').boundingBox();
  const box = await demo.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(canvas.x);
  expect(box.x + box.width).toBeLessThanOrEqual(canvas.x + canvas.width + 1);
});


test('Wave and Slider keep independent semantic colors but share typography and central size tokens in both themes', async ({ page }) => {
  await page.goto('/tools');
  const demo = page.locator('.pg-tools-wave-demo');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    const sizes = await demo.evaluate(root => {
      const el = selector => root.querySelector(selector);
      const css = selector => getComputedStyle(el(selector));
      const waveLabel = css('.pg-tools-wave-demo__heading');
      const sliderLabel = css('.pg-slider__label');
      const waveValue = css('.pg-tools-wave-demo__percent');
      const sliderValue = css('.pg-slider__value');
      const tokens = getComputedStyle(root);
      return {
        waveActive: css('.pg-wave-progress__wave').backgroundColor,
        sliderActive: css('.pg-slider__active').backgroundColor,
        handleColor: css('.pg-slider__handle').backgroundColor,
        waveRest: css('.pg-wave-progress__rest').backgroundColor,
        sliderRest: css('.pg-slider__inactive').backgroundColor,
        waveLabel: { color: waveLabel.color, size: waveLabel.fontSize, weight: waveLabel.fontWeight },
        sliderLabel: { color: sliderLabel.color, size: sliderLabel.fontSize, weight: sliderLabel.fontWeight },
        waveValue: { color: waveValue.color, size: waveValue.fontSize, weight: waveValue.fontWeight },
        sliderValue: { color: sliderValue.color, size: sliderValue.fontSize, weight: sliderValue.fontWeight },
        activeHeight: css('.pg-slider__active').height,
        inactiveHeight: css('.pg-slider__inactive').height,
        handleHeight: css('.pg-slider__handle').height,
        hitHeight: css('.pg-slider__input').height,
        compactSize: tokens.getPropertyValue('--pg-compact-control-size').trim(),
      };
    });
    expect(sizes.waveActive).not.toBe(sizes.sliderActive);
    expect(sizes.handleColor).toBe(sizes.sliderActive);
    expect(sizes.waveRest).not.toBe(sizes.sliderRest);
    expect(sizes.waveLabel).toEqual(sizes.sliderLabel);
    expect(sizes.waveValue).toEqual(sizes.sliderValue);
    expect(sizes.handleHeight).toBe(sizes.compactSize);
    expect(sizes.handleHeight).toBe('32px');
    expect(sizes.activeHeight).toBe('16px');
    expect(sizes.inactiveHeight).toBe('10px');
    expect(sizes.hitHeight).toBe('48px');
  }
});
