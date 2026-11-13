/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E FIELD OUTLINE                                                                    ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє field outline у браузері через Playwright.                              ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/field-outline.spec.js.                                 ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tools');
  await page.getByRole('tab', {name: 'Елементи'}).click();
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
  // Allow fractional Chromium font metric rounding without hiding shifts.
  expect(Math.abs((after.y - afterBox.y) - offset)).toBeLessThan(1.5);
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

test('single-line input, select and combobox surfaces share a compact 40px height',async ({page})=>{
  const heights=await page.evaluate(()=>{
    const root=document.querySelector('.pg-tools-field-demo');
    return ['.pg-input .pg-field__surface','.pg-select .pg-field__surface',
      '.pg-combobox .pg-field__surface'].map(s=>root.querySelector(s).getBoundingClientRect().height);
  });
  expect(heights.every(h=>Math.abs(h-40)<.25)).toBe(true);
  await page.setViewportSize({width:390,height:844});
  const narrow=await page.evaluate(()=>{
    const root=document.querySelector('.pg-tools-field-demo');
    return ['.pg-input .pg-field__surface','.pg-select .pg-field__surface',
      '.pg-combobox .pg-field__surface'].map(s=>root.querySelector(s).getBoundingClientRect().height);
  });
  expect(narrow.every(h=>Math.abs(h-40)<.25)).toBe(true);
});

test('native Select opens from the chevron area at desktop and mobile widths',async ({page})=>{
  const field=page.locator('.pg-tools-field-demo .pg-select')
    .filter({has:page.locator('select[name="demo-field-country"]')});
  const select=field.locator('select');
  const caret=field.locator('.pg-field__caret');

  for(const [width,theme] of [[1280,'light'],[390,'dark']]) {
    await page.setViewportSize({width,height:844});
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    await caret.scrollIntoViewIfNeeded();
    const target=await caret.evaluate(arrow=>{
      const r=arrow.getBoundingClientRect();
      const x=r.left+r.width/2,y=r.top+r.height/2;
      return {x,y,hit:document.elementFromPoint(x,y)?.getAttribute('name')};
    });
    // The arrow is visual only: pointer input must go to the native select.
    expect(target.hit).toBe('demo-field-country');
    await select.evaluate(el=>{
      el.dataset.pgTestCaretPointer='false';
      el.addEventListener('pointerdown',event=>{
        el.dataset.pgTestCaretPointer=String(event.target===el);
      },{once:true});
    });
    await page.mouse.click(target.x,target.y);
    await expect(select).toHaveAttribute('data-pg-test-caret-pointer','true');
    await expect(select).toBeFocused();
    await page.keyboard.press('Escape');
    await select.blur();
  }

  // Native keyboard selection and option values still work.
  await select.focus();
  await select.press('ArrowDown');
  await expect(select).toHaveValue('ua');
  await select.selectOption('pl');
  await expect(select).toHaveValue('pl');
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
