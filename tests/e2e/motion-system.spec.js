/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED MOTION CHANNELS E2E                                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Захищає motion tokens, existing timings і reduced motion у спільних компонентах.       ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, /tools, Button Group, SegmentSwitch, RevealPanel, FAB.                    ║
 * ║ ПУБЛІЧНИЙ API: Browser E2E tests.                                                                  ║
 * ║ ПРИНЦИП: Зміна токенів не повинна змінити затверджені тривалості та траєкторії.                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('spatial and effects tokens preserve old aliases and existing component timing', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const values = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const get = key => root.getPropertyValue('--pg-' + key).trim();
    const geometry = getComputedStyle(document.querySelector('.pg-tabs__nav .pg-button--group'));
    const plate = getComputedStyle(document.querySelector('.pg-view-switch .pg-segment-switch__plate'));
    const fab = getComputedStyle(document.querySelector('.pg-fab__trigger .pg-fab__face'));
    const reveal = getComputedStyle(document.querySelector('.pg-shell__footer-panel'));
    return {
      spatial: get('motion-spatial-normal-duration'),
      effects: get('motion-effects-normal-duration'),
      oldSpatial: get('duration-layout'),
      oldEffects: get('duration-normal'),
      spatialEase: get('motion-spatial-ease'),
      oldSpatialEase: get('ease-layout'),
      effectsEase: get('motion-effects-ease'),
      oldEffectsEase: get('ease'),
      groupProperties: geometry.transitionProperty,
      groupDurations: geometry.transitionDuration,
      groupEase: geometry.transitionTimingFunction,
      plateDuration: plate.transitionDuration,
      fabDuration: fab.transitionDuration,
      revealDuration: reveal.transitionDuration,
    };
  });
  expect(values.spatial).toBe('340ms');
  expect(values.effects).toBe('210ms');
  expect(values.oldSpatial).toBe(values.spatial);
  expect(values.oldEffects).toBe(values.effects);
  expect(values.spatialEase).toBe(values.oldSpatialEase);
  expect(values.effectsEase).toBe(values.oldEffectsEase);
  expect(values.groupProperties).toContain('border-radius');
  expect(values.groupDurations).toBe('0.21s, 0.21s, 0.34s, 0.15s, 0.15s');
  expect(values.plateDuration).toBe('0.28s');
  expect(values.fabDuration).toBe('0.34s');
  expect(values.revealDuration).toBe('0.34s, 0.21s');
});

test('reduced motion removes group and switch transitions while leaving layout functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const group = page.locator('.pg-tabs__nav .pg-button--group').first();
  const plate = page.locator('.pg-view-switch .pg-segment-switch__plate');
  await expect(group).toHaveCSS('transition-property', 'none');
  await expect(plate).toHaveCSS('transition-property', 'none');
  await page.getByRole('tab', { name: 'Медіатека' }).click();
  await expect(page.locator('#pg-tools-panel-media-library')).toBeVisible();
});
