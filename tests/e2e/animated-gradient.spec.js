/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT E2E                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє кнопку у «Таблицях», рух і доступність Dialog.              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared Dialog, tools/animated-gradient-demo.             ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/animated-gradient.spec.js.                               ║
 * ║ ПРИНЦИП: Перевірка реальної інтеграції без тестової підміни модалки.               ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Tables opens the shared dialog with a branded animated gradient', async ({ page }) => {
  await page.goto('/tools');
  const tables = page.locator('#pg-tools-panel-tables');
  const trigger = tables.locator('[data-pg-action="animated-gradient-demo"]');
  await expect(trigger).toBeVisible();
  await expect(page.locator('#pg-tools-panel-text [data-pg-action="animated-gradient-demo"]')).toHaveCount(0);

  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const gradient = dialog.locator('.pg-animated-gradient');
  await expect(gradient.locator('.pg-animated-gradient__title')).toHaveText('pinguin V6');
  await expect(gradient.locator('.pg-animated-gradient__glow')).toHaveCount(3);
  await expect(gradient.locator('.pg-animated-gradient__grain')).toHaveAttribute('aria-hidden', 'true');
  await expect(gradient.locator('.pg-animated-gradient__glow--main')).toHaveCSS('animation-name', 'pg-gradient-main-flow');
  const themeTone = await gradient.evaluate(el => ({
    main: getComputedStyle(el).getPropertyValue('--pg-tone-main-base').trim(),
    secondary: getComputedStyle(el).getPropertyValue('--pg-tone-secondary-base').trim(),
    tertiary: getComputedStyle(el).getPropertyValue('--pg-tone-tertiary-base').trim(),
  }));
  expect(themeTone.main).toBeTruthy();
  expect(themeTone.secondary).toBeTruthy();
  expect(themeTone.tertiary).toBeTruthy();

  // Three same-size morphing spots have color centers at ~1/6, 1/2, 5/6.
  const balance = await gradient.evaluate(surface => {
    const width = surface.getBoundingClientRect().width;
    const colors = ['main', 'secondary', 'tertiary'];
    return colors.map(tone => {
      const glow = surface.querySelector('.pg-animated-gradient__glow--' + tone);
      const style = getComputedStyle(glow);
      return {
        center: (parseFloat(style.left) + parseFloat(style.width) / 2) / width,
        width: parseFloat(style.width) / width,
        ink: style.getPropertyValue('--pg-gradient-blob-color').trim(),
        semantic: getComputedStyle(surface).getPropertyValue('--pg-tone-' + tone + '-base').trim(),
        blur: style.filter,
        animation: style.animationName,
      };
    });
  });
  expect(balance.map(item => Math.round(item.center * 100))).toEqual([17, 50, 83]);
  for (const item of balance) {
    expect(item.width).toBeCloseTo(0.56, 1);
    expect(item.ink).toBe(item.semantic);
    expect(item.blur).toBe('blur(24px)');
    expect(item.animation).toMatch(/^pg-gradient-/);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Reduced motion stops background and grain while dialog remains usable on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.pg-animated-gradient__glow--main')).toHaveCSS('animation-name', 'none');
  await expect(dialog.locator('.pg-animated-gradient__grain')).toHaveCSS('animation-name', 'none');
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
});

test('open Dialog pauses Shell animations and background placeholder rotation, then restores them', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Таблиці' }).click();

  // A real, independent instance in the Shell: no production test-mode hooks.
  await page.evaluate(async () => {
    const { createAnimatedGradient } = await import('/src/ui/animated-gradient/animated-gradient.js');
    document.querySelector('#pg-tools-panel-tables')
      .append(createAnimatedGradient({ text: 'background' }));
  });
  const background = page.locator('#pg-tools-panel-tables > .pg-animated-gradient');
  const backgroundGlow = background.locator('.pg-animated-gradient__glow--main');
  await expect(backgroundGlow).toHaveCSS('animation-play-state', 'running');

  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const dialog = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect(dialog).toBeVisible();
  await expect(backgroundGlow).toHaveCSS('animation-play-state', 'paused');
  await expect(background.locator('.pg-animated-gradient__grain')).toHaveCSS('animation-play-state', 'paused');
  await expect(dialog.locator('.pg-animated-gradient__glow--main')).toHaveCSS('animation-play-state', 'running');

  const focusGuard = await page.evaluate(() => {
    const dialog = document.querySelector('dialog.pg-dialog[open]');
    const behind = document.querySelector('#app button');
    behind.focus();
    return dialog.contains(document.activeElement);
  });
  expect(focusGuard).toBe(true);

  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(backgroundGlow).toHaveCSS('animation-play-state', 'running');
});
