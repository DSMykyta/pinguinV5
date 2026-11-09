/**
 * Real notch, matched single-line heights, contextual backgrounds and circular checkbox.
 * Checks use actual DOM controls; no screenshot placeholders or copied Brands feature.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', {name: 'Текст'}).click();
});

test('outlined label cuts through fieldset border without an opaque label patch', async ({page}) => {
  const input = page.locator('input[name="demo-field-name"]');
  const field = page.locator('.pg-tools-field-demo .pg-input').filter({has:input}).locator('.pg-field');
  const label = field.locator('.pg-field__label');
  const border = field.locator('fieldset.pg-field__outline');
  const notch = border.locator('legend');
  await expect(border).toHaveAttribute('aria-hidden','true');
  await expect(label).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect.poll(() => notch.boundingBox().then(b=>b.width)).toBeLessThan(1);
  await input.focus();
  await expect.poll(() => notch.boundingBox().then(b=>b.width)).toBeGreaterThan(30);
  const geometry = await page.evaluate(() => {
    const control = document.querySelector('input[name="demo-field-name"]');
    const container = control.closest('.pg-field');
    const outline = container.querySelector('.pg-field__outline');
    const label = container.querySelector('.pg-field__label');
    return {background: getComputedStyle(label).backgroundColor,
      outline: getComputedStyle(outline).borderTopStyle,
      labelCenter: label.getBoundingClientRect().y + label.getBoundingClientRect().height / 2,
      frameTop: container.getBoundingClientRect().top};
  });
  expect(geometry.background).toBe('rgba(0, 0, 0, 0)');
  expect(geometry.outline).toBe('solid');
  expect(Math.abs(geometry.labelCenter-geometry.frameTop)).toBeLessThan(3);
});

test('leading accessories align notch, and different surface colors need no label background',async ({page})=>{
  const container=page.locator('.pg-tools-field-demo .pg-input').filter({has:page.locator('input[name="demo-field-price"]')}).locator('.pg-field');
  await container.locator('input').focus();
  await expect.poll(()=>container.locator('legend').boundingBox().then(b=>b.width)).toBeGreaterThan(25);
  const offsets=await container.evaluate(element=>{
    const label=element.querySelector('.pg-field__label').getBoundingClientRect();
    const notch=element.querySelector('legend').getBoundingClientRect();
    return {labelX:label.x,notchX:notch.x};
  });
  expect(Math.abs(offsets.labelX-offsets.notchX)).toBeLessThan(9);
  await page.evaluate(()=>{
    document.querySelector('.pg-tools-field-demo').style.background='linear-gradient(120deg, #cfc, #bbd)';
  });
  await expect(container.locator('.pg-field__label')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
});

test('one-line Input, Select and Combobox remain exactly 56px when adjacent to described fields', async ({page})=>{
  const h=await page.evaluate(()=>{
    const root=document.querySelector('.pg-tools-field-demo');
    return ['.pg-input .pg-field','.pg-select .pg-field','.pg-combobox .pg-field']
      .map(selector=>root.querySelector(selector).getBoundingClientRect().height);
  });
  expect(h).toEqual([56,56,56]);
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.evaluate(()=>{
    const root=document.querySelector('.pg-tools-field-demo');
    return ['.pg-input .pg-field','.pg-select .pg-field','.pg-combobox .pg-field']
      .map(selector=>root.querySelector(selector).getBoundingClientRect().height);
  });
  expect(narrow).toEqual([56,56,56]);
});

test('checkbox becomes a circular check or minus, preserving native keyboard and mixed state',async ({page})=>{
  const box=page.locator('.pg-tools-advanced-fields .pg-checkbox');
  const checkbox=box.getByRole('checkbox',{name:'Враховувати в описі'});
  await expect(checkbox).toBeChecked();
  await expect(box.locator('.pg-checkbox__box')).toHaveCSS('border-radius','50%');
  await checkbox.press('Space');
  await expect(checkbox).not.toBeChecked();
  await expect(box.locator('.pg-checkbox__box')).toHaveCSS('border-radius','5px');
  const mixed=await page.evaluate(async()=>{
    const {createCheckbox}=await import('/src/ui/checkbox/checkbox.js');
    const control=createCheckbox({label:'Частковий вибір',indeterminate:true});
    document.body.append(control.element);
    return control.element.className;
  });
  expect(mixed).toBe('pg-checkbox');
  const partial=page.locator('.pg-checkbox').filter({has:page.getByRole('checkbox',{name:'Частковий вибір'})});
  await expect(partial).toHaveAttribute('data-pg-mixed','true');
  await expect(partial.locator('.pg-checkbox__box')).toHaveCSS('border-radius','50%');
  await partial.getByRole('checkbox').press('Space');
  await expect(partial).toHaveAttribute('data-pg-mixed','false');
});
