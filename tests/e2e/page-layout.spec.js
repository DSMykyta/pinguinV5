/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — UNIVERSAL PAGE LAYOUT E2E                                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє однакову геометрію шапки й заголовків сторінок.                            ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite, UI page та Shell.                                                     ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Розташування заголовка визначає спільний шаблон.                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function geometry(page) {
  // Shell column transitions may still be moving after pin/collapse; measure settled layout.
  await page.locator('.pg-shell').evaluate(node => Promise.all(node.getAnimations().map(
    animation => animation.finished.catch(() => {}))));
  const surface = page.locator('.pg-page');
  await surface.evaluate(node => Promise.all(node.getAnimations().map(
    animation => animation.finished.catch(() => {}))));
  const [heading, frame, header] = await Promise.all([
    page.locator('h1.pg-page__title').boundingBox(),
    surface.boundingBox(),
    page.locator('.pg-shell__page-name').boundingBox(),
  ]);
  const fontSize = await page.locator('h1.pg-page__title').evaluate(node =>
    getComputedStyle(node).fontSize);
  return {
    titleX: heading.x, titleY: heading.y, titleWidth: heading.width,
    frameX: frame.x, frameWidth: frame.width,
    headerX: header.x, headerY: header.y, fontSize,
  };
}

function sameLayout(actual, expected) {
  for (const key of ['titleX', 'titleY', 'titleWidth',
    'frameX', 'frameWidth', 'headerX', 'headerY']) {
    expect(Math.abs(actual[key] - expected[key]), key).toBeLessThan(1);
  }
  expect(actual.fontSize).toBe(expected.fontSize);
}

test('overview and both tool tabs share exactly the same page header placement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Огляд');
  await expect(page.locator('h1.pg-page__title')).toHaveText('Робочий простір');
  const overview = await geometry(page);

  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).click();
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Інструменти · Таблиці');
  await expect(page.locator('h1.pg-page__title')).toHaveText('Таблиці');
  sameLayout(await geometry(page), overview);

  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Інструменти · Текст');
  await expect(page.locator('h1.pg-page__title')).toHaveText('Текст');
  sameLayout(await geometry(page), overview);

  await page.goBack();
  await expect(page.locator('.pg-shell__page-name')).toHaveText('Огляд');
  await expect(page.locator('h1.pg-page__title')).toHaveText('Робочий простір');
  sameLayout(await geometry(page), overview);
});

test('universal title alignment works with docked aside and on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  const overview = await geometry(page);

  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).click();
  await expect(page.locator('h1.pg-page__title')).toHaveText('Таблиці');
  sameLayout(await geometry(page), overview);

  await page.setViewportSize({ width: 390, height: 844 });
  const narrowTools = await geometry(page);
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Огляд' }).click();
  await expect(page.locator('h1.pg-page__title')).toHaveText('Робочий простір');
  sameLayout(await geometry(page), narrowTools);
});
