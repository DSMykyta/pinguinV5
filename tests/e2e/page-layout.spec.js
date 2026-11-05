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
  await page.locator('.pg-shell').evaluate(el => Promise.all(el.getAnimations()
    .map(a => a.finished.catch(() => {}))));
  const [header, tabs, main] = await Promise.all([
    page.locator('h1.pg-shell__page-name').boundingBox(),
    page.locator('.pg-shell__local-nav [role="tablist"]').boundingBox(),
    page.locator('.pg-shell__content').boundingBox(),
  ]);
  const inset = await page.locator('.pg-shell__content').evaluate(node =>
    parseFloat(getComputedStyle(node).paddingLeft));
  return {
    headerX: header.x, tabX: tabs.x,
    contentStartX: main.x + inset, chromeX: main.x + 16, mainY: main.y,
  };
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
  expect(Math.abs(x.headerX - x.chromeX)).toBeLessThan(1);
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
  expect(Math.abs(desktop.headerX - desktop.chromeX)).toBeLessThan(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await coordinates(page);
  expect(Math.abs(mobile.tabX - mobile.chromeX)).toBeLessThan(1);
  await page.getByRole('tab', { name: 'Текст' }).click();
  const mobileText = await coordinates(page);
  for (const key of Object.keys(mobile))
    expect(Math.abs(mobileText[key] - mobile[key]), key).toBeLessThan(1);
});


test('previous accepted spacing and fixed right controls survive aside pinning', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const header = page.locator('.pg-shell__header');
  const main = page.locator('.pg-shell__content');
  const context = page.locator('[data-pg-action="aside-toggle"]');
  const search = page.locator('.pg-search__field');
  const mainStyle = await main.evaluate(node => {
    const css = getComputedStyle(node);
    return { top: css.paddingTop, left: css.paddingLeft,
      radius: css.borderTopLeftRadius, background: css.backgroundColor };
  });
  await expect(header).toHaveCSS('height', '60px');
  expect(mainStyle.top).toBe('40px');
  expect(parseFloat(mainStyle.left)).toBe(72);
  expect(mainStyle.radius).toBe('18px');
  expect(mainStyle.background).not.toBe('rgba(0, 0, 0, 0)');
  await expect(main.locator('.pg-page')).toBeHidden();
  await expect(page.locator('.pg-page')).toBeHidden();

  const beforeContext = await context.boundingBox();
  const beforeSearch = await search.boundingBox();
  await context.click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  await page.locator('.pg-shell').evaluate(node =>
    Promise.all(node.getAnimations().map(a => a.finished.catch(() => {}))));

  const afterContext = await context.boundingBox();
  const afterSearch = await search.boundingBox();
  for (const key of ['x', 'y']) {
    expect(Math.abs(beforeContext[key] - afterContext[key]), 'context ' + key).toBeLessThan(1);
    expect(Math.abs(beforeSearch[key] - afterSearch[key]), 'search ' + key).toBeLessThan(1);
  }
  expect(Math.abs(afterContext.x + afterContext.width - 1428)).toBeLessThan(1);

  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  const afterCollapse = await context.boundingBox();
  expect(Math.abs(afterCollapse.x - beforeContext.x)).toBeLessThan(1);
  expect(Math.abs(afterCollapse.y - beforeContext.y)).toBeLessThan(1);
});

test('expanded sidebar labels do not repeat as tooltips', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const link = page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' });
  await expect(link).toHaveAttribute('data-pg-tooltip-collapsed', 'Інструменти');
  await expect(link).not.toHaveAttribute('data-pg-tooltip-always');
  await link.hover();
  // Longer than the shared tooltip's 500ms delay.
  await page.waitForTimeout(650);
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await link.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Інструменти');
});
