/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TWO RADIAL CSS GRADIENTS E2E                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Main base + two independently moving 200% radial fields; three demo motions.      ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, existing Dialog, ButtonGroup and AnimatedGradient.                       ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                                         ║
 * ║ ПРИНЦИП: Two CSS pseudolayers; no Canvas, noise, JS animation loops or new modal.                ║
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

test('pinguinV6 uses two independent oversized soft radial color fields with no noise', async ({ page }) => {
  const { trigger, modal, gradient } = await openGradient(page);

  await expect(modal).toHaveAttribute('data-pg-presentation', 'edge-to-edge');
  await expect(modal.locator('.pg-dialog__header, .pg-dialog__footer')).toHaveCount(0);
  await expect(gradient.locator('.pg-animated-gradient__title')).toHaveText('pinguinV6');
  await expect(gradient).toHaveAttribute('data-pg-preset', 'light');
  await expect(gradient.locator('canvas, svg, .pg-animated-gradient__grain, .pg-animated-gradient__glow')).toHaveCount(0);
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();

  const style = await gradient.evaluate(node => {
    const root = getComputedStyle(node);
    const layer = getComputedStyle(node, '::before');
    const other = getComputedStyle(node, '::after');
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
      tertiaryGradient: other.backgroundImage,
      blur: layer.filter,
      tertiaryBlur: other.filter,
      inset: [layer.top, layer.right, layer.bottom, layer.left],
      tertiaryInset: [other.top, other.right, other.bottom, other.left],
      animationName: layer.animationName,
      tertiaryAnimationName: other.animationName,
      animationDirection: layer.animationDirection,
      animationIterationCount: layer.animationIterationCount,
      animationPlayState: layer.animationPlayState,
      tertiaryPlayState: other.animationPlayState,
      backgroundImage: root.backgroundImage,
    };
  });

  expect(style.base).toBe(style.computedMain);
  expect(style.gradient.match(/radial-gradient\(/g)).toHaveLength(1);
  expect(style.tertiaryGradient.match(/radial-gradient\(/g)).toHaveLength(1);
  expect(style.gradient).not.toContain('var(');
  expect(style.secondary).toBeTruthy();
  expect(style.tertiary).toBeTruthy();
  expect(style.backgroundImage).toBe('none');
  expect(style.blur).toBe('none');
  expect(style.tertiaryBlur).toBe('none');
  expect(style.animationName).toBe('pg-gradient-travel-secondary');
  expect(style.tertiaryAnimationName).toBe('pg-gradient-travel-tertiary');
  expect(style.animationDirection).toBe('normal');
  expect(style.animationIterationCount).toBe('infinite');
  expect(style.animationPlayState).toBe('running');
  expect(style.tertiaryPlayState).toBe('running');
  const halfHeight = (await gradient.boundingBox()).height * .5;
  // Both layers extend 50% beyond each edge; the old version was only 20%.
  expect(parseFloat(style.inset[0])).toBeCloseTo(-halfHeight, 0);
  expect(parseFloat(style.tertiaryInset[0])).toBeCloseTo(-halfHeight, 0);

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
        otherAnimation: getComputedStyle(node, '::after').animationName,
        base: css.backgroundColor,
      };
    }));
  }
  expect(new Set(results.map(item => item.duration)).size).toBe(3);
  expect(results.map(item => item.animation)).toEqual([
    'pg-gradient-breathe-secondary', 'pg-gradient-travel-secondary', 'pg-gradient-orbit-secondary',
  ]);
  expect(results.map(item => item.otherAnimation)).toEqual([
    'pg-gradient-breathe-tertiary', 'pg-gradient-travel-tertiary', 'pg-gradient-orbit-tertiary',
  ]);
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
    const other = getComputedStyle(node, '::after');
    return { animationName: layer.animationName, gradient: layer.backgroundImage,
      otherAnimation: other.animationName, otherGradient: other.backgroundImage,
      filter: layer.filter, transform: layer.transform, willChange: layer.willChange };
  });
  expect(style.animationName).toBe('none');
  expect(style.gradient.match(/radial-gradient\(/g)).toHaveLength(1);
  expect(style.otherGradient.match(/radial-gradient\(/g)).toHaveLength(1);
  expect(style.otherAnimation).toBe('none');
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
  await expect.poll(() => bg.evaluate(node => [
    getComputedStyle(node, '::before').animationPlayState,
    getComputedStyle(node, '::after').animationPlayState,
  ])).toEqual(['paused', 'paused']);
  await expect.poll(() => modal.locator('.pg-animated-gradient').evaluate(node => [
    getComputedStyle(node, '::before').animationPlayState,
    getComputedStyle(node, '::after').animationPlayState,
  ])).toEqual(['running', 'running']);
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
  await expect.poll(() => bg.evaluate(node => getComputedStyle(node, '::before').animationPlayState))
    .toBe('running');
});

test('two hues cross the surface independently instead of moving as a single slab', async ({ page }) => {
  const { modal, gradient } = await openGradient(page);
  const positions = await gradient.evaluate(node => {
    const read = part => getComputedStyle(node, part).transform;
    return [read('::before'), read('::after')];
  });
  await page.waitForTimeout(450);
  const moved = await gradient.evaluate(node => {
    const read = part => getComputedStyle(node, part).transform;
    return [read('::before'), read('::after')];
  });
  expect(moved[0]).not.toBe(positions[0]);
  expect(moved[1]).not.toBe(positions[1]);
  expect(moved[0]).not.toBe(moved[1]);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
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
