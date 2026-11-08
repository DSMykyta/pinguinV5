/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED TOOLTIP E2E                                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє глобальну підказку, її геометрію та динамічні підписи.                     ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, src/ui/tooltip та Shell.                                                    ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Немає нативного title, tooltip не виходить за viewport і не ламає взаємодію.              ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('theme uses shared legacy tooltip instead of native browser title', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const theme = page.locator('[data-pg-action="theme-cycle"]');
  const tooltip = page.getByRole('tooltip');
  await expect(theme).not.toHaveAttribute('title');
  await expect(theme).toHaveAttribute('data-pg-tooltip', 'Тема: Системна');

  await theme.hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText('Тема: Системна');
  await expect(tooltip).toHaveCSS('border-radius', '8px');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(36, 36, 40)');

  const position = await tooltip.boundingBox();
  expect(position.x).toBeGreaterThanOrEqual(8);
  expect(position.y).toBeGreaterThanOrEqual(8);
  expect(position.x + position.width).toBeLessThanOrEqual(1432);
  expect(position.y + position.height).toBeLessThanOrEqual(892);

  await theme.click();
  await expect(theme).toHaveAttribute('data-pg-tooltip', 'Тема: Світла');
  await expect(tooltip).toHaveText('Тема: Світла');

  await page.mouse.move(400, 400);
  await expect(tooltip).toHaveCount(0);
});

test('hover follows the mouse, works on dynamic panels, and changes with the dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const navToggle = page.locator('[data-pg-action="sidebar-toggle"]');
  const tooltip = page.getByRole('tooltip');

  await navToggle.hover();
  await expect(tooltip).toHaveText('Згорнути навігацію');
  const start = await tooltip.boundingBox();
  const target = await navToggle.boundingBox();
  // Move a few pixels inside the same button; entering/leaving nested SVGs
  // should never be mistaken for leaving the tooltip target.
  await page.mouse.move(target.x + target.width / 2 + 2, target.y + target.height / 2 + 2);
  await expect(tooltip).toBeVisible();
  const moved = await tooltip.boundingBox();
  expect(moved.x).toBeGreaterThan(start.x);
  expect(moved.y).toBeGreaterThan(start.y);

  await page.mouse.move(600, 600);
  await expect(tooltip).toHaveCount(0);

  await page.locator('[data-pg-action="theme-cycle"]').click();
  await page.locator('[data-pg-action="theme-cycle"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const asideToggle = page.locator('[data-pg-action="aside-toggle"]');
  await asideToggle.hover();
  await expect(tooltip).toHaveText('Відкрити контекстне меню');
  await expect(tooltip).toHaveCSS('background-color', 'rgb(241, 241, 241)');

  await asideToggle.click();
  const pin = page.locator('[data-pg-action="aside-pin"]');
  await pin.hover();
  await expect(tooltip).toHaveText('Закріпити панель');
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await expect(tooltip).toHaveText('Відкріпити панель');
});

test('keyboard focus supports the same tooltip without a native title', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.keyboard.press('Tab');

  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('data-pg-tooltip');
  const description = await focused.getAttribute('data-pg-tooltip');
  await expect(page.getByRole('tooltip')).toHaveText(description);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('legacy data-tooltip for truncated content is supported without duplicating normal text', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const element = document.createElement('div');
    element.id = 'test-tooltip-overflow';
    element.dataset.tooltip = 'Це повний довгий текст для обрізаного рядка';
    element.textContent = 'Це повний довгий текст для обрізаного рядка';
    element.style.cssText = 'position:fixed;top:90px;left:350px;width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    document.body.append(element);
  });

  await page.locator('#test-tooltip-overflow').hover();
  await expect(page.getByRole('tooltip')).toHaveText('Це повний довгий текст для обрізаного рядка');

  await page.mouse.move(750, 700);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.evaluate(() => {
    const node = document.getElementById('test-tooltip-overflow');
    node.style.width = '600px';
  });
  await page.locator('#test-tooltip-overflow').hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0, { timeout: 800 });
});

test('local tooltip lifecycle cancels pending work, remounts and disposes independently', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { initTooltips } = await import('/src/ui/tooltip/tooltip.js');
    const frames = [];
    for (const label of ['Перший', 'Другий']) {
      const frame = document.createElement('iframe');
      frame.title = label;
      const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
      frame.srcdoc = '<!doctype html><html><head><title>Tooltip lifecycle</title></head><body></body></html>';
      document.body.append(frame);
      await loaded;
      const doc = frame.contentDocument;
      const view = frame.contentWindow;
      const button = doc.createElement('button');
      button.textContent = label;
      button.dataset.pgTooltip = label;
      button.setAttribute('data-pg-tooltip-always', '');
      doc.body.append(button);
      const start = () => button.dispatchEvent(new view.MouseEvent('mouseover', { bubbles: true, clientX: 20, clientY: 20 }));
      frames.push({ frame, doc, view, start, mount: () => initTooltips({ doc, view }) });
    }
    // Initial iframe layout can dispatch resize, which correctly hides a tooltip.
    // Start the interaction after native loading and layout have settled.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const fixture of frames) fixture.dispose = fixture.mount();
    frames[0].start();
    frames[0].dispose();
    frames[0].start(); // No old listener should be able to schedule a tooltip.
    frames[1].start();
    window.pgTooltipLifecycle = frames;
  });
  const first = page.frameLocator('iframe[title="Перший"]');
  const second = page.frameLocator('iframe[title="Другий"]');
  await expect(second.getByRole('tooltip')).toHaveText('Другий');
  await expect(first.getByRole('tooltip')).toHaveCount(0);
  await page.evaluate(() => {
    const fixture = window.pgTooltipLifecycle[0];
    fixture.dispose = fixture.mount();
    fixture.start();
  });
  await expect(first.getByRole('tooltip')).toHaveText('Перший');
  await page.evaluate(() => {
    const fixture = window.pgTooltipLifecycle[0];
    fixture.dispose();
    fixture.dispose();
  });
  await expect(first.getByRole('tooltip')).toHaveCount(0);
  await expect(second.getByRole('tooltip')).toHaveText('Другий');
  await page.evaluate(() => window.pgTooltipLifecycle[1].dispose());
  await expect(second.getByRole('tooltip')).toHaveCount(0);
});
