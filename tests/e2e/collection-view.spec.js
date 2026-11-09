/**
 * PINGUIN NEXT — shared dense collection, native selection and legacy-inspired
 * pagination + segmented view switch. All tabs share one Shell layout/animation.
 */
import { test, expect } from '@playwright/test';

const root = page => page.locator('.pg-collection-view');
const table = page => root(page).locator('.pg-collection-view__table');
const switchTo = async (page, mode) => {
  const label = mode === 'tiles' ? 'Плитки' : 'Таблиця';
  await page.locator('.pg-view-switch .pg-segment-switch__label[title="' + label + '"]').click();
  await expect(page.locator('.pg-view-switch').getByRole('radio',{name:label})).toBeChecked();
};
test.beforeEach(async ({page})=>{
  await page.goto('/tools');
  await page.getByRole('tab',{name:'Макети даних'}).click();
});

test('table is the workspace, no special fill mode or duplicate page headings',async({page})=>{
  await expect(page.getByRole('heading',{name:'Інструменти',level:1})).toHaveCount(1);
  await expect(page.getByRole('heading',{name:'Таблиця та плитки',level:2})).toHaveCount(0);
  await expect(page.locator('.pg-tools-data-views__intro,.pg-tools-data-views__meta')).toHaveCount(0);
  await expect(page.locator('.pg-shell__content')).not.toHaveAttribute('data-pg-workspace-layout',/.+/);
  await expect(page.locator('.pg-tabs')).not.toHaveAttribute('data-pg-fill',/.+/);
  const geometry=await page.evaluate(()=>{
    const a=document.querySelector('.pg-shell__content').getBoundingClientRect();
    const b=document.querySelector('.pg-collection-view').getBoundingClientRect();
    return {left:b.left-a.left,right:b.right-a.right,top:b.top-a.top,bottom:b.bottom-a.bottom};
  });
  expect(Object.values(geometry).every(x=>Math.abs(x)<2)).toBe(true);
  await expect(root(page).locator('.pg-collection-view__table-scroll')).toHaveCSS('border-top-style','none');
  await expect(page.locator('.pg-shell__header-actions .pg-search')).toHaveCount(1);
  await expect(page.locator('.pg-shell__context-button')).toHaveCount(1);
});

test('dense table renders selection, nine fields, row actions and fixed footer pagination',async({page})=>{
  await expect(table(page).locator('thead th')).toHaveCount(11);
  await expect(table(page).locator('tbody tr')).toHaveCount(25);
  await expect(page.locator('.pg-pagination__status')).toHaveText('1–25 із 32');
  await expect(table(page).locator('tbody .pg-collection-view__row-menu')).toHaveCount(25);
  await expect(root(page).locator('.pg-collection-view__tiles')).toBeHidden();
  await expect(page.locator('.pg-view-switch')).toHaveAttribute('role','radiogroup');
  await expect(page.locator('.pg-view-switch').getByRole('radio',{name:'Таблиця'})).toBeChecked();
});

test('native header checkbox uses checked, mixed and empty states across visible page',async({page})=>{
  const all=table(page).getByRole('checkbox',{name:'Вибрати всі на поточній сторінці'});
  const first=table(page).locator('tbody tr').first().getByRole('checkbox');
  await expect(all).not.toBeChecked();
  await table(page).locator('tbody tr').first().locator('.pg-checkbox__row').click();
  await expect(all).not.toBeChecked();
  await expect(table(page).locator('thead .pg-checkbox')).toHaveAttribute('data-pg-mixed','true');
  await table(page).locator('thead .pg-checkbox__row').click();
  await expect(all).toBeChecked();
  await expect(table(page).locator('tbody tr[data-pg-selected="true"]')).toHaveCount(25);
  await table(page).locator('thead .pg-checkbox__row').click();
  await expect(all).not.toBeChecked();
  await expect(table(page).locator('thead .pg-checkbox')).toHaveAttribute('data-pg-mixed','false');
  await expect(table(page).locator('tbody tr[data-pg-selected="true"]')).toHaveCount(0);
});

test('pagination advances from 25 to 7, changes rows-per-page and preserves selection ids',async({page})=>{
  const one=table(page).locator('tbody tr').first().getByRole('checkbox');
  await table(page).locator('tbody tr').first().locator('.pg-checkbox__row').click();
  await page.getByRole('button',{name:'Наступна сторінка'}).click();
  await expect(table(page).locator('tbody tr')).toHaveCount(7);
  await expect(page.locator('.pg-pagination__status')).toHaveText('26–32 із 32');
  await expect(page.getByRole('button',{name:'Сторінка 2'})).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'Попередня сторінка'}).click();
  await expect(table(page).locator('tbody tr').first().getByRole('checkbox')).toBeChecked();
  await page.getByRole('combobox',{name:'Рядків на сторінці'}).selectOption('50');
  await expect(table(page).locator('tbody tr')).toHaveCount(32);
  await expect(page.locator('.pg-pagination__status')).toHaveText('1–32 із 32');
});

test('sorted header and aside share one collection sorting state',async({page})=>{
  const heads=table(page).locator('thead th');
  await expect(heads.nth(1)).toHaveAttribute('aria-sort','ascending');
  const first=await table(page).locator('tbody tr td:nth-child(2)').allTextContents();
  await heads.nth(1).getByRole('button').click();
  await expect(heads.nth(1)).toHaveAttribute('aria-sort','descending');
  const reverse=await table(page).locator('tbody tr td:nth-child(2)').allTextContents();
  expect(reverse[0]).not.toEqual(first[0]);
  await page.locator('[data-pg-action="aside-toggle"]').click();
  const aside=page.locator('#pg-aside-panel');
  await expect(aside.getByRole('radiogroup',{name:'Напрямок сортування'})).toBeVisible();
  await expect(aside.getByRole('radio',{name:'Я–А'})).toBeChecked();
  await aside.getByRole('combobox',{name:'Сортувати за'}).selectOption('products');
  await expect(heads.nth(3)).toHaveAttribute('aria-sort','descending');
  await aside.locator('.pg-segment-switch__label[title="А–Я"]').click();
  await expect(heads.nth(3)).toHaveAttribute('aria-sort','ascending');
  const counts=(await table(page).locator('tbody tr td:nth-child(4)').allTextContents())
    .map(s=>Number(s.trim()));
  expect(counts).toEqual([...counts].sort((a,b)=>a-b));
});

test('row action menu is functional and uses one shared Menu implementation',async({page})=>{
  const before=await table(page).locator('tbody tr').count();
  expect(before).toBe(25);
  await table(page).locator('tbody tr').first().getByRole('button',{name:/Дії:/}).click();
  const item=page.getByRole('menuitem',{name:'Дублювати'});
  await expect(item).toBeVisible();
  await item.click();
  await expect(page.locator('.pg-pagination__status')).toContainText('із 33');
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(page.locator('.pg-tools-data-views__aside-detail')).toContainText('Створено локальну копію');
});

test('segmented switch toggles table and tiles without changing underlying page or selection',async({page})=>{
  const ids=await table(page).locator('tbody tr').evaluateAll(items=>items.map(x=>x.dataset.pgRowId));
  await switchTo(page,'tiles');
  await expect(root(page)).toHaveAttribute('data-pg-view','tiles');
  await expect(root(page).locator('.pg-collection-view__table-scroll')).toBeHidden();
  await expect(root(page).locator('.pg-collection-view__tile')).toHaveCount(25);
  const tileIds=await root(page).locator('.pg-collection-view__tile').evaluateAll(items=>items.map(x=>x.dataset.pgRowId));
  expect(tileIds).toEqual(ids);
  await switchTo(page,'table');
  const restored=await table(page).locator('tbody tr').evaluateAll(items=>items.map(x=>x.dataset.pgRowId));
  expect(restored).toEqual(ids);
});

test('saved view is isolated per feature and survives page reload',async({page})=>{
  await page.evaluate(()=>localStorage.setItem('pg:v1:brands:view',JSON.stringify('table')));
  await switchTo(page,'tiles');
  const stored=await page.evaluate(()=>({
    demo:JSON.parse(localStorage.getItem('pg:v1:tools-data-views:view')),
    brands:JSON.parse(localStorage.getItem('pg:v1:brands:view')),
  }));
  expect(stored).toEqual({demo:'tiles',brands:'table'});
  await page.getByRole('tab',{name:'Текст'}).click();
  await expect(page.locator('.pg-shell__page-actions .pg-view-switch')).toHaveCount(0);
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(root(page)).toHaveAttribute('data-pg-view','tiles');
  await page.reload();
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(root(page)).toHaveAttribute('data-pg-view','tiles');
  await expect(page.locator('.pg-view-switch').getByRole('radio',{name:'Плитки'})).toBeChecked();
});

test('search belongs only to data tab and filtering updates pagination',async({page})=>{
  const input=page.getByRole('searchbox',{name:'Шукати у таблиці брендів'});
  await expect(input).toBeVisible();
  await input.fill('Pinguin');
  await expect(table(page).locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('.pg-pagination__status')).toHaveText('1–1 із 1');
  await page.getByRole('tab',{name:'Текст'}).click();
  await expect(page.locator('.pg-search')).toBeHidden();
  await page.getByRole('tab',{name:'Переходи'}).click();
  await expect(page.locator('.pg-search')).toBeHidden();
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(input).toHaveValue('Pinguin');
  await expect(table(page).locator('tbody tr')).toHaveCount(1);
  await input.fill('');
  await expect(table(page).locator('tbody tr')).toHaveCount(25);
});

test('invalid mode falls back to table and table-only collection has no view switch',async({page})=>{
  await page.evaluate(()=>localStorage.setItem('pg:v1:tools-data-views:view','"bad-mode"'));
  await page.reload();
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(root(page)).toHaveAttribute('data-pg-view','table');
  const result=await page.evaluate(async()=>{
    const {createCollectionView}=await import('/src/ui/collection-view/collection-view.js');
    const a={id:'a',name:'Перший'},b={id:'b',name:'Другий'};
    const view=createCollectionView({
      label:'Тільки таблиця',rows:[a,b],columns:[{key:'name',label:'Назва'}],
    });
    const before=view.getRows()[0]===a;
    view.setRows([b,a]);
    const after=view.getRows()[0]===b;
    const noSwitch=view.headerActions===null;
    view.destroy();
    return {before,after,noSwitch};
  });
  expect(result).toEqual({before:true,after:true,noSwitch:true});
});

test('unified tab animation and static Shell geometry, with no flush/fill exception',async({page})=>{
  const main=page.locator('.pg-shell__content');
  const original=await main.evaluate(node=>[getComputedStyle(node).padding,getComputedStyle(node).overflow]);
  const name=await page.locator('#pg-tools-panel-data-views').evaluate(node=>getComputedStyle(node).animationName);
  await page.getByRole('tab',{name:'Текст'}).click();
  const after=await main.evaluate(node=>[getComputedStyle(node).padding,getComputedStyle(node).overflow]);
  expect(after).toEqual(original);
  const textName=await page.locator('#pg-tools-panel-text').evaluate(node=>getComputedStyle(node).animationName);
  expect(textName).toBe(name);
  expect(name).toBe('pg-page-enter');
  await expect(page.locator('.pg-tabs')).not.toHaveAttribute('data-pg-fill',/.+/);
  await expect(main).not.toHaveAttribute('data-pg-workspace-layout',/.+/);
});

test('narrow table scrolls locally while tile cards fit and view switch works',async({page})=>{
  await page.setViewportSize({width:390,height:800});
  const area=page.locator('.pg-collection-view__table-scroll');
  const metrics=await area.evaluate(node=>{
    node.scrollLeft=400;
    return {clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,
      scrollLeft:node.scrollLeft,columns:node.querySelectorAll('thead th').length};
  });
  expect(metrics.columns).toBe(11);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.scrollLeft).toBeGreaterThan(0);
  await switchTo(page,'tiles');
  await expect(root(page).locator('.pg-collection-view__tiles')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
});

test('dark mode and reduced motion keep native segmented switch accessible',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  const plate=page.locator('.pg-view-switch .pg-segment-switch__plate');
  await expect(plate).toHaveCSS('transition-duration','0s');
  await switchTo(page,'tiles');
  await expect(root(page).locator('.pg-collection-view__tiles')).toBeVisible();
});
