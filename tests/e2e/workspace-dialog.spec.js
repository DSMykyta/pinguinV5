/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WORKSPACE DIALOG + SECTION NAVIGATOR E2E                                           ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє справжні Переходи, чотири кути й підказки всередині модального редактора.  ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, /tools, shared Dialog/SectionNavigator/Tooltip.                      ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/workspace-dialog.spec.js.                             ║
 * ║ ПРИНЦИП: Тільки браузерна поведінка; не вводить тестових режимів у production UI.                 ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */
import { test, expect } from '@playwright/test';

async function openEditor(page) {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await page.getByRole('button', { name: 'Редагувати: Aero Pulse' }).click();
  const modal = page.getByRole('dialog', { name: 'Редагування бренду' });
  await expect(modal).toBeVisible();
  return modal;
}

test('editor uses shared Section Navigator and retains the left sidebar as shortcuts', async ({ page }) => {
  const modal = await openEditor(page);
  const navigator = modal.locator('.pg-section-navigator');
  const heading = navigator.locator('.pg-section-navigator__title');
  const nav = modal.locator('.pg-workspace-layout__nav-list');
  await expect(navigator).toHaveCount(1);
  await expect(navigator).toHaveAttribute('data-pg-scroll-container', 'external');
  await expect(heading).toHaveText('Основне');
  await expect(navigator.locator('.pg-section-navigator__handle')).toHaveCount(2);
  await expect(nav.locator('[aria-current="true"]')).toHaveText('Основне');

  const name = modal.getByRole('textbox', { name: 'Назва бренду' });
  await name.fill('Aero Pulse редакція');
  await navigator.locator('[data-pg-direction="next"]').click();
  await expect(heading).toHaveText('Канали продажу');
  await expect(navigator).toHaveAttribute('aria-busy', 'false');
  await expect(nav.locator('[aria-current="true"]')).toHaveText('Канали продажу');
  await nav.getByRole('button', { name: 'Налаштування' }).click();
  await expect(heading).toHaveText('Налаштування');
  await expect(navigator).toHaveAttribute('aria-busy', 'false');
  await nav.getByRole('button', { name: 'Основне' }).click();
  await expect(heading).toHaveText('Основне');
  await expect(name).toHaveValue('Aero Pulse редакція');
});

test('four shared corner buttons remain anchored while sidebar collapses', async ({ page }) => {
  const modal = await openEditor(page);
  const layout = modal.locator('.pg-workspace-layout');
  const actions = ['dialog-refresh', 'dialog-dismiss', 'dialog-delete', 'dialog-confirm'];
  for (const action of actions) {
    const button = modal.locator('[data-pg-action="' + action + '"]');
    await expect(button).toHaveClass(/pg-icon-button--corner/);
    expect((await button.textContent()).trim()).toBe('');
  }
  await expect(layout).toHaveAttribute('data-pg-nav', 'expanded');
  await modal.getByRole('button', { name: 'Згорнути навігацію' }).click();
  await expect(layout).toHaveAttribute('data-pg-nav', 'collapsed');
  await expect(modal.locator('.pg-section-navigator')).toHaveCount(1);
  const corners = await modal.evaluate(root => {
    const box = action => {
      const rect = root.querySelector('[data-pg-action="' + action + '"]').getBoundingClientRect();
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    };
    return {
      refresh: box('dialog-refresh'), close: box('dialog-dismiss'),
      remove: box('dialog-delete'), save: box('dialog-confirm'),
    };
  });
  expect(corners.refresh.left).toBeLessThan(corners.close.left);
  expect(corners.remove.left).toBeLessThan(corners.save.left);
  expect(corners.refresh.top).toBeLessThan(corners.remove.top);
  expect(corners.close.top).toBeLessThan(corners.save.top);
});

test('modal tooltips occupy the browser top layer and background hints cannot appear', async ({ page }) => {
  const modal = await openEditor(page);
  await expect(modal).toHaveAttribute('open', '');
  const close = modal.locator('[data-pg-action="dialog-dismiss"]');
  await close.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText('Закрити діалог');
  const state = await tooltip.evaluate(element => ({
    inModal: Boolean(element.closest('dialog')),
    inTopLayer: element.matches(':popover-open'),
  }));
  expect(state).toEqual({ inModal: true, inTopLayer: true });
  // Native showModal renders the background inert. No tooltip may resurrect
  // from the global Shell while this dialog remains open.
  await page.mouse.move(1, 1);
  await expect(tooltip).toHaveCount(0);
  await expect(modal).toBeVisible();
});

test('edge-wheel transitions stay local to the editor workspace', async ({ page }) => {
  const modal = await openEditor(page);
  const canvas = modal.locator('.pg-workspace-layout__canvas');
  const navigator = modal.locator('.pg-section-navigator');
  await canvas.evaluate(node => {
    node.scrollTop = node.scrollHeight;
    for (let i = 0; i < 3; i++) {
      node.dispatchEvent(new WheelEvent('wheel', { deltaY: 85, cancelable: true, bubbles: true }));
    }
  });
  await expect(navigator.locator('.pg-section-navigator__title')).toHaveText('Канали продажу');
  await expect(navigator).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.pg-shell')).toBeVisible();
});

test('saving from the modal persists the test record without changing the global Shell', async ({ page }) => {
  const modal = await openEditor(page);
  await modal.getByRole('textbox', { name: 'Назва бренду' }).fill('Aero Pulse — змінено');
  await modal.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Редагувати: Aero Pulse — змінено' })).toHaveCount(1);
});
