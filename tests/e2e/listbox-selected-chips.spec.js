/**
 * Multi-select chips and their seamless selected-values extension.
 * The selection tray is part of the same Listbox component, not a second editor.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createListbox } = await import('/src/ui/listbox/listbox.js');
    const options = [
      { value: 'prom', label: 'Пром.ua' },
      { value: 'rozetka', label: 'Rozetka' },
      { value: 'promua', label: 'Prom.ua (UA)' },
      { value: 'amazon', label: 'Amazon' },
      { value: 'etsy', label: 'Etsy' },
      { value: 'meta', label: 'Meta', disabled: true },
    ];
    window.pgSelectedChanges = [];
    const upper = createListbox({
      label: 'Маркетплейси', name: 'marketplaces',
      multiple: true, searchable: true, options,
      value: ['prom', 'rozetka', 'promua', 'amazon', 'etsy'],
      onChange: values => window.pgSelectedChanges.push(values),
    });
    const lower = createListbox({
      label: 'Вибрані внизу', multiple: true,
      options, value: ['prom', 'rozetka', 'promua', 'amazon', 'etsy'],
    });
    for (const [name, instance, bottom] of [
      ['normal', upper, false], ['near-bottom', lower, true],
    ]) {
      const node = document.createElement('div');
      node.id = 'selection-test-' + name;
      node.style.cssText =
        'position:fixed;left:' + (bottom ? '450px' : '30px') +
        ';width:330px;z-index:60;' +
        (bottom ? 'bottom:20px' : 'top:80px');
      node.append(instance.element);
      document.body.append(node);
    }
  });
});

test('hover joins a chip tray to the SAME outlined field, showing every selected item', async ({ page }) => {
  const root = page.locator('#selection-test-normal');
  await expect(root.locator('.pg-listbox__chip')).toHaveCount(4);
  await expect(root.getByRole('button', { name: 'Показати всі вибрані значення' })).toBeVisible();
  await root.locator('.pg-field__surface').hover();
  const tray = root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  await expect(root.locator('.pg-listbox__selected-chip')).toHaveCount(5);
  await expect(root.locator('.pg-listbox__panel')).toBeHidden();
  const geometry = await root.evaluate(element => {
    const frame = element.querySelector('.pg-field__surface').getBoundingClientRect();
    const extended = element.querySelector('.pg-listbox__selection-tray').getBoundingClientRect();
    return {
      gap: extended.top - frame.bottom,
      left: extended.left - frame.left,
      width: extended.width - frame.width,
      side: element.querySelector('.pg-listbox').dataset.pgTraySide,
      radius: getComputedStyle(element.querySelector('.pg-field__surface')).borderBottomLeftRadius,
    };
  });
  expect(geometry.side).toBe('down');
  expect(Math.abs(geometry.gap)).toBeLessThan(2.5);
  expect(Math.abs(geometry.left)).toBeLessThan(1.5);
  expect(Math.abs(geometry.width)).toBeLessThan(1.5);
  expect(geometry.radius).toBe('0px');
});

test('chip X removes a single value without opening the options list', async ({ page }) => {
  const root = page.locator('#selection-test-normal');
  await root.locator('.pg-field__surface').hover();
  const tray = root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  await tray.getByRole('button', { name: 'Видалити Amazon' }).click();
  await expect(tray).toBeVisible();
  await expect(root.locator('.pg-listbox__selected-chip')).toHaveCount(4);
  await expect(root.locator('.pg-listbox__panel')).toBeHidden();
  const result = await page.evaluate(() => ({
    changes: window.pgSelectedChanges,
    fields: Array.from(document.querySelectorAll('#selection-test-normal input[name="marketplaces"]'))
      .map(input => input.value),
  }));
  expect(result.changes).toEqual([['prom', 'rozetka', 'promua', 'etsy']]);
  expect(result.fields).toEqual(['prom', 'rozetka', 'promua', 'etsy']);
});

test('summary X is a real keyboard-focusable button, not a nested button', async ({ page }) => {
  const root = page.locator('#selection-test-normal');
  const button = root.locator('.pg-listbox__value--interactive')
    .getByRole('button', { name: 'Видалити Пром.ua' });
  const invalidNesting = await root.evaluate(element =>
    element.querySelectorAll('button button').length);
  expect(invalidNesting).toBe(0);
  await button.focus();
  await button.press('Enter');
  await expect(root.locator('input[name="marketplaces"]')).toHaveCount(4);
  await expect(root.locator('.pg-listbox__panel')).toBeHidden();
  await expect(root.locator('.pg-listbox__selection-tray')).toBeVisible();
});

test('extension opens immediately ABOVE when the field sits near the viewport bottom', async ({ page }) => {
  const root = page.locator('#selection-test-near-bottom');
  await root.locator('.pg-field__surface').hover();
  const tray = root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  const geometry = await root.evaluate(element => {
    const frame = element.querySelector('.pg-field__surface').getBoundingClientRect();
    const extended = element.querySelector('.pg-listbox__selection-tray').getBoundingClientRect();
    return {
      side: element.querySelector('.pg-listbox').dataset.pgTraySide,
      gap: frame.top - extended.bottom,
      widthDiff: frame.width - extended.width,
      radius: getComputedStyle(element.querySelector('.pg-field__surface')).borderTopLeftRadius,
    };
  });
  expect(geometry.side).toBe('up');
  expect(Math.abs(geometry.gap)).toBeLessThan(2.5);
  expect(Math.abs(geometry.widthDiff)).toBeLessThan(1.5);
  expect(geometry.radius).toBe('0px');
});

test('clicking the main trigger switches from the expanded chips to the options list', async ({ page }) => {
  const root = page.locator('#selection-test-normal');
  await root.locator('.pg-field__surface').hover();
  await expect(root.locator('.pg-listbox__selection-tray')).toBeVisible();
  await root.locator('.pg-listbox__trigger').click({ position: { x: 305, y: 28 } });
  await expect(root.locator('.pg-listbox__selection-tray')).toBeHidden();
  await expect(root.locator('.pg-listbox__panel')).toBeVisible();
  await expect(root.locator('.pg-listbox__trigger')).toHaveAttribute('aria-expanded', 'true');
});
