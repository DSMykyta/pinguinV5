/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — NESTED MENU E2E                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Side submenu hover, viewport flip, keyboard, touch and cleanup.       ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, shared createMenu, /tools Menu demo.                 ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/menu-submenu.spec.js.                   ║
 * ║ ПРИНЦИП: Reuses the same Menu and positionPopup; no parallel menu manager.        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const menuDemo = page => page.locator('.pg-tools-menu-demo');
const actions = page => menuDemo(page).locator('.pg-menu').first();
const rootPanel = page => actions(page).locator(':scope > .pg-menu__panel');
const plugins = page => rootPanel(page).getByRole('menuitem', { name: 'Плагіни' });
const submenu = page => actions(page).locator('.pg-menu__subpanel').first();

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
});

test('hover opens adjacent submenu and moving across the gap keeps it open', async ({ page }) => {
  await actions(page).locator('.pg-menu__trigger').click();
  await plugins(page).hover();
  await expect(plugins(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(submenu(page)).toBeVisible();
  const parentRect = await plugins(page).boundingBox();
  const childRect = await submenu(page).boundingBox();
  expect(childRect.x).toBeGreaterThanOrEqual(parentRect.x + parentRect.width);
  await submenu(page).getByRole('menuitem', { name: 'Open Notion page' }).hover();
  await page.waitForTimeout(290);
  await expect(submenu(page)).toBeVisible();
  await submenu(page).getByRole('menuitem', { name: 'Open Notion page' }).click();
  await expect(menuDemo(page).locator('[data-pg-menu-result]')).toHaveAttribute('data-pg-menu-result', 'notion-demo');
  await expect(rootPanel(page)).toBeHidden();
  await expect(submenu(page)).toBeHidden();
});

test('ArrowRight/ArrowLeft/Escape navigate one level at a time', async ({ page }) => {
  await actions(page).locator('.pg-menu__trigger').click();
  await plugins(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(submenu(page)).toBeVisible();
  await expect(submenu(page).getByRole('menuitem', { name: 'Open Notion page' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(submenu(page)).toBeHidden();
  await expect(plugins(page)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(submenu(page)).toBeHidden();
  await expect(plugins(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(rootPanel(page)).toBeHidden();
  await expect(actions(page).locator('.pg-menu__trigger')).toBeFocused();
});

test('nested descendants select only leaves and close all levels', async ({ page }) => {
  await actions(page).locator('.pg-menu__trigger').click();
  await plugins(page).hover();
  const more = submenu(page).getByRole('menuitem', { name: 'Інші інструменти' });
  await more.hover();
  const deepest = actions(page).locator('.pg-menu__subpanel').nth(1);
  await expect(deepest).toBeVisible();
  await deepest.getByRole('menuitem', { name: 'Приклад третього рівня' }).click();
  await expect(menuDemo(page).locator('[data-pg-menu-result]')).toHaveAttribute('data-pg-menu-result', 'third-level-demo');
  await expect(rootPanel(page)).toBeHidden();
  await expect(submenu(page)).toBeHidden();
  await expect(deepest).toBeHidden();
});

test('shared popup positioning flips a side panel left at the viewport edge', async ({ page }) => {
  await page.evaluate(async () => {
    const { createMenu } = await import('/src/ui/menu/menu.js');
    const menu = createMenu({
      label: 'Поруч із краєм',
      items: [{ label: 'Плагіни', items: [{ label: 'Open Notion page', value: 'notion' }] }],
    });
    const host = document.createElement('div');
    host.id = 'edge-submenu-host';
    host.style.cssText = 'position:fixed;right:10px;top:120px;z-index:100';
    host.append(menu.element);
    document.body.append(host);
    window.pgEdgeMenu = menu;
  });
  const edge = page.locator('#edge-submenu-host');
  await edge.locator('.pg-menu__trigger').click();
  const parent = edge.locator('.pg-menu__panel').first().getByRole('menuitem', { name: 'Плагіни' });
  await parent.hover();
  await expect(parent).toHaveAttribute('data-pg-side', 'left');
  const rect = await edge.locator('.pg-menu__subpanel').boundingBox();
  const parentRect = await parent.boundingBox();
  expect(rect.x + rect.width).toBeLessThanOrEqual(parentRect.x);
  expect(rect.x).toBeGreaterThanOrEqual(0);
  await page.mouse.click(5, 5);
  await expect(edge.locator('.pg-menu__panel').first()).toBeHidden();
  await page.evaluate(() => window.pgEdgeMenu.destroy());
  await expect(page.locator('#edge-submenu-host .pg-menu')).toHaveCount(0);
});

test('existing check menu stays independent of nested action menus', async ({ page }) => {
  const appearance = menuDemo(page).locator('.pg-menu').nth(1);
  await appearance.locator('.pg-menu__trigger').click();
  await expect(appearance.getByRole('menuitemcheckbox', { name: 'Компактний' })).toHaveAttribute('aria-checked', 'true');
  await appearance.getByRole('menuitemcheckbox', { name: 'Звичайний' }).click();
  await expect(menuDemo(page).locator('[data-pg-view-result]')).toHaveAttribute('data-pg-view-result', 'standard');
  await expect(appearance.locator('.pg-menu__panel')).toBeHidden();
  await expect(menuDemo(page).locator('.pg-menu__subpanel:visible')).toHaveCount(0);
});

test('touch click expands and selects a submenu without hover', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('/tools');
    await page.getByRole('tab', { name: 'Елементи' }).click();
    await actions(page).locator('.pg-menu__trigger').click();
    await plugins(page).click();
    await expect(submenu(page)).toBeVisible();
    await submenu(page).getByRole('menuitem', { name: 'Open Notion page' }).click();
    await expect(menuDemo(page).locator('[data-pg-menu-result]')).toHaveAttribute('data-pg-menu-result', 'notion-demo');
  } finally {
    await context.close();
  }
});


test('hovering a sibling closes a previous submenu without changing root layout', async ({ page }) => {
  await actions(page).locator('.pg-menu__trigger').click();
  const before = await rootPanel(page).boundingBox();
  await plugins(page).hover();
  await expect(submenu(page)).toBeVisible();
  await rootPanel(page).getByRole('menuitem', { name: 'Видалити' }).hover();
  await expect(submenu(page)).toBeHidden();
  const after = await rootPanel(page).boundingBox();
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
  await expect(rootPanel(page)).toBeVisible();
});

test('disabled submenu trigger never opens and its siblings still work', async ({ page }) => {
  await page.evaluate(async () => {
    const { createMenu } = await import('/src/ui/menu/menu.js');
    const menu = createMenu({
      label: 'Вимкнені пункти',
      items: [
        { label: 'Недоступна група', disabled: true, items: [
          { label: 'Не відкривати', value: 'blocked' },
        ] },
        { label: 'Доступна дія', value: 'allowed' },
      ],
      onSelect(value) { document.body.dataset.pgDisabledMenuResult = value; },
    });
    const host = document.createElement('div');
    host.id = 'disabled-submenu-host';
    host.append(menu.element);
    document.body.append(host);
    window.pgDisabledMenu = menu;
  });
  const host = page.locator('#disabled-submenu-host');
  await host.locator('.pg-menu__trigger').click();
  const disabled = host.getByRole('menuitem', { name: 'Недоступна група' });
  await expect(disabled).toBeDisabled();
  await disabled.hover({ force: true });
  await expect(disabled).toHaveAttribute('aria-expanded', 'false');
  await expect(host.locator('.pg-menu__subpanel')).toBeHidden();
  await host.getByRole('menuitem', { name: 'Доступна дія' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-pg-disabled-menu-result', 'allowed');
  await page.evaluate(() => window.pgDisabledMenu.destroy());
});
