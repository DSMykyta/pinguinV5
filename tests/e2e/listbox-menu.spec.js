/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E LISTBOX MENU                                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє listbox menu у браузері через Playwright.                               ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/listbox-menu.spec.js.                                  ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', {name:'Елементи'}).click();
});

test('single Listbox uses native button, arrows and stable hidden form value', async({page})=>{
  const widget=page.locator('.pg-tools-listbox-demo .pg-listbox').first();
  const trigger=widget.locator('.pg-listbox__trigger');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  const list=widget.getByRole('listbox');
  await expect(list).toBeVisible();
  await expect(list).toBeFocused();
  await list.press('ArrowDown');
  await list.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(trigger).toBeFocused();
  await expect(widget.locator('input[name="demo-marketplace"]')).toHaveValue('rozetka');
  await trigger.click();
  await list.press('Escape');
  await expect(trigger).toBeFocused();
});

test('multi Listbox preserves chips and selects only filtered enabled options', async({page})=>{
  const widget=page.locator('.pg-tools-listbox-demo .pg-listbox').nth(1);
  const trigger=widget.locator('.pg-listbox__trigger');
  await expect(widget.locator('.pg-listbox__chip')).toHaveCount(2);
  await trigger.press('ArrowDown');
  const search=widget.getByRole('combobox',{name:'Пошук у списку Маркетплейси'});
  await search.fill('Prom.ua');
  const choices=widget.locator('.pg-listbox__option:not([hidden])');
  await expect(choices).toHaveCount(1);
  await widget.getByRole('button',{name:'Вибрати всі'}).click();
  await expect(widget.locator('.pg-listbox__chip')).toHaveCount(3);
  const vals=await widget.locator('input[name="demo-marketplaces"]').evaluateAll(nodes=>nodes.map(n=>n.value));
  expect(vals).toEqual(['prom','rozetka','promua']);
  await search.fill('Meta');
  await expect(widget.getByRole('button',{name:'Вибрати всі'})).toBeDisabled();
  const values=await widget.locator('input[name="demo-marketplaces"]').evaluateAll(nodes=>nodes.map(n=>n.value));
  expect(values).not.toContain('meta');
  await search.press('Escape');
  await expect(trigger).toBeFocused();
});

test('Menu keyboard navigation executes current item, restores focus, persists checked choices', async({page})=>{
  const section=page.locator('.pg-tools-menu-demo');
  const menus=section.locator('.pg-menu');
  const actions=menus.first();
  const trigger=actions.locator('.pg-menu__trigger');
  await trigger.click();
  const first=actions.getByRole('menuitem',{name:'Редагувати'});
  await expect(first).toBeFocused();
  await first.press('ArrowDown');
  const second=actions.getByRole('menuitem',{name:'Дублювати'});
  await expect(second).toBeFocused();
  await second.press('Enter');
  await expect(trigger).toBeFocused();
  await expect(section.locator('.pg-tools-menu-demo__status')).toHaveAttribute('data-pg-menu-result','duplicate');
  const appearance=menus.nth(1);
  await appearance.locator('.pg-menu__trigger').click();
  const choice=appearance.getByRole('menuitemcheckbox',{name:'Компактний'});
  await expect(choice).toHaveAttribute('aria-checked','true');
  await choice.click();
  await appearance.locator('.pg-menu__trigger').click();
  await expect(choice).toHaveAttribute('aria-checked','false');
  await choice.press('Escape');
  await expect(appearance.locator('.pg-menu__trigger')).toBeFocused();
  await expect(menus.nth(2).locator('.pg-menu__trigger')).toBeDisabled();
});

test('Select uses shared Listbox while Combobox and action Menu remain independent', async ({page})=>{
  const all = {
    select: await page.locator('.pg-tools-field-demo .pg-select.pg-listbox').count(),
    native: await page.locator('select').count(),
    combo: await page.locator('.pg-tools-field-demo .pg-combobox').count(),
    multi: await page.locator('.pg-tools-listbox-demo .pg-listbox').count(),
    actions: await page.locator('.pg-tools-menu-demo .pg-menu').count(),
  };
  expect(all).toEqual({select:1,native:0,combo:1,multi:3,actions:3});
});


test('pointer-opened menu does not paint its automatically focused first item as hovered', async ({page})=>{
  const menu=page.locator('.pg-tools-menu-demo .pg-menu').first();
  const trigger=menu.locator('.pg-menu__trigger');
  const first=menu.getByRole('menuitem',{name:'Редагувати'});
  const second=menu.getByRole('menuitem',{name:'Дублювати'});
  await trigger.click();
  await expect(first).toBeFocused();
  await page.mouse.move(1,1);
  await expect(first).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await second.hover();
  await expect(second).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(first).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await page.mouse.move(1,1);
  await page.keyboard.press('ArrowDown');
  await expect(second).toBeFocused();
  await expect(second).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
