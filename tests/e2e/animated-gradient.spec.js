/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LEGACY GRADIENT PRESETS E2E                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: 3 пресети, 3 спільні кнопки, 2 статичні текстури й шум без швів.                     ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Dialog, ButtonGroup, AnimatedGradient.                                  ║
 * ║ ПУБЛІЧНИЙ API: Browser regression tests.                                                        ║
 * ║ ПРИНЦИП: CSS-transform loops, no per-frame JS paint, preserved shared modal behavior.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function openGradient(page) {
  await page.goto('/tools');
  const trigger = page.locator('#pg-tools-panel-tables [data-pg-action="animated-gradient-demo"]');
  await trigger.click();
  const modal = page.getByRole('dialog', { name: 'Анімований градієнт' });
  await expect(modal).toBeVisible();
  const gradient = modal.locator('.pg-animated-gradient');
  await expect(gradient).toHaveAttribute('data-pg-gradient-ready', 'true');
  return { trigger, modal, gradient };
}

const sampleCanvas = canvas => canvas.evaluate(el => {
  const context = el.getContext('2d');
  const data = context.getImageData(0, 0, el.width, el.height).data;
  let sum = 0, variation = 0, maxStep = 0;
  const step = Math.max(1, Math.floor(el.width / 20));
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i] + data[i + 1] + data[i + 2];
    if (i > 0) variation += Math.abs(data[i] - data[i - 4]);
  }
  for (let y = 1; y < el.height - 1; y += step) {
    for (let x = 1; x < el.width - 1; x += step) {
      const i = 4 * (y * el.width + x), j = i - 4;
      maxStep = Math.max(maxStep, Math.abs(data[i] - data[j]),
        Math.abs(data[i + 1] - data[j + 1]), Math.abs(data[i + 2] - data[j + 2]));
    }
  }
  return { sum, variation, maxStep, width: el.width, height: el.height };
});

test('full-bleed demo shows pinguinV6 and three reusable preset buttons', async ({ page }) => {
  const { trigger, modal, gradient } = await openGradient(page);
  await expect(modal).toHaveAttribute('data-pg-presentation', 'edge-to-edge');
  await expect(modal.locator('.pg-dialog__header, .pg-dialog__footer')).toHaveCount(0);
  await expect(gradient.locator('.pg-animated-gradient__title')).toHaveText('pinguinV6');
  await expect(gradient).toHaveAttribute('data-pg-preset', 'dawn');
  await expect(gradient.locator('canvas.pg-animated-gradient__canvas')).toHaveCount(2);
  await expect(gradient.locator('canvas.pg-animated-gradient__grain')).toHaveCount(1);
  await expect(gradient.locator('.pg-animated-gradient__glow')).toHaveCount(0);

  const group = modal.getByRole('group', { name: 'Тип градієнта' });
  await expect(group.getByRole('button')).toHaveCount(3);
  for (const name of ['Light', 'Storm', 'Dawn']) {
    await expect(group.getByRole('button', { name })).toBeVisible();
  }
  await expect(group.getByRole('button', { name: 'Dawn' })).toHaveAttribute('aria-pressed', 'true');
  await expect(modal.getByRole('button', { name: 'Закрити діалог' })).toBeFocused();
  const coverage = await gradient.evaluate(node => {
    const a = node.getBoundingClientRect(), b = node.closest('dialog').getBoundingClientRect();
    return [Math.abs(a.width-b.width),Math.abs(a.height-b.height),
      Math.abs(a.x-b.x),Math.abs(a.y-b.y)];
  });
  for(const difference of coverage) expect(difference).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('all three legacy presets are distinct and repaint existing textures only on selection', async ({ page }) => {
  const { modal, gradient } = await openGradient(page);
  const group = modal.getByRole('group', { name: 'Тип градієнта' });
  const firstLayer = gradient.locator('canvas.pg-animated-gradient__canvas--a');
  const secondLayer = gradient.locator('canvas.pg-animated-gradient__canvas--b');
  const samples = {};
  for(const [preset,name] of [['dawn','Dawn'],['light','Light'],['storm','Storm']]){
    await group.getByRole('button', { name }).click();
    await expect(gradient).toHaveAttribute('data-pg-preset', preset);
    await expect(group.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    samples[preset] = await sampleCanvas(firstLayer);
    expect(samples[preset].maxStep).toBeLessThan(25);
    expect(samples[preset].variation).toBeGreaterThan(0);
  }
  expect(new Set(Object.values(samples).map(s=>s.sum)).size).toBe(3);
  await expect(firstLayer).toHaveCount(1);
  await expect(secondLayer).toHaveCount(1);
  const first = await sampleCanvas(firstLayer);
  const second = await sampleCanvas(secondLayer);
  await page.waitForTimeout(700);
  expect(await sampleCanvas(firstLayer)).toEqual(first);
  expect(await sampleCanvas(secondLayer)).toEqual(second);

  const styles = await firstLayer.evaluate(a=>{
    const b=a.nextElementSibling;
    return {
      a:getComputedStyle(a).animationName,
      b:getComputedStyle(b).animationName,
      coverage:getComputedStyle(a).width,
      grainOpacity:getComputedStyle(a.parentElement.querySelector('.pg-animated-gradient__grain')).opacity,
    };
  });
  expect(styles.a).toContain('pg-gradient-slow-drift-a');
  expect(styles.b).toContain('pg-gradient-slow-drift-b');
  expect(parseFloat(styles.grainOpacity)).toBeGreaterThan(.3);
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
});

test('loop is seamless: keyframes start and end with the same transform and opacity', async ({ page }) => {
  const { modal, gradient } = await openGradient(page);
  const result = await gradient.evaluate(async () => {
    const sheet = [...document.styleSheets].find(sheet=>{
      try { return [...sheet.cssRules].some(rule=>rule.name==='pg-gradient-slow-drift-a'); }
      catch { return false; }
    });
    const rules=[...sheet.cssRules].filter(rule=>[
      'pg-gradient-slow-drift-a','pg-gradient-slow-drift-b','pg-gradient-soft-blend'
    ].includes(rule.name));
    return rules.map(rule=>{
      const first=[...rule.cssRules].find(r=>r.keyText.includes('0%'));
      return {name:rule.name,startEndTogether:first.keyText.includes('100%')};
    });
  });
  expect(result).toEqual([
    {name:'pg-gradient-slow-drift-a',startEndTogether:true},
    {name:'pg-gradient-slow-drift-b',startEndTogether:true},
    {name:'pg-gradient-soft-blend',startEndTogether:true},
  ]);
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
});

test('dark mode repaints existing textures; reduced motion freezes CSS animation', async ({ page }) => {
  const { modal, gradient } = await openGradient(page);
  const base = await sampleCanvas(gradient.locator('.pg-animated-gradient__canvas--a'));
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect.poll(async()=> (await sampleCanvas(gradient.locator('.pg-animated-gradient__canvas--a'))).sum)
    .not.toBe(base.sum);
  await page.emulateMedia({ reducedMotion:'reduce' });
  await expect(gradient.locator('.pg-animated-gradient__canvas--a')).toHaveCSS('animation-name','none');
  await expect(gradient.locator('.pg-animated-gradient__canvas--b')).toHaveCSS('animation-name','none');
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
});

test('Dialog pauses the background instance and does not freeze its own gradient', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async()=>{
    const { createAnimatedGradient } = await import('/src/ui/animated-gradient/animated-gradient.js');
    const bg = createAnimatedGradient({ text:null, preset:'storm' });
    document.querySelector('#pg-tools-panel-tables').append(bg);
  });
  const bg = page.locator('#pg-tools-panel-tables > .pg-animated-gradient');
  await bg.scrollIntoViewIfNeeded();
  await expect(bg).toHaveAttribute('data-pg-gradient-paused','false');
  await page.locator('[data-pg-action="animated-gradient-demo"]').click();
  const modal = page.getByRole('dialog', {name:'Анімований градієнт'});
  await expect(bg).toHaveAttribute('data-pg-gradient-paused','true');
  await expect(modal.locator('.pg-animated-gradient')).toHaveAttribute('data-pg-gradient-paused','false');
  await modal.locator('[data-pg-action="dialog-dismiss"]').click();
  await expect(modal).toHaveCount(0);
  await expect(bg).toHaveAttribute('data-pg-gradient-paused','false');
});

test('edge-to-edge Dialog remains reusable with arbitrary content', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async()=>{
    const { showDialog }=await import('/src/ui/dialog/dialog.js');
    const node=document.createElement('div');
    node.textContent='Довільний вміст';
    node.style.display='grid';
    void showDialog({title:'Перегляд матеріалу',presentation:'edge-to-edge',content:node});
  });
  const modal=page.getByRole('dialog',{name:'Перегляд матеріалу'});
  await expect(modal.locator('.pg-dialog__body > div')).toHaveCSS('display','grid');
  await expect(modal.getByRole('button',{name:'Закрити діалог'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
});
