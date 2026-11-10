/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E COLLECTION VIEW                                                                  ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє collection view у браузері через Playwright.                            ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/collection-view.spec.js.                               ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const root = page => page.locator('#pg-tools-panel-data-views .pg-collection-view');
const table = page => root(page).locator('.pg-collection-view__table');
const switchTo = async (page, mode) => {
  const label = mode === 'tiles' ? 'Плитки' : 'Таблиця';
  await page.locator('.pg-shell__page-actions .pg-view-switch .pg-segment-switch__label[title="' + label + '"]').click();
  await expect(page.locator('.pg-shell__page-actions .pg-view-switch').getByRole('radio',{name:label})).toBeChecked();
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

test('table rounds only its header and last row; the shared workspace stays square',async({page})=>{
  const main=page.locator('.pg-shell__content');
  const scroller=root(page).locator('.pg-collection-view__table-scroll');
  const firstHeader=table(page).locator('thead th').first();
  const lastHeader=table(page).locator('thead th').last();
  const firstBottom=table(page).locator('tbody tr:last-child td').first();
  const lastBottom=table(page).locator('tbody tr:last-child td').last();

  await expect(main).toHaveCSS('border-radius','0px');
  await expect(scroller).toHaveCSS('border-radius','0px');
  await expect(table(page)).toHaveCSS('border-radius','16px');
  await expect(firstHeader).toHaveCSS('border-start-start-radius','16px');
  await expect(lastHeader).toHaveCSS('border-start-end-radius','16px');
  await expect(firstBottom).toHaveCSS('border-end-start-radius','16px');
  await expect(lastBottom).toHaveCSS('border-end-end-radius','16px');
  await expect(lastBottom).toHaveClass(/pg-collection-view__actions-cell/);

  // Both directions still scroll locally; right and left pinned columns
  // retain their native sticky positions rather than a rounded clipping card.
  await page.setViewportSize({width:600,height:720});
  const scrolled=await scroller.evaluate(el=>{
    el.scrollTo({top:el.scrollHeight,left:el.scrollWidth,behavior:'instant'});
    return {top:el.scrollTop,left:el.scrollLeft};
  });
  expect(scrolled.top).toBeGreaterThan(0);
  expect(scrolled.left).toBeGreaterThan(0);
  await expect(lastBottom).toHaveCSS('border-end-end-radius','16px');
  await expect(lastHeader).toHaveCSS('position','sticky');

  // One row after filtering is also the last row. Switching to tiles and
  // an article tab cannot alter Shell geometry or its shared scrollbar.
  await page.getByRole('searchbox',{name:'Шукати у таблиці брендів'}).fill('Pinguin');
  await expect(table(page).locator('tbody tr')).toHaveCount(1);
  await expect(table(page).locator('tbody tr:last-child td').last())
    .toHaveCSS('border-end-end-radius','16px');
  await switchTo(page,'tiles');
  await expect(main).toHaveCSS('border-radius','0px');
  await switchTo(page,'table');
  await page.getByRole('tab',{name:'Текст'}).click();
  await expect(main).toHaveCSS('border-radius','0px');
});

test('dense table renders selection, nine fields, row actions and fixed footer pagination',async({page})=>{
  await expect(table(page).locator('thead th')).toHaveCount(11);
  await expect(table(page).locator('tbody tr')).toHaveCount(25);
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 25 з 32');
  await expect(root(page).locator('.pg-pagination')).toHaveCount(0);
  await expect(page.locator('.pg-shell__footer')).toHaveAttribute('data-pg-has-content','true');
  await expect(page.locator('.pg-shell__footer')).toHaveCSS('border-top-style','none');
  const footer=await page.locator('.pg-shell__footer').boundingBox();
  const pages=await page.locator('.pg-shell__footer .pg-pagination__pages').boundingBox();
  expect(Math.abs((pages.x+pages.width/2)-(footer.x+footer.width/2))).toBeLessThan(2);
  await expect(table(page).locator('tbody .pg-collection-view__row-menu')).toHaveCount(25);
  await expect(root(page).locator('.pg-collection-view__tiles')).toBeHidden();
  await expect(page.locator('.pg-shell__page-actions .pg-view-switch')).toHaveAttribute('role','radiogroup');
  await expect(page.locator('.pg-shell__page-actions .pg-view-switch').getByRole('radio',{name:'Таблиця'})).toBeChecked();
});

test('shared scrollbars hide native arrows and footer has no decorative divider',async({page})=>{
  const footer=page.locator('.pg-shell__footer');
  await expect(footer).toHaveCSS('height','56px');
  await expect(footer).toHaveCSS('border-top-style','none');
  await expect(footer.locator('.pg-shell__footer-panel')).toHaveCSS('border-top-style','none');

  for(const selector of ['.pg-collection-view__table-scroll','.pg-collection-view__tiles']) {
    const scroller=root(page).locator(selector);
    await expect(scroller).toHaveClass(/pg-scrollbar/);
    const styles=await scroller.evaluate(node=>({
      standardWidth:getComputedStyle(node).scrollbarWidth,
      standardColor:getComputedStyle(node).scrollbarColor,
      nativeButton:getComputedStyle(node,'::-webkit-scrollbar-button').display,
    }));
    // Chromium must use the shared WebKit styling, not the native thin variant.
    expect(styles.standardWidth).toBe('auto');
    expect(styles.standardColor).toBe('auto');
    expect(styles.nativeButton).toBe('none');
  }

  // The scrollbar is still functional, not hidden or replaced by a fake widget.
  const scroller=root(page).locator('.pg-collection-view__table-scroll');
  const scrollTop=await scroller.evaluate(node=>{
    node.scrollTop=100;
    return node.scrollTop;
  });
  expect(scrollTop).toBeGreaterThan(0);
});

test('scrolling a narrow table in both directions leaves no scrollbar button chrome',async({page})=>{
  await page.setViewportSize({width:600,height:720});
  const scroller=root(page).locator('.pg-collection-view__table-scroll');
  const state=await scroller.evaluate(node=>{
    node.scrollTop=160;
    node.scrollLeft=160;
    const parts=[
      '::-webkit-scrollbar-button:horizontal:decrement',
      '::-webkit-scrollbar-button:horizontal:increment',
      '::-webkit-scrollbar-button:vertical:decrement',
      '::-webkit-scrollbar-button:vertical:increment',
    ];
    return {
      top:node.scrollTop,left:node.scrollLeft,
      horizontalOverflow:node.scrollWidth>node.clientWidth,
      verticalOverflow:node.scrollHeight>node.clientHeight,
      buttons:parts.map(part=>({
        part,
        display:getComputedStyle(node,part).display,
        appearance:getComputedStyle(node,part).getPropertyValue('-webkit-appearance'),
        background:getComputedStyle(node,part).backgroundImage,
      })),
    };
  });
  expect(state.horizontalOverflow).toBe(true);
  expect(state.verticalOverflow).toBe(true);
  expect(state.top).toBeGreaterThan(0);
  expect(state.left).toBeGreaterThan(0);
  for(const button of state.buttons) {
    // Chromium returns an empty computed style for a non-generated directional
    // scrollbar pseudo-element. Both '' and 'none' mean there is no arrow.
    expect(['', 'none'],button.part).toContain(button.display);
    expect(['', 'none'],button.part).toContain(button.background);
  }
});

test('checkboxes and actions reveal on hover or keyboard focus while selection persists',async({page})=>{
  const view=root(page);
  const header=table(page).locator('thead .pg-collection-view__selection-cell .pg-checkbox');
  const first=table(page).locator('tbody tr').first();
  const second=table(page).locator('tbody tr').nth(1);
  const selection=first.locator('.pg-collection-view__selection-cell .pg-checkbox');
  const menu=first.locator('.pg-collection-view__row-menu');
  const edit=first.locator('[data-pg-action="row-edit"]');
  const th=table(page).locator('thead .pg-collection-view__actions-cell');

  await expect(th).toHaveText('');
  await expect(th).toHaveAttribute('aria-label','Дії');
  await expect(view).toHaveAttribute('data-pg-selected-count','0');
  await page.mouse.move(1,1);
  await expect(header).toHaveCSS('opacity','0');
  await expect(selection).toHaveCSS('opacity','0');
  await expect(menu).toHaveCSS('opacity','0');
  await expect(edit).toHaveCSS('user-select','text');
  const before=await first.boundingBox();

  await first.hover();
  await expect(selection).toHaveCSS('opacity','1');
  await expect(menu).toHaveCSS('opacity','1');
  await expect(edit).toHaveCSS('user-select','text');
  const after=await first.boundingBox();
  expect(after.width).toBeCloseTo(before.width,1);
  expect(after.height).toBeCloseTo(before.height,1);

  await table(page).locator('thead .pg-collection-view__selection-cell').hover();
  await expect(header).toHaveCSS('opacity','1');
  await first.locator('.pg-checkbox__row').click();
  await expect(view).toHaveAttribute('data-pg-selected-count','1');
  await page.mouse.move(1,1);
  await expect(header).toHaveCSS('opacity','1');
  await expect(second.locator('.pg-checkbox')).toHaveCSS('opacity','1');

  await first.locator('.pg-checkbox__row').click();
  await expect(view).toHaveAttribute('data-pg-selected-count','0');
  await page.mouse.move(1,1);
  await expect(second.locator('.pg-checkbox')).toHaveCSS('opacity','0');
  await second.getByRole('checkbox').focus();
  await expect(second.locator('.pg-checkbox')).toHaveCSS('opacity','1');
});

test('brand name is the only edit target; selecting text does not open the editor',async({page})=>{
  const row=table(page).locator('tbody tr').first();
  const selectionCell=row.locator('td.pg-collection-view__selection-cell');
  const brandCell=row.locator('td[data-pg-column="name"]');
  const name=brandCell.locator('.pg-collection-view__editable-name');

  await expect(selectionCell.locator('[data-pg-action="row-edit"]')).toHaveCount(0);
  await expect(brandCell.locator('.pg-collection-view__edit,.pg-collection-view__primary-line')).toHaveCount(0);
  await expect(name).toHaveAttribute('role','button');
  await expect(name).toHaveCSS('user-select','text');
  const rect=await name.boundingBox();
  await page.mouse.move(rect.x+2,rect.y+rect.height/2);
  await page.mouse.down();
  await page.mouse.move(rect.x+Math.min(rect.width-2,80),rect.y+rect.height/2,{steps:8});
  await page.mouse.up();
  expect((await page.evaluate(()=>window.getSelection()?.toString()??'')).length).toBeGreaterThan(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.evaluate(()=>window.getSelection()?.removeAllRanges());
  await name.click();
  await expect(page.getByRole('dialog',{name:'Редагування бренду'})).toBeVisible();
});

test('closing an editor never leaves an unchecked row checkbox visible from name focus',async({page})=>{
  const collection=root(page);
  const row=table(page).locator('tbody tr').first();
  const name=row.locator('.pg-collection-view__editable-name');
  const checkbox=row.locator('.pg-collection-view__selection-cell .pg-checkbox');

  await expect(collection).toHaveAttribute('data-pg-selected-count','0');
  await name.click();
  const dialog=page.getByRole('dialog',{name:'Редагування бренду'});
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(dialog).toHaveCount(0);
  // The native dialog restores focus to the name. That must not act
  // like a permanently hovered selection cell.
  await expect(name).toBeFocused();
  await page.mouse.move(1,1);
  await expect(checkbox).toHaveCSS('opacity','0');
  await checkbox.locator('.pg-checkbox__control').focus();
  await expect(checkbox).toHaveCSS('opacity','1');
  await page.mouse.move(1,1);
  await checkbox.locator('.pg-checkbox__control').blur();
  await expect(checkbox).toHaveCSS('opacity','0');
});

test('coarse pointer keeps row checkboxes and actions visible without hover',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
  try {
    const page=await context.newPage();
    await page.goto('/tools');
    await page.getByRole('tab',{name:'Макети даних'}).click();
    const row=table(page).locator('tbody tr').first();
    await expect(row.locator('.pg-checkbox')).toHaveCSS('opacity','1');
    await expect(row.locator('.pg-collection-view__row-menu')).toHaveCSS('opacity','1');
    await expect(row.locator('.pg-collection-view__editable-name')).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test('native header checkbox uses checked, mixed and empty states across visible page',async({page})=>{
  const all=table(page).getByRole('checkbox',{name:'Вибрати всі на поточній сторінці'});
  const first=table(page).locator('tbody tr').first().getByRole('checkbox');
  await expect(all).not.toBeChecked();
  await table(page).locator('tbody tr').first().locator('.pg-checkbox__row').click();
  await expect(all).not.toBeChecked();
  await expect(table(page).locator('thead .pg-checkbox')).toHaveAttribute('data-pg-mixed','true');
  await table(page).locator('thead .pg-checkbox__row').click();
  await expect(all).not.toBeChecked();
  await expect(table(page).locator('tbody tr[data-pg-selected="true"]')).toHaveCount(0);
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
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 7 з 32');
  await expect(page.getByRole('button',{name:'Сторінка 2'})).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'Попередня сторінка'}).click();
  await expect(table(page).locator('tbody tr').first().getByRole('checkbox')).toBeChecked();
  const originalFab=page.locator('[data-pg-action="aside-fab-toggle"]');
  const sizeFab=page.locator('[data-pg-action="page-fab-toggle"]');
  await expect(originalFab).toBeVisible();
  await expect(sizeFab).toBeVisible();
  await sizeFab.click();
  await expect(page.locator('#pg-page-fab-actions [data-pg-fab-value="25"]'))
    .toHaveAttribute('aria-pressed','true');
  await page.locator('#pg-page-fab-actions [data-pg-fab-value="50"]').click();
  await expect(table(page).locator('tbody tr')).toHaveCount(32);
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 32 з 32');
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
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 25 з 33');
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(page.locator('.pg-tools-data-views__aside-detail')).toContainText('Дубльовано локально');
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
  await expect(page.locator('.pg-shell__page-actions .pg-view-switch').getByRole('radio',{name:'Плитки'})).toBeChecked();
});

test('search belongs only to data tab and filtering updates pagination',async({page})=>{
  const input=page.getByRole('searchbox',{name:'Шукати у таблиці брендів'});
  await expect(input).toBeVisible();
  await input.fill('Pinguin');
  await expect(table(page).locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('.pg-shell__footer .pg-pagination__status')).toHaveText('Показано 1 з 1');
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
  const area=root(page).locator('.pg-collection-view__table-scroll');
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

test('row actions are the final column and the entire menu fits without horizontal scrolling',async({page})=>{
  const labels=await table(page).locator('thead th').evaluateAll(nodes=>nodes.slice(0,3).map(node=>({
    label:node.textContent.trim(),className:node.className,
  })));
  expect(labels[0].className).toContain('selection-cell');
  expect(labels[1].label).toMatch(/^Бренд/);
  const lastHead = await table(page).locator('thead th').last().evaluate(node => node.className);
  expect(lastHead).toContain('actions-cell');
  const trigger=table(page).locator('tbody tr').first().getByRole('button',{name:/Дії:/});
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await expect(trigger).toHaveCSS('background-color', /.+/);
  const menu=page.getByRole('menu',{name:/Дії:/});
  const last=menu.getByRole('menuitem',{name:'Архівувати або відновити'});
  await expect(last).toBeVisible();
  const dims=await menu.evaluate(el=>{
    const last=el.querySelector('[data-pg-value="archive"]');
    const a=el.getBoundingClientRect(),b=last.getBoundingClientRect();
    return {width:a.width,scrollWidth:el.scrollWidth,lastRight:b.right,menuRight:a.right,
      itemScrollWidth:last.scrollWidth,itemWidth:last.clientWidth};
  });
  expect(dims.width).toBeGreaterThan(185);
  expect(dims.scrollWidth).toBeLessThanOrEqual(dims.width+1);
  expect(dims.itemScrollWidth).toBeLessThanOrEqual(dims.itemWidth+1);
  await last.hover();
  const hover=await last.evaluate(el=>getComputedStyle(el).backgroundColor);
  const idle=await menu.locator('[data-pg-value="duplicate"]').evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(hover).not.toBe(idle);
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
});

test('page footer is shared across tabs, with no duplicated pagination controls',async({page})=>{
  const footer=page.locator('.pg-shell__footer');
  const pager=footer.locator('.pg-pagination');
  await expect(pager).toHaveCount(1);
  await page.getByRole('tab',{name:'Текст'}).click();
  await expect(footer).toHaveAttribute('data-pg-has-content','false');
  await expect(footer).toBeEmpty();
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(footer).toHaveAttribute('data-pg-has-content','true');
  await expect(pager).toHaveCount(1);
  await expect(footer).toHaveCSS('height','56px');
  // Pagination has a bottom-to-top entrance; measure after reaching its rest position.
  await footer.locator('.pg-shell__footer-panel').evaluate(node =>
    Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))));
  const bounds=await Promise.all([footer.boundingBox(),pager.boundingBox()]);
  expect(bounds[1].y+bounds[1].height).toBeLessThanOrEqual(bounds[0].y+bounds[0].height+2);
});

test('the original FAB stays unchanged, with a second instance alongside only on data tab',async({page})=>{
  const primary=page.locator('[data-pg-action="aside-fab-toggle"]');
  const secondary=page.locator('[data-pg-action="page-fab-toggle"]');
  await expect(primary).toBeVisible();
  await expect(secondary).toBeVisible();
  await expect(page.locator('.pg-fab')).toHaveCount(2);
  // Both the pagination FAB and its surface enter from below.
  await page.locator('.pg-shell__footer-panel').evaluate(node =>
    Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {}))));
  const [a,b]=await Promise.all([primary.boundingBox(),secondary.boundingBox()]);
  expect(Math.abs(a.y-b.y)).toBeLessThan(2);
  expect(Math.abs(b.x+b.width+8-a.x)).toBeLessThan(2);
  // A translated footer FAB must never be clipped by the workspace boundary.
  // The right edge of its actual hit target remains clickable, not just visible.
  const edgeHit=await secondary.evaluate(button=>{
    const r=button.getBoundingClientRect();
    const hit=document.elementFromPoint(r.right-2,r.top+r.height/2);
    return button.contains(hit)||hit===button;
  });
  expect(edgeHit).toBe(true);
  // Opening the page-size FAB must keep all shared actions within the viewport.
  await secondary.click();
  const pageActions=page.locator('#pg-page-fab-actions .pg-fab__item');
  await expect(pageActions).toHaveCount(5);
  const allVisible=await pageActions.evaluateAll(nodes=>nodes.every(node=>{
    const r=node.getBoundingClientRect();
    return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;
  }));
  expect(allVisible).toBe(true);
  await page.keyboard.press('Escape');
  const ids=await page.locator('.pg-fab__actions').evaluateAll(els=>els.map(el=>el.id));
  expect(new Set(ids).size).toBe(2);
  await primary.click();
  await expect(page.locator('#pg-fab-actions .pg-fab__item')).toHaveCount(2);
  await expect(page.locator('#pg-fab-actions')).toContainText('Код проєкту');
  await expect(secondary).toHaveAttribute('aria-expanded','false');
  await secondary.click();
  await expect(primary).toHaveAttribute('aria-expanded','false');
  await expect(secondary).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#pg-page-fab-actions .pg-fab__item')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await expect(secondary).toHaveAttribute('aria-expanded','false');
  await expect(secondary).toBeFocused();
  await page.getByRole('tab',{name:'Текст'}).click();
  await expect(secondary).toBeHidden();
  await expect(primary).toBeVisible();
  await primary.click();
  await expect(page.locator('#pg-fab-actions')).toContainText('Редактор у legacy');
  await page.getByRole('tab',{name:'Макети даних'}).click();
  await expect(secondary).toBeVisible();
  await expect(page.locator('#pg-fab-actions')).toContainText('Код проєкту');
});

test('legacy btn-icon mini buttons align with compact checkboxes in table and tiles',async({page})=>{
  const row=table(page).locator('tbody tr').first();
  const compact=row.locator('.pg-checkbox__row');
  const box=row.locator('.pg-checkbox__box');
  const edit=row.getByRole('button',{name:/Редагувати:/});
  const menu=row.getByRole('button',{name:/Дії:/});

  for(const control of [compact,edit,menu]) {
    await expect(control).toHaveCSS('width','32px');
    await expect(control).toHaveCSS('height','32px');
  }
  await expect(box).toHaveCSS('width','24px');
  await expect(box).toHaveCSS('height','24px');
  await expect(edit).toHaveCSS('border-top-left-radius','9999px');
  await expect(edit.locator('.pg-icon')).toHaveCSS('width','16px');
  await expect(edit).toHaveCSS('border-top-width','0px');

  const idle=await edit.evaluate(el=>getComputedStyle(el).backgroundColor);
  await edit.hover();
  const hover=await edit.evaluate(el=>({
    background:getComputedStyle(el).backgroundColor,
    shadow:getComputedStyle(el).boxShadow,
    color:getComputedStyle(el).color,
  }));
  expect(hover.background).not.toBe(idle);
  expect(hover.shadow).not.toBe('none');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await expect(menu).not.toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded','false');

  await switchTo(page,'tiles');
  const tile=root(page).locator('.pg-collection-view__tile').first();
  await expect(tile.locator('.pg-checkbox__row')).toHaveCSS('width','32px');
  await expect(tile.locator('.pg-checkbox__box')).toHaveCSS('width','24px');
  await expect(tile.getByRole('button',{name:/Дії:/})).toHaveCSS('width','32px');
});

test('mini action and compact checkbox honor focus, dark theme and reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const row=table(page).locator('tbody tr').first();
  const edit=row.getByRole('button',{name:/Редагувати:/});
  await expect(edit).toHaveCSS('transition-duration','0s');
  // Reach the mini button by keyboard, not programmatic focus (which is not :focus-visible).
  await row.getByRole('checkbox').focus();
  await page.keyboard.press('Tab');
  await expect(edit).toBeFocused();
  await expect(edit).toHaveCSS('outline-style','solid');
  await expect(row.locator('.pg-checkbox__box')).toHaveCSS('transition-duration','0s');
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
  await edit.hover();
  const bg=await edit.evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  await expect(edit).toHaveCSS('width','32px');
});

test('footer FAB remains fully clickable on mobile beside the global FAB',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const primary=page.locator('[data-pg-action="aside-fab-toggle"]');
  const secondary=page.locator('[data-pg-action="page-fab-toggle"]');
  await expect(primary).toBeVisible();
  await expect(secondary).toBeVisible();
  const [a,b]=await Promise.all([primary.boundingBox(),secondary.boundingBox()]);
  // Mobile fixed and flow positions may differ by fractional rounded pixels.
  // Keep the horizontal 8px gap and the full hit area independently verified.
  expect(Math.abs(a.y-b.y)).toBeLessThan(4);
  expect(Math.abs(b.x+b.width+8-a.x)).toBeLessThan(2);
  expect(await secondary.evaluate(button=>{
    const r=button.getBoundingClientRect();
    return [r.left+2,r.right-2].every(x=>{
      const hit=document.elementFromPoint(x,r.top+r.height/2);
      return hit===button||button.contains(hit);
    });
  })).toBe(true);
  await secondary.click();
  await expect(secondary).toHaveAttribute('aria-expanded','true');
  const choices=page.locator('#pg-page-fab-actions .pg-fab__item');
  await expect(choices).toHaveCount(5);
  expect(await choices.evaluateAll(nodes=>nodes.every(node=>{
    const r=node.getBoundingClientRect();
    return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;
  }))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(secondary).toHaveAttribute('aria-expanded','false');
});
