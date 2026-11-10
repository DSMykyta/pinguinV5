/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — UNIFIED CHECKBOX E2E                                                                ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Один Checkbox у формах, таблицях, плитках; 32px hit, 24px box, labels та native state. ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test; фактичні компоненти у /tools.                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/checkbox-unified.spec.js.                             ║
 * ║ ПРИНЦИП: Без копій UI. Тестує робочу фабрику та окреме представлення доступного підпису.           ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function sameCheckbox(check) {
  const hit = check.locator('.pg-checkbox__hit');
  const box = check.locator('.pg-checkbox__box');
  await expect(hit).toHaveCSS('width', '32px');
  await expect(hit).toHaveCSS('height', '32px');
  await expect(box).toHaveCSS('width', '24px');
  await expect(box).toHaveCSS('height', '24px');
  await expect(check).not.toHaveAttribute('data-pg-compact', /.+/);
  await expect(check.locator('input[type=checkbox]')).toHaveCount(1);
}

test('form, table header, rows and tiles share the exact same Checkbox geometry', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();

  const form = page.locator('.pg-tools-advanced-fields__grid .pg-checkbox').first();
  await sameCheckbox(form);
  await expect(form.locator('.pg-checkbox__copy')).toBeVisible();
  await expect(form.locator('.pg-checkbox__description')).toBeVisible();

  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const table = page.locator('#pg-tools-panel-data-views .pg-collection-view__table');
  const all = table.locator('thead .pg-checkbox').first();
  const row = table.locator('tbody .pg-checkbox').first();
  for (const check of [all, row]) {
    await sameCheckbox(check);
    await expect(check.locator('.pg-checkbox__row')).toHaveCSS('width', '32px');
    await expect(check.locator('.pg-checkbox__copy')).toHaveCSS('position', 'absolute');
  }

  // The icon-only presentation does not remove the accessible record name.
  const first = row.getByRole('checkbox', { name: /^Вибрати:/ });
  await expect(first).not.toBeChecked();
  await row.locator('.pg-checkbox__hit').click();
  await expect(first).toBeChecked();

  await page.locator('.pg-shell__page-actions .pg-view-switch .pg-segment-switch__label[title="Плитки"]').click();
  const tile = page.locator('#pg-tools-panel-data-views .pg-collection-view__tile .pg-checkbox').first();
  await sameCheckbox(tile);
  await expect(tile.locator('.pg-checkbox__row')).toHaveCSS('width', '32px');
  await expect(tile.locator('.pg-checkbox__copy')).toHaveCSS('position', 'absolute');
});

test('the same checkbox retains visible form labels, mixed state, focus and disabled behavior', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
  const form = page.locator('.pg-tools-advanced-fields__grid .pg-checkbox').first();
  const control = form.getByRole('checkbox', { name: 'Враховувати в описі' });

  await sameCheckbox(form);
  await expect(control).toBeChecked();
  await form.locator('.pg-checkbox__hit').click();
  await expect(control).not.toBeChecked();
  await control.focus();
  await control.press('Space');
  await expect(control).toBeChecked();

  await page.evaluate(async () => {
    const { createCheckbox } = await import('/src/ui/checkbox/checkbox.js');
    const area = document.createElement('section');
    area.id = 'pg-checkbox-instances';
    area.style.cssText = 'display:grid;gap:16px;max-width:300px';
    const partial = createCheckbox({
      label: 'Частковий вибір', indeterminate: true,
    });
    const disabled = createCheckbox({
      label: 'Недоступний вибір', disabled: true,
    });
    const iconOnly = createCheckbox({
      label: 'Доступна назва без підпису', showLabel: false,
    });
    area.append(partial.element, disabled.element, iconOnly.element);
    document.querySelector('.pg-tools-advanced-fields').append(area);
  });

  const extra = page.locator('#pg-checkbox-instances .pg-checkbox');
  await expect(extra).toHaveCount(3);
  for (const instance of await extra.all()) await sameCheckbox(instance);
  const mixed = extra.nth(0);
  await expect(mixed.locator('.pg-checkbox__box')).toHaveCSS('border-radius', '50%');
  await mixed.getByRole('checkbox').press('Space');
  await expect(mixed).toHaveAttribute('data-pg-mixed', 'false');
  await expect(extra.nth(1).getByRole('checkbox')).toBeDisabled();
  await expect(extra.nth(2).getByRole('checkbox', { name: 'Доступна назва без підпису' })).toHaveCount(1);
  await expect(extra.nth(2).locator('.pg-checkbox__copy')).toHaveCSS('position', 'absolute');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(form.locator('.pg-checkbox__box')).toHaveCSS('transition-duration', '0s');
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await sameCheckbox(form);
});
