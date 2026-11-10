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
