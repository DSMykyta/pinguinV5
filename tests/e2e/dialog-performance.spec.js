/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DIALOG PERFORMANCE REGRESSION                                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Зберегти швидкі, відтворювані переходи без втрати семантики Workspace/Modal.            ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, /tools, Dialog, WorkspaceLayout, SectionNavigator.                          ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                                           ║
 * ║ ПРИНЦИП: Кодові timings перевіряються через WAAPI, реальний FPS — окремий DevTools профіль.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function openWorkspace(page) {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await page.getByRole('button', { name: 'Редагувати: Aero Pulse' }).click();
  const modal = page.getByRole('dialog', { name: 'Редагувати «Aero Pulse»' });
  await expect(modal).toHaveAttribute('data-pg-state', 'visible');
  return modal;
}

test('large dialog fades over a single static native backdrop', async ({ page }) => {
  const modal = await openWorkspace(page);
  const style = await modal.evaluate(node => {
    const computed = getComputedStyle(node);
    const backdrop = getComputedStyle(node, '::backdrop');
    const rect = node.getBoundingClientRect();
    return {
      transform: computed.transform,
      transitionProperty: computed.transitionProperty,
      transitionDuration: computed.transitionDuration,
      blur: backdrop.backdropFilter,
      background: backdrop.backgroundColor,
      width: rect.width,
      height: rect.height,
    };
  });
  expect(style.transform).toBe('none');
  expect(style.transitionProperty).toBe('opacity');
  expect(style.transitionDuration).toBe('0.12s');
  expect(style.blur).toBe('none');
  expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('.pg-dialog__blur-margins')).toHaveCount(0);
  expect(style.width).toBeGreaterThan(800);
  expect(style.height).toBeGreaterThan(500);
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.pg-dialog__blur-margins')).toHaveCount(0);
});

test('workspace section switching uses the same navigator with responsive 80/130 timings', async ({ page }) => {
  const modal = await openWorkspace(page);
  await page.evaluate(() => {
    const original = Element.prototype.animate;
    window.__pgTimedTransitions = [];
    Element.prototype.animate = function(frames, timing) {
      if (this.classList?.contains('pg-section-navigator__panel')) {
        window.__pgTimedTransitions.push(timing.duration);
      }
      return original.call(this, frames, timing);
    };
    window.__pgRestoreAnimate = () => {
      Element.prototype.animate = original;
      delete window.__pgRestoreAnimate;
    };
  });
  try {
    const layout = modal.locator('.pg-workspace-layout');
    const nav = layout.locator('.pg-workspace-layout__nav-list');
    const field = modal.getByRole('textbox', { name: 'Назва бренду' });
    await field.fill('Aero Pulse fast transition');
    await nav.getByRole('button', { name: 'Канали продажу' }).click();
    await expect(layout.locator('.pg-section-navigator__title')).toHaveText('Канали продажу');
    await expect(layout.locator('.pg-section-navigator')).toHaveAttribute('aria-busy', 'false');
    expect(await page.evaluate(() => window.__pgTimedTransitions)).toEqual([80, 130]);

    await nav.getByRole('button', { name: 'Основне' }).click();
    await expect(layout.locator('.pg-section-navigator')).toHaveAttribute('aria-busy', 'false');
    await expect(field).toHaveValue('Aero Pulse fast transition');
    expect(await page.evaluate(() => window.__pgTimedTransitions)).toEqual([80, 130, 80, 130]);
  } finally {
    await page.evaluate(() => window.__pgRestoreAnimate?.());
  }
});

test('collapsing workspace navigation uses shared 150ms spatial duration without changing geometry', async ({ page }) => {
  const modal = await openWorkspace(page);
  const layout = modal.locator('.pg-workspace-layout');
  const before = await layout.evaluate(node => ({
    transition: getComputedStyle(node).transitionProperty,
    duration: getComputedStyle(node).transitionDuration,
  }));
  expect(before.transition).toBe('grid-template-columns');
  expect(before.duration).toBe('0.15s');
  const toggle = modal.getByRole('button', { name: 'Згорнути меню редактора' });
  await toggle.click();
  await expect(layout).toHaveAttribute('data-pg-nav', 'collapsed');
  await expect(modal.getByRole('button', { name: 'Розгорнути меню редактора' })).toHaveAttribute('aria-expanded', 'false');
  await expect(layout.locator('.pg-section-navigator')).toHaveCount(1);
  await modal.getByRole('button', { name: 'Розгорнути меню редактора' }).click();
  await expect(layout).toHaveAttribute('data-pg-nav', 'expanded');
  await expect(layout.locator('.pg-section-navigator')).toHaveCount(1);
});

test('short dialog still animates subtly and retains native modality', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
  await page.locator('[data-pg-action="dialog-demo-info"]').click();
  const modal = page.getByRole('dialog', { name: 'Інформація' });
  await expect(modal).toHaveAttribute('data-pg-state', 'visible');
  await expect(modal).toHaveCSS('transition-duration', '0.14s, 0.14s');
  await expect(modal).toHaveAttribute('open', '');
  await modal.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(modal).toHaveCount(0);
});

test('reduced motion removes all dialog and section transitions without losing behavior', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const modal = await openWorkspace(page);
  await expect(modal).toHaveCSS('transition-duration', '0s');
  const layout = modal.locator('.pg-workspace-layout');
  await expect(layout).toHaveCSS('transition-duration', '0s');
  await layout.locator('.pg-workspace-layout__nav-list')
    .getByRole('button', { name: 'Канали продажу' }).click();
  await expect(layout.locator('.pg-section-navigator__title')).toHaveText('Канали продажу');
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
});

test('standard, editor and edge-to-edge use one native static backdrop', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showDialog } = await import('/src/ui/dialog/dialog.js');
    for (const size of ['standard', 'editor']) {
      void showDialog({ title: 'Backdrop ' + size, message: 'Test backdrop', size });
    }
    const content = document.createElement('div');
    content.textContent = 'Edge content';
    void showDialog({ title: 'Backdrop edge', presentation: 'edge-to-edge', content });
  });
  for (const size of ['standard', 'editor', 'edge']) {
    const modal = page.getByRole('dialog', { name: 'Backdrop ' + size });
    await expect(modal).toBeVisible();
    const backdrop = await modal.evaluate(node => {
      const style = getComputedStyle(node, '::backdrop');
      return { filter: style.backdropFilter, color: style.backgroundColor };
    });
    expect(backdrop.filter).toBe('none');
    expect(backdrop.color).not.toBe('rgba(0, 0, 0, 0)');
    await expect(page.locator('.pg-dialog__blur-margins')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  }
});

test('frost backdrop uses static theme washes and grain, never live blur', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
  await page.locator('[data-pg-action="dialog-demo-info"]').click();
  const modal = page.getByRole('dialog', { name: 'Інформація' });
  await expect(modal).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    const style = await modal.evaluate(node => {
      const backdrop = getComputedStyle(node, '::backdrop');
      return { image: backdrop.backgroundImage, filter: backdrop.backdropFilter,
        animation: backdrop.animationName, transition: backdrop.transitionDuration,
        duration: backdrop.animationDuration, transitionProperty: backdrop.transitionProperty,
        inset: backdrop.top, size: backdrop.backgroundSize };
    });
    expect(style.image).toMatch(/url\(/);
    expect(style.image.match(/radial-gradient\(/g)).toHaveLength(4);
    expect(style.filter).toBe('none');
    expect(style.animation).toBe('pg-dialog-atmosphere');
    expect(style.duration).toBe('80s');
    expect(style.transitionProperty).toBe('opacity');
    expect(style.transition).toBe('0.21s');
    expect(parseFloat(style.inset)).toBeLessThan(0);
    expect(style.size).toContain('64px 64px');
    expect(await modal.evaluate(node => getComputedStyle(node, '::backdrop').backgroundColor))
      .toBe(theme === 'light' ? 'rgba(21, 27, 33, 0.76)' : 'rgba(17, 22, 27, 0.82)');
  }
  await expect(page.locator('.pg-dialog__blur-margins')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});

test('reduced motion keeps atmospheric backdrop stationary and immediately visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
  await page.locator('[data-pg-action="dialog-demo-info"]').click();
  const modal = page.getByRole('dialog', { name: 'Інформація' });
  await expect(modal).toBeVisible();
  const style = await modal.evaluate(node => {
    const s = getComputedStyle(node, '::backdrop');
    return { animation: s.animationName, transform: s.transform, opacity: s.opacity, transition: s.transitionProperty, filter: s.backdropFilter };
  });
  expect(style).toEqual({ animation: 'none', transform: 'none', opacity: '1', transition: 'none', filter: 'none' });
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
