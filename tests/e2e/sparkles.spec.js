/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SPARKLES E2E                                                       ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: CSS-шари, перемикач видимості, циклічність і reduced-motion.         ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Tools demo, Sparkles and existing Switch.                ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                          ║
 * ║ ПРИНЦИП: Перевіряє один декоративний DOM-вузол без JS-частинок і Canvas.          ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function openSparkles(page) {
  await page.goto('/tools');
  await page.locator('#pg-tools-panel-tables [data-pg-action="animated-gradient-demo"]').click();
  const dialog = page.getByRole('dialog', { name: 'Анімований градієнт' });
  const switchControl = dialog.getByRole('switch', { name: 'Іскри' });
  const sparkles = dialog.locator('.pg-sparkles');
  return { dialog, switchControl, sparkles };
}

test('three tiny radial-gradient grids are toggled by the existing switch', async ({ page }) => {
  const { dialog, switchControl, sparkles } = await openSparkles(page);
  await expect(sparkles).toHaveCount(1);
  await expect(sparkles).toHaveAttribute('aria-hidden', 'true');
  await expect(sparkles).toBeHidden();
  await expect(switchControl).not.toBeChecked();

  await switchControl.check();
  await expect(sparkles).toBeVisible();
  const css = await sparkles.evaluate(node => {
    const style = getComputedStyle(node);
    return {
      images: style.backgroundImage,
      sizes: style.backgroundSize,
      positions: style.backgroundPosition,
      duration: style.animationDuration,
      timing: style.animationTimingFunction,
      iteration: style.animationIterationCount,
      animationName: style.animationName,
      pointerEvents: style.pointerEvents,
    };
  });
  expect(css.images.match(/radial-gradient\(/g)).toHaveLength(3);
  expect(css.sizes).toBe('60px 60px, 90px 90px, 140px 140px');
  // Animated background-position changes on every frame: check layer count,
  // not an arbitrary timestamp. Exact loop endpoints are tested below.
  expect(css.positions.split(',')).toHaveLength(3);
  expect(css.duration).toBe('12s');
  expect(css.timing).toBe('linear');
  expect(css.iteration).toBe('infinite');
  expect(css.animationName).toBe('pg-sparkles-drift');
  expect(css.pointerEvents).toBe('none');
  await switchControl.uncheck();
  await expect(sparkles).toBeHidden();
  await dialog.locator('[data-pg-action="dialog-dismiss"]').click();
});

test('sparkles remain static in reduced-motion and can be composed independently', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { dialog, switchControl, sparkles } = await openSparkles(page);
  await switchControl.check();
  await expect(sparkles).toBeVisible();
  expect(await sparkles.evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await dialog.locator('[data-pg-action="dialog-dismiss"]').click();

  const independent = await page.evaluate(async () => {
    const { createSparkles } = await import('/src/ui/sparkles/sparkles.js');
    const surface = document.createElement('div');
    surface.style.position = 'relative';
    surface.style.width = '160px';
    surface.style.height = '160px';
    document.body.append(surface);
    const instance = createSparkles({ visible: true });
    surface.append(instance.element);
    const result = {
      count: surface.querySelectorAll('.pg-sparkles').length,
      visible: instance.getVisible(),
    };
    instance.setVisible(false);
    result.hidden = instance.element.hidden;
    instance.destroy();
    result.removed = surface.querySelector('.pg-sparkles') === null;
    surface.remove();
    return result;
  });
  expect(independent).toEqual({ count: 1, visible: true, hidden: true, removed: true });
});

test('all layer movements wrap on full tile boundaries', async ({ page }) => {
  const { dialog, switchControl, sparkles } = await openSparkles(page);
  await switchControl.check();
  const result = await sparkles.evaluate(node => {
    const animation = [...node.getAnimations()].find(item => item.effect?.getKeyframes?.().length);
    const frames = animation?.effect.getKeyframes() ?? [];
    const end = frames.at(-1)?.backgroundPosition || '';
    return { end, count: frames.length };
  });
  expect(result.count).toBeGreaterThan(0);
  expect(result.end).toBe('60px 60px, -60px 130px, 210px -120px');
  await dialog.locator('[data-pg-action="dialog-dismiss"]').click();
});
