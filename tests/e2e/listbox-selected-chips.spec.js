/**
 * Multi-select overflow: +N controls one expanded field, not duplicate chips.
 * The tests use the actual Listbox and disabled native Input components.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createListbox } = await import('/src/ui/listbox/listbox.js');
    const options = [
      { value: 'prom', label: 'Пром.ua' },
      { value: 'rozetka', label: 'Rozetka' },
      { value: 'promua', label: 'Prom.ua (UA)' },
      { value: 'amazon', label: 'Amazon' },
      { value: 'etsy', label: 'Etsy' },
      { value: 'meta', label: 'Meta', disabled: true },
    ];
    window.pgSelectedChanges = [];
    const many = ['prom', 'rozetka', 'promua', 'amazon', 'etsy'];
    const configurations = [
      ['normal', many, false],
      ['near-bottom', many, true],
      ['few', ['prom', 'rozetka', 'promua'], false],
    ];
    for (const [name, value, bottom] of configurations) {
      const control = createListbox({
        label: 'Маркетплейси ' + name, name: 'marketplaces', multiple: true,
        searchable: true, options, value,
        onChange: values => window.pgSelectedChanges.push(values),
      });
      const host = document.createElement('div');
      host.id = 'selection-test-' + name;
      host.style.cssText = 'position:fixed;left:' +
        (name === 'normal' ? '30px' : name === 'near-bottom' ? '450px' : '810px') +
        ';width:330px;z-index:60;' + (bottom ? 'bottom:20px' : 'top:80px');
      host.append(control.element);
      document.body.append(host);
    }
  });
});

async function movePointerTo(page, target) {
  const rect = await target.boundingBox();
  expect(rect).not.toBeNull();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

async function hoverOverflow(page, root) {
  // Showing the expanded surface deliberately covers +N. Playwright's
  // locator.hover() waits for the button to stay visible and retries forever.
  // A real mouse move initiates the UI transition without that false condition.
  const more = root.getByRole('button', { name: 'Показати всі вибрані значення' });
  await movePointerTo(page, more);
  await expect(root.locator('.pg-listbox__selection-tray')).toBeVisible();
}

test('ordinary hovering shows nothing; hovering +N replaces compact chips with one expanded field', async ({page}) => {
  const root=page.locator('#selection-test-normal');
  const more=root.getByRole('button',{name:'Показати всі вибрані значення'});
  const tray=root.locator('.pg-listbox__selection-tray');
  await expect(root.locator('.pg-listbox__chip')).toHaveCount(4);
  await movePointerTo(page, root.locator('.pg-field__label').first());
  await expect(tray).toBeHidden();
  await movePointerTo(page, root.locator('.pg-listbox__chip-text').first());
  await expect(tray).toBeHidden();

  await hoverOverflow(page, root);
  await expect(tray).toBeVisible();
  await expect(root.locator('.pg-listbox__selected-chip')).toHaveCount(5);
  await expect(root.locator('.pg-listbox__panel')).toBeHidden();
  await expect(root.locator('.pg-listbox__value--interactive')).toHaveCSS('visibility','hidden');
  const geometry=await root.evaluate(el=>{
    const surface=el.querySelector(':scope > .pg-listbox > .pg-field > .pg-field__surface').getBoundingClientRect();
    const expanded=el.querySelector('.pg-listbox__selection-tray').getBoundingClientRect();
    return {side:el.querySelector('.pg-listbox').dataset.pgTraySide,
      top:expanded.top-surface.top,width:expanded.width-surface.width,
      x:expanded.left-surface.left,bottom:expanded.bottom-surface.bottom,
      surfaceHeight:surface.height,expandedHeight:expanded.height};
  });
  expect(geometry.side).toBe('down');
  expect(Math.abs(geometry.top)).toBeLessThan(2);
  expect(Math.abs(geometry.width)).toBeLessThan(2);
  expect(Math.abs(geometry.x)).toBeLessThan(2);
  expect(geometry.expandedHeight).toBeGreaterThan(geometry.surfaceHeight);
});

test('× removes one value in expanded view without opening options',async({page})=>{
  const root=page.locator('#selection-test-normal');
  await hoverOverflow(page, root);
  const tray=root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  await tray.getByRole('button',{name:'Видалити Amazon'}).click();
  await expect(tray).toBeVisible();
  await expect(tray.locator('.pg-listbox__selected-chip')).toHaveCount(4);
  await expect(root.locator('.pg-listbox__panel')).toBeHidden();
  const selected=await page.evaluate(()=>({
    changes:window.pgSelectedChanges,
    form:Array.from(document.querySelectorAll('#selection-test-normal input[name=marketplaces]'))
      .map(i=>i.value),
  }));
  expect(selected.changes).toEqual([['prom','rozetka','promua','etsy']]);
  expect(selected.form).toEqual(['prom','rozetka','promua','etsy']);
});

test('when all selected values fit, there is no +N or expansion on hover or focus',async({page})=>{
  const root=page.locator('#selection-test-few');
  const tray=root.locator('.pg-listbox__selection-tray');
  await expect(root.locator('.pg-listbox__chip')).toHaveCount(3);
  await expect(root.locator('[data-pg-show-selected]')).toHaveCount(0);
  await root.locator(':scope > .pg-listbox > .pg-field > .pg-field__surface').hover();
  await root.locator('.pg-listbox__trigger').focus();
  await expect(tray).toBeHidden();
  await expect(root.locator('.pg-listbox')).toHaveAttribute('data-pg-has-overflow','false');
});

test('keyboard focus on +N opens expanded values; Escape closes and returns to trigger',async({page})=>{
  const root=page.locator('#selection-test-normal');
  const more=root.getByRole('button',{name:'Показати всі вибрані значення'});
  await more.focus();
  const tray=root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  await expect(tray.getByRole('button',{name:'Згорнути вибрані значення'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tray).toBeHidden();
  await expect(root.locator('.pg-listbox__trigger')).toBeFocused();
});

test('expanded surface grows upward near viewport bottom without duplicating selected chips',async({page})=>{
  const root=page.locator('#selection-test-near-bottom');
  await hoverOverflow(page, root);
  const tray=root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  const geometry=await root.evaluate(el=>{
    const surface=el.querySelector(':scope > .pg-listbox > .pg-field > .pg-field__surface').getBoundingClientRect();
    const extended=el.querySelector('.pg-listbox__selection-tray').getBoundingClientRect();
    return {side:el.querySelector('.pg-listbox').dataset.pgTraySide,
      gap:extended.bottom-surface.bottom,width:extended.width-surface.width,
      compact:getComputedStyle(el.querySelector('.pg-listbox__value--interactive')).visibility};
  });
  expect(geometry.side).toBe('up');
  expect(Math.abs(geometry.gap)).toBeLessThan(2);
  expect(Math.abs(geometry.width)).toBeLessThan(2);
  expect(geometry.compact).toBe('hidden');
});

test('removing hidden tags until only three remain closes expanded view automatically',async({page})=>{
  const root=page.locator('#selection-test-normal');
  await hoverOverflow(page, root);
  const tray=root.locator('.pg-listbox__selection-tray');
  await expect(tray).toBeVisible();
  await tray.getByRole('button',{name:'Видалити Etsy'}).click();
  await tray.getByRole('button',{name:'Видалити Amazon'}).click();
  await expect(tray).toBeHidden();
  await expect(root.getByRole('button',{name:'Показати всі вибрані значення'})).toHaveCount(0);
  await expect(root.locator('.pg-listbox__chip')).toHaveCount(3);
});

test('main trigger opens option selection independently of +N',async({page})=>{
  const root=page.locator('#selection-test-normal');
  await root.locator('.pg-listbox__trigger').press('ArrowDown');
  await expect(root.locator('.pg-listbox__panel')).toBeVisible();
  await expect(root.locator('.pg-listbox__selection-tray')).toBeHidden();
  await expect(root.locator('.pg-listbox__trigger')).toHaveAttribute('aria-expanded','true');
});

test('disabled Input ignores pointer and programmatic focus and renders no text cursor',async({page})=>{
  const control=page.locator('input[name="demo-disabled"]');
  await expect(control).toBeDisabled();
  const values=await control.evaluate(input=>{
    input.focus();
    const surface=input.closest('.pg-field').querySelector('.pg-field__surface');
    return {active:document.activeElement===input,
      pointer:getComputedStyle(input).pointerEvents,
      cursor:getComputedStyle(surface).cursor,
      disabled:input.disabled};
  });
  expect(values).toEqual({active:false,pointer:'none',cursor:'not-allowed',disabled:true});
  const disabled=page.locator('.pg-input').filter({has:control});
  await expect(disabled.locator('.pg-field')).toHaveAttribute('data-pg-disabled','true');
});
