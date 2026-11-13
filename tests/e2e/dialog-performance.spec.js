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

test('large dialog fades instead of scaling over the same blurred backdrop', async ({ page }) => {
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
      width: rect.width,
      height: rect.height,
    };
  });
  expect(style.transform).toBe('none');
  expect(style.transitionProperty).toBe('opacity');
  expect(style.transitionDuration).toBe('0.12s');
  // Workspace no longer live-blurs the occluded full viewport.
  expect(style.blur).toBe('none');
  const blurMargins = page.locator('.pg-dialog__blur-margins');
  await expect(blurMargins).toHaveCount(1);
  await expect(blurMargins.locator('.pg-dialog__blur-margin-side')).toHaveCount(2);
  expect(await blurMargins.evaluate(node => ({
    top: getComputedStyle(node, '::before').backdropFilter,
    bottom: getComputedStyle(node, '::after').backdropFilter,
    left: getComputedStyle(node.querySelector('[data-pg-side="left"]')).backdropFilter,
    right: getComputedStyle(node.querySelector('[data-pg-side="right"]')).backdropFilter,
  }))).toEqual({top:'blur(8px)', bottom:'blur(8px)', left:'blur(8px)', right:'blur(8px)'});
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
