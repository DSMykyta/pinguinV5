/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E POPUP POSITION                                                                   ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє popup position у браузері через Playwright.                             ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/popup-position.spec.js.                                ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
  await page.evaluate(async () => {
    const [{ createListbox }, { createCombobox }, { createMenu }] = await Promise.all([
      import('/src/ui/listbox/listbox.js'),
      import('/src/ui/combobox/combobox.js'),
      import('/src/ui/menu/menu.js'),
    ]);
    const cases = [
      ['listbox', createListbox({
        label: 'Список для тесту', multiple: true, searchable: true,
        options: [
          { value: 'a', label: 'Альфа' }, { value: 'b', label: 'Бета' },
          { value: 'c', label: 'Гамма' },
        ],
      })],
      ['combobox', createCombobox({
        label: 'Пошук для тесту',
        options: [
          { value: 'a', label: 'Альфа' }, { value: 'b', label: 'Бета' },
          { value: 'c', label: 'Гамма' },
        ],
      })],
      ['menu', createMenu({
        label: 'Дії для тесту',
        items: [
          { label: 'Відкрити', value: 'open' },
          { label: 'Редагувати', value: 'edit' },
          { label: 'Закрити', value: 'close' },
        ],
      })],
    ];
    cases.forEach(([name, item], index) => {
      const holder = document.createElement('div');
      holder.id = 'popup-test-' + name;
      holder.style.cssText = 'position:fixed;bottom:24px;left:' + (25 + 280 * index) +
        'px;width:240px;z-index:50';
      holder.append(item.element);
      document.body.append(holder);
    });
  });
});

async function verifyUpward(page, holder, anchorSelector, popupSelector) {
  const area = page.locator('#popup-test-' + holder);
  const popup = area.locator(popupSelector);
  await expect(popup).toBeVisible();
  const geometry = await area.evaluate((node, selectors) => {
    const anchor = node.querySelector(selectors[0]).getBoundingClientRect();
    const box = node.querySelector(selectors[1]).getBoundingClientRect();
    return {
      gap: anchor.top - box.bottom,
      popupHeight: box.height,
      viewportHeight: window.innerHeight,
      popupTop: box.top,
      anchorTop: anchor.top,
    };
  }, [anchorSelector, popupSelector]);
  expect(geometry.popupHeight).toBeGreaterThan(35);
  expect(geometry.popupTop).toBeGreaterThanOrEqual(7);
  expect(geometry.popupTop).toBeLessThan(geometry.anchorTop);
  expect(geometry.gap).toBeGreaterThanOrEqual(2);
  expect(geometry.gap).toBeLessThanOrEqual(6);
}

test('Listbox opens immediately above the trigger with a 4px gap', async ({ page }) => {
  const holder = page.locator('#popup-test-listbox');
  await holder.locator('.pg-listbox__trigger').click();
  await verifyUpward(page, 'listbox', '.pg-listbox__trigger', '.pg-listbox__panel');
  // Search shrinks the popup while it is open; it must stay near the trigger.
  await holder.locator('.pg-listbox__search').fill('Гамма');
  await verifyUpward(page, 'listbox', '.pg-listbox__trigger', '.pg-listbox__panel');
});

test('Combobox opens immediately above the input with a 4px gap', async ({ page }) => {
  const holder = page.locator('#popup-test-combobox');
  await holder.locator('input[role=combobox]').focus();
  await verifyUpward(page, 'combobox', 'input[role=combobox]', '.pg-combobox__list');
});

test('Menu opens immediately above its trigger with a 4px gap', async ({ page }) => {
  const holder = page.locator('#popup-test-menu');
  await holder.locator('.pg-menu__trigger').click();
  await verifyUpward(page, 'menu', '.pg-menu__trigger', '.pg-menu__panel');
});

test('native anchor follows a moved menu trigger without a JS reposition call', async ({ page }) => {
  const supported = await page.evaluate(() =>
    CSS.supports('position-anchor', '--pg-popup-anchor') &&
    CSS.supports('top', 'anchor(bottom)') &&
    CSS.supports('width', 'anchor-size(width)') &&
    CSS.supports('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline') &&
    typeof HTMLElement.prototype.showPopover === 'function');
  test.skip(!supported, 'CSS Anchor Positioning is not supported');
  const holder = page.locator('#popup-test-menu');
  await holder.evaluate(node => {
    node.style.bottom = 'auto';
    node.style.top = '80px';
    node.style.left = '100px';
  });
  await holder.locator('.pg-menu__trigger').click();
  const popup = holder.locator('.pg-menu__panel');
  await expect(popup).toBeVisible();
  const read = () => holder.evaluate(node => {
    const trigger = node.querySelector('.pg-menu__trigger').getBoundingClientRect();
    const popup = node.querySelector('.pg-menu__panel');
    const box = popup.getBoundingClientRect();
    return { anchor: popup.style.getPropertyValue('position-anchor'),
      gap: box.top - trigger.bottom, x: box.left, dx: box.left - trigger.left };
  });
  const before = await read();
  expect(before.anchor).toMatch(/^--pg-popup-anchor-/);
  expect(before.gap).toBeCloseTo(4, 0);
  expect(before.dx).toBeCloseTo(0, 0);
  await holder.evaluate(node => { node.style.left = '160px'; });
  await expect.poll(async () => (await read()).x).toBeCloseTo(before.x + 60, 0);
  expect((await read()).gap).toBeCloseTo(4, 0);
});

test('supported browser keeps the native anchor when the menu flips upward', async ({ page }) => {
  const supported = await page.evaluate(() =>
    CSS.supports('position-anchor', '--pg-popup-anchor') &&
    CSS.supports('top', 'anchor(bottom)') &&
    CSS.supports('width', 'anchor-size(width)') &&
    CSS.supports('position-try-fallbacks', 'flip-block, flip-inline, flip-block flip-inline'));
  test.skip(!supported, 'CSS Anchor Positioning is not supported');
  const holder = page.locator('#popup-test-menu');
  await holder.locator('.pg-menu__trigger').click();
  await verifyUpward(page, 'menu', '.pg-menu__trigger', '.pg-menu__panel');
  expect(await holder.locator('.pg-menu__panel').evaluate(node =>
    node.style.getPropertyValue('position-anchor'))).toMatch(/^--pg-popup-anchor-/);
});
