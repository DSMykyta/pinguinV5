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
  const modal = page.getByRole('dialog', { name: 'Редагувати «Aero Pulse»' });
  await expect(modal).toBeVisible();
  return modal;
}

test('editor uses shared Section Navigator and retains the left sidebar as shortcuts', async ({ page }) => {
  const modal = await openEditor(page);
  const navigator = modal.locator('.pg-section-navigator');
  const heading = navigator.locator('.pg-section-navigator__title');
  const nav = modal.locator('.pg-workspace-layout__nav-list');
  await expect(navigator).toHaveCount(1);
  await expect(navigator).toHaveAttribute('data-pg-scroll-container', 'local');
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
    await expect(button).toHaveClass(action === 'dialog-refresh' ? /pg-mini-button/ : /pg-icon-button--corner/);
    expect((await button.textContent()).trim()).toBe('');
  }
  await expect(layout).toHaveAttribute('data-pg-nav', 'expanded');
  await modal.getByRole('button', { name: 'Згорнути меню редактора' }).click();
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
  // The mini refresh control is vertically stacked and centered under the corner close control.
  expect(Math.abs((corners.refresh.left + corners.refresh.width / 2) -
    (corners.close.left + corners.close.width / 2))).toBeLessThan(1);
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
  const navigator = modal.locator('.pg-section-navigator');
  const viewport = navigator.locator('.pg-section-navigator__viewport');
  await viewport.evaluate(node => {
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

test('workspace navigation uses the Sidebar skin and keeps both section controls pinned while content scrolls', async ({ page }) => {
  const modal = await openEditor(page);
  const layout = modal.locator('.pg-workspace-layout');
  const canvas = layout.locator('.pg-workspace-layout__canvas');
  const navigator = layout.locator('.pg-section-navigator');
  const viewport = navigator.locator('.pg-section-navigator__viewport');
  const top = navigator.locator('.pg-section-navigator__rail[data-pg-placement="top"]');
  const bottom = navigator.locator('.pg-section-navigator__rail[data-pg-placement="bottom"]');
  const field = modal.getByRole('textbox', { name: 'Назва бренду' });

  await expect(layout.locator('.pg-workspace-layout__nav-item').first())
    .toHaveClass(/pg-button--nav-item/);
  await expect(page.locator('.pg-sidebar__link').first())
    .toHaveClass(/pg-button--nav-item/);
  await expect(navigator).toHaveAttribute('data-pg-scroll-container', 'local');

  // Simulate a section longer than the viewport without coupling its content
  // or scrolling mechanics to WorkspaceLayout.
  await modal.locator('.pg-tools-data-views__edit-section').first().evaluate(section => {
    const longContent = document.createElement('div');
    longContent.style.blockSize = '2400px';
    longContent.setAttribute('aria-hidden', 'true');
    section.append(longContent);
  });
  const before = await modal.evaluate(root => {
    const box = selector => root.querySelector(selector).getBoundingClientRect();
    return {
      top: box('.pg-section-navigator__rail[data-pg-placement="top"]').top,
      bottom: box('.pg-section-navigator__rail[data-pg-placement="bottom"]').bottom,
      canvasTop: box('.pg-workspace-layout__canvas').top,
      canvasBottom: box('.pg-workspace-layout__canvas').bottom,
      viewportWidth: box('.pg-section-navigator__viewport').width,
      fieldWidth: box('input[autofocus]').width,
    };
  });

  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight; });
  const after = await modal.evaluate(root => {
    const scrollport = root.querySelector('.pg-section-navigator__viewport');
    return {
      scrollTop: scrollport.scrollTop,
      top: root.querySelector('.pg-section-navigator__rail[data-pg-placement="top"]').getBoundingClientRect().top,
      bottom: root.querySelector('.pg-section-navigator__rail[data-pg-placement="bottom"]').getBoundingClientRect().bottom,
    };
  });

  expect(after.scrollTop).toBeGreaterThan(500);
  expect(Math.abs(after.top - before.top)).toBeLessThan(1);
  expect(Math.abs(after.bottom - before.bottom)).toBeLessThan(1);
  expect(before.top).toBeGreaterThanOrEqual(before.canvasTop);
  expect(before.bottom).toBeLessThanOrEqual(before.canvasBottom);
  expect(before.fieldWidth).toBeGreaterThan(before.viewportWidth * .8);
  await expect(top).toBeVisible();
  await expect(bottom).toBeVisible();
  await expect(field).toBeAttached();
});

test('all workspace sections share the same flush edges and the title aligns with first navigation row', async ({ page }) => {
  const modal = await openEditor(page);
  const aligned = await modal.evaluate(root => {
    const bounds = selector => {
      const r = root.querySelector(selector).getBoundingClientRect();
      return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, centerY:r.top + r.height/2, width:r.width };
    };
    const body = root.querySelector('.pg-dialog__body');
    const header = root.querySelector('.pg-section-navigator__header');
    const viewport = root.querySelector('.pg-section-navigator__viewport');
    const top = root.querySelector('[data-pg-placement="top"]');
    const bottom = root.querySelector('[data-pg-placement="bottom"]');
    return {
      canvas:bounds('.pg-workspace-layout__canvas'),
      navItem:bounds('.pg-workspace-layout__nav-item'),
      title:bounds('.pg-section-navigator__title'),
      field:bounds('.pg-tools-data-views__edit-section'),
      viewport:bounds('.pg-section-navigator__viewport'),
      top:top.getBoundingClientRect().width,
      bottom:bottom.getBoundingClientRect().width,
      bodyPadding:getComputedStyle(body).padding,
      titlePadding:getComputedStyle(header).paddingLeft,
      viewportPadding:getComputedStyle(viewport).paddingLeft,
    };
  });
  expect(aligned.bodyPadding).toBe('0px');
  expect(aligned.titlePadding).toBe('0px');
  expect(aligned.viewportPadding).toBe('0px');
  expect(Math.abs(aligned.title.left-aligned.field.left)).toBeLessThan(2);
  expect(Math.abs(aligned.field.left-aligned.canvas.left)).toBeLessThan(2);
  expect(Math.abs(aligned.viewport.right-aligned.canvas.right)).toBeLessThan(2);
  expect(Math.abs(aligned.title.centerY-aligned.navItem.centerY)).toBeLessThan(3);
  expect(aligned.top).toBeLessThanOrEqual(56);
  expect(aligned.bottom).toBeLessThanOrEqual(56);
});
