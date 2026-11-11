/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — WORKSPACE EDITOR ACTIONS                                            ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдині кнопки навігації, збереження і закриття редактора.               ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared Dialog, WorkspaceLayout, Button, CollectionView.   ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/workspace-editor-actions.spec.js.       ║
 * ║ ПРИНЦИП: Немає другого меню чи другого потоку збереження.                          ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await page.locator('#pg-tools-panel-data-views .pg-collection-view__editable-name').first().click();
  await expect(page.getByRole('dialog', { name: /^Редагувати «.+»$/ })).toBeVisible();
});

test('workspace reuses navigator toggle and correctly stacks shared corner/mini actions', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: /^Редагувати «.+»$/ });
  const workspace = dialog.locator('.pg-workspace-layout');
  const menu = workspace.locator('.pg-workspace-layout__top-left [data-pg-action="workspace-nav-toggle"]');
  const close = workspace.locator('.pg-workspace-layout__top-right [data-pg-action="dialog-dismiss"]');
  const refresh = workspace.locator('.pg-workspace-layout__top-right [data-pg-action="dialog-refresh"]');
  const save = workspace.locator('.pg-workspace-layout__bottom-right [data-pg-action="dialog-save"]');
  const saveClose = workspace.locator('.pg-workspace-layout__bottom-right [data-pg-action="dialog-confirm"]');

  await expect(menu).toHaveCount(1);
  await expect(workspace.locator('.pg-workspace-layout__nav [data-pg-action="workspace-nav-toggle"]')).toHaveCount(0);
  await expect(menu).toHaveClass(/pg-icon-button--corner/);
  await expect(refresh).toHaveClass(/pg-mini-button/);
  await expect(save).toHaveClass(/pg-mini-button/);
  await expect(saveClose).toHaveClass(/pg-icon-button--corner/);
  await expect(saveClose).toHaveAttribute('aria-label', 'Зберегти і закрити');
  await expect(saveClose.locator('svg.pg-icon')).toHaveCount(1);

  const order = await workspace.evaluate(root => {
    const locate = selector => root.querySelector(selector).getBoundingClientRect();
    const close = locate('.pg-workspace-layout__top-right [data-pg-action="dialog-dismiss"]');
    const refresh = locate('.pg-workspace-layout__top-right [data-pg-action="dialog-refresh"]');
    const save = locate('.pg-workspace-layout__bottom-right [data-pg-action="dialog-save"]');
    const check = locate('.pg-workspace-layout__bottom-right [data-pg-action="dialog-confirm"]');
    return { refreshBelowClose: refresh.top >= close.bottom,
      saveAboveCheck: save.bottom <= check.top };
  });
  expect(order.refreshBelowClose).toBe(true);
  expect(order.saveAboveCheck).toBe(true);
  await menu.click();
  await expect(workspace).toHaveAttribute('data-pg-nav', 'collapsed');
  await menu.click();
  await expect(workspace).toHaveAttribute('data-pg-nav', 'expanded');
});

test('small save persists and stays open; checkmark saves and closes; clean close is allowed', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: /^Редагувати «.+»$/ });
  const input = dialog.getByRole('textbox', { name: 'Назва бренду' });
  await input.fill('Aardvark Test Brand');
  await dialog.locator('[data-pg-action="dialog-save"]').click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.pg-dialog__status')).toHaveText('Зміни збережено.');
  // Save-only establishes a new baseline; close must not ask to discard.
  await dialog.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.pg-dialog__decision')).toHaveCount(0);
  await expect(page.locator('#pg-tools-panel-data-views .pg-collection-view__editable-name')
    .filter({ hasText: 'Aardvark Test Brand' })).toHaveCount(1);

  await page.locator('#pg-tools-panel-data-views .pg-collection-view__editable-name')
    .filter({ hasText: 'Aardvark Test Brand' }).click();
  const reopened = page.getByRole('dialog', { name: 'Редагувати «Aardvark Test Brand»' });
  await expect(reopened).toBeVisible();
  await reopened.getByRole('textbox', { name: 'Назва бренду' }).fill('Aardvark Updated Brand');
  await reopened.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(reopened).toHaveCount(0);
});
