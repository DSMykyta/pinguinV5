/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED FIELD DENSITY E2E                                                            ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Контракт розмірів Input/Select/Combobox/Listbox/Number/Tag та співвідношення з Checkbox. ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, спільні компоненти у Tools.                                           ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/field-density.spec.js.                                ║
 * ║ ПРИНЦИП: Перевіряє спільний токен, не підмінює логіку компонентів.                                  ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const FIELD_SELECTORS = [
  '.pg-tools-field-demo .pg-input .pg-field__surface',
  '.pg-tools-field-demo .pg-select .pg-field__surface',
  '.pg-tools-field-demo .pg-combobox .pg-field__surface',
  '.pg-tools-listbox-demo .pg-listbox > .pg-field .pg-field__surface',
  '.pg-tools-advanced-fields .pg-number-field .pg-field__surface',
  '.pg-tools-field-demo .pg-tag-field .pg-field__surface',
];

async function visitTools(page) {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
}

async function dimensions(page) {
  return page.evaluate(selectors => {
    const sizes = selectors.map(selector => {
      const element = document.querySelector(selector);
      if (!element) throw new Error('Missing shared control: ' + selector);
      const control = element.querySelector('.pg-field__control');
      return {
        surface: element.getBoundingClientRect().height,
        inner: control?.getBoundingClientRect().height,
      };
    });
    const row = document.querySelector('.pg-tools-advanced-fields .pg-checkbox__row');
    const box = document.querySelector('.pg-tools-advanced-fields .pg-checkbox__box');
    const hit = document.querySelector('.pg-tools-advanced-fields .pg-checkbox__hit');
    return {
      sizes,
      checkboxRow: row.getBoundingClientRect().height,
      checkboxHit: [hit.getBoundingClientRect().width, hit.getBoundingClientRect().height],
      checkboxBox: box.getBoundingClientRect().height,
      touch: matchMedia('(pointer: coarse)').matches,
      token: getComputedStyle(document.documentElement).getPropertyValue('--pg-field-control-size').trim(),
    };
  }, FIELD_SELECTORS);
}

test('all six single-line fields remain 40px beside the universal table-sized checkbox', async ({ page }) => {
  await visitTools(page);
  const metrics = await dimensions(page);
  expect(metrics.touch).toBe(false);
  expect(metrics.sizes).toHaveLength(6);
  expect(metrics.sizes.every(size => Math.abs(size.surface - 40) < .25)).toBe(true);
  expect(metrics.sizes.every(size => size.inner <= 40 && size.inner >= 32)).toBe(true);
  // Descriptions can make the surrounding label row taller, but not the checkbox itself.
  expect(metrics.checkboxRow).toBeGreaterThanOrEqual(32);
  expect(metrics.checkboxHit).toEqual([32, 32]);
  expect(metrics.checkboxBox).toBe(24);

  const multiline = await page.locator('.pg-tools-advanced-fields .pg-textarea .pg-field__surface').first().boundingBox();
  expect(multiline.height).toBeGreaterThan(40);
});

test('touch input increases every shared hit target to 44px without resizing a checkbox glyph', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    await visitTools(page);
    const metrics = await dimensions(page);
    expect(metrics.touch).toBe(true);
    expect(metrics.token).toBe('44px');
    // Fractional layout zoom can produce 43.9999px or 44.0001px.
    expect(metrics.sizes).toHaveLength(6);
    expect(metrics.sizes.every(size => Math.abs(size.surface - 44) < .25)).toBe(true);
    expect(metrics.checkboxHit).toEqual([32, 32]);
    expect(metrics.checkboxBox).toBe(24);

    const listbox = page.locator('.pg-tools-listbox-demo .pg-listbox').first();
    const caret = listbox.locator('.pg-field__caret');
    await caret.scrollIntoViewIfNeeded();
    const arrow = await caret.boundingBox();
    expect(arrow).not.toBeNull();
    // The decorative caret must pass touch through to the actual trigger.
    const target = await caret.evaluate(node => {
      const bounds = node.getBoundingClientRect();
      return document.elementFromPoint(
        bounds.x + bounds.width / 2, bounds.y + bounds.height / 2
      )?.closest('.pg-listbox__trigger') !== null;
    });
    expect(target).toBe(true);
    await page.touchscreen.tap(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
    await expect(listbox.locator('.pg-listbox__trigger')).toHaveAttribute('aria-expanded', 'true');
    await expect(listbox.locator('.pg-listbox__panel')).toBeVisible();
  } finally {
    await context.close();
  }
});
