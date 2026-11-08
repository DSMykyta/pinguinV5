/**
 * PINGUIN NEXT — outlined shared field regression tests.
 * All fixtures are live DOM components, not screenshots of mocks.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const [
      { createInput }, { createSelect }, { createCombobox }, { createTagField },
    ] = await Promise.all([
      import('/src/ui/input/input.js'),
      import('/src/ui/select/select.js'),
      import('/src/ui/combobox/combobox.js'),
      import('/src/ui/tag-field/tag-field.js'),
    ]);
    const area = document.createElement('section');
    area.id = 'pg-field-test-area';
    area.style.cssText = 'width:min(480px,calc(100vw - 24px));padding:12px;margin:24px auto;display:grid;gap:24px';
    const leading = document.createElement('span');
    leading.textContent = 'UA';
    leading.id = 'pg-field-prefix';
    const trailing = document.createElement('button');
    trailing.type = 'button';
    trailing.textContent = '?';
    trailing.setAttribute('aria-label', 'Допомога');
    window.pgFieldTest = {
      text: createInput({ label: 'Назва', leading, trailing }),
      select: createSelect({
        label: 'Країна', name: 'country',
        options: [{ value: 'ua', label: 'Україна' }, { value: 'pl', label: 'Польща' }],
      }),
      combo: createCombobox({
        label: 'Вибір товару', name: 'product',
        options: [{ value: 'one', label: 'Протеїн' }, { value: 'two', label: 'Креатин' }],
      }),
      tags: createTagField({ label: 'Альтернативні назви', name: 'aliases' }),
    };
    for (const field of Object.values(window.pgFieldTest)) area.append(field.element);
    document.body.append(area);
  });
});

test('all empty fields start with label inside and focus floats label onto top outline', async ({ page }) => {
  for (const type of ['input', 'select', 'combobox', 'tag-field']) {
    const field = page.locator('#pg-field-test-area .pg-' + type);
    const shell = field.locator('.pg-field').first();
    const label = shell.locator('.pg-field__label');
    const control = type === 'select' ? field.locator('select')
      : type === 'combobox' ? field.locator('input[role=combobox]')
      : field.locator('input:not([type=hidden])');
    const idle = await label.boundingBox();
    const outer = await shell.boundingBox();
    expect(Math.abs(idle.y + idle.height / 2 - (outer.y + outer.height / 2))).toBeLessThan(8);
    await control.focus();
    await expect.poll(async () => {
      const floated = await label.boundingBox();
      const outline = await shell.boundingBox();
      return Math.abs(floated.y + floated.height / 2 - outline.y);
    }).toBeLessThan(4);
    await control.blur();
  }
});

test('input adornments are independent of text width and focus remains native', async ({ page }) => {
  const field = page.locator('#pg-field-test-area .pg-input').first();
  const prefix = field.locator('#pg-field-prefix');
  const label = field.locator('.pg-field__label');
  const rect = await prefix.boundingBox();
  const labelRect = await label.boundingBox();
  expect(labelRect.x).toBeGreaterThan(rect.x + rect.width - 3);
  await field.getByRole('textbox', { name: 'Назва' }).fill('Pinguin');
  await expect(field.locator('.pg-field')).toHaveAttribute('data-pg-filled', 'true');
  await field.getByRole('button', { name: 'Допомога' }).click();
  await expect(field.getByRole('textbox', { name: 'Назва' })).toHaveValue('Pinguin');
});

test('select is native, retains values in a form and floats when filled', async ({ page }) => {
  const select = page.getByRole('combobox', { name: 'Країна' });
  await select.selectOption('pl');
  await expect(select).toHaveValue('pl');
  const shell = page.locator('#pg-field-test-area .pg-select .pg-field');
  await expect(shell).toHaveAttribute('data-pg-filled', 'true');
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.append(window.pgFieldTest.select.element);
    document.body.append(form);
    window.pgFieldFormValue = new FormData(form).get('country');
  });
  expect(await page.evaluate(() => window.pgFieldFormValue)).toBe('pl');
});

test('combobox chooses by ArrowDown and Enter and stores stable value', async ({ page }) => {
  const combo = page.getByRole('combobox', { name: 'Вибір товару' });
  await combo.fill('Кре');
  await expect(page.getByRole('option', { name: 'Креатин' })).toBeVisible();
  await combo.press('ArrowDown');
  await combo.press('Enter');
  await expect(combo).toHaveValue('Креатин');
  await expect.poll(() => page.evaluate(() => window.pgFieldTest.combo.getValue())).toBe('two');
  await expect(page.locator('#pg-field-test-area .pg-combobox .pg-field')).toHaveAttribute('data-pg-filled', 'true');
  await combo.focus();
  await combo.press('Escape');
  await expect(combo).toHaveValue('Креатин');
});

test('tag field adds/removes values and floats its label for populated values', async ({ page }) => {
  const field = page.locator('#pg-field-test-area .pg-tag-field');
  const input = field.locator('input[type=text]');
  await input.fill('Перший');
  await input.press('Enter');
  await expect(field.getByRole('button', { name: 'Видалити Перший' })).toBeVisible();
  await expect(field.locator('.pg-field')).toHaveAttribute('data-pg-filled', 'true');
  await input.fill('Другий');
  await input.press('Enter');
  await expect(field.getByRole('button', { name: 'Видалити Другий' })).toBeVisible();
  await input.press('Backspace');
  await expect(field.locator('.pg-tag-field__tag[data-pg-armed=true]')).toHaveCount(1);
  await input.press('Backspace');
  await expect(field.getByRole('button', { name: 'Видалити Другий' })).toHaveCount(0);
  await input.press('ControlOrMeta+z');
  await expect(field.getByRole('button', { name: 'Видалити Другий' })).toBeVisible();
});

test('dark theme, reduced motion and mobile widths retain the same outline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  for (const type of ['input', 'select', 'combobox', 'tag-field']) {
    const shell = page.locator('#pg-field-test-area .pg-' + type + ' .pg-field').first();
    const rect = await shell.boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(390);
    await expect(shell).toHaveCSS('transition-duration', '0s');
  }
});
