/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LISTBOX TOOLBAR E2E                                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Реальна кнопка multi-select, stable popup, змішані стани та фільтр.                    ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, shared Input, Button, Listbox.                                         ║
 * ║ ПУБЛІЧНИЙ API: playwright test tests/e2e/listbox-toolbar.spec.js.                                    ║
 * ║ ПРИНЦИП: Один IconButton з динамічною іконкою, без Checkbox input/дублювання CSS.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
});

test('search and the existing mini IconButton share one accessible row', async ({ page }) => {
  const single = page.locator('.pg-tools-listbox-demo .pg-listbox').first();
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await single.locator('.pg-listbox__trigger').click();
  await expect(single.locator('.pg-listbox__toolbar')).toHaveCount(0);
  await single.locator('.pg-listbox__trigger').click();

  await multi.locator('.pg-listbox__trigger').click();
  const toolbar = multi.locator('.pg-listbox__toolbar');
  const search = toolbar.locator('.pg-listbox__search-field .pg-field__surface');
  const all = toolbar.locator('button.pg-listbox__select-all');
  await expect(search).toBeVisible();
  await expect(all).toBeVisible();
  await expect(all).toHaveClass(/pg-mini-button/);
  await expect(all).toHaveAttribute('aria-pressed', 'mixed');
  await expect(all).toHaveAttribute('aria-label', 'Зняти вибір');
  await expect(all.locator('svg.pg-icon')).toHaveCount(1);
  await expect(toolbar.locator('input[type=checkbox]')).toHaveCount(0);
  await expect(toolbar.locator('.pg-field__label--sr-only')).toHaveText('Пошук у списку Маркетплейси');

  const a = await search.boundingBox(), b = await all.boundingBox();
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(2);
  expect(a.x+a.width).toBeLessThanOrEqual(b.x+1);
});

test('clicking the button actually changes selection and preserves the open popup', async ({ page }) => {
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  const trigger = multi.locator('.pg-listbox__trigger');
  await trigger.click();
  const all = multi.locator('button.pg-listbox__select-all');
  const selected = multi.locator('[role=option][aria-selected=true]');
  const popup = multi.locator('.pg-listbox__panel');
  await expect(selected).toHaveCount(2);

  await all.click();
  await expect(selected).toHaveCount(0);
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(all).toHaveAttribute('aria-label', 'Вибрати всі');
  await expect(popup).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await all.click();
  await expect(selected).toHaveCount(5); // Disabled option is never selected.
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-label', 'Зняти всі');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await all.focus();
  await all.press('Space');
  await expect(selected).toHaveCount(0);
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('filter affects visible values only; button disables for zero matches', async ({ page }) => {
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await multi.locator('.pg-listbox__trigger').click();
  const all = multi.locator('button.pg-listbox__select-all');
  const search = multi.locator('.pg-listbox__search-field input');
  const selected = multi.locator('[role=option][aria-selected=true]');

  await search.fill('Rozetka');
  await expect(all).toHaveAttribute('aria-label', 'Зняти знайдені');
  await all.click();
  await expect(multi.getByRole('option', { name:'Rozetka', exact:true })).toHaveAttribute('aria-selected', 'false');
  await expect(selected).toHaveCount(1);
  await expect(all).toHaveAttribute('aria-label', 'Вибрати знайдені');
  await all.click();
  await expect(selected).toHaveCount(2);

  await search.fill('немає такого маркетплейсу');
  await expect(all).toBeDisabled();
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await search.fill('');
  await expect(all).toBeEnabled();
  await expect(all).toHaveAttribute('aria-pressed', 'mixed');
});

test('real outside scroll can still close popup after button actions', async ({ page }) => {
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  const trigger = multi.locator('.pg-listbox__trigger');
  await trigger.click();
  await multi.locator('button.pg-listbox__select-all').click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('mini button remains beside search on narrow viewport without overflow', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  const multi = page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  await multi.locator('.pg-listbox__trigger').click();
  const toolbar = multi.locator('.pg-listbox__toolbar');
  const search = toolbar.locator('.pg-listbox__search-field .pg-field__surface');
  const all = toolbar.locator('button.pg-listbox__select-all');
  const a = await search.boundingBox(), b = await all.boundingBox(), t = await toolbar.boundingBox();
  expect(a.width).toBeGreaterThan(30);
  expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(2);
  expect(b.x+b.width).toBeLessThanOrEqual(t.x+t.width+1);
});
