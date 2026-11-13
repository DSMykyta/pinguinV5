/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TWO RADIAL CSS GRADIENTS E2E                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Main background, secondary/tertiary soft spots and three demo presets.              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, existing Dialog, ButtonGroup and AnimatedGradient.                       ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                                         ║
 * ║ ПРИНЦИП: ONE CSS layer; no Canvas, noise, JS frame callbacks or new modal.                       ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function openGradient(page) {
  await page.goto('/tools');
  const trigger = page.locator('#pg-tools-panel-tables [data-pg-action="animated-gradient-demo"]');
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect(modal).toBeVisible();
  const gradient = modal.locator('.pg-animated-gradient');
  return { trigger, modal, gradient };
}

test('pinguinV6 gradient fills shared Dialog with primary and two radial spots, no noise', async ({ page }) => {
  const { trigger, modal, gradient } = await openGradient(page);

  await expect(modal).toHaveAttribute('data-pg-presentation', 'edge-to-edge');
  await expect(modal.locator('.pg-dialog__header, .pg-dialog__footer')).toHaveCount(0);
  await expect(gradient.locator('.pg-animated-gradient__title')).toHaveText('pinguinV6');
  await expect(gradient).toHaveAttribute('data-pg-preset', 'dawn');
  await expect(gradient.locator('canvas, svg, .pg-animated-gradient__grain, .pg-animated-gradient__glow')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();

  const style = await gradient.evaluate(node => {
    const root = getComputedStyle(node);
    const layer = getComputedStyle(node, '::before');
    return {
      base: root.backgroundColor,
      main: root.getPropertyValue('--pg-tone-main-base').trim(),
      computedMain: (() => {
        const probe = document.createElement('span');
        probe.style.color = root.getPropertyValue('--pg-tone-main-base').trim();
        node.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      })(),
      secondary: root.getPropertyValue('--pg-tone-secondary-base').trim(),
      tertiary: root.getPropertyValue('--pg-tone-tertiary-base').trim(),
      gradient: layer.backgroundImage,
      blur: layer.filter,
      inset: [layer.top, layer.right, layer.bottom, layer.left],
      animationName: layer.animationName,
      animationDirection: layer.animationDirection,
      animationIterationCount: layer.animationIterationCount,
      animationPlayState: layer.animationPlayState,
      backgroundImage: root.backgroundImage,
    };
  });

  expect(style.base).toBe(style.computedMain);
  expect(style.gradient.match(/radial-gradient\(/g)).toHaveLength(2);
  expect(style.gradient).not.toContain('var(');
  expect(style.secondary).toBeTruthy();
  expect(style.tertiary).toBeTruthy();
  expect(style.backgroundImage).toBe('none');
  expect(style.blur).toBe('blur(60px)');
  expect(style.animationName).toBe('pg-gradient-pulse');
  expect(style.animationDirection).toBe('alternate');
  expect(style.animationIterationCount).toBe('infinite');
  expect(style.animationPlayState).toBe('running');

  const coverage = await gradient.evaluate(node => {
    const a = node.getBoundingClientRect();
    const b = node.closest('dialog').getBoundingClientRect();
    return [Math.abs(a.width - b.width), Math.abs(a.height - b.height),
      Math.abs(a.x - b.x), Math.abs(a.y - b.y)];
  });
  for (const difference of coverage) expect(difference).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('Motion controls select real translate, rotate and pulse effects on the same background', async ({ page }) => {
  const { modal, gradient } = await openGradient(page);
  const group = modal.getByRole('group', { name: 'Тип руху градієнта' });
  await expect(group.getByRole('button')).toHaveCount(3);
  const results = [];
  for (const [name, preset] of [['Пульсація', 'dawn'], ['Переміщення', 'light'], ['Обертання', 'storm']]) {
    await group.getByRole('button', { name }).click();
    await expect(group.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    await expect(gradient).toHaveAttribute('data-pg-preset', preset);
    results.push(await gradient.evaluate(node => {
      const css = getComputedStyle(node);
      const layer = getComputedStyle(node, '::before');
      return {
        duration: layer.animationDuration,
        animation: layer.animationName,
        spotX: css.getPropertyValue('--pg-gradient-secondary-x').trim(),
        spotY: css.getPropertyValue('--pg-gradient-tertiary-y').trim(),
        base: css.backgroundColor,
      };
    }));
  }
  expect(new Set(results.map(item => item.duration)).size).toBe(3);
  expect(results.map(item => item.animation)).toEqual([
    'pg-gradient-pulse', 'pg-gradient-translate', 'pg-gradient-rotate',
  ]);
  expect(new Set(results.map(item => item.spotX)).size).toBe(3);
  expect(results.every(item => item.base === results[0].base)).toBe(true);
  await expect(gradient.locator('canvas, svg')).toHaveCount(0);
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
});

test('reduced-motion stops drift but preserves the same two spots and solid base', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { modal, gradient } = await openGradient(page);
  const style = await gradient.evaluate(node => {
    const layer = getComputedStyle(node, '::before');
    return { animationName: layer.animationName, gradient: layer.backgroundImage,
      filter: layer.filter, transform: layer.transform, willChange: layer.willChange };
  });
  expect(style.animationName).toBe('none');
  expect(style.gradient.match(/radial-gradient\(/g)).toHaveLength(2);
  expect(style.transform).toBe('none');
  expect(style.willChange).toBe('auto');
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
});

test('the shared Dialog pauses radial movement in the background, but not inside itself', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createAnimatedGradient } = await import('/src/ui/animated-gradient/animated-gradient.js');
    document.querySelector('#pg-tools-panel-tables').append(createAnimatedGradient({ text: null }));
  });
  const bg = page.locator('#pg-tools-panel-tables > .pg-animated-gradient');
  await expect(bg).toHaveCount(1);
  await expect.poll(() => bg.evaluate(node => getComputedStyle(node, '::before').animationPlayState))
    .toBe('running');

  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const modal = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect.poll(() => bg.evaluate(node => getComputedStyle(node, '::before').animationPlayState))
    .toBe('paused');
  await expect.poll(() => modal.locator('.pg-animated-gradient').evaluate(node =>
    getComputedStyle(node, '::before').animationPlayState)).toBe('running');
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
  await expect.poll(() => bg.evaluate(node => getComputedStyle(node, '::before').animationPlayState))
    .toBe('running');
});

test('the generic edge-to-edge Dialog remains reusable for arbitrary visual content', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showDialog } = await import('/src/ui/dialog/dialog.js');
    const content = document.createElement('div');
    content.textContent = 'Довільний вміст';
    content.style.display = 'grid';
    void showDialog({ title: 'Перегляд матеріалу', presentation: 'edge-to-edge', content });
  });
  const modal = page.getByRole('dialog', { name: 'Перегляд матеріалу' });
  await expect(modal.locator('.pg-dialog__body > div')).toHaveCSS('display', 'grid');
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
