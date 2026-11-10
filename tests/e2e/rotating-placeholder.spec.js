/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — ROTATING PLACEHOLDER BROWSER TESTS                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевірка history-only UI, lazy DOM, visibility, cleanup і native API. ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, /tools і спільний Input.                            ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/rotating-placeholder.spec.js.            ║
 * ║ ПРИНЦИП: DOM, autocomplete і геометрія основного Input не дублюються.              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('empty history adds no overlay; two saved values rotate with stable geometry', async ({ page }) => {
  const input = page.locator('input[name="demo-rotating-feature"]');
  const panel = page.locator('.pg-input').filter({ has: input });
  const hint = panel.locator('.pg-input__rotating-placeholder');
  await expect(input).toHaveAccessibleName('Ознака товару — змінні підказки');
  await expect(input).toHaveAttribute('autocomplete', 'on');
  await expect(hint).toHaveCount(0);
  await expect(page.locator('input[name="demo-brand"]').locator('..')
    .locator('.pg-input__rotating-placeholder')).toHaveCount(0);

  const before = await panel.locator('.pg-field__surface').boundingBox();
  await input.fill('Sugar Free');
  await input.blur();
  await input.fill('Time Release');
  await input.blur();
  await input.fill('');
  await input.blur();

  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Time Release');
  await expect(hint).toContainText('Sugar Free', { timeout: 9000 });
  const after = await panel.locator('.pg-field__surface').boundingBox();
  expect(Math.abs(after.height - before.height)).toBeLessThan(1);

  await page.reload();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await input.scrollIntoViewIfNeeded();
  await expect(hint).toContainText(/Time Release|Sugar Free/);
});

test('declarative native HTML field keeps autocomplete and only acquires DOM when used', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('.pg-tools-input-demo__grid').insertAdjacentHTML('beforeend',
      '<div><label for="feature-native">Ознака</label>' +
      '<input id="feature-native" type="text" name="feature-native" autocomplete="on" ' +
      'data-pg-rotating-placeholder></div>');
  });
  const input = page.locator('#feature-native');
  const host = page.locator('.pg-input__rotating-native-host').filter({ has: input });
  await expect(host).toHaveCount(0);
  await expect(input).toHaveAttribute('autocomplete', 'on');
  await input.fill('5 mg');
  await input.blur();
  await input.fill('');
  await input.blur();
  await expect(host).toHaveCount(1);
  await expect(host.locator('.pg-input__rotating-placeholder')).toContainText('5 mg');
  const stored = await page.evaluate(() => JSON.parse(
    localStorage.getItem('pg:v1:input-placeholder-history:feature-native') || '[]'));
  expect(stored).toEqual(['5 mg']);
});

test('removing and re-adding HTML opt-in restores native input and state', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('.pg-tools-input-demo__grid').insertAdjacentHTML('beforeend',
      '<input id="temporary-rotator" name="temporary-rotator" type="text" data-pg-rotating-placeholder>');
  });
  const input = page.locator('#temporary-rotator');
  await input.fill('First');
  await input.blur();
  await input.fill('');
  await input.blur();
  const host = page.locator('.pg-input__rotating-native-host').filter({ has: input });
  await expect(host).toHaveCount(1);

  await input.evaluate(node => node.removeAttribute('data-pg-rotating-placeholder'));
  await expect(host).toHaveCount(0);
  await input.fill('Not recorded');
  await input.blur();
  await input.evaluate(node => node.setAttribute('data-pg-rotating-placeholder', ''));
  await expect(input).toHaveValue('Not recorded');
  await input.fill('Recorded');
  await input.blur();
  const stored = await page.evaluate(() => JSON.parse(
    localStorage.getItem('pg:v1:input-placeholder-history:temporary-rotator') || '[]'));
  expect(stored).toEqual(['Recorded', 'First']);
});

test('reduced motion, manual pause and focus preserve native keyboard editing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.locator('input[name="demo-rotating-feature"]');
  const hint = page.locator('.pg-input').filter({ has: input })
    .locator('.pg-input__rotating-placeholder');
  await input.fill('Sugar Free');
  await input.blur();
  await input.fill('Time Release');
  await input.blur();
  await input.fill('');
  await input.blur();

  await expect(hint).toContainText('Time Release');
  await page.waitForTimeout(2600);
  await expect(hint).toContainText('Time Release');
  await input.focus();
  await expect(hint).toBeHidden();
  await input.pressSequentially('Vegan');
  await expect(input).toHaveValue('Vegan');
  await input.blur();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await input.fill('');
  await input.blur();
  await page.evaluate(async () => {
    const { setRotatingPlaceholdersPaused } = await import('/src/ui/input/rotating-placeholder.js');
    setRotatingPlaceholdersPaused(true);
  });
  await expect(hint).toContainText('Vegan');
  await page.waitForTimeout(2600);
  await expect(hint).toContainText('Vegan');
  await page.evaluate(async () => {
    const { setRotatingPlaceholdersPaused } = await import('/src/ui/input/rotating-placeholder.js');
    setRotatingPlaceholdersPaused(false);
  });
});

test('change and form submit saving policies are independent of input focus', async ({ page }) => {
  await page.evaluate(() => {
    const container = document.querySelector('.pg-tools-input-demo__grid');
    container.insertAdjacentHTML('beforeend',
      '<form id="save-only"><label for="save-input">Submit-only</label>' +
      '<input id="save-input" name="save-input" data-pg-rotating-placeholder ' +
      'data-pg-placeholder-save="submit"><button type="submit">Зберегти</button></form>');
    document.querySelector('#save-only').addEventListener('submit', event => event.preventDefault());
  });
  const input = page.locator('#save-input');
  await input.fill('Confirmed');
  await input.blur();
  const before = await page.evaluate(() =>
    localStorage.getItem('pg:v1:input-placeholder-history:save-input'));
  expect(before).toBeNull();
  await page.locator('#save-only button[type="submit"]').click();
  const after = await page.evaluate(() => JSON.parse(
    localStorage.getItem('pg:v1:input-placeholder-history:save-input') || '[]'));
  expect(after).toEqual(['Confirmed']);
  await input.fill('');
  await input.blur();
  await expect(page.locator('#save-only .pg-input__rotating-placeholder'))
    .toContainText('Confirmed');
  await page.locator('#save-only').evaluate(form => form.reset());
  await expect(input).toHaveValue('');
});

test('same semantic indexed names share a history, modules isolate unrelated data', async ({ page }) => {
  await page.evaluate(() => {
    const host = document.querySelector('.pg-tools-input-demo__grid');
    host.insertAdjacentHTML('beforeend',
      '<div data-pg-module="products">' +
      '<input name="items[0][feature]" data-pg-rotating-placeholder>' +
      '<input name="items[1][feature]" data-pg-rotating-placeholder></div>' +
      '<div data-pg-module="brands">' +
      '<input name="items[0][feature]" data-pg-rotating-placeholder></div>');
  });
  const a = page.locator('[data-pg-module="products"] input').first();
  const b = page.locator('[data-pg-module="products"] input').last();
  const other = page.locator('[data-pg-module="brands"] input');
  await a.fill('Sugar Free');
  await a.blur();
  await b.scrollIntoViewIfNeeded();
  await expect(b.locator('..').locator('.pg-input__rotating-placeholder')).toHaveCount(1);
  await expect(other.locator('..').locator('.pg-input__rotating-placeholder')).toHaveCount(0);
  const stored = await page.evaluate(() => {
    const key = 'pg:v1:input-placeholder-history:' + encodeURIComponent('products:items[][feature]');
    return JSON.parse(localStorage.getItem(key) || '[]');
  });
  expect(stored).toEqual(['Sugar Free']);
});

test('a thousand unused opt-in fields allocate no placeholder DOM', async ({ page }) => {
  await page.evaluate(() => {
    const container = document.querySelector('.pg-tools-input-demo__grid');
    const host = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const input = document.createElement('input');
      input.name = 'unused-' + i;
      input.setAttribute('data-pg-rotating-placeholder', '');
      host.append(input);
    }
    const secret = document.createElement('input');
    secret.type = 'password';
    secret.name = 'password';
    secret.setAttribute('data-pg-rotating-placeholder', '');
    host.append(secret);
    container.append(host);
  });
  await expect(page.locator('.pg-input__rotating-native-host')).toHaveCount(0);
  await expect(page.locator('.pg-input__rotating-placeholder')).toHaveCount(0);
  await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
});

test('cross-tab local storage changes update a visible field', async ({ page, context }) => {
  const input = page.locator('input[name="demo-rotating-feature"]');
  await input.scrollIntoViewIfNeeded();
  const second = await context.newPage();
  await second.goto('/tools');
  await second.evaluate(() => localStorage.setItem(
    'pg:v1:input-placeholder-history:demo-rotating-feature',
    JSON.stringify(['From another tab'])
  ));
  await second.close();
  await page.bringToFront();
  await input.scrollIntoViewIfNeeded();
  await expect(page.locator('.pg-input').filter({ has: input })
    .locator('.pg-input__rotating-placeholder')).toContainText('From another tab');
});

test('invalid values are not memorized and per-value deletion updates the existing UI', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('.pg-tools-input-demo__grid').insertAdjacentHTML('beforeend',
      '<div><label for="valid-feature">Валідне значення</label>' +
      '<input id="valid-feature" name="valid-feature" pattern="[A-Z]{3}" data-pg-rotating-placeholder></div>');
  });
  const input = page.locator('#valid-feature');
  await input.fill('123');
  await input.blur();
  const invalid = await page.evaluate(() =>
    localStorage.getItem('pg:v1:input-placeholder-history:valid-feature'));
  expect(invalid).toBeNull();
  await input.fill('ABC');
  await input.blur();
  await input.fill('DEF');
  await input.blur();
  await input.fill('');
  await input.blur();

  const hint = input.locator('..').locator('.pg-input__rotating-placeholder');
  await expect(hint).toContainText('DEF');
  await page.evaluate(async () => {
    const { removeInputPlaceholderHistoryValue } = await import('/src/ui/input/placeholder-history.js');
    removeInputPlaceholderHistoryValue('valid-feature', 'DEF');
  });
  await expect(hint).toContainText('ABC');
  await page.evaluate(async () => {
    const { clearInputPlaceholderHistory } = await import('/src/ui/input/placeholder-history.js');
    clearInputPlaceholderHistory('valid-feature');
  });
  await expect(hint).toBeHidden();
});

test('moving an input between module owners re-scopes rather than mixing histories', async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector('.pg-tools-input-demo__grid').insertAdjacentHTML('beforeend',
      '<div data-pg-module="module-a"><input id="moved" name="feature" data-pg-rotating-placeholder></div>' +
      '<div data-pg-module="module-b"></div>');
  });
  const input = page.locator('#moved');
  await input.fill('Only A');
  await input.blur();
  await page.evaluate(() => document.querySelector('[data-pg-module="module-b"]')
    .append(document.querySelector('#moved')));
  await input.fill('');
  await input.blur();
  await expect(page.locator('[data-pg-module="module-b"] .pg-input__rotating-placeholder'))
    .toHaveCount(0);
  const stored = await page.evaluate(() => localStorage.getItem(
    'pg:v1:input-placeholder-history:' + encodeURIComponent('module-b:feature')));
  expect(stored).toBeNull();
});
