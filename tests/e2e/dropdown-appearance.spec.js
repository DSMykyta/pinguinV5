/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E DROPDOWN APPEARANCE                                                              ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє dropdown appearance у браузері через Playwright.                        ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/dropdown-appearance.spec.js.                           ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const [{ createListbox }, { createCombobox }] = await Promise.all([
      import('/src/ui/listbox/listbox.js'),
      import('/src/ui/combobox/combobox.js'),
    ]);
    const options = Array.from({ length: 25 }, (_, i) => ({
      value: 'v-' + i, label: 'Варіант ' + (i + 1),
    }));
    const widget = {
      listbox: createListbox({
        label: 'Маркетплейси', multiple: true, searchable: true, options,
      }),
      combobox: createCombobox({ label: 'Товар у каталозі', options }),
    };
    for (const [key, control] of Object.entries(widget)) {
      const holder = document.createElement('div');
      holder.id = 'visual-test-' + key;
      holder.style.cssText = 'position:fixed;top:120px;left:' +
        (key === 'listbox' ? '60px' : '450px') +
        ';width:315px;z-index:90';
      holder.append(control.element);
      document.body.append(holder);
    }
  });
});

async function sameWidth(page, name, popupSelector) {
  const root = page.locator('#visual-test-' + name);
  const values = await root.evaluate((container, popupSelector) => {
    const field = container.querySelector('.pg-field__surface').getBoundingClientRect();
    const popup = container.querySelector(popupSelector).getBoundingClientRect();
    return { deltaX: popup.x - field.x, deltaWidth: popup.width - field.width };
  }, popupSelector);
  expect(Math.abs(values.deltaX)).toBeLessThan(1.5);
  expect(Math.abs(values.deltaWidth)).toBeLessThan(1.5);
}

async function angle(page, selector) {
  return page.locator(selector).evaluate(node => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
    return Math.round((Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360);
  });
}

test('Listbox dropdown spans the full outlined field and arrow rotates on open/close', async ({ page }) => {
  const root = page.locator('#visual-test-listbox');
  const arrow = '#visual-test-listbox .pg-field__caret';
  await expect.poll(() => angle(page, arrow)).toBe(0);
  await root.locator('.pg-listbox__trigger').click();
  await expect(root.locator('.pg-listbox__trigger')).toHaveAttribute('aria-expanded', 'true');
  await sameWidth(page, 'listbox', '.pg-listbox__panel');
  await expect.poll(() => angle(page, arrow)).toBe(180);
  await root.locator('.pg-listbox__search').press('Escape');
  await expect(root.locator('.pg-listbox__trigger')).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => angle(page, arrow)).toBe(0);
});

test('Combobox dropdown matches the whole field including its chevron', async ({ page }) => {
  const root = page.locator('#visual-test-combobox');
  const arrow = '#visual-test-combobox .pg-field__caret';
  const input = root.getByRole('combobox', { name: 'Товар у каталозі' });
  await expect.poll(() => angle(page, arrow)).toBe(0);
  await input.focus();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await sameWidth(page, 'combobox', '.pg-combobox__list');
  await expect.poll(() => angle(page, arrow)).toBe(180);
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => angle(page, arrow)).toBe(0);
});

test('scrollbar remains compact without arrow buttons in long selection lists', async ({ page }) => {
  const root = page.locator('#visual-test-listbox');
  await root.locator('.pg-listbox__trigger').click();
  const panel = root.locator('.pg-listbox__panel');
  const styles = await panel.evaluate(node => ({
    width: getComputedStyle(node).scrollbarWidth,
    arrowDisplay: getComputedStyle(node, '::-webkit-scrollbar-button').display,
    maxHeight: getComputedStyle(node).maxHeight,
  }));
  expect(styles.width).toBe('auto'); // Chromium uses the shared 8px WebKit scrollbar skin.
  expect(styles.arrowDisplay).toBe('none');
  expect(parseFloat(styles.maxHeight)).toBeGreaterThan(100);
});

test('reduced motion disables the rotating arrow transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [root, selector] of [
    ['listbox', '.pg-field__caret'],
    ['combobox', '.pg-field__caret'],
  ]) {
    const duration = await page.locator('#visual-test-' + root + ' ' + selector)
      .evaluate(el => getComputedStyle(el).transitionDuration);
    expect(duration).toBe('0s');
  }
});


test('shared dropdown options have flat joining edges with rounded popup exterior', async ({ page }) => {
  const root = page.locator('#visual-test-listbox');
  await root.locator('.pg-listbox__trigger').click();
  const first = root.getByRole('option', { name: 'Варіант 1', exact: true });
  const second = root.getByRole('option', { name: 'Варіант 2', exact: true });
  await first.click();
  await second.click();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(first).toHaveCSS('border-radius', '0px');
  await expect(second).toHaveCSS('border-radius', '0px');
  const a = await first.boundingBox(), b = await second.boundingBox();
  expect(Math.abs(a.y+a.height-b.y)).toBeLessThan(1);
  await expect(root.locator('.pg-listbox__panel')).not.toHaveCSS('border-radius', '0px');
  await page.keyboard.press('Escape');
  const combo = page.locator('#visual-test-combobox');
  await combo.getByRole('combobox').focus();
  await expect(combo.getByRole('option').first()).toHaveCSS('border-radius', '0px');
});
