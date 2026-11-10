/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DIALOG BROWSER TESTS                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє native modal, blur backdrop, фокус і незалежні вкладки.     ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, src/ui/dialog, tools/dialog-demo.                          ║
 * ║ ПУБЛІЧНИЙ API: Browser E2E.                                                        ║
 * ║ ПРИНЦИП: Не змінюємо Shell і не дублюємо модальні компоненти.                      ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('Dialog demo belongs to Text tab; native modal darkens and blurs backdrop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const tables = page.locator('#pg-tools-panel-tables');
  const text = page.locator('#pg-tools-panel-text');
  await expect(tables).toBeVisible();
  await expect(text).toBeHidden();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(tables).toBeHidden();
  await expect(text).toBeVisible();
  await expect(text.locator('[data-pg-action="dialog-demo-info"]')).toBeVisible();
  await expect(text.locator('[data-pg-action="toast-demo"]')).toHaveCount(0);

  const before = await page.locator('.pg-shell__content').boundingBox();
  await text.locator('[data-pg-action="dialog-demo-info"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('.pg-dialog__title')).toHaveText('Інформація');
  const backdrop = await dialog.evaluate(el => {
    const style = getComputedStyle(el, '::backdrop');
    return { filter: style.backdropFilter, background: style.backgroundColor };
  });
  expect(backdrop.filter).toBe('blur(8px)');
  expect(backdrop.background).not.toBe('rgba(0, 0, 0, 0)');
  expect(await page.locator('.pg-shell__content').boundingBox()).toEqual(before);
  await expect(dialog.locator('[data-pg-action="dialog-confirm"]')).toBeFocused();

  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(text.locator('.pg-tools-dialog-demo')).toHaveAttribute('data-pg-dialog-result', 'confirm');
});

async function openBrandDelete(page) {
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const collection = page.locator('#pg-tools-panel-data-views .pg-collection-view');
  const rows = collection.locator('.pg-collection-view__table tbody tr');
  await rows.nth(0).locator('.pg-checkbox__row').click();
  await rows.nth(1).locator('.pg-checkbox__row').click();
  const trigger = page.locator('[data-pg-selection-action="delete"]');
  await expect(trigger).toBeVisible();
  await trigger.click();
  return { collection, trigger };
}

test('real collection Confirm focuses Cancel, Escape preserves rows, Confirm removes them', async ({ page }) => {
  await page.goto('/tools');
  const { collection, trigger } = await openBrandDelete(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-pg-action="dialog-cancel"]')).toBeFocused();
  await expect(dialog.locator('[data-pg-action="dialog-confirm"]')).toHaveClass(/pg-button--destructive/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(collection).toHaveAttribute('data-pg-selected-count', '2');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.locator('[data-pg-action="dialog-confirm"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(collection).toHaveAttribute('data-pg-selected-count', '0');
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 25 з 30');
});

test('native Confirm traps focus and explicit Cancel keeps records intact', async ({ page }) => {
  await page.goto('/tools');
  const { collection } = await openBrandDelete(page);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() =>
    document.querySelector('.pg-dialog').contains(document.activeElement))).toBe(true);
  await dialog.locator('[data-pg-action="dialog-cancel"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(collection).toHaveAttribute('data-pg-selected-count', '2');
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 25 з 32');
});

test('mobile and dark theme preserve native dialog geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await theme.click();
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // Sidebar theme control is hidden behind mobile navigation below 1080px.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Текст' }).click();
  await page.locator('[data-pg-action="dialog-demo-info"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(15);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.y + box.height).toBeLessThanOrEqual(830);
  await expect(dialog).toHaveCSS('transition-duration', '0s');
  await page.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(dialog).toHaveCount(0);
});
