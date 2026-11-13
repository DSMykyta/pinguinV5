/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ANIMATED GRADIENT E2E                                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє суцільний колір без смуг, контурів і зайвих шарів.           ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared Dialog, tools/animated-gradient-demo.             ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/animated-gradient.spec.js.                               ║
 * ║ ПРИНЦИП: Тільки один існуючий компонент, 6 полів і рідна модальна механіка.        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Tables shows a smooth three-tone field, without stripes, geometric blobs or SVG noise', async ({ page }) => {
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
  await expect(gradient.locator('.pg-animated-gradient__glow')).toHaveCount(6);
  await expect(gradient.locator('svg, .pg-animated-gradient__grain')).toHaveCount(0);

  const geometry = await gradient.evaluate(el => {
    const surfaceStyle = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const tones = ['main', 'secondary', 'tertiary'];
    const fields = tones.flatMap(tone => [...el.querySelectorAll('.pg-animated-gradient__glow--' + tone)].map(glow => {
      const style = getComputedStyle(glow);
      return {
        tone, field: glow.dataset.pgField,
        x: Math.round(parseFloat(style.left) / box.width * 100),
        y: Math.round(parseFloat(style.top) / box.height * 100),
        width: parseFloat(style.width) / box.width,
        filter: style.filter,
        clip: style.clipPath,
        radius: style.borderRadius,
        image: style.backgroundImage,
        animation: style.animationName,
        ink: style.getPropertyValue('--pg-gradient-field-color').trim(),
        semantic: surfaceStyle.getPropertyValue('--pg-tone-' + tone + '-base').trim(),
      };
    }));
    return { backgroundImage: surfaceStyle.backgroundImage, fields };
  });

  expect(geometry.backgroundImage).toBe('none'); // No horizontal/vertical stripe layer.
  expect(geometry.fields.map(field => field.tone)).toEqual([
    'main', 'main', 'secondary', 'secondary', 'tertiary', 'tertiary',
  ]);
  expect(geometry.fields.map(field => field.field)).toEqual(['a','b','a','b','a','b']);
  for (const field of geometry.fields) {
    expect(field.width).toBeCloseTo(1.15, 1);
    expect(field.ink).toBe(field.semantic);
    expect(field.filter).toBe('none');
    expect(field.clip).toBe('none');
    expect(field.radius).toBe('0px');
    expect(field.image).toContain('radial-gradient');
    expect(field.animation).toMatch(/^pg-gradient-cloud-drift-[ab]$/);
  }
  // Scattered in both dimensions, not arranged as three bands.
  expect(new Set(geometry.fields.map(field => field.x)).size).toBeGreaterThan(3);
  expect(new Set(geometry.fields.map(field => field.y)).size).toBeGreaterThan(3);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Reduced motion keeps the continuous colors while disabling decorative motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const dialog = page.getByRole('dialog');
  const fields = dialog.locator('.pg-animated-gradient__glow');
  await expect(fields).toHaveCount(6);
  for (const field of await fields.all()) await expect(field).toHaveCSS('animation-name', 'none');
  const surface = dialog.locator('.pg-animated-gradient');
  await expect(surface).toHaveCSS('background-image', 'none');
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
});

test('Dialog pauses the animated color fields behind it and restores them on close', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Таблиці' }).click();

  await page.evaluate(async () => {
    const { createAnimatedGradient } = await import('/src/ui/animated-gradient/animated-gradient.js');
    document.querySelector('#pg-tools-panel-tables')
      .append(createAnimatedGradient({ text: 'background' }));
  });
  const background = page.locator('#pg-tools-panel-tables > .pg-animated-gradient');
  const backgroundGlow = background.locator('.pg-animated-gradient__glow--main').first();
  await expect(backgroundGlow).toHaveCSS('animation-play-state', 'running');

  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const dialog = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect(dialog).toBeVisible();
  await expect(backgroundGlow).toHaveCSS('animation-play-state', 'paused');
  await expect(dialog.locator('.pg-animated-gradient__glow--main').first()).toHaveCSS('animation-play-state', 'running');

  const focusGuard = await page.evaluate(() => {
    const modal = document.querySelector('dialog.pg-dialog[open]');
    document.querySelector('#app button').focus();
    return modal.contains(document.activeElement);
  });
  expect(focusGuard).toBe(true);

  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(backgroundGlow).toHaveCSS('animation-play-state', 'running');
});
