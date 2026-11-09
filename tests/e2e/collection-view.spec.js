/**
 * Table/tile design-review tab: one dataset, existing header, accessible sorting,
 * adaptive overflow, and a reusable page-scoped persisted mode.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
});

test('new tab uses existing Shell header and contains 32 native table records', async ({page}) => {
  await expect(page.getByRole('heading', { name: 'Інструменти', level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Таблиця та плитки', level: 2 })).toHaveCount(0);
  await expect(page.locator('.pg-tools-data-views__intro, .pg-tools-data-views__meta')).toHaveCount(0);
  await expect(page.locator('.pg-shell__content')).toHaveAttribute('data-pg-workspace-layout','flush');
  await expect(page.locator('.pg-tabs')).toHaveAttribute('data-pg-fill','true');
  await expect(page.locator('.pg-collection-view__table-scroll')).toHaveCSS('border-top-style','none');
  const geometry = await page.evaluate(() => {
    const area = document.querySelector('.pg-shell__content').getBoundingClientRect();
    const viewport = document.querySelector('.pg-collection-view__table-scroll').getBoundingClientRect();
    return {area,viewport};
  });
  expect(Math.abs(geometry.area.left - geometry.viewport.left)).toBeLessThan(2);
  expect(Math.abs(geometry.area.right - geometry.viewport.right)).toBeLessThan(2);
  expect(Math.abs(geometry.area.top - geometry.viewport.top)).toBeLessThan(2);
  expect(Math.abs(geometry.area.bottom - geometry.viewport.bottom)).toBeLessThan(2);
  await expect(page.locator('.pg-tools-data-views__root h1')).toHaveCount(0);
  await expect(page.locator('.pg-shell__header-actions .pg-search')).toHaveCount(1);
  await expect(page.locator('.pg-shell__context-button')).toHaveCount(1);
  const modes = page.locator('.pg-shell__page-actions');
  await expect(modes.getByRole('group', {name:'Режим перегляду'})).toBeVisible();
  await expect(modes.getByRole('button',{name:'Таблиця'})).toHaveAttribute('aria-pressed','true');
  await expect(modes.getByRole('button',{name:'Плитки'})).toHaveAttribute('aria-pressed','false');
  const table = page.locator('.pg-collection-view__table');
  await expect(table).toBeVisible();
  await expect(table.locator('thead th')).toHaveCount(9);
  await expect(table.locator('tbody tr')).toHaveCount(32);
  await expect(page.locator('.pg-collection-view__tiles')).toBeHidden();
});

test('navigating away restores the normal workspace layout', async ({page}) => {
  await page.getByRole('tab', {name:'Текст'}).click();
  await expect(page.locator('.pg-shell__content')).toHaveAttribute('data-pg-workspace-layout','default');
  const pad = await page.locator('.pg-shell__content').evaluate(node =>
    Number.parseFloat(getComputedStyle(node).paddingLeft));
  expect(pad).toBeGreaterThan(0);
  await page.getByRole('tab', {name:'Макети даних'}).click();
  await expect(page.locator('.pg-shell__content')).toHaveAttribute('data-pg-workspace-layout','flush');
});

test('sidebar and context aside use shared arrowless scrollbar styles', async ({page}) => {
  const nav = page.locator('.pg-sidebar__nav');
  const aside = page.locator('.pg-aside');
  await expect(nav).toHaveClass(/pg-scrollbar/);
  await expect(aside).toHaveClass(/pg-scrollbar/);
  await expect(page.locator('.pg-shell__content')).toHaveClass(/pg-scrollbar/);
  await expect(page.locator('.pg-aside__item-arrow')).toHaveCount(0);
  const props = await nav.evaluate(node => ({
    thickness: getComputedStyle(node).scrollbarWidth,
    arrows: getComputedStyle(node,'::-webkit-scrollbar-button').display,
  }));
  expect(props).toEqual({thickness:'thin',arrows:'none'});
});

test('sorting native headers changes shared record order and aria-sort', async({page}) => {
  const table = page.locator('.pg-collection-view__table');
  const headers = table.locator('thead th');
  const first = await table.locator('tbody tr td:first-child').allTextContents();
  expect(first.length).toBe(32);
  await expect(headers.first()).toHaveAttribute('aria-sort', 'ascending');
  await headers.first().getByRole('button').click();
  await expect(headers.first()).toHaveAttribute('aria-sort','descending');
  const reverse = await table.locator('tbody tr td:first-child').allTextContents();
  expect(reverse).toEqual([...first].reverse());
  await table.getByRole('button',{name:/Сортувати Товари/}).click();
  await expect(headers.nth(2)).toHaveAttribute('aria-sort','ascending');
  await expect(headers.first()).not.toHaveAttribute('aria-sort','ascending');
  const counts = (await table.locator('tbody tr td:nth-child(3)').allTextContents())
    .map(x=>Number(x.trim()));
  expect(counts).toEqual([...counts].sort((a,b)=>a-b));
});

test('tiles show the same sorted rows and restore the table without duplicating data',async({page})=>{
  const root=page.locator('.pg-collection-view');
  const tableIds=await root.locator('tbody tr').evaluateAll(rows=>rows.map(row=>row.dataset.pgRowId));
  const tiles=page.locator('.pg-shell__page-actions').getByRole('button',{name:'Плитки'});
  await tiles.click();
  await expect(tiles).toHaveAttribute('aria-pressed','true');
  await expect(root).toHaveAttribute('data-pg-view','tiles');
  await expect(root.locator('.pg-collection-view__table-scroll')).toBeHidden();
  await expect(root.locator('.pg-collection-view__tiles')).toBeVisible();
  await expect(root.locator('.pg-collection-view__tile')).toHaveCount(32);
  const tileIds=await root.locator('.pg-collection-view__tile').evaluateAll(rows=>rows.map(row=>row.dataset.pgRowId));
  expect(tileIds).toEqual(tableIds);
  await page.locator('.pg-shell__page-actions').getByRole('button',{name:'Таблиця'}).click();
  await expect(root.locator('.pg-collection-view__table')).toBeVisible();
  const restored=await root.locator('tbody tr').evaluateAll(rows=>rows.map(row=>row.dataset.pgRowId));
  expect(restored).toEqual(tableIds);
});

test('the preference persists across reload and tab changes, without affecting another feature',async({page})=>{
  const first=page.locator('.pg-shell__page-actions').getByRole('button',{name:'Плитки'});
  await page.evaluate(()=>window.localStorage.setItem('pg:v1:brands:view',JSON.stringify('table')));
  await first.click();
  await expect(page.locator('.pg-collection-view')).toHaveAttribute('data-pg-view','tiles');
  const storage=await page.evaluate(()=>({
    demo:JSON.parse(localStorage.getItem('pg:v1:tools-data-views:view')),
    brands:JSON.parse(localStorage.getItem('pg:v1:brands:view')),
  }));
  expect(storage).toEqual({demo:'tiles',brands:'table'});
  await page.getByRole('tab',{name:'Текст'}).click();
  await expect(page.locator('.pg-shell__page-actions .pg-view-switch')).toHaveCount(0);
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(page.locator('.pg-collection-view')).toHaveAttribute('data-pg-view','tiles');
  await page.reload();
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(page.locator('.pg-collection-view')).toHaveAttribute('data-pg-view','tiles');
  await expect(page.locator('.pg-view-switch__button[data-pg-view-mode="tiles"]')).toHaveAttribute('aria-pressed','true');
});

test('invalid remembered view safely falls back to a table',async({page})=>{
  await page.evaluate(()=>window.localStorage.setItem('pg:v1:tools-data-views:view','"invalid"'));
  await page.reload();
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(page.locator('.pg-collection-view')).toHaveAttribute('data-pg-view','table');
  await expect(page.locator('.pg-collection-view__table')).toBeVisible();
});

test('on narrow screens every column remains available by local horizontal scrolling',async({page})=>{
  await page.setViewportSize({width:390,height:800});
  const scroller=page.locator('.pg-collection-view__table-scroll');
  await expect(scroller).toBeVisible();
  const metrics=await scroller.evaluate(node=>{
    node.scrollLeft=400;
    return {
      clientWidth:node.clientWidth,
      scrollWidth:node.scrollWidth,
      scrollLeft:node.scrollLeft,
      columns:node.querySelectorAll('thead th').length,
    };
  });
  expect(metrics.columns).toBe(9);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.scrollLeft).toBeGreaterThan(0);
  const tiles=page.locator('.pg-shell__page-actions').getByRole('button',{name:'Плитки'});
  await tiles.click();
  await expect(page.locator('.pg-collection-view__tiles')).toBeVisible();
  const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(horizontalOverflow).toBe(false);
});

test('table-only component has no view-switch and setRows preserves original record objects',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createCollectionView}=await import('/src/ui/collection-view/collection-view.js');
    const a={id:'a',name:'Перший'},b={id:'b',name:'Другий'};
    const collection=createCollectionView({
      label:'Тільки таблиця',rows:[a,b],columns:[{key:'name',label:'Назва'}],
    });
    const before=collection.getRows()[0]===a;
    collection.setRows([b,a]);
    const after=collection.getRows()[0]===b;
    const controls=collection.headerActions;
    collection.destroy();
    return {before,after,controls};
  });
  expect(result).toEqual({before:true,after:true,controls:null});
});

test('reduced-motion and dark theme keep view controls visible and usable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  const btn=page.locator('.pg-shell__page-actions').getByRole('button',{name:'Плитки'});
  await expect(btn).toBeVisible();
  await expect(btn).toHaveCSS('transition-duration','0s');
  await btn.click();
  await expect(page.locator('.pg-collection-view__tiles')).toBeVisible();
});
