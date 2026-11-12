/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MATERIAL 3 BUTTON LOADING E2E                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє нову форму Loading на існуючій Button без другого індикатора.                ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, /tools, src/ui/button/button.js і button.css.                               ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                                           ║
 * ║ ПРИНЦИП: Центрований морфінг, без layout shift; навігаційне кільце лишається самостійним.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('loading replaces label with animated Material-inspired shape without moving existing button', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
  const state = await page.evaluate(async () => {
    const { setButtonLoading } = await import('/src/ui/button/button.js');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pg-button pg-button--primary';
    button.textContent = 'Зберегти';
    button.style.setProperty('--pg-button-loading-ink', 'hotpink');
    document.body.append(button);
    let activations = 0;
    button.addEventListener('click', () => { activations++; });
    const firstChild = button.firstChild;
    const before = button.getBoundingClientRect();
    const ink = getComputedStyle(button).color;
    const original = button.getAttribute('aria-label');
    setButtonLoading(button, true);
    setButtonLoading(button, true);
    const during = button.getBoundingClientRect();
    const shape = getComputedStyle(button, '::after');
    const busy = {
      state: button.dataset.pgLoading,
      accessibleName: button.getAttribute('aria-label'),
      ariaBusy: button.getAttribute('aria-busy'),
      ariaDisabled: button.getAttribute('aria-disabled'),
      width: shape.width,
      height: shape.height,
      left: shape.left,
      top: shape.top,
      content: shape.content,
      clip: shape.clipPath,
      background: shape.backgroundColor,
      backgroundImage: shape.backgroundImage,
      animations: shape.animationName,
      animationDurations: shape.animationDuration,
      staticChildren: button.firstChild === firstChild,
      sameWidth: before.width === during.width,
      sameHeight: before.height === during.height,
    };
    button.click();
    setButtonLoading(button, false);
    const recovered = {
      actions: activations,
      busy: button.hasAttribute('data-pg-loading'),
      ariaBusy: button.hasAttribute('aria-busy'),
      ariaDisabled: button.hasAttribute('aria-disabled'),
      label: button.getAttribute('aria-label'),
      ink: button.style.getPropertyValue('--pg-button-loading-ink'),
      sameChild: button.firstChild === firstChild,
      visible: getComputedStyle(button).color === ink,
    };
    button.remove();
    return { busy, recovered, original };
  });

  expect(state.busy.state).toBe('true');
  expect(state.busy.accessibleName).toBe('Зберегти');
  expect(state.busy.ariaBusy).toBe('true');
  expect(state.busy.ariaDisabled).toBe('true');
  expect(state.busy.width).toBe('22px');
  expect(state.busy.height).toBe('22px');
  expect(state.busy.left).toBe('50%');
  expect(state.busy.top).toBe('50%');
  expect(state.busy.content).toBe('""');
  expect(state.busy.clip).toMatch(/^polygon\(/);
  expect(state.busy.backgroundImage).toBe('none');
  expect(state.busy.animations).toContain('pg-button-loading-morph');
  expect(state.busy.animations).toContain('pg-button-loading-turn');
  expect(state.busy.staticChildren).toBe(true);
  expect(state.busy.sameWidth).toBe(true);
  expect(state.busy.sameHeight).toBe(true);
  expect(state.recovered).toEqual({
    actions: 0,
    busy: false,
    ariaBusy: false,
    ariaDisabled: false,
    label: null,
    ink: 'hotpink',
    sameChild: true,
    visible: true,
  });
  expect(state.original).toBeNull();
});

test('mini button uses a smaller centered shape, keeping its icon node, original label and size', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
  const state = await page.evaluate(async () => {
    const { createIconButton, setButtonLoading } = await import('/src/ui/button/button.js');
    const button = createIconButton({
      label: 'Шукати', icon: 'search', variant: 'mini',
    });
    document.body.append(button);
    const icon = button.firstElementChild;
    const normalColor = getComputedStyle(button).color;
    const before = button.getBoundingClientRect();
    setButtonLoading(button, true);
    const during = button.getBoundingClientRect();
    const shape = getComputedStyle(button, '::after');
    const hidden = getComputedStyle(icon).visibility;
    const values = {
      width: shape.width, height: shape.height,
      hidden, name: button.getAttribute('aria-label'),
      ink: shape.backgroundColor,
      normalColor,
      sameWidth: before.width === during.width,
      sameHeight: before.height === during.height,
    };
    setButtonLoading(button, false);
    values.iconRestored = button.firstElementChild === icon;
    values.labelRestored = button.getAttribute('aria-label') === 'Шукати';
    values.visibleAgain = getComputedStyle(icon).visibility === 'visible';
    button.remove();
    return values;
  });
  expect(state.width).toBe('18px');
  expect(state.height).toBe('18px');
  expect(state.hidden).toBe('hidden');
  expect(state.name).toBe('Шукати');
  expect(state.ink).toBe(state.normalColor);
  expect(state.sameWidth).toBe(true);
  expect(state.sameHeight).toBe(true);
  expect(state.iconRestored).toBe(true);
  expect(state.labelRestored).toBe(true);
  expect(state.visibleAgain).toBe(true);
});

test('reduced motion keeps a static, centered shape and withButtonLoading recovers after rejected task', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  const state = await page.evaluate(async () => {
    const { withButtonLoading } = await import('/src/ui/button/button.js');
    const button = document.createElement('button');
    button.className = 'pg-button pg-button--outline';
    button.textContent = 'Перевірити';
    document.body.append(button);
    let motion;
    let caught = false;
    try {
      await withButtonLoading(button, async () => {
        const shape = getComputedStyle(button, '::after');
        motion = { animationName: shape.animationName, transform: shape.transform,
          clip: shape.clipPath, busy: button.getAttribute('aria-busy') };
        throw new Error('Expected rejection');
      });
    } catch (error) { caught = error.message === 'Expected rejection'; }
    const restored = !button.hasAttribute('data-pg-loading') &&
      !button.hasAttribute('aria-busy') && button.textContent === 'Перевірити';
    button.remove();
    return { motion, caught, restored };
  });
  expect(state.motion.animationName).toBe('none');
  expect(state.motion.transform).not.toBe('none');
  expect(state.motion.clip).toMatch(/^polygon\(/);
  expect(state.motion.busy).toBe('true');
  expect(state.caught).toBe(true);
  expect(state.restored).toBe(true);
});

test('navigator keeps the existing determinate gesture ring, not loading shapes', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Переходи' }).click();
  await expect(page.locator('.pg-section-navigator__ring-fill').first()).toHaveAttribute('pathLength', '100');
  await expect(page.locator('.pg-section-navigator__handle[data-pg-loading]')).toHaveCount(0);
});
