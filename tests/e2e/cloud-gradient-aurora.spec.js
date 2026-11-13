/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — AURORA CLOUD GRADIENT E2E                                                        ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Три semantic tones, 30 FPS budget, Dialog pause/release, login regression.          ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared CloudGradient, existing Dialog and tools demo.                    ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/cloud-gradient-aurora.spec.js.                                          ║
 * ║ ПРИНЦИП: Aurora is opt-in, while login Cloud stays on its original shader.                       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Aurora preview reuses the shared Dialog and preserves original CSS demo', async ({ page }) => {
  await page.goto('/tools');
  const cssTrigger = page.locator('#pg-tools-panel-tables [data-pg-action="animated-gradient-demo"]');
  const auroraTrigger = page.locator('#pg-tools-panel-tables [data-pg-action="aurora-gradient-demo"]');
  await expect(cssTrigger).toBeVisible();
  await expect(auroraTrigger).toBeVisible();

  await auroraTrigger.click();
  const modal = page.getByRole('dialog', { name: 'Aurora — триколірний градієнт' });
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute('data-pg-presentation', 'edge-to-edge');
  await expect(modal.locator('.pg-dialog__header, .pg-dialog__footer')).toHaveCount(0);
  await expect(modal.locator('.pg-animated-gradient__title')).toHaveText('pinguinV6');
  await expect(modal.locator('.pg-animated-gradient')).toHaveCount(0);

  const cloud = modal.locator('.pg-cloud-gradient');
  await expect(cloud).toHaveAttribute('data-pg-variant', 'aurora');
  await expect(cloud).toHaveAttribute('aria-hidden', 'true');
  await expect(cloud.locator('canvas')).toHaveCount(1);
  const dimensions = await cloud.evaluate(el => {
    const canvas = el.querySelector('canvas');
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      width: canvas.width, height: canvas.height,
      surfaceWidth: rect.width, surfaceHeight: rect.height,
      mode: el.dataset.pgRenderer,
      fallback: style.backgroundImage,
    };
  });
  expect(dimensions.width).toBeLessThanOrEqual(768);
  expect(dimensions.height).toBeLessThanOrEqual(480);
  if (dimensions.mode === 'webgl') {
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.surfaceWidth * .75 + 1);
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.surfaceHeight * .75 + 1);
  } else {
    expect(dimensions.fallback.match(/radial-gradient\(/g)).toHaveLength(2);
  }
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(auroraTrigger).toBeFocused();
  await cssTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Анімований градієнт' })
    .locator('.pg-animated-gradient')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('Aurora limits WebGL draws and stops while obscured by a native Dialog', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createCloudGradient } = await import('/src/ui/cloud-gradient/cloud-gradient.js');
    const cloud = createCloudGradient({ variant: 'aurora' });
    cloud.element.classList.add('pg-test-aurora');
    cloud.element.style.width = '440px';
    cloud.element.style.height = '320px';
    document.querySelector('#pg-tools-panel-tables').append(cloud.element);
    cloud.mount();
    window.__auroraTestController = cloud; // Test-owned reference only.
  });
  const layer = page.locator('#pg-tools-panel-tables > .pg-test-aurora');
  await layer.scrollIntoViewIfNeeded();
  await expect(layer).toHaveAttribute('data-pg-variant', 'aurora');

  const stats = () => page.evaluate(() => window.__auroraTestController.getStats());
  const initial = await stats();
  expect(initial.width).toBeLessThanOrEqual(330);
  expect(initial.height).toBeLessThanOrEqual(240);
  if (initial.renderer === 'webgl') {
    await expect(layer).toHaveAttribute('data-pg-motion', 'running');
    const start = await stats();
    const startTime = Date.now();
    await page.waitForTimeout(550);
    const end = await stats();
    const seconds = (Date.now() - startTime) / 1000;
    expect(end.framesRendered - start.framesRendered)
      .toBeLessThanOrEqual(Math.ceil(seconds * 30) + 3);
    expect(end.framesRendered).toBeGreaterThan(start.framesRendered);
  }

  await page.evaluate(async () => {
    const { showDialog } = await import('/src/ui/dialog/dialog.js');
    const text = document.createElement('p');
    text.textContent = 'Перевірка паузи';
    void showDialog({ title: 'Тест фону', content: text });
  });
  const modal = page.getByRole('dialog', { name: 'Тест фону' });
  await expect(modal).toBeVisible();
  await expect(layer).toHaveAttribute('data-pg-motion', 'paused');
  const pausedFrames = (await stats()).framesRendered;
  await page.waitForTimeout(350);
  expect((await stats()).framesRendered).toBe(pausedFrames);

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  if (initial.renderer === 'webgl') {
    await expect(layer).toHaveAttribute('data-pg-motion', 'running');
  }
  await page.evaluate(() => {
    window.__auroraTestController.destroy();
    delete window.__auroraTestController;
  });
  await expect(layer).toHaveCount(0);
});

test('reduced motion keeps a static Aurora frame with no active animation loop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await page.locator('[data-pg-action="aurora-gradient-demo"]').click();
  const modal = page.getByRole('dialog', { name: 'Aurora — триколірний градієнт' });
  const cloud = modal.locator('.pg-cloud-gradient');
  await expect(cloud).toHaveAttribute('data-pg-motion', 'paused');
  await expect(cloud).toHaveAttribute('data-pg-variant', 'aurora');
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});

test('login cloud remains the original one-tone mode', async ({ page }) => {
  await page.goto('/login-demo');
  const cloud = page.locator('.pg-cloud-gradient');
  await expect(cloud).toHaveAttribute('data-pg-variant', 'cloud');
  await expect(cloud.locator('canvas')).toHaveCount(1);
  expect(await cloud.evaluate(node =>
    node.style.getPropertyValue('--pg-cloud-gradient-glow').trim()))
    .toBe('var(--pg-tone-tertiary-base)');
  await expect(page.getByRole('form', { name: 'Демонстрація входу' })
    .locator('.pg-input')).toHaveCount(2);
});
