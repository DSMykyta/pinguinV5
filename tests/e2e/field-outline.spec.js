/**
 * Plain shared field regression tests: no notch, no floating, stable 56px surfaces.
 * Real browser controls, across narrow layouts and different background contexts.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', {name: 'Текст'}).click();
});

test('permanent label stays above the border without any decorative cutout', async ({page}) => {
  const field = page.locator('.pg-tools-field-demo .pg-input')
    .filter({has:page.locator('input[name="demo-field-name"]')});
  const label = field.locator('.pg-field__label');
  const surface = field.locator('.pg-field__surface');
  await expect(label).toBeVisible();
  await expect(field.locator('fieldset, legend')).toHaveCount(0);
  const before = await label.boundingBox();
  const box = await surface.boundingBox();
  const offset = before.y - box.y;
  expect(before.y + before.height).toBeLessThan(box.y);
  await field.locator('input').focus();
  await expect(label).toHaveCSS('position','static');
  await expect(label).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const after = await label.boundingBox();
  const afterBox = await surface.boundingBox();
  expect(Math.abs((after.y - afterBox.y) - offset)).toBeLessThan(1);
  await expect(surface).toHaveCSS('border-top-style','solid');
});

test('adornments and different surrounding backgrounds do not affect the label',async ({page})=>{
  const field=page.locator('.pg-tools-field-demo .pg-input')
    .filter({has:page.locator('input[name="demo-field-price"]')});
  const label=field.locator('.pg-field__label');
  const surface=field.locator('.pg-field__surface');
  await expect(field.locator('.pg-field__leading')).toBeVisible();
  await expect(field.locator('.pg-field__trailing')).toBeVisible();
  const old=await label.boundingBox();
  const oldBorder=await surface.boundingBox();
  const offset=old.y-oldBorder.y;
  await page.evaluate(()=>{
    document.querySelector('.pg-tools-field-demo').style.background='linear-gradient(120deg,#cfc,#bbd)';
  });
  await field.locator('input').focus();
  await expect(label).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const after=await label.boundingBox();
  const border=await surface.boundingBox();
  expect(Math.abs((after.y-border.y)-offset)).toBeLessThan(2);
  expect(after.y+after.height).toBeLessThan(border.y);
});

test('single-line input, select and combobox surfaces are all 56px',async ({page})=>{
  const heights=await page.evaluate(()=>{
    const root=document.querySelector('.pg-tools-field-demo');
    return ['.pg-input .pg-field__surface','.pg-select .pg-field__surface',
      '.pg-combobox .pg-field__surface'].map(s=>root.querySelector(s).getBoundingClientRect().height);
  });
  expect(heights.every(h=>Math.abs(h-56)<.25)).toBe(true);
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.evaluate(()=>{
    const root=document.querySelector('.pg-tools-field-demo');
    return ['.pg-input .pg-field__surface','.pg-select .pg-field__surface',
      '.pg-combobox .pg-field__surface'].map(s=>root.querySelector(s).getBoundingClientRect().height);
  });
  expect(narrow.every(h=>Math.abs(h-56)<.25)).toBe(true);
});

test('checkbox circle and mixed-state keyboard behavior remain unchanged',async ({page})=>{
  const box=page.locator('.pg-tools-advanced-fields .pg-checkbox');
  const checkbox=box.getByRole('checkbox',{name:'Враховувати в описі'});
  await expect(checkbox).toBeChecked();
  await expect(box.locator('.pg-checkbox__box')).toHaveCSS('border-radius','50%');
  await checkbox.press('Space');
  await expect(checkbox).not.toBeChecked();
  await expect(box.locator('.pg-checkbox__box')).toHaveCSS('border-radius','5px');
  await page.evaluate(async()=>{
    const {createCheckbox}=await import('/src/ui/checkbox/checkbox.js');
    const control=createCheckbox({label:'Частковий вибір',indeterminate:true});
    document.body.append(control.element);
  });
  const partial=page.locator('.pg-checkbox').filter({has:page.getByRole('checkbox',{name:'Частковий вибір'})});
  await expect(partial).toHaveAttribute('data-pg-mixed','true');
  await expect(partial.locator('.pg-checkbox__box')).toHaveCSS('border-radius','50%');
  await partial.getByRole('checkbox').press('Space');
  await expect(partial).toHaveAttribute('data-pg-mixed','false');
});
