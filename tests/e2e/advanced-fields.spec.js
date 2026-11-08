/**
 * PINGUIN NEXT — INDEPENDENT ADVANCED CONTROLS
 * Real browser behavior, isolated test fixtures and form serialization.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const [{ createTextarea }, { createNumberField }, { createCheckbox },
      { createSwitch }, { createRadioGroup }] = await Promise.all([
      import('/src/ui/textarea/textarea.js'),
      import('/src/ui/number-field/number-field.js'),
      import('/src/ui/checkbox/checkbox.js'),
      import('/src/ui/switch/switch.js'),
      import('/src/ui/radio-group/radio-group.js'),
    ]);
    const area = document.createElement('section');
    area.id = 'pg-advanced-test-area';
    area.style.cssText = 'width:min(460px,calc(100vw - 24px));margin:30px auto;padding:12px;display:grid;gap:24px';
    const controls = {
      note: createTextarea({
        label: 'Примітка', name: 'note', description: 'Введіть деталі',
        rows: 3, minRows: 3, maxRows: 5, maxLength: 200, showCount: true,
      }),
      weight: createNumberField({
        label: 'Вага', name: 'weight', min: 0, max: 1,
        step: .25, value: .25, unit: 'кг',
      }),
      check: createCheckbox({
        label: 'Обрати все', name: 'select-all', indeterminate: true,
        description: 'Деякі записи вибрано',
      }),
      toggle: createSwitch({
        label: 'Публікація', name: 'published', checked: false,
        onChange: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return false;
        },
      }),
      radio: createRadioGroup({
        label: 'Доставка', name: 'delivery', value: 'pickup',
        options: [
          { label: 'Самовивіз', value: 'pickup' },
          { label: 'Кур’єр', value: 'courier', description: 'Адресна доставка' },
          { label: 'Пошта', value: 'post', disabled: true },
        ],
      }),
    };
    window.pgAdvancedControls = controls;
    Object.values(controls).forEach(component => area.append(component.element));
    document.body.append(area);
  });
});

test('Textarea grows then shrinks, shows its counter and keeps top-border label', async ({ page }) => {
  const field = page.locator('#pg-advanced-test-area .pg-textarea');
  const input = field.getByRole('textbox', { name: 'Примітка' });
  await expect(input).toHaveAttribute('aria-describedby', /-description/);
  await expect(field.locator('.pg-textarea__counter')).toHaveText('0 / 200');
  await input.fill('Один рядок\n'.repeat(8));
  await expect(field.locator('.pg-field')).toHaveAttribute('data-pg-filled', 'true');
  await expect.poll(() => input.evaluate(node => parseFloat(node.style.height))).toBeGreaterThan(120);
  const expanded = await input.evaluate(node => parseFloat(node.style.height));
  await input.fill('Коротко');
  await expect(field.locator('.pg-textarea__counter')).toHaveText('7 / 200');
  await expect.poll(() => input.evaluate(node => parseFloat(node.style.height))).toBeLessThan(expanded);
  await input.focus();
  await expect.poll(async () => {
    const label = await field.locator('.pg-field__label').boundingBox();
    const outline = await field.locator('.pg-field').boundingBox();
    return Math.abs(label.y + label.height / 2 - outline.y);
  }).toBeLessThan(4);
});

test('Number Field preserves numeric semantics and steps without rounding drift', async ({ page }) => {
  const field = page.locator('#pg-advanced-test-area .pg-number-field');
  const input = field.getByRole('spinbutton', { name: 'Вага' });
  await expect(input).toHaveValue('0.25');
  await field.getByRole('button', { name: 'Збільшити Вага' }).click();
  await expect(input).toHaveValue('0.5');
  await field.getByRole('button', { name: 'Збільшити Вага' }).click();
  await field.getByRole('button', { name: 'Збільшити Вага' }).click();
  await expect(input).toHaveValue('1');
  await expect(field.getByRole('button', { name: 'Збільшити Вага' })).toBeDisabled();
  await input.fill('');
  await expect(field.locator('.pg-field')).toHaveAttribute('data-pg-filled', 'false');
  expect(await page.evaluate(() => window.pgAdvancedControls.weight.getValue())).toBe(null);
  await input.fill('0.75');
  expect(await page.evaluate(() => window.pgAdvancedControls.weight.getValue())).toBe(.75);
});

test('Checkbox has native form and mixed-state behavior', async ({ page }) => {
  const box = page.locator('#pg-advanced-test-area').getByRole('checkbox', { name: 'Обрати все' });
  await expect(box).toHaveAttribute('aria-describedby', /-description/);
  expect(await page.evaluate(() => window.pgAdvancedControls.check.getState().indeterminate)).toBe(true);
  await box.press('Space');
  expect(await page.evaluate(() => window.pgAdvancedControls.check.getState().indeterminate)).toBe(false);
  await expect(box).toBeChecked();
  const selected = await page.evaluate(() => {
    const f = document.createElement('form');
    f.append(window.pgAdvancedControls.check.element);
    document.body.append(f);
    return new FormData(f).get('select-all');
  });
  expect(selected).toBe('on');
});

test('Switch rolls back rejected async changes without showing a fake success', async ({ page }) => {
  const toggle = page.locator('#pg-advanced-test-area').getByRole('switch', { name: 'Публікація' });
  await expect(toggle).not.toBeChecked();
  await toggle.press('Space');
  await expect(page.locator('#pg-advanced-test-area .pg-switch')).toHaveAttribute('data-pg-state', 'ready');
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('#pg-advanced-test-area .pg-switch__status')).toContainText('відновлено');
});

test('Radio Group uses native exclusive selection and arrow navigation', async ({ page }) => {
  const group = page.locator('#pg-advanced-test-area .pg-radio-group');
  const pickup = group.getByRole('radio', { name: 'Самовивіз' });
  const courier = group.getByRole('radio', { name: 'Кур’єр' });
  const post = group.getByRole('radio', { name: 'Пошта' });
  await expect(pickup).toBeChecked();
  await expect(post).toBeDisabled();
  await pickup.focus();
  await pickup.press('ArrowDown');
  await expect(courier).toBeChecked();
  expect(await page.evaluate(() => window.pgAdvancedControls.radio.getValue())).toBe('courier');
  const selected = await page.evaluate(() => {
    const f = document.createElement('form');
    f.append(window.pgAdvancedControls.radio.element);
    document.body.append(f);
    return new FormData(f).get('delivery');
  });
  expect(selected).toBe('courier');
});

test('Two component instances do not share values or cleanup state', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createNumberField } = await import('/src/ui/number-field/number-field.js');
    const first = createNumberField({ label: 'Перший', value: 1 });
    const second = createNumberField({ label: 'Другий', value: 9 });
    document.body.append(first.element, second.element);
    first.setValue(3);
    const before = [first.getValue(), second.getValue()];
    first.destroy();
    const after = second.getValue();
    second.destroy();
    return { before, after };
  });
  expect(result).toEqual({ before: [3, 9], after: 9 });
});
