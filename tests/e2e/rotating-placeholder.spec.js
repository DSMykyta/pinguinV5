/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROTATING PLACEHOLDER BROWSER TESTS                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє opt-in, нативне введення, історію, HTML і reduced motion.     ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, /tools і спільний Input.                            ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/rotating-placeholder.spec.js.            ║
 * ║ ПРИНЦИП: Реальний браузер; ніякого дублювання UI поза існуючою вкладкою.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('opt-in rotates inside existing Input without changing nearby fields or browser autocomplete', async ({ page }) => {
  const input = page.locator('input[name="demo-rotating-feature"]');
  const panel = page.locator('.pg-input').filter({ has: input });
  const hint = panel.locator('.pg-input__rotating-placeholder');
  const regular = page.locator('.pg-input').filter({ has: page.locator('input[name="demo-brand"]') });
  await expect(input).toHaveAttribute('autocomplete', 'on');
  await expect(input).toHaveAccessibleName('Ознака товару — змінні підказки');
  await expect(hint).toContainText('Sugar Free');
  await expect(regular.locator('.pg-input__rotating-placeholder')).toHaveCount(0);
  const before = await panel.locator('.pg-field__surface').boundingBox();
  await expect(hint).toContainText('Time Release', { timeout: 7000 });
  const after = await panel.locator('.pg-field__surface').boundingBox();
  expect(Math.abs(after.height - before.height)).toBeLessThan(1);
  await input.focus();
  await expect(hint).toBeHidden();
  await input.fill('25%');
  await input.blur();
  await expect(hint).toBeHidden();
  await page.reload();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(page.locator('input[name="demo-rotating-feature"]')
    .locator('..').locator('.pg-input__rotating-placeholder')).toContainText('25%');
});

test('native HTML data attributes opt in only that field and history is scoped by key', async ({ page }) => {
  await page.evaluate(() => {
    const container = document.querySelector('.pg-tools-input-demo__grid');
    container.insertAdjacentHTML('beforeend',
      '<div><label for="feature-native">HTML поле</label>' +
      '<input id="feature-native" type="text" name="feature-native" autocomplete="on" ' +
      'data-pg-rotating-placeholder="50 mg | 750 mg" ' +
      'data-pg-placeholder-history="html-feature" data-pg-placeholder-interval="1200"></div>');
  });
  const input = page.locator('#feature-native');
  const hint = page.locator('.pg-input__rotating-native-host .pg-input__rotating-placeholder');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('50 mg');
  await expect(input).toHaveAttribute('autocomplete', 'on');
  await input.fill('5 mg');
  await input.blur();
  await expect(hint).toBeHidden();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pg:v1:input-placeholder-history:html-feature') || '[]')
  );
  expect(stored).toContain('5 mg');
  const unrelated = await page.evaluate(() =>
    localStorage.getItem('pg:v1:input-placeholder-history:demo-product-feature')
  );
  expect(unrelated).toBeNull();
});

test('reduced motion keeps a static placeholder and focus preserves editing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.locator('input[name="demo-rotating-feature"]');
  const hint = page.locator('.pg-input').filter({ has: input }).locator('.pg-input__rotating-placeholder');
  await expect(hint).toContainText('Sugar Free');
  await page.waitForTimeout(1600);
  await expect(hint).toContainText('Sugar Free');
  await input.focus();
  await expect(hint).toBeHidden();
  await input.type('Vegan');
  await expect(input).toHaveValue('Vegan');
});

test('removing HTML opt-in tears down overlay without touching native value or focus', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('.pg-tools-input-demo__grid').insertAdjacentHTML('beforeend',
      '<input id="temporary-rotator" name="temporary-rotator" type="text" ' +
      'data-pg-rotating-placeholder="A | B">');
  });
  const field = page.locator('#temporary-rotator');
  await expect(page.locator('.pg-input__rotating-native-host').filter({ has: field })).toBeVisible();
  await field.evaluate(input => input.removeAttribute('data-pg-rotating-placeholder'));
  await expect(page.locator('.pg-input__rotating-native-host').filter({ has: field })).toHaveCount(0);
  await field.fill('Retained');
  await expect(field).toHaveValue('Retained');
  await field.evaluate(input => input.setAttribute('data-pg-rotating-placeholder', 'Again | And again'));
  await expect(page.locator('.pg-input__rotating-native-host').filter({ has: field })).toHaveCount(1);
  await expect(field).toHaveValue('Retained');
});
