/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED FIELD FEEDBACK STABILITY E2E                               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє незмінність геометрії при коротких помилках.              ║
 * ║ ЗАЛЕЖНОСТІ: Playwright і сім наявних Field/Input компонентів.                   ║
 * ║ ПУБЛІЧНИЙ API: Playwright test suite для /tools і /login-demo.                    ║
 * ║ ПРИНЦИП: Перевірка спільного контракту; тест не вводить нових UI компонентів.    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

function stableRects(page, selector) {
  return page.locator(selector).evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
}

function compareRects(actual, expected) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((item, i) => {
    for (const key of ['x', 'y', 'width', 'height']) {
      expect(Math.abs(item[key] - expected[i][key])).toBeLessThan(1);
    }
  });
}

test('seven shared Field owners retain input/label/next-field coordinates across errors', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const modules = await Promise.all([
      import('/src/ui/input/input.js'),
      import('/src/ui/select/select.js'),
      import('/src/ui/combobox/combobox.js'),
      import('/src/ui/listbox/listbox.js'),
      import('/src/ui/tag-field/tag-field.js'),
      import('/src/ui/number-field/number-field.js'),
      import('/src/ui/textarea/textarea.js'),
    ]);
    const factories = [
      modules[0].createInput,
      modules[1].createSelect,
      modules[2].createCombobox,
      modules[3].createListbox,
      modules[4].createTagField,
      modules[5].createNumberField,
      modules[6].createTextarea,
    ];
    const root = document.createElement('section');
    root.id = 'pg-feedback-test';
    root.style.cssText = [
      'position:fixed', 'inset:20px auto auto 20px',
      'width:340px', 'display:grid', 'gap:8px',
      'z-index:99', 'background:var(--pg-color-page)',
    ].join(';');
    const options = [{ label: 'Перша', value: 'one' }];
    const fields = factories.map((create, index) => create({
      id: 'pg-feedback-' + index,
      label: 'Поле ' + index,
      description: 'Постійний підпис',
      options, autoResize: false,
    }));
    const noHint = modules[0].createInput({ label: 'Без підказки', id: 'pg-feedback-plain' });
    fields.push(noHint);
    fields.forEach(field => root.append(field.element));
    document.body.append(root);
    window.pgFeedbackTest = { fields };
  });
  const selector = '#pg-feedback-test > div, #pg-feedback-test > div .pg-field__label, #pg-feedback-test > div .pg-field__surface';
  const initial = await stableRects(page, selector);
  await page.evaluate(() => {
    for (const field of window.pgFeedbackTest.fields) {
      field.setError('Обов’язкове поле');
    }
  });
  compareRects(await stableRects(page, selector), initial);
  const errors = page.locator('#pg-feedback-test [id$="-error"]:visible');
  await expect(errors).toHaveCount(8);
  for (let i = 0; i < 8; i++) {
    const owner = page.locator('#pg-feedback-test > div').nth(i);
    // TagField's native input lives inside its composite Field surface.
    const inputOrTrigger = i === 4 ? owner.locator('.pg-tag-field__input')
      : owner.locator('.pg-field__control').first();
    await expect(inputOrTrigger).toHaveAttribute('aria-invalid', 'true');
  }
  await page.evaluate(() => {
    for (const field of window.pgFeedbackTest.fields) field.setError('');
  });
  compareRects(await stableRects(page, selector), initial);
  await page.evaluate(() => {
    window.pgFeedbackTest.fields.forEach(field => field.destroy());
    delete window.pgFeedbackTest;
    document.querySelector('#pg-feedback-test').remove();
  });
});

test('login demo stays centered when success status appears after validation', async ({ page }) => {
  await page.goto('/login-demo');
  const targets = '.pg-login-demo__form, .pg-login-demo__form > .pg-input, .pg-login-demo__submit';
  const before = await stableRects(page, targets);
  await page.getByLabel('Логін').fill('demo');
  await page.getByLabel('Пароль').fill('example');
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page.getByRole('status')).toContainText('Справжній вхід не виконується.');
  compareRects(await stableRects(page, targets), before);
});
