/**
 * Upward opening must align with the REAL rendered popup height, not its cap.
 * Fixtures near the viewport bottom force all three popup components upward.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
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
