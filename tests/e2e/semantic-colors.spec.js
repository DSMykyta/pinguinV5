/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E SEMANTIC COLORS                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Реальні soft/solid кольори, hover, Dialog, stable layout.  ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, Tools data views, common Button.          ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/semantic-colors.spec.js.       ║
 * ║ ПРИНЦИП: Нових сторінок і демо-кнопок не створюємо.                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
});

test('only Active badges use the shared success/soft tint in both themes', async ({ page }) => {
  const badges = page.locator('#pg-tools-panel-data-views .pg-collection-view__table .pg-tools-data-views__status');
  const active = badges.filter({ hasText: 'Активний' }).first();
  const draft = badges.filter({ hasText: 'Чернетка' }).first();
  await expect(active).toHaveAttribute('data-pg-status', 'active');
  await expect(draft).toHaveAttribute('data-pg-status', 'draft');

  const readColors = () => page.evaluate(() => {
    const active = document.querySelector('#pg-tools-panel-data-views .pg-collection-view__table [data-pg-status="active"]');
    const draft = document.querySelector('#pg-tools-panel-data-views .pg-collection-view__table [data-pg-status="draft"]');
    const sample = document.createElement('span');
    sample.style.background = 'var(--pg-tone-success-soft)';
    sample.style.color = 'var(--pg-tone-success-on-soft)';
    document.body.append(sample);
    const pick = el => {
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, color: style.color };
    };
    const colors = { active: pick(active), draft: pick(draft), expected: pick(sample) };
    sample.remove();
    return colors;
  });

  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => {
      if (theme === 'light') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', 'dark');
    }, theme);
    const { active: colors, draft: neutral, expected } = await readColors();
    expect(colors).toEqual(expected);
    expect(neutral).not.toEqual(expected);
  }
});

test('bulk selection reuses soft warning, success and danger, and danger confirm is solid', async ({ page }) => {
  const table = page.locator('#pg-tools-panel-data-views .pg-collection-view__table');
  const rows = table.locator('tbody tr');
  await rows.nth(0).locator('.pg-checkbox__row').click();
  await rows.nth(1).locator('.pg-checkbox__row').click();

  const actions = page.locator('.pg-selection-actions');
  await expect(actions).toHaveAttribute('data-pg-mode', 'multiple');
  const archive = actions.locator('[data-pg-selection-action="archive"]');
  const restore = actions.locator('[data-pg-selection-action="restore"]');
  const remove = actions.locator('[data-pg-selection-action="delete"]');
  await expect(archive).toHaveAttribute('data-pg-tone', 'warning');
  await expect(restore).toHaveAttribute('data-pg-tone', 'success');
  await expect(remove).toHaveAttribute('data-pg-tone', 'danger');

  for (const button of [archive, restore, remove]) {
    await expect(button).toHaveAttribute('data-pg-appearance', 'soft');
    const before = await button.evaluate(el => ({
      color: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
      bounds: el.getBoundingClientRect().toJSON(),
    }));
    await button.hover();
    await expect.poll(() => button.evaluate(el => getComputedStyle(el).backgroundColor))
      .not.toBe(before.background);
    const after = await button.evaluate(el => ({
      color: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
      bounds: el.getBoundingClientRect().toJSON(),
    }));
    expect(after.background).not.toBe(before.background);
    expect(after.color).toBe(before.color);
    expect(after.bounds.width).toBeCloseTo(before.bounds.width, 1);
    expect(after.bounds.height).toBeCloseTo(before.bounds.height, 1);
  }

  await remove.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const confirm = dialog.locator('[data-pg-action="dialog-confirm"]');
  await expect(confirm).toHaveAttribute('data-pg-tone', 'danger');
  await expect(confirm).toHaveAttribute('data-pg-appearance', 'solid');
  await dialog.locator('[data-pg-action="dialog-cancel"]').click();
  await expect(dialog).toHaveCount(0);
});

test('edit save is blue solid, without changing the existing editor Dialog', async ({ page }) => {
  await page.locator('.pg-collection-view__table tbody tr').first()
    .locator('[data-pg-action="row-edit"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const save = dialog.locator('[data-pg-action="dialog-confirm"]');
  await expect(save).toHaveText('Зберегти');
  await expect(save).toHaveAttribute('data-pg-tone', 'secondary');
  await expect(save).toHaveAttribute('data-pg-appearance', 'solid');
  await expect(dialog).toHaveClass(/pg-dialog--editor/);
  await dialog.locator('[data-pg-action="dialog-cancel"]').click();
});

test('soft danger is readable and its color changes with the theme, not its size', async ({ page }) => {
  const rows = page.locator('.pg-collection-view__table tbody tr');
  await rows.nth(0).locator('.pg-checkbox__row').click();
  await rows.nth(1).locator('.pg-checkbox__row').click();
  const remove = page.locator('[data-pg-selection-action="delete"]');
  await expect(remove).toBeVisible();
  const capture = () => remove.evaluate(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    return { color: style.color, background: style.backgroundColor,
      width: rect.width, height: rect.height };
  });
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  const light = await capture();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect.poll(async () => (await capture()).color).not.toBe(light.color);
  const dark = await capture();
  expect(light.color).not.toBe(dark.color);
  expect(light.background).not.toBe(dark.background);
  expect(light.width).toBeCloseTo(dark.width, 1);
  expect(light.height).toBeCloseTo(dark.height, 1);
});
