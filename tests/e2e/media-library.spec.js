/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E MEDIA LIBRARY                                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє media library у браузері через Playwright.                              ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/media-library.spec.js.                                 ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const tab = (page, name) => page.getByRole('tab', { name, exact: true });
const brands = page => page.locator('#pg-tools-panel-data-views .pg-collection-view');
const media = page => page.locator('#pg-tools-panel-media-library .pg-collection-view');
const status = page => page.locator('.pg-shell__footer .pg-pagination__status');
const sizeFab = page => page.locator('[data-pg-action="page-fab-toggle"]');
const sizeLabel = page => sizeFab(page).locator('.pg-fab__trigger-value');

test('same media artwork is visible in tiles AND in the table preview column', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  await expect(media(page)).toHaveAttribute('data-pg-view', 'tiles');
  const tilePictures = media(page).locator('.pg-collection-view__tile img.pg-media-library__image');
  await expect(tilePictures).toHaveCount(10);
  const expectedSource = await tilePictures.first().getAttribute('src');
  expect(expectedSource).toMatch(/^data:image\/svg\+xml/);

  await page.locator('.pg-view-switch .pg-segment-switch__label[title="Таблиця"]').click();
  await expect(media(page)).toHaveAttribute('data-pg-view', 'table');
  const headers = media(page).locator('.pg-collection-view__table thead th');
  await expect(headers).toHaveCount(6); // checkbox, preview, name, format, size, actions
  await expect(headers.nth(1)).toHaveText('Зображення');
  const pictures = media(page).locator('.pg-collection-view__table tbody img.pg-media-library__table-thumb');
  await expect(pictures).toHaveCount(10);
  await expect(pictures.first()).toHaveAttribute('src', expectedSource);
  // An SVG viewBox declares an aspect ratio; intrinsic pixel width is browser-defined.
  await expect.poll(() => pictures.first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const box = await pictures.first().boundingBox();
  expect(box.width).toBe(72);
  expect(box.height).toBe(45);
});

test('page index, page size, and selection do not leak between brand and media tabs', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Макети даних').click();
  await expect(status(page)).toHaveText('Показано 25 з 32');
  await expect(sizeLabel(page)).toHaveText('25');
  await brands(page).locator('.pg-collection-view__table tbody tr').first()
    .locator('.pg-checkbox__row').click();
  await expect(brands(page)).toHaveAttribute('data-pg-selected-count', '1');
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect(status(page)).toHaveText('Показано 7 з 32');

  await tab(page, 'Медіатека').click();
  await expect(status(page)).toHaveText('Показано 10 з 19');
  await expect(sizeLabel(page)).toHaveText('10');
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '0');
  await media(page).locator('.pg-collection-view__tile').first().locator('.pg-checkbox__row').click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect(status(page)).toHaveText('Показано 9 з 19');

  await tab(page, 'Макети даних').click();
  await expect(status(page)).toHaveText('Показано 7 з 32');
  await expect(brands(page)).toHaveAttribute('data-pg-selected-count', '1');
  await expect(sizeLabel(page)).toHaveText('25');
  await tab(page, 'Медіатека').click();
  await expect(status(page)).toHaveText('Показано 9 з 19');
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await expect(sizeLabel(page)).toHaveText('10');
});

test('changing media page-size FAB keeps brands pagination and numeric trigger intact', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  await expect(sizeLabel(page)).toHaveText('10');
  await sizeFab(page).click();
  await page.locator('#pg-page-fab-actions [data-pg-fab-value="25"]').click();
  await expect(status(page)).toHaveText('Показано 19 з 19');
  await expect(sizeLabel(page)).toHaveText('25');
  await tab(page, 'Макети даних').click();
  await expect(status(page)).toHaveText('Показано 25 з 32');
  await expect(sizeLabel(page)).toHaveText('25');
  await sizeFab(page).click();
  await page.locator('#pg-page-fab-actions [data-pg-fab-value="50"]').click();
  await expect(sizeLabel(page)).toHaveText('50');
  await expect(status(page)).toHaveText('Показано 32 з 32');
  await tab(page, 'Медіатека').click();
  await expect(sizeLabel(page)).toHaveText('25');
  await expect(status(page)).toHaveText('Показано 19 з 19');
  await expect(page.locator('[data-pg-action="page-fab-toggle"]')).toHaveCount(1);
});

test('tile checkbox, action menu, caption and image opening stay independent', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  const tile = media(page).locator('.pg-collection-view__tile').first();
  await tile.locator('.pg-checkbox__row').click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
  await tile.locator('.pg-collection-view__tile-menu .pg-menu__trigger').click();
  await expect(page.getByRole('menuitem', { name: 'Дублювати' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');

  const caption=tile.locator('.pg-media-library__caption');
  const hitArea=tile.locator('.pg-collection-view__tile-open');
  const photo=tile.locator('.pg-media-library__image');
  // Layout dimensions remain exact even when the entire card is rotated.
  // getBoundingClientRect() reports axis-aligned transformed boxes, whose
  // corners can overlap visually by a few pixels despite correct hit areas.
  const [hitHeight,photoHeight,hitTop]=await Promise.all([
    hitArea.evaluate(element=>element.offsetHeight),
    photo.evaluate(element=>element.offsetHeight),
    hitArea.evaluate(element=>element.offsetTop),
  ]);
  expect(hitTop).toBe(0);
  expect(hitHeight).toBe(photoHeight);
  await caption.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Caption text remains selectable; dragging over it must not open the editor.
  const name=tile.locator('.pg-media-library__name');
  const nameBox=await name.boundingBox();
  await page.mouse.move(nameBox.x+3,nameBox.y+nameBox.height/2);
  await page.mouse.down();
  await page.mouse.move(nameBox.x+Math.min(nameBox.width-3,80),nameBox.y+nameBox.height/2,{steps:8});
  await page.mouse.up();
  expect((await page.evaluate(()=>window.getSelection()?.toString()??'')).length).toBeGreaterThan(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await hitArea.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Редагування зображення');
  await page.getByRole('button', { name: 'Скасувати' }).click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count', '1');
});


test('table columns remain pixel-stable when sorting or paging the media library', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Медіатека' }).click();
  await page.locator('.pg-view-switch [title="Таблиця"]').click();
  const view = page.locator('#pg-tools-panel-media-library .pg-collection-view');
  const table = view.locator('table');
  await expect(table).toHaveCSS('table-layout','fixed');
  const edges = () => table.locator('thead th').evaluateAll(nodes =>
    nodes.map(node => ({ x: Math.round(node.getBoundingClientRect().x),
      width: Math.round(node.getBoundingClientRect().width) })));
  const initial = await edges();
  await table.locator('thead th[data-pg-column="name"] button').click();
  await expect.poll(edges).toEqual(initial);
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect.poll(edges).toEqual(initial);
});

test('tile tilt clears on pointer exit after checkbox is checked and unchecked', async ({ page }) => {
  await page.goto('/tools');
  await tab(page, 'Медіатека').click();
  const tile=media(page).locator('.pg-collection-view__tile').first();
  const surface=tile.locator('.pg-collection-view__tile-surface');
  const checkbox=tile.locator('.pg-checkbox__control');
  await tile.hover();
  await expect(tile).toHaveCSS('transform','none');
  await expect(surface).not.toHaveCSS('transform','none');
  await tile.locator('.pg-checkbox__row').click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count','1');
  await tile.locator('.pg-checkbox__row').click();
  await expect(media(page)).toHaveAttribute('data-pg-selected-count','0');
  await expect(checkbox).toBeFocused();
  await page.mouse.move(1,1);
  await expect(surface).toHaveCSS('transform','none');
});

test('tiles share the restrained tilt and disable it in reduced-motion', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab',{name:'Медіатека'}).click();
  const tile=page.locator('#pg-tools-panel-media-library .pg-collection-view__tile').first();
  const surface=tile.locator('.pg-collection-view__tile-surface');
  await tile.hover();
  await expect(surface).not.toHaveCSS('transform','none');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(surface).toHaveCSS('transition-duration','0s');
  await expect(surface).toHaveCSS('transform','none');
});


test('selected tiles draw one consistent border without changing layout', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const tile=media(page).locator('.pg-collection-view__tile').first();
  const surface=tile.locator('.pg-collection-view__tile-surface');
  const boundsBefore=await tile.boundingBox();
  await tile.locator('.pg-checkbox__row').click();
  await expect(tile).toHaveAttribute('data-pg-selected','true');
  const border=await surface.evaluate(element=>{
    const style=getComputedStyle(element,'::after');
    return {content:style.content,widths:[style.borderTopWidth,style.borderRightWidth,
      style.borderBottomWidth,style.borderLeftWidth],color:style.borderTopColor,
      pointerEvents:style.pointerEvents};
  });
  expect(border.content).toBe('""');
  expect(border.widths).toEqual(['2px','2px','2px','2px']);
  expect(border.pointerEvents).toBe('none');
  const boundsAfter=await tile.boundingBox();
  expect(boundsAfter.width).toBeCloseTo(boundsBefore.width,1);
  expect(boundsAfter.height).toBeCloseTo(boundsBefore.height,1);
  await tile.locator('.pg-checkbox__row').click();
  await expect(tile).toHaveAttribute('data-pg-selected','false');
  await expect.poll(()=>surface.evaluate(element=>getComputedStyle(element,'::after').content)).toBe('none');
});

test('tile stays tilted when pointer crosses onto ellipsis and open menu items', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const tile=media(page).locator('.pg-collection-view__tile').first();
  const surface=tile.locator('.pg-collection-view__tile-surface');
  const menu=tile.locator('.pg-collection-view__tile-menu .pg-menu__trigger');
  await tile.hover();
  await expect(surface).not.toHaveCSS('transform','none');
  await menu.hover();
  await expect(surface).not.toHaveCSS('transform','none');
  await menu.click();
  await expect(surface).not.toHaveCSS('transform','none');
  await page.getByRole('menuitem',{name:'Переглянути дані'}).hover();
  await expect(surface).not.toHaveCSS('transform','none');
  await page.keyboard.press('Escape');
  await page.mouse.move(1,1);
  await expect(surface).toHaveCSS('transform','none');
});

// Data and presentation regressions: no inactive DOM, scope-aware selection, focus, states.
test('only active media view mounts records and keeps IDs across switches', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const view=media(page);
  await expect(view.locator('.pg-collection-view__tile')).toHaveCount(10);
  await expect(view.locator('tbody tr')).toHaveCount(0);
  await view.locator('.pg-collection-view__tile').first().locator('.pg-checkbox__row').click();
  await page.locator('.pg-view-switch [title="Таблиця"]').click();
  await expect(view.locator('.pg-collection-view__tile')).toHaveCount(0);
  await expect(view.locator('tbody tr')).toHaveCount(10);
  await expect(view).toHaveAttribute('data-pg-selected-count','1');
  await page.locator('.pg-view-switch [title="Плитки"]').click();
  await expect(view.locator('.pg-collection-view__tile')).toHaveCount(10);
  await expect(view.locator('tbody tr')).toHaveCount(0);
  await expect(view).toHaveAttribute('data-pg-selected-count','1');
});

test('selection scope distinguishes current page and hidden search results', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const view=media(page);
  await view.locator('.pg-collection-view__tile').nth(0).locator('.pg-checkbox__row').click();
  await view.locator('.pg-collection-view__tile').nth(1).locator('.pg-checkbox__row').click();
  const before=await view.evaluate(node=>{
    const names=[...node.querySelectorAll('.pg-media-library__name')].map(item=>item.textContent);
    return names.slice(0,2);
  });
  const scope=await page.evaluate(async()=>{
    // Inspect the public Collection View API from an independent instance.
    const {createCollectionView}=await import('/src/ui/collection-view/collection-view.js');
    const host=createCollectionView({
      label:'Selection scope test',
      rows:[{id:'1',name:'Перший'},{id:'2',name:'Другий'},{id:'3',name:'Третій'}],
      columns:[{key:'name',label:'Назва'}],selectable:true,pageSize:10,
    });
    document.body.append(host.element);
    const checks=host.element.querySelectorAll('tbody .pg-checkbox__control');
    checks[0].click();checks[1].click();
    host.setQuery('Перший');
    const filtered=host.getSelectionSummary();
    host.setQuery('');
    const unfiltered=host.getSelectionSummary();
    host.destroy();
    return {filtered,unfiltered};
  });
  expect(scope.filtered).toEqual({
    total:2,inResults:1,onCurrentPage:1,outsideResults:1,outsidePage:1,
  });
  expect(scope.unfiltered).toEqual({
    total:2,inResults:2,onCurrentPage:2,outsideResults:0,outsidePage:0,
  });
  expect(before).toHaveLength(2);
});

test('keyboard focus returns to row menu after duplicate rebuilds the media collection', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const view=media(page);
  const tile=view.locator('.pg-collection-view__tile').first();
  const name=await tile.locator('.pg-media-library__name').textContent();
  await tile.locator('.pg-collection-view__tile-menu .pg-menu__trigger').click();
  await page.getByRole('menuitem',{name:'Дублювати'}).click();
  await expect(view.locator('.pg-media-library__name')).toContainText([name]);
  const focused=page.locator(':focus');
  await expect(focused).toHaveAttribute('aria-label',new RegExp('Дії:'));
});

test('collection differentiates empty search, loading and error without new controls', async ({ page }) => {
  await page.goto('/tools');
  const result=await page.evaluate(async()=>{
    const {createCollectionView}=await import('/src/ui/collection-view/collection-view.js');
    const view=createCollectionView({
      label:'Empty states',rows:[{id:'a',name:'Альфа'}],
      columns:[{key:'name',label:'Назва'}],
    });
    document.body.append(view.element);
    const read=()=>({text:view.element.querySelector('.pg-collection-view__empty').textContent,
      hidden:view.element.querySelector('.pg-collection-view__empty').hidden});
    view.setQuery('немає');
    const noMatches=read();
    view.setDataState('loading');
    const loading=read();
    view.setDataState('error','Сервер недоступний');
    const error=read();
    view.setRows([]);
    const noRows=read();
    view.destroy();
    return {noMatches,loading,error,noRows};
  });
  expect(result.noMatches).toEqual({text:'За поточним запитом нічого не знайдено',hidden:false});
  expect(result.loading).toEqual({text:'Завантаження записів…',hidden:false});
  expect(result.error).toEqual({text:'Сервер недоступний',hidden:false});
  expect(result.noRows).toEqual({text:'Немає записів',hidden:false});
});

test('tile keeps accessible focus independently of pointer tilt and adapts to width', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const view=media(page);
  const tile=view.locator('.pg-collection-view__tile').first();
  const surface=tile.locator('.pg-collection-view__tile-surface');
  await page.mouse.move(1,1);
  await page.keyboard.press('Tab');
  await tile.locator('.pg-checkbox__control').focus();
  await expect(tile.locator('.pg-checkbox__control')).toBeFocused();
  // Programmatic focus does not always trigger :focus-visible: force keyboard modality.
  await page.keyboard.press('Tab');
  await expect(view).toHaveCSS('container-type','inline-size');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(surface).toHaveCSS('transition-duration','0s');
});


test('footer pagination retains keyboard focus after changing pages', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const next=page.getByRole('button',{name:'Наступна сторінка'});
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Сторінка 2'})).toHaveAttribute('aria-current','page');
  // On the last page the disabled next control yields focus to the current page.
  await expect(page.getByRole('button',{name:'Сторінка 2'})).toBeFocused();
  const previous=page.getByRole('button',{name:'Попередня сторінка'});
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Сторінка 1'})).toHaveAttribute('aria-current','page');
  await expect(page.getByRole('button',{name:'Попередня сторінка'})).toBeFocused();
});

test('temporary loading and error retain current collection page without stale tiles', async ({ page }) => {
  await page.goto('/tools');
  await tab(page,'Медіатека').click();
  const result=await page.evaluate(async()=>{
    const {createCollectionView}=await import('/src/ui/collection-view/collection-view.js');
    const rows=Array.from({length:31},(_,i)=>({id:'state-'+i,name:'Запис '+i}));
    const view=createCollectionView({
      label:'Тест станів',rows,columns:[{key:'name',label:'Назва'}],
      renderTile:row=>{
        const element=document.createElement('article');
        element.textContent=row.name;
        return element;
      },
      modes:['tiles','table'],initialMode:'tiles',pageSize:10,
    });
    document.body.append(view.element);
    const state=()=>({
      page:view.getPagination().page,
      total:view.getPagination().total,
      count:view.element.querySelectorAll('.pg-collection-view__tile').length,
      tilesHidden:view.element.querySelector('.pg-collection-view__tiles').hidden,
      status:view.element.querySelector('.pg-collection-view__empty').textContent,
      busy:view.element.getAttribute('aria-busy'),
      pagerInert:view.footerContent.inert,
    });
    view.setPage(3);
    const before=state();
    view.setDataState('loading');
    const loading=state();
    view.setDataState('error','Помилка завантаження');
    const error=state();
    view.setRows(rows);
    const recovered=state();
    view.destroy();
    return {before,loading,error,recovered};
  });
  expect(result.before).toMatchObject({page:3,total:31,count:10,tilesHidden:false,busy:'false',pagerInert:false});
  expect(result.loading).toMatchObject({page:3,total:31,count:0,tilesHidden:true,status:'Завантаження записів…',busy:'true',pagerInert:true});
  expect(result.error).toMatchObject({page:3,total:31,count:0,tilesHidden:true,status:'Помилка завантаження',busy:'false',pagerInert:true});
  expect(result.recovered).toMatchObject({page:3,total:31,count:10,tilesHidden:false,busy:'false',pagerInert:false});
});
