/**
 * Unified form-field contract, including search inside multi-selection.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.goto('/tools');
  await page.evaluate(async()=>{
    const [{createInput},{createNumberField},{createListbox}]=await Promise.all([
      import('/src/ui/input/input.js'),
      import('/src/ui/number-field/number-field.js'),
      import('/src/ui/listbox/listbox.js'),
    ]);
    const root=document.createElement('section');
    root.id='shared-input-test';
    root.style.cssText='position:fixed;top:50px;left:30px;width:320px;z-index:99';
    const controls={
      text:createInput({label:'Назва товару'}),
      number:createNumberField({label:'Маса порції',value:30}),
      choice:createListbox({label:'Маркетплейси',multiple:true,searchable:true,
        options:[{label:'Prom.ua',value:'prom'}, {label:'Rozetka',value:'rozetka'}],
        value:['prom']}),
    };
    root.append(controls.choice.element);
    document.body.append(root);
    window.pgSharedFieldTest=controls;
  });
});

test('selected value and popup search reuse the same frame, 56px geometry and label-above layout',async({page})=>{
  const choice=page.locator('#shared-input-test .pg-listbox');
  const frame=choice.locator(':scope > .pg-field');
  await expect(frame.locator('.pg-field__label')).toHaveText('Маркетплейси');
  await expect(frame.locator('.pg-field__surface')).toHaveCSS('height','56px');
  await choice.locator('.pg-listbox__trigger').click();
  await expect(choice).toHaveAttribute('data-pg-open','true');
  await expect(frame).toHaveAttribute('data-pg-active','true');
  const inner=choice.locator('.pg-listbox__search-field');
  await expect(choice.locator('.pg-listbox__search-field.pg-input--search')).toHaveCount(1);
  await expect(inner.locator('.pg-field__label')).toHaveText('Пошук');
  await expect(inner.locator('.pg-field__surface')).toHaveCSS('height','56px');
  await expect(inner.getByRole('combobox',{name:'Пошук у списку Маркетплейси'})).toBeFocused();
  const metrics=await choice.evaluate(el=>{
    const a=el.querySelector(':scope > .pg-field > .pg-field__surface');
    const b=el.querySelector('.pg-listbox__search-field .pg-field__surface');
    const colors=[getComputedStyle(a).borderTopColor,getComputedStyle(b).borderTopColor];
    const radius=[getComputedStyle(a).borderRadius,getComputedStyle(b).borderRadius];
    return {colors,radius};
  });
  expect(metrics.colors[0]).toBe(metrics.colors[1]);
  expect(metrics.radius[0]).toBe(metrics.radius[1]);
});

test('Listbox outer border remains active while focus is in search, then resets on close',async({page})=>{
  const choice=page.locator('#shared-input-test .pg-listbox');
  const frame=choice.locator(':scope > .pg-field');
  await choice.locator('.pg-listbox__trigger').click();
  await expect(choice).toHaveAttribute('data-pg-open','true');
  await expect(frame).toHaveAttribute('data-pg-active','true');
  const search=choice.getByRole('combobox',{name:'Пошук у списку Маркетплейси'});
  await search.fill('Roz');
  await expect(choice.getByRole('option',{name:'Rozetka'})).toBeVisible();
  await search.press('Escape');
  await expect(choice).toHaveAttribute('data-pg-open','false');
  await expect(frame).toHaveAttribute('data-pg-active','false');
});

test('legacy Input variants have one actual DOM frame, not two label arrangements',async({page})=>{
  const info=await page.evaluate(async()=>{
    const {createInput}=await import('/src/ui/input/input.js');
    const standard=createInput({label:'Поле',variant:'standard'});
    const floating=createInput({label:'Поле',variant:'floating'});
    document.body.append(standard.element,floating.element);
    const result=[standard,floating].map(c=>({
      labels:c.element.querySelectorAll('.pg-field > .pg-field__label').length,
      standalone:c.element.querySelectorAll(':scope > .pg-input__label').length,
      border:c.element.querySelectorAll('.pg-field__surface').length,
    }));
    standard.destroy();floating.destroy();
    return result;
  });
  expect(info).toEqual([{labels:1,standalone:0,border:1},{labels:1,standalone:0,border:1}]);
});
