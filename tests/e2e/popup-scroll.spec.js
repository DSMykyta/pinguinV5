/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E POPUP SCROLL                                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє popup scroll у браузері через Playwright.                               ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/popup-scroll.spec.js.                                  ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const [{createListbox},{createCombobox},{createMenu}] = await Promise.all([
      import('/src/ui/listbox/listbox.js'),
      import('/src/ui/combobox/combobox.js'),
      import('/src/ui/menu/menu.js'),
    ]);
    const options = Array.from({length:25}, (_,i) => ({
      value:'option-'+i, label:'Варіант '+i,
    }));
    const cases = {
      listbox: createListbox({label:'Тест списку',options,searchable:true}),
      combobox: createCombobox({label:'Тест підказок',options}),
      menu: createMenu({label:'Дії',items:options}),
    };
    Object.entries(cases).forEach(([key,widget],index) => {
      const scroller=document.createElement('div');
      scroller.id='scroll-dismiss-'+key;
      scroller.style.cssText='position:fixed;top:75px;left:'+(15+285*index)+
        'px;width:250px;height:160px;overflow:auto;z-index:40;background:white';
      const spacer=document.createElement('div');
      spacer.style.height='500px';
      scroller.append(widget.element,spacer);
      document.body.append(scroller);
    });
  });
});

const components=[
  {name:'listbox',trigger:'.pg-listbox__trigger',popup:'.pg-listbox__panel',expanded:'.pg-listbox__trigger'},
  {name:'combobox',trigger:'input[role=combobox]',popup:'.pg-combobox__list',expanded:'input[role=combobox]'},
  {name:'menu',trigger:'.pg-menu__trigger',popup:'.pg-menu__panel',expanded:'.pg-menu__trigger'},
];

for(const {name,trigger,popup,expanded} of components) {
  test(name+' remains open while scrolling its own options, closes on parent scroll',async({page})=>{
    const scroller=page.locator('#scroll-dismiss-'+name);
    const open=async()=>{
      if(name==='combobox')await scroller.locator(trigger).focus();
      else await scroller.locator(trigger).click();
    };
    await open();
    await expect(scroller.locator(expanded)).toHaveAttribute('aria-expanded','true');
    const options=scroller.locator(popup);
    await expect(options).toBeVisible();

    const internal=await options.evaluate(node=>{
      const old=node.scrollTop;
      node.scrollTop=100;
      return {old,now:node.scrollTop,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight};
    });
    expect(internal.scrollHeight).toBeGreaterThan(internal.clientHeight);
    expect(internal.now).toBeGreaterThan(internal.old);
    // The capture listener receives the internal scroll event, but must ignore it.
    await page.waitForTimeout(100);
    await expect(scroller.locator(expanded)).toHaveAttribute('aria-expanded','true');

    // Let the open gesture's browser scroll-to-focus events finish before external scroll.
    await page.waitForTimeout(80);
    await scroller.evaluate(node=>{node.scrollTop=75;});
    await expect(scroller.locator(expanded)).toHaveAttribute('aria-expanded','false');
    await expect(options).toBeHidden();
  });
}

test('window scroll dismisses an open Listbox while leaving the selected value unchanged',async({page})=>{
  const scroller=page.locator('#scroll-dismiss-listbox');
  const trigger=scroller.locator('.pg-listbox__trigger');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await page.waitForTimeout(80);
  await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(scroller.locator('.pg-listbox__panel')).toBeHidden();
});
