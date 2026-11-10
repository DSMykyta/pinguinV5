/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED SELECTION DROPDOWNS E2E                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє caret hit target на всіх тестових Select, Combobox, Listbox та sort fields. ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, наявні компоненти та демо маршруту /tools.                           ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/selection-caret.spec.js.                              ║
 * ║ ПРИНЦИП: Один Field caret, збереження нативних/custom семантик і ніяких fixture-only реалізацій.  ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function caretPoint(field) {
  const caret = field.locator('.pg-field__caret');
  await caret.scrollIntoViewIfNeeded();
  return caret.evaluate(arrow => {
    const box = arrow.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const root = arrow.closest('.pg-field');
    const control = root.querySelector('.pg-field__control');
    const trailing = root.querySelector('.pg-field__trailing');
    return {
      x, y, hitsControl: document.elementFromPoint(x, y) === control,
      trailingEvents: getComputedStyle(trailing).pointerEvents,
      caretEvents: getComputedStyle(arrow).pointerEvents,
      caretWidth: arrow.offsetWidth, // Layout width, not 45° transformed bounding box.
      trailingWidth: trailing.getBoundingClientRect().width,
      surfaceHeight: root.querySelector('.pg-field__surface').getBoundingClientRect().height,
    };
  });
}

async function clickCaret(page, field) {
  const hit = await caretPoint(field);
  expect(hit.hitsControl).toBe(true);
  expect(hit.trailingEvents).toBe('none');
  expect(hit.caretEvents).toBe('none');
  expect(hit.trailingWidth).toBe(44);
  expect(hit.caretWidth).toBe(9);
  expect(Math.abs(hit.surfaceHeight - 40)).toBeLessThan(.5);
  await page.mouse.click(hit.x, hit.y);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('every demo value selector uses the same Field caret in both viewports and themes', async ({ page }) => {
  const fields = page.locator('.pg-tools-field-demo .pg-select, .pg-tools-field-demo .pg-combobox, .pg-tools-listbox-demo .pg-listbox');
  await expect(fields).toHaveCount(5);

  for (const [width, theme] of [[1280, 'light'], [390, 'dark']]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(next => {
      if (next === 'dark') document.documentElement.setAttribute('data-theme', next);
      else document.documentElement.removeAttribute('data-theme');
    }, theme);
    for (const field of await fields.all()) {
      const hit = await caretPoint(field);
      expect(hit.hitsControl).toBe(true);
      expect(hit.trailingEvents).toBe('none');
      expect(hit.caretEvents).toBe('none');
      expect(hit.trailingWidth).toBe(44);
      expect(Math.abs(hit.surfaceHeight - 40)).toBeLessThan(.5);
      await expect(field.locator('.pg-field__caret')).toHaveCSS('border-right-width', '2px');
      await expect(field.locator('.pg-field__caret')).toHaveCSS('transition-property', 'transform');
    }
  }
});

test('each of the three real Listbox demos opens directly from its arrow and closes on Escape', async ({ page }) => {
  const fields = page.locator('.pg-tools-listbox-demo .pg-listbox');
  await expect(fields).toHaveCount(3);
  for (const field of await fields.all()) {
    const trigger = field.locator('.pg-listbox__trigger');
    await clickCaret(page, field);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(field.locator('.pg-listbox__panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(field.locator('.pg-listbox__panel')).toBeHidden();
  }
});

test('Combobox caret reopens suggestions even if Escape left the input focused', async ({ page }) => {
  const field = page.locator('.pg-tools-field-demo .pg-combobox');
  const input = field.getByRole('combobox', { name: 'Товар у каталозі' });
  await clickCaret(page, field);
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).toBeFocused();

  await clickCaret(page, field);
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await field.getByRole('option', { name: 'Креатин моногідрат' }).click();
  await expect(input).toHaveValue('Креатин моногідрат');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});

test('native Select and collection sorting Selects keep the caret inside the native hit target', async ({ page }) => {
  const country = page.locator('.pg-tools-field-demo .pg-select');
  const native = country.locator('select');
  await clickCaret(page, country);
  await expect(native).toBeFocused();
  await native.press('Escape');
  await native.selectOption('pl');
  await expect(native).toHaveValue('pl');

  for (const tab of ['Макети даних', 'Медіатека']) {
    await page.getByRole('tab', { name: tab }).click();
    const asideToggle = page.locator('[data-pg-action="aside-toggle"]');
    const aside = page.locator('#pg-aside-panel');
    if (await aside.getAttribute('aria-hidden') === 'true') await asideToggle.click();
    const sorting = aside.locator('.pg-select');
    await expect(sorting).toHaveCount(1);
    await clickCaret(page, sorting);
    await expect(sorting.locator('select')).toBeFocused();
    await sorting.locator('select').press('Escape');
  }
});

test('action Menu is still a separate shared component, not a cloned value picker', async ({ page }) => {
  const menu = page.locator('.pg-tools-menu-demo .pg-menu').first();
  await menu.locator('.pg-menu__trigger').click();
  await expect(menu.locator('.pg-menu__panel')).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Дублювати' }).click();
  await expect(menu.locator('.pg-menu__panel')).toBeHidden();
});

test('custom selection popup and options have one shared skin', async ({ page }) => {
  const listbox = page.locator('.pg-tools-listbox-demo .pg-listbox').first();
  const combo = page.locator('.pg-tools-field-demo .pg-combobox');
  await combo.getByRole('combobox').focus(); // Combobox suggestions render on opening.
  const popupSelectors = [
    ['.pg-listbox__panel', listbox],
    ['.pg-combobox__list', combo],
  ];
  const styles = [];
  for (const [selector, owner] of popupSelectors) {
    const popup = owner.locator(selector);
    await expect(popup).toHaveClass(/pg-field__popup/);
    const option = owner.locator('.pg-field__option').first();
    await expect(option).toHaveCSS('min-block-size', '38px');
    styles.push(await popup.evaluate(node => {
      const css = getComputedStyle(node);
      // PositionPopup clamps the rendered height to remaining viewport space.
      // That limit is placement, not a skin variation.
      return [css.padding, css.borderRadius, css.boxShadow];
    }));
  }
  expect(styles[0]).toEqual(styles[1]);
});

test('reduced motion disables caret transition once in the shared Field skin', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fields = page.locator('.pg-tools-field-demo .pg-select, .pg-tools-field-demo .pg-combobox, .pg-tools-listbox-demo .pg-listbox');
  for (const field of await fields.all()) {
    await expect(field.locator('.pg-field__caret')).toHaveCSS('transition-duration', '0s');
  }
});
