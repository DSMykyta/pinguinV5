/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E SHARED BUTTON CONSISTENCY                                                        ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє повторне використання спільних кнопок у Shell, Menu, Dialog і колекції.      ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test; спільні компоненти з src/ui/button.                                    ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/button-consistency.spec.js.                             ║
 * ║ ПРИНЦИП: Локальні BEM-класи визначають роль, а візуальний skin — тільки спільний UI.                ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/tools');
});

test('Aside pin reuses the global mini icon button with a stable pressed state', async ({page}) => {
  await page.locator('[data-pg-action="aside-toggle"]').click();
  const pin = page.locator('[data-pg-action="aside-pin"]');
  await expect(pin).toBeVisible();
  await expect(pin).toHaveClass(/pg-icon-button/);
  await expect(pin).toHaveClass(/pg-mini-button/);
  await expect(pin).not.toHaveClass(/pg-aside__pin/);
  await expect(pin).toHaveCSS('width', '32px');
  await expect(pin).toHaveCSS('height', '32px');
  await expect(pin).toHaveCSS('border-top-left-radius', '9999px');
  await expect(pin.locator('.pg-icon')).toHaveCSS('width','16px');
  await expect(pin).toHaveAttribute('aria-pressed','false');
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed','true');
  const bg = await pin.evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});

test('outlined Menu trigger and compact table Menu share button skins', async ({page}) => {
  await page.getByRole('tab',{name:'Текст'}).click();
  const menu = page.locator('.pg-tools-menu-demo .pg-menu').first();
  const trigger = menu.locator('.pg-menu__trigger');
  await expect(trigger).toHaveClass(/pg-button--outline/);
  await expect(trigger).toHaveCSS('min-height','40px');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded','false');

  await page.getByRole('tab',{name:'Макети даних'}).click();
  const mini = page.locator('.pg-collection-view__row-menu .pg-menu__trigger').first();
  await expect(mini).toHaveClass(/pg-mini-button/);
  await expect(mini).toHaveClass(/pg-button--outline/);
  await expect(mini).toHaveCSS('width','32px');
  await expect(mini).toHaveCSS('height','32px');
});

test('Dialog buttons take primary and secondary style from the same button module', async ({page}) => {
  await page.getByRole('tab',{name:'Текст'}).click();
  await page.locator('[data-pg-action="dialog-demo-confirm"]').click();
  const dialog = page.getByRole('dialog');
  const cancel = dialog.locator('[data-pg-action="dialog-cancel"]');
  const confirm = dialog.locator('[data-pg-action="dialog-confirm"]');
  await expect(cancel).toHaveClass(/pg-button--secondary/);
  // The demo intentionally opens a destructive confirmation, not a primary action.
  await expect(confirm).toHaveClass(/pg-button--destructive/);
  await expect(cancel).toHaveCSS('min-height','40px');
  await expect(confirm).toHaveCSS('min-height','40px');
  await cancel.click();
  await expect(dialog).toHaveCount(0);
});

test('icon button variants preserve native disabled, hidden, keyboard focus and reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async()=>{
    const {createIconButton}=await import('/src/ui/button/button.js');
    const button=createIconButton({label:'Окремий тестовий pin',icon:'pin',variant:'mini'});
    button.id='pg-button-test';
    document.body.append(button);
  });
  const btn=page.locator('#pg-button-test');
  await expect(btn).toHaveCSS('transition-duration','0s');
  await btn.focus();
  await expect(btn).toBeFocused();
  await btn.evaluate(el=>el.disabled=true);
  await expect(btn).toBeDisabled();
  await btn.evaluate(el=>{el.disabled=false;el.hidden=true;});
  await expect(btn).toBeHidden();
});

test('clear and tag removal buttons reuse shared controls instead of local CSS skins', async ({page}) => {
  await page.getByRole('tab',{name:'Текст'}).click();
  const clear = page.locator('.pg-tools-field-demo .pg-input__clear');
  await expect(clear).toHaveClass(/pg-mini-button/);
  await expect(clear).toHaveCSS('width','32px');
  const aliases = page.locator('.pg-tools-field-demo .pg-tag-field');
  const input = aliases.locator('input[type="text"]');
  await input.fill('Повторне використання');
  await input.press('Enter');
  const remove = aliases.getByRole('button',{name:'Видалити Повторне використання'});
  await expect(remove).toHaveClass(/pg-button--quiet/);
  await expect(remove).toHaveClass(/pg-button--square/);
  await remove.click();
  await expect(remove).toHaveCount(0);
});

test('existing Button aligns an icon before or after the text with one 8px gap', async ({page}) => {
  await page.getByRole('tab', {name:'Текст'}).click();
  const row=page.locator('.pg-tools-button-demo__row');
  const before=row.getByRole('button',{name:'Іконка зліва'});
  const after=row.getByRole('button',{name:'Іконка справа'});
  await expect(row).toBeVisible();
  for (const button of [before, after]) {
    await expect(button).toHaveCSS('display','inline-flex');
    await expect(button).toHaveCSS('align-items','center');
    await expect(button).toHaveCSS('gap','8px');
    await expect(button.locator('.pg-icon')).toHaveCSS('width','18px');
    await expect(button.locator('.pg-icon')).toHaveCSS('height','18px');
    const centers=await button.evaluate(el=>{
      const [a,b]=el.children;
      const first=a.getBoundingClientRect(),second=b.getBoundingClientRect();
      return Math.abs((first.top+first.bottom)/2-(second.top+second.bottom)/2);
    });
    expect(centers).toBeLessThan(2);
  }
  expect(await before.evaluate(el=>el.firstElementChild?.classList.contains('pg-icon'))).toBe(true);
  expect(await after.evaluate(el=>el.lastElementChild?.classList.contains('pg-icon'))).toBe(true);
  await after.click();
  await expect(page.locator('.pg-tools-button-demo__status')).toContainText('після тексту');
});

test('border orbit loading preserves button geometry and ignores repeated clicks', async ({page})=>{
  await page.getByRole('tab',{name:'Текст'}).click();
  const button=page.locator('[data-pg-action="button-loading-demo"]');
  const before=await button.boundingBox();
  await button.evaluate(el=>{
    el.dataset.pgTestClicks='0';
    el.addEventListener('click',()=>{el.dataset.pgTestClicks=String(Number(el.dataset.pgTestClicks)+1);});
  });
  await button.click();
  await expect(button).toHaveAttribute('data-pg-loading','true');
  await expect(button).toHaveAttribute('aria-busy','true');
  await expect(button).toHaveAttribute('aria-disabled','true');
  await expect(button).toHaveAttribute('data-pg-test-clicks','1');
  const during=await button.boundingBox();
  expect(Math.abs(during.width-before.width)).toBeLessThan(.5);
  expect(Math.abs(during.height-before.height)).toBeLessThan(.5);
  const visual=await button.evaluate(el=>{
    const s=getComputedStyle(el,'::after');
    return {content:s.content,animation:s.animationName,background:s.backgroundImage,
      radius:s.borderTopLeftRadius,pointer:s.pointerEvents};
  });
  expect(visual.content).not.toBe('none');
  expect(visual.animation).toBe('pg-button-loading-orbit');
  expect(visual.background).toContain('conic-gradient');
  expect(visual.pointer).toBe('none');
  await button.focus();
  await page.keyboard.press('Enter');
  await button.evaluate(el=>el.click());
  await expect(button).toHaveAttribute('data-pg-test-clicks','1');
  await expect(button).toBeFocused();
  await expect(button).not.toHaveAttribute('data-pg-loading','true',{timeout:5000});
  await expect(button).not.toHaveAttribute('aria-busy','true');
  await expect(button).not.toHaveAttribute('aria-disabled','true');
  await expect(page.locator('.pg-tools-button-demo__status')).toContainText('завершено');
});

test('Loading works for mini, restores state after rejection and honors reduced motion',async({page})=>{
  await page.getByRole('tab',{name:'Текст'}).click();
  const compact=page.locator('[data-pg-action="button-loading-mini-demo"]');
  await compact.click();
  await expect(compact).toHaveAttribute('data-pg-loading','true');
  await expect(compact).toHaveCSS('width','32px');
  await expect(compact).toHaveCSS('height','32px');
  await expect(compact).not.toHaveAttribute('data-pg-loading','true',{timeout:5000});

  await page.emulateMedia({reducedMotion:'reduce'});
  const state=await page.evaluate(async()=>{
    const {createIconButton, setButtonLoading, withButtonLoading}=await import('/src/ui/button/button.js');
    const button=createIconButton({label:'Busy corner',icon:'plus',variant:'corner'});
    document.body.append(button);
    button.setAttribute('aria-disabled','false');
    button.focus();
    setButtonLoading(button,true);
    setButtonLoading(button,true);
    const busy={focus:document.activeElement===button,angle:getComputedStyle(button,'::after').animationName,
      expanded:button.getAttribute('aria-expanded'),dimension:button.getBoundingClientRect().width};
    setButtonLoading(button,false);
    let rejected=false;
    try {
      await withButtonLoading(button,async()=>{throw new Error('expected');});
    } catch(e){rejected=e.message==='expected';}
    const restored={
      busy:button.hasAttribute('aria-busy'),loading:button.hasAttribute('data-pg-loading'),
      disabled:button.getAttribute('aria-disabled'),focus:document.activeElement===button,
      animation:getComputedStyle(button.querySelector('.pg-icon')).animationName,
    };
    button.remove();
    return {busy,restored,rejected};
  });
  expect(state.busy.focus).toBe(true);
  expect(state.busy.angle).toBe('none');
  expect(state.busy.dimension).toBe(40);
  expect(state.rejected).toBe(true);
  expect(state.restored).toEqual({
    busy:false,loading:false,disabled:'false',focus:true,animation:'none',
  });
});
