/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROTATING PLACEHOLDER BROWSER TESTS                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє історію без готових фраз, opt-in HTML і reduced motion.       ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, /tools і спільний Input.                            ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/rotating-placeholder.spec.js.            ║
 * ║ ПРИНЦИП: Реальний браузер; звичайні інпути та autocomplete не змінюються.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('empty history shows nothing; entered values rotate without changing field geometry', async ({ page }) => {
  const input = page.locator('input[name="demo-rotating-feature"]');
  const panel = page.locator('.pg-input').filter({ has: input });
  const hint = panel.locator('.pg-input__rotating-placeholder');
  const regular = page.locator('.pg-input').filter({ has: page.locator('input[name="demo-brand"]') });

  await expect(input).toHaveAttribute('data-pg-rotating-placeholder', '');
  await expect(input).toHaveAttribute('autocomplete', 'on');
  await expect(input).toHaveAccessibleName('Ознака товару — змінні підказки');
  await expect(hint).toBeHidden();
  await expect(hint).toBeEmpty();
  await expect(regular.locator('.pg-input__rotating-placeholder')).toHaveCount(0);
  const before = await panel.locator('.pg-field__surface').boundingBox();

  await input.fill('Sugar Free');
  await input.blur();
  await input.fill('Time Release');
  await input.blur();
  await expect(hint).toBeHidden();

  await input.fill('');
  await input.blur();
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Time Release');
  await expect(hint).toContainText('Sugar Free', { timeout: 5000 });
  const after = await panel.locator('.pg-field__surface').boundingBox();
  expect(Math.abs(after.height - before.height)).toBeLessThan(1);

  await page.reload();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(page.locator('.pg-input').filter({ has: page.locator('input[name="demo-rotating-feature"]') })
    .locator('.pg-input__rotating-placeholder')).toContainText(/Time Release|Sugar Free/);
});

test('one empty HTML attribute derives history from stable name and isolates other fields', async ({ page }) => {
  await page.evaluate(() => {
    const container = document.querySelector('.pg-tools-input-demo__grid');
    container.insertAdjacentHTML('beforeend',
      '<div><label for="feature-native">HTML поле</label>' +
      '<input id="feature-native" type="text" name="feature-native" autocomplete="on" ' +
      'data-pg-rotating-placeholder></div>');
  });
  const input = page.locator('#feature-native');
  const hint = page.locator('.pg-input__rotating-native-host .pg-input__rotating-placeholder');
  await expect(hint).toBeHidden();
  await expect(input).toHaveAttribute('autocomplete', 'on');

  await input.fill('5 mg');
  await input.blur();
  await expect(hint).toBeHidden();
  await input.fill('');
  await input.blur();
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('5 mg');

  const history = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pg:v1:input-placeholder-history:feature-native') || '[]'));
  expect(history).toEqual(['5 mg']);
  const unrelated = await page.evaluate(() =>
    localStorage.getItem('pg:v1:input-placeholder-history:demo-rotating-feature'));
  expect(unrelated).toBeNull();
});

test('reduced motion shows the saved phrase statically and native editing remains accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.locator('input[name="demo-rotating-feature"]');
  const hint = page.locator('.pg-input').filter({ has: input }).locator('.pg-input__rotating-placeholder');

  await expect(hint).toBeHidden();
  await input.fill('Sugar Free');
  await input.blur();
  await input.fill('Time Release');
  await input.blur();
  await input.fill('');
  await input.blur();
  await expect(hint).toContainText('Time Release');
  await page.waitForTimeout(1700);
  await expect(hint).toContainText('Time Release');
  await input.focus();
  await expect(hint).toBeHidden();
  await input.pressSequentially('Vegan');
  await expect(input).toHaveValue('Vegan');
});

test('removing and restoring the opt-in keeps the original native value', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('.pg-tools-input-demo__grid').insertAdjacentHTML('beforeend',
      '<input id="temporary-rotator" name="temporary-rotator" type="text" data-pg-rotating-placeholder>');
  });
  const input = page.locator('#temporary-rotator');
  await expect(page.locator('.pg-input__rotating-native-host').filter({ has: input })).toHaveCount(1);

  await input.evaluate(node => node.removeAttribute('data-pg-rotating-placeholder'));
  await expect(page.locator('.pg-input__rotating-native-host').filter({ has: input })).toHaveCount(0);
  await input.fill('Not recorded');
  await input.blur();
  await expect(input).toHaveValue('Not recorded');
  await input.evaluate(node => node.setAttribute('data-pg-rotating-placeholder', ''));
  await expect(page.locator('.pg-input__rotating-native-host').filter({ has: input })).toHaveCount(1);
  await expect(input).toHaveValue('Not recorded');
  await input.fill('Recorded');
  await input.blur();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pg:v1:input-placeholder-history:temporary-rotator') || '[]'));
  expect(stored).toEqual(['Recorded']);
});

test('many opted-in fields stay empty before use; sensitive input types are excluded', async ({ page }) => {
  await page.evaluate(() => {
    const grid = document.querySelector('.pg-tools-input-demo__grid');
    const holder = document.createElement('div');
    for (let i = 0; i < 100; i++) {
      const input = document.createElement('input');
      input.name = 'attribute-' + i;
      input.setAttribute('data-pg-rotating-placeholder', '');
      holder.append(input);
    }
    const email = document.createElement('input');
    email.name = 'email';
    email.type = 'email';
    email.setAttribute('data-pg-rotating-placeholder', '');
    holder.append(email);
    grid.append(holder);
  });
  const hints = page.locator('.pg-input__rotating-placeholder');
  await expect(hints).toHaveCount(101);
  await expect(page.locator('input[name="email"]').locator('..').locator('.pg-input__rotating-placeholder')).toHaveCount(0);
  const emptyCount = await page.locator('input[name^="attribute-"]').evaluateAll(nodes =>
    nodes.filter(input => input.parentElement.querySelector('.pg-input__rotating-placeholder')?.textContent === '').length);
  expect(emptyCount).toBe(100);
});
