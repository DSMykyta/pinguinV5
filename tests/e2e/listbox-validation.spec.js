/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LISTBOX VALIDATION E2E                                               ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Red error text and valid/empty selection transitions in a real browser.║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test; shared Field, Listbox and existing Tools demo.         ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/listbox-validation.spec.js.                 ║
 * ║ ПРИНЦИП: Test existing components without new production controls or button skins.  ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('required Listbox uses one red text/border/label/caret state and clears it on selection', async ({ page }) => {
  const field = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(2);
  const trigger = field.locator('.pg-listbox__trigger');
  const shell = field.locator('.pg-field');
  const surface = shell.locator('.pg-field__surface');
  const label = shell.locator('.pg-field__label');
  const caret = shell.locator('.pg-field__caret');
  const problem = field.locator('.pg-listbox__error');

  await expect(problem).toHaveText('Оберіть хоча б один маркетплейс.');
  await expect(problem).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-required', 'true');
  await expect(trigger).toHaveAttribute('aria-invalid', 'true');
  await expect(shell).toHaveAttribute('data-pg-state', 'error');
  const red = await problem.evaluate(el => getComputedStyle(el).color);
  await expect(label).toHaveCSS('color', red);
  await expect(trigger).toHaveCSS('color', red);
  await expect(caret).toHaveCSS('color', red);
  await trigger.hover();
  await expect(surface).toHaveCSS('border-top-color', red);

  await trigger.click();
  await expect(surface).toHaveCSS('border-top-color', red);
  await page.getByRole('option', { name: 'Пром.ua', exact: true }).click();
  await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
  await expect(problem).toBeHidden();
  await expect(shell).toHaveAttribute('data-pg-state', 'ready');
  await expect(field.locator('.pg-listbox__value')).toHaveText('Пром.ua');
  const normalInk = await trigger.evaluate(el => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--pg-color-text-primary)';
    el.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  await expect(trigger).toHaveCSS('color', normalInk);
});

test('required multi Listbox revalidates last removal, select all, and programmatic selection', async ({ page }) => {
  await page.evaluate(async () => {
    const { createListbox } = await import('/src/ui/listbox/listbox.js');
    const instance = createListbox({
      id: 'pg-required-multi-regression',
      label: 'Перевірка мультивибору',
      required: true,
      multiple: true,
      selectAll: true,
      options: [
        { value: 'prom', label: 'Пром.ua' },
        { value: 'rozetka', label: 'Rozetka' },
      ],
      error: 'Оберіть хоча б один маркетплейс.',
    });
    document.querySelector('.pg-tools-listbox-demo__grid').append(instance.element);
    window.pgRequiredMultiRegression = instance;
  });
  const field = page.locator('.pg-listbox').filter({
    has: page.locator('#pg-required-multi-regression'),
  });
  const trigger = field.locator('.pg-listbox__trigger');
  const problem = field.locator('.pg-listbox__error');

  await expect(problem).toBeVisible();
  await trigger.click();
  await page.getByRole('option', { name: 'Пром.ua', exact: true }).click();
  await expect(problem).toBeHidden();
  await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('option', { name: 'Пром.ua', exact: true }).click();
  await expect(problem).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-invalid', 'true');

  await field.getByRole('button', { name: 'Вибрати всі' }).click();
  await expect(problem).toBeHidden();
  await field.getByRole('button', { name: 'Зняти всі' }).click();
  await expect(problem).toBeVisible();

  await page.evaluate(() => window.pgRequiredMultiRegression.setValue(['rozetka']));
  await expect(problem).toBeHidden();
  await page.evaluate(() => window.pgRequiredMultiRegression.setValue([]));
  await expect(problem).toBeVisible();
});

test('dark theme keeps invalid text red and clears it on valid choice', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const field = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(2);
  const trigger = field.locator('.pg-listbox__trigger');
  const problem = field.locator('.pg-listbox__error');
  const red = await problem.evaluate(el => getComputedStyle(el).color);
  await expect(trigger).toHaveCSS('color', red);
  await trigger.click();
  await page.getByRole('option', { name: 'Rozetka', exact: true }).click();
  await expect(problem).toBeHidden();
  await expect(trigger).not.toHaveAttribute('aria-invalid', 'true');
});
