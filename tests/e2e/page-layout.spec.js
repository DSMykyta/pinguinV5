/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — GLOBAL FIVE-ZONE LAYOUT                                                              ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдині координати, прихований footer і незалежні панелі.                         ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і спільні UI-компоненти.                                            ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну схему без винятків для сторінок.                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function coordinates(page) {
  await page.locator('.pg-page').evaluate(el => Promise.all(el.getAnimations()
    .map(a => a.finished.catch(() => {}))));
  await page.locator('.pg-shell').evaluate(el => Promise.all(el.getAnimations()
    .map(a => a.finished.catch(() => {}))));
  const [header, tabs, section] = await Promise.all([
    page.locator('h1.pg-shell__page-name').boundingBox(),
    page.locator('.pg-shell__local-nav [role="tablist"]').boundingBox(),
    page.locator('h2.pg-page__title').boundingBox(),
  ]);
  return { headerX: header.x, tabX: tabs.x, sectionX: section.x, sectionY: section.y };
}

test('five global zones exist, footer is structurally present but invisible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await expect(page.locator('.pg-shell')).toBeVisible();
  await expect(page.locator('.pg-sidebar')).toBeVisible();
  await expect(page.locator('.pg-shell__header')).toBeVisible();
  await expect(page.locator('.pg-shell__content')).toBeVisible();
  await expect(page.locator('.pg-shell__footer')).toHaveCount(1);
  await expect(page.locator('.pg-shell__footer')).toBeHidden();
  await expect(page.locator('#pg-aside-panel')).toBeHidden();

  const title = await page.locator('.pg-shell__page-name').boundingBox();
  const search = await page.locator('.pg-search__field').boundingBox();
  const asideButton = await page.locator('[data-pg-action="aside-toggle"]').boundingBox();
  expect(Math.abs(title.y + title.height / 2 - (search.y + search.height / 2)))
    .toBeLessThan(3);
  expect(Math.abs(title.y + title.height / 2 - (asideButton.y + asideButton.height / 2)))
    .toBeLessThan(3);

  const x = await coordinates(page);
  expect(Math.abs(x.headerX - x.tabX)).toBeLessThan(1);
  expect(Math.abs(x.headerX - x.sectionX)).toBeLessThan(1);
});

test('tab changes do not move shared header, tabs or main section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const before = await coordinates(page);
  await page.getByRole('tab', { name: 'Текст' }).click();
  const after = await coordinates(page);
  for (const key of Object.keys(before))
    expect(Math.abs(after[key] - before[key]), key).toBeLessThan(1);
  await page.getByRole('tab', { name: 'Таблиці' }).click();
  const restored = await coordinates(page);
  for (const key of Object.keys(before))
    expect(Math.abs(restored[key] - before[key]), key).toBeLessThan(1);
});

test('header and content stay aligned with docked aside and on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  const desktop = await coordinates(page);
  expect(Math.abs(desktop.headerX - desktop.tabX)).toBeLessThan(1);
  expect(Math.abs(desktop.headerX - desktop.sectionX)).toBeLessThan(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await coordinates(page);
  expect(Math.abs(mobile.tabX - mobile.sectionX)).toBeLessThan(1);
  await page.getByRole('tab', { name: 'Текст' }).click();
  const mobileText = await coordinates(page);
  for (const key of Object.keys(mobile))
    expect(Math.abs(mobileText[key] - mobile[key]), key).toBeLessThan(1);
});
