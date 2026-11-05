/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — INPUT BROWSER TESTS                                                 ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Floating states, label semantics, search clear, error, themes.        ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, shared Input, tools input demo.                            ║
 * ║ ПУБЛІЧНИЙ API: Browser E2E.                                                        ║
 * ║ ПРИНЦИП: Тести не змінюють Shell і не використовують mock inputs.                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('floating labels respond to hover, focus, filled value and blur', async ({ page }) => {
  const field = page.locator('.pg-input').filter({ has: page.locator('[name="demo-product-name"]') });
  const label = field.locator('.pg-input__label');
  const control = field.locator('input');
  await expect(control).toHaveAccessibleName('Назва товару');
  const initial = await label.evaluate(node => getComputedStyle(node).transform);

  await field.locator('.pg-input__field').hover();
  await expect.poll(() => label.evaluate(node => getComputedStyle(node).transform)).not.toBe(initial);
  await page.mouse.move(0, 0);
  await expect.poll(() => label.evaluate(node => getComputedStyle(node).transform)).toBe(initial);

  await control.focus();
  await expect.poll(() => label.evaluate(node => getComputedStyle(node).transform)).not.toBe(initial);
  await control.fill('Протеїн');
  await control.blur();
  await expect(field).toHaveAttribute('data-pg-filled', 'true');
  await expect.poll(() => label.evaluate(node => getComputedStyle(node).transform)).not.toBe(initial);

  await control.fill('');
  await control.blur();
  await expect(field).toHaveAttribute('data-pg-filled', 'false');
  await expect.poll(() => label.evaluate(node => getComputedStyle(node).transform)).toBe(initial);
});

test('search has an icon, accessible label, optional visible hint, and working clear', async ({ page }) => {
  const search = page.locator('input[name="demo-search"]');
  const parent = page.locator('.pg-input--search').filter({ has: search });
  const clear = parent.getByRole('button', { name: 'Очистити поле Пошук товарів' });
  await expect(search).toHaveAccessibleName('Пошук товарів');
  await expect(parent.locator('.pg-input__leading-icon .pg-icon')).toHaveCount(1);
  await expect(clear).toBeHidden();

  await search.fill('Pinguin');
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(clear).toBeHidden();

  const withoutHint = page.locator('input[name="demo-search-empty"]');
  await expect(withoutHint).toHaveAccessibleName('Пошук без підказки');
  await expect(withoutHint).toHaveAttribute('placeholder', ' ');
  await expect(withoutHint).toBeVisible();
});

test('error and description are associated; standard and disabled states remain semantic', async ({ page }) => {
  const bad = page.locator('input[name="demo-article"]');
  await expect(bad).toHaveAttribute('aria-invalid', 'true');
  const errorId = await bad.getAttribute('aria-describedby');
  await expect(page.locator('#' + errorId)).toHaveText('Цей артикул уже використовується.');

  const standard = page.locator('input[name="demo-standard"]');
  await expect(standard).toHaveAccessibleName('Опис поля');
  const supportId = await standard.getAttribute('aria-describedby');
  await expect(page.locator('#' + supportId)).toHaveText('Постійний підпис для складних форм.');
  await expect(page.locator('.pg-input--standard').getByText('Опис поля')).toBeVisible();
  await expect(page.locator('input[name="demo-disabled"]')).toBeDisabled();
});

test('mobile, dark theme, reduced motion and keyboard navigation are preserved', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await theme.click();
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const name = page.locator('input[name="demo-product-name"]');
  await name.focus();
  await expect(name).toBeFocused();
  await expect(page.locator('.pg-input--floating .pg-input__label').first()).toHaveCSS('transition-duration', '0s');
  const field = name.locator('..');
  const rect = await field.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(390);

  await name.press('Tab');
  await expect(page.locator('input[name="demo-email"]')).toBeFocused();
});
