/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E IMAGE FIELD                                                                      ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє image field у браузері через Playwright.                                ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/image-field.spec.js.                                   ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL4QwAAAABJRU5ErkJggg==',
  'base64'
);

test.beforeEach(async({page})=>{
  await page.goto('/tools');
  await page.getByRole('tab',{name:'Елементи'}).click();
});

test('pick, reject invalid replacement, replace and remove revoke only owned blob URLs',async({page})=>{
  const root=page.locator('.pg-tools-image-demo .pg-image-field');
  const picker=root.locator('input[type=file]');
  await expect(root.getByRole('button',{name:'Додати зображення'})).toBeVisible();
  await page.evaluate(()=>{
    window.pgRevokedUrls=[];
    const original=URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL=(url)=>{window.pgRevokedUrls.push(url);original(url);};
  });
  await picker.setInputFiles({name:'sample.png',mimeType:'image/png',buffer:PNG});
  await expect(root.locator('.pg-image-field__preview')).toBeVisible();
  const first=await root.locator('img').getAttribute('src');
  expect(first).toMatch(/^blob:/);
  await picker.setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('text')});
  await expect(root.locator('.pg-image-field__error')).toContainText('не підтримується');
  expect(await root.locator('img').getAttribute('src')).toBe(first);
  await picker.setInputFiles({name:'another.png',mimeType:'image/png',buffer:PNG});
  const second=await root.locator('img').getAttribute('src');
  expect(second).not.toBe(first);
  expect(await page.evaluate(()=>window.pgRevokedUrls)).toContain(first);
  await root.getByRole('button',{name:'Прибрати'}).click();
  await expect(root.locator('.pg-image-field__preview')).toBeHidden();
  expect(await page.evaluate(()=>window.pgRevokedUrls)).toContain(second);
});

test('drop and keyboard pick remain independent, and file limit errors keep old image',async({page})=>{
  const root=page.locator('.pg-tools-image-demo .pg-image-field');
  await page.evaluate(()=>{
    const zone=document.querySelector('.pg-tools-image-demo .pg-image-field__zone');
    const data=new DataTransfer();
    data.items.add(new File([new Uint8Array([1,2,3])],'dropped.png',{type:'image/png'}));
    zone.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));
  });
  await expect(root.locator('.pg-image-field__filename')).toHaveText('dropped.png');
  const old=await root.locator('img').getAttribute('src');
  await root.locator('input[type=file]').setInputFiles({
    name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(2*1024*1024+1),
  });
  await expect(root.locator('.pg-image-field__error')).toContainText('розмір');
  expect(await root.locator('img').getAttribute('src')).toBe(old);
  const other=await page.evaluate(async()=>{
    const {createImageField}=await import('/src/ui/image-field/image-field.js');
    const field=createImageField({label:'Неактивне фото',disabled:true});
    document.body.append(field.element);
    const disabled=field.element.querySelector('.pg-image-field__choose').disabled;
    field.destroy();
    return disabled;
  });
  expect(other).toBe(true);
});
