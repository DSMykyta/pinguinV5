/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LISTBOX TOOLBAR E2E                                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Search + shared tri-state Checkbox in one row, filtering and mixed selection.            ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test; existing Tools Listbox preview and shared Field/Input/Button.         ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/listbox-toolbar.spec.js.                                    ║
 * ║ ПРИНЦИП: Перевірка реального UX з чинним native Checkbox, без нових UI-скінів.                        ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', {name:'Текст'}).click();
});

test('compact search and existing tri-state checkbox share one row, label stays accessible', async ({page}) => {
  const single = page.locator('.pg-tools-listbox-demo .pg-listbox').first();
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await single.locator('.pg-listbox__trigger').click();
  await expect(single.locator('.pg-listbox__toolbar')).toHaveCount(0);
  await single.locator('.pg-listbox__trigger').click();

  await multi.locator('.pg-listbox__trigger').click();
  const toolbar = multi.locator('.pg-listbox__toolbar');
  const search = toolbar.locator('.pg-listbox__search-field .pg-field__surface');
  const label = toolbar.locator('.pg-field__label');
  const all = toolbar.locator('.pg-listbox__select-all .pg-checkbox__row');
  await expect(search).toBeVisible();
  await expect(all).toBeVisible();
  await expect(label).toHaveText('Пошук у списку Маркетплейси');
  await expect(label).toHaveClass(/pg-field__label--sr-only/);
  await expect(toolbar.getByRole('combobox', {name:'Пошук у списку Маркетплейси'})).toBeVisible();
  await expect(toolbar.locator('input[type=checkbox]')).toHaveCount(1);
  await expect(toolbar.getByRole('checkbox', {name:'Зняти вибір'}))
    .toHaveJSProperty('indeterminate', true);

  const [a,b] = await Promise.all([search.boundingBox(),all.boundingBox()]);
  expect(Math.abs((a.y+a.height/2)-(b.y+b.height/2))).toBeLessThan(2);
  expect(a.x+a.width).toBeLessThan(b.x+1);
  expect(b.x+b.width).toBeLessThanOrEqual((await toolbar.boundingBox()).x+(await toolbar.boundingBox()).width+1);
});

test('select-all checkbox clears a mixed selection; filtered actions only affect matches', async ({page}) => {
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await multi.locator('.pg-listbox__trigger').click();
  const all = multi.locator('.pg-listbox__select-all .pg-checkbox__row');
  const checkbox = multi.locator('.pg-listbox__select-all input[type=checkbox]');
  const search = multi.locator('.pg-listbox__search-field input');
  const selected = multi.locator('[role=option][aria-selected=true]');

  await expect(checkbox).toHaveJSProperty('indeterminate', true);
  await expect(checkbox).toHaveAccessibleName('Зняти вибір');
  await all.click();
  await expect(selected).toHaveCount(0);
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toHaveAccessibleName('Вибрати всі');
  await all.click();
  await expect(selected).toHaveCount(5); // One disabled option is never selected.
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveAccessibleName('Зняти всі');

  await search.fill('Rozetka');
  await expect(checkbox).toHaveAccessibleName('Зняти знайдені');
  await all.click();
  await expect(multi.getByRole('option',{name:'Rozetka',exact:true})).toHaveAttribute('aria-selected','false');
  await expect(selected).toHaveCount(4);
  await expect(checkbox).toHaveAccessibleName('Вибрати знайдені');
  await all.click();
  await expect(selected).toHaveCount(5);
  await search.fill('');
  await expect(checkbox).toHaveAccessibleName('Зняти всі');
  await search.fill('Немає такого маркетплейсу');
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toHaveAccessibleName('Вибрати знайдені');
  await search.fill('');
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).toBeChecked();
});

test('checkbox interaction stays inside the open popup even when focus causes document scroll', async ({page}) => {
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  const trigger = multi.locator('.pg-listbox__trigger');
  await trigger.click();
  const popup = multi.locator('.pg-listbox__panel');
  const checkbox = multi.locator('.pg-listbox__select-all input[type=checkbox]');
  const hit = multi.locator('.pg-listbox__select-all .pg-checkbox__row');

  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // Emulate an ancestor scroll produced by focusing a visually hidden native input.
  await checkbox.evaluate(input => {
    input.addEventListener('focus', () => {
      window.dispatchEvent(new Event('scroll'));
    }, { once: true });
  });
  await hit.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(popup).toBeVisible();
  await expect(multi.locator('.pg-listbox__options')).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toHaveAccessibleName('Вибрати всі');

  // Repeating the action and using the keyboard must also keep it open.
  await hit.click();
  await expect(checkbox).toBeChecked();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await checkbox.press('Space');
  await expect(checkbox).not.toBeChecked();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  // Genuine outside scrolling must still dismiss the popup after the guard re-arms.
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('toolbar stays in one horizontal row on narrow viewport, no new geometry mode', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await multi.locator('.pg-listbox__trigger').click();
  const toolbar = multi.locator('.pg-listbox__toolbar');
  const search = toolbar.locator('.pg-listbox__search-field .pg-field__surface');
  const all = toolbar.locator('.pg-listbox__select-all .pg-checkbox__row');
  const a = await search.boundingBox();
  const b = await all.boundingBox();
  expect(a.width).toBeGreaterThan(30);
  expect(b.x).toBeGreaterThan(a.x);
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(2);
  await expect(toolbar.locator('.pg-field__label--sr-only')).toHaveCount(1);
});
