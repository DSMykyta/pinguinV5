/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E PHOTO CHARM                                            ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє м'який фотошарм, локальне фото й перемикач.       ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test і демо /tools.                               ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/photo-charm.spec.js.        ║
 * ║ ПРИНЦИП: Тестує поведінку, не змінює production компоненти.              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import {test,expect} from '@playwright/test';

const PNG=Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL4QwAAAABJRU5ErkJggg==','base64'
);

test.beforeEach(async({page})=>{
  await page.goto('/tools');
  await page.getByRole('tab',{name:'Елементи'}).click();
});

test('one image source feeds both layers; switch does not hide the sharp image',async({page})=>{
  const charm=page.locator('.pg-tools-image-demo .pg-photo-charm');
  const sharp=charm.locator('.pg-photo-charm__image');
  const aura=charm.locator('.pg-photo-charm__aura');
  const toggle=page.getByRole('switch',{name:'Розмите тло'});
  await expect(charm).toHaveAttribute('data-pg-enabled','true');
  expect(await sharp.getAttribute('src')).toBe(await aura.getAttribute('src'));
  await expect(aura).toHaveAttribute('aria-hidden','true');
  expect(await aura.evaluate(node=>getComputedStyle(node).filter)).toContain('blur(40px)');
  await toggle.uncheck();
  await expect(charm).toHaveAttribute('data-pg-enabled','false');
  await expect(aura).toHaveCSS('opacity','0');
  await expect(sharp).toBeVisible();
  await toggle.check();
  await expect(charm).toHaveAttribute('data-pg-enabled','true');
  await expect(aura).not.toHaveCSS('opacity','0');
});

test('selected local photo replaces preview and removing it restores sample',async({page})=>{
  const demo=page.locator('.pg-tools-image-demo');
  const sharp=demo.locator('.pg-photo-charm__image');
  const aura=demo.locator('.pg-photo-charm__aura');
  const sample=await sharp.getAttribute('src');
  await demo.locator('input[type=file]').setInputFiles({
    name:'test.png',mimeType:'image/png',buffer:PNG,
  });
  const local=await sharp.getAttribute('src');
  expect(local).toMatch(/^blob:/);
  expect(await aura.getAttribute('src')).toBe(local);
  await expect(sharp).toHaveAttribute('alt','Попередній перегляд: test.png');
  await demo.getByRole('button',{name:'Прибрати'}).click();
  await expect(sharp).toHaveAttribute('src',sample);
  await expect(aura).toHaveAttribute('src',sample);
});

test('two independent photo charms and reduced-motion transitions',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const result=await page.evaluate(async()=>{
    const {createPhotoCharm}=await import('/src/ui/photo-charm/photo-charm.js');
    const a=createPhotoCharm({src:'data:image/png;base64,iVBORw0KGgo=',alt:'Перше'});
    const b=createPhotoCharm({src:'data:image/png;base64,iVBORw0KGgo=',alt:'Друге'});
    document.body.append(a.element,b.element);
    a.setEnabled(false);
    const independent=[a.getEnabled(),b.getEnabled()];
    const duration=getComputedStyle(b.element.querySelector('.pg-photo-charm__aura')).transitionDuration;
    a.destroy();b.destroy();
    return {independent,duration,remaining:a.element.isConnected||b.element.isConnected};
  });
  expect(result).toEqual({independent:[false,true],duration:'0s',remaining:false});
});

test('photo glow has equal fade space on all sides at desktop and mobile widths',async({page})=>{
  const charm=page.locator('.pg-tools-image-demo .pg-photo-charm');
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    const geometry=await charm.evaluate(root=>{
      const aura=root.querySelector('.pg-photo-charm__aura');
      const sharp=root.querySelector('.pg-photo-charm__image');
      const outer=root.getBoundingClientRect();
      const inner=sharp.getBoundingClientRect();
      const a=aura.getBoundingClientRect();
      const style=getComputedStyle(aura);
      const gutters=[inner.left-outer.left,outer.right-inner.right,
        inner.top-outer.top,outer.bottom-inner.bottom];
      const padding=[style.paddingLeft,style.paddingRight,style.paddingTop,style.paddingBottom].map(parseFloat);
      return {gutters,padding,aligned:Math.abs(a.left-outer.left)<1&&Math.abs(a.top-outer.top)<1
        &&Math.abs(a.width-outer.width)<1&&Math.abs(a.height-outer.height)<1,
        mask:style.maskImage,composite:style.maskComposite,transform:style.transform};
    });
    expect(geometry.aligned).toBe(true);
    expect(Math.max(...geometry.gutters)-Math.min(...geometry.gutters)).toBeLessThan(1);
    geometry.padding.forEach((value,i)=>expect(Math.abs(value-geometry.gutters[i])).toBeLessThan(1));
    expect(geometry.mask).toContain('linear-gradient');
    expect(geometry.mask).not.toContain('radial-gradient');
    expect(geometry.composite).toContain('intersect');
    expect(geometry.transform).toBe('none');
  }
});
