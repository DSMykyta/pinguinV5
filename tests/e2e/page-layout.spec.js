/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SHARED PAGE GEOMETRY E2E                                                             ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Одна шапка і одна область заголовків для всіх вкладок.                           ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і модульна оболонка.                                                   ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну поведінку, не декоративні заглушки.                                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function geometry(page) {
  const surface = page.locator('.pg-page');
  await surface.evaluate(element => Promise.all(element.getAnimations()
    .map(animation => animation.finished.catch(() => {}))));
  await page.locator('.pg-shell').evaluate(element =>
    Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
  const h1 = await page.locator('h1.pg-page__title').boundingBox();
  const frame = await surface.boundingBox();
  const header = await page.locator('.pg-shell__page-name').boundingBox();
  return {
    x: h1.x, y: h1.y, width: h1.width,
    frameX: frame.x, frameWidth: frame.width,
    headerX: header.x, headerY: header.y,
  };
}

function same(a, b) {
  for (const key of Object.keys(a)) {
    expect(Math.abs(a[key] - b[key]), key).toBeLessThan(1);
  }
}

test('shared page layout does not depend on which tool tab is selected', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const before = await geometry(page);
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Інструменти · Текст');
  same(await geometry(page), before);
  await page.getByRole('tab', { name: 'Таблиці' }).click();
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Інструменти · Таблиці');
  same(await geometry(page), before);
});

test('page layout remains universal with collapsed nav and pinned aside', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  const pinned = await geometry(page);
  await page.getByRole('tab', { name: 'Текст' }).click();
  same(await geometry(page), pinned);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await geometry(page);
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await page.getByRole('tab', { name: 'Таблиці' }).click();
  // The sidebar remains open while tabs are switched.
  same(await geometry(page), mobile);
});
