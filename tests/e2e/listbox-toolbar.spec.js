/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LISTBOX TOOLBAR E2E                                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Search + normal select-all Button in one row, filtering and mixed selection.            ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test; existing Tools Listbox preview and shared Field/Input/Button.         ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/listbox-toolbar.spec.js.                                    ║
 * ║ ПРИНЦИП: Перевірка реального UX без створення ще одного dropdown чи checkbox.                        ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', {name:'Текст'}).click();
});

test('compact search and plain select-all button share one row, label stays accessible', async ({page}) => {
  const single = page.locator('.pg-tools-listbox-demo .pg-listbox').first();
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await single.locator('.pg-listbox__trigger').click();
  await expect(single.locator('.pg-listbox__toolbar')).toHaveCount(0);
  await single.locator('.pg-listbox__trigger').click();

  await multi.locator('.pg-listbox__trigger').click();
  const toolbar = multi.locator('.pg-listbox__toolbar');
  const search = toolbar.locator('.pg-listbox__search-field .pg-field__surface');
  const label = toolbar.locator('.pg-field__label');
  const all = toolbar.locator('.pg-listbox__select-all');
  await expect(search).toBeVisible();
  await expect(all).toBeVisible();
  await expect(label).toHaveText('Пошук у списку Маркетплейси');
  await expect(label).toHaveClass(/pg-field__label--sr-only/);
  await expect(toolbar.getByRole('combobox', {name:'Пошук у списку Маркетплейси'})).toBeVisible();
  await expect(toolbar.locator('input[type=checkbox]')).toHaveCount(0);

  const [a,b] = await Promise.all([search.boundingBox(),all.boundingBox()]);
  expect(Math.abs((a.y+a.height/2)-(b.y+b.height/2))).toBeLessThan(2);
  expect(a.x+a.width).toBeLessThan(b.x+1);
  expect(b.x+b.width).toBeLessThanOrEqual((await toolbar.boundingBox()).x+(await toolbar.boundingBox()).width+1);
});

test('select-all button clears a mixed selection; filtered actions only affect matches', async ({page}) => {
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await multi.locator('.pg-listbox__trigger').click();
  const all = multi.locator('.pg-listbox__select-all');
  const search = multi.locator('.pg-listbox__search-field input');
  const selected = multi.locator('[role=option][aria-selected=true]');

  await expect(all).toHaveText('Зняти вибір');
  await all.click();
  await expect(selected).toHaveCount(0);
  await expect(all).toHaveText('Вибрати всі');
  await all.click();
  await expect(selected).toHaveCount(5); // One disabled option is never selected.
  await expect(all).toHaveText('Зняти всі');

  await search.fill('Rozetka');
  await expect(all).toHaveText('Зняти знайдені');
  await all.click();
  await expect(multi.getByRole('option',{name:'Rozetka',exact:true})).toHaveAttribute('aria-selected','false');
  await expect(selected).toHaveCount(4);
  await expect(all).toHaveText('Вибрати знайдені');
  await all.click();
  await expect(selected).toHaveCount(5);
  await search.fill('');
  await expect(all).toHaveText('Зняти всі');
});

test('toolbar stays in one horizontal row on narrow viewport, no new geometry mode', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await multi.locator('.pg-listbox__trigger').click();
  const toolbar = multi.locator('.pg-listbox__toolbar');
  const search = toolbar.locator('.pg-listbox__search-field .pg-field__surface');
  const all = toolbar.locator('.pg-listbox__select-all');
  const a = await search.boundingBox();
  const b = await all.boundingBox();
  expect(a.width).toBeGreaterThan(30);
  expect(b.x).toBeGreaterThan(a.x);
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(2);
  await expect(toolbar.locator('.pg-field__label--sr-only')).toHaveCount(1);
});
