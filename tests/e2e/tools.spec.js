/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOOLS TABS E2E                                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє обидва рівні навігації та зміну контексту aside.                          ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, локальний Vite.                                                           ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Pin зберігається між маршрутами, вкладки незалежні від Shell.                            ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('second page and two local tabs follow the legacy navigation hierarchy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const globalNav = page.getByRole('navigation', { name: 'Інструменти' });
  const tools = globalNav.getByRole('link', { name: 'Інструменти' });
  await tools.click();

  await expect(page).toHaveURL(/\/tools$/);
  await expect(page).toHaveTitle('Інструменти · Pinguin');
  await expect(tools).toHaveAttribute('aria-current', 'page');
  await expect(globalNav.getByRole('link', { name: 'Огляд' })).not.toHaveAttribute('aria-current', 'page');

  const tabs = page.getByRole('tablist', { name: 'Інструменти' });
  const tables = tabs.getByRole('tab', { name: 'Таблиці' });
  const text = tabs.getByRole('tab', { name: 'Текст' });
  const aside = page.locator('#pg-aside-panel');

  await expect(tables).toHaveAttribute('aria-selected', 'true');
  await expect(text).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('tabpanel', { name: 'Таблиці' })).toBeVisible();
  await expect(aside.locator('.pg-aside__heading')).toHaveText('Таблиці');

  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(aside).toBeVisible();
  await expect(aside.getByRole('link', { name: 'Генератор у legacy' })).toBeVisible();
  // A transient popover closes on outside clicks; pin it to inspect changing context.
  await page.locator('[data-pg-action="aside-pin"]').click();

  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  await expect(tables).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('tabpanel', { name: 'Текст' })).toBeVisible();
  await expect(aside.getByRole('heading', { name: 'Текст' })).toBeVisible();
  await expect(aside.getByRole('link', { name: 'Редактор у legacy' })).toBeVisible();
  await expect(aside.getByRole('link', { name: 'Генератор у legacy' })).toHaveCount(0);

  await text.press('ArrowLeft');
  await expect(tables).toBeFocused();
  await expect(tables).toHaveAttribute('aria-selected', 'true');
  await expect(aside.getByRole('heading', { name: 'Таблиці' })).toBeVisible();

  await globalNav.getByRole('link', { name: 'Огляд' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(aside.getByRole('heading', { name: 'Проєкт' })).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(tables).toHaveAttribute('aria-selected', 'true');
});

test('pinned aside follows tabs and pages without moving or closing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const shell = page.locator('.pg-shell');
  const aside = page.locator('#pg-aside-panel');
  const workspace = page.locator('.pg-shell__workspace');
  const nav = page.getByRole('navigation', { name: 'Інструменти' });

  const initialWidth = (await workspace.boundingBox()).width;
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(shell).toHaveAttribute('data-pg-aside-mode', 'docked');
  await expect.poll(async () => (await workspace.boundingBox()).width)
    .toBeLessThan(initialWidth - 250);

  const initialAsidePosition = await aside.boundingBox();
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(aside.getByRole('heading', { name: 'Текст' })).toBeVisible();
  await expect(shell).toHaveAttribute('data-pg-aside-mode', 'docked');

  await nav.getByRole('link', { name: 'Огляд' }).click();
  await expect(aside.getByRole('heading', { name: 'Проєкт' })).toBeVisible();
  await expect(aside).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aside).toBeVisible();

  await nav.getByRole('link', { name: 'Інструменти' }).click();
  await expect(aside.getByRole('heading', { name: 'Таблиці' })).toBeVisible();
  await expect(shell).toHaveAttribute('data-pg-aside-mode', 'docked');

  const finalAsidePosition = await aside.boundingBox();
  for (const dimension of ['x', 'y', 'width']) {
    expect(Math.abs(finalAsidePosition[dimension] - initialAsidePosition[dimension])).toBeLessThan(1);
  }
});

test('mobile tabs work while pinned desktop preference does not dock', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'floating');

  await page.getByRole('tab', { name: 'Текст' }).click();
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(page.locator('#pg-aside-panel').getByRole('heading', { name: 'Текст' })).toBeVisible();
  await expect(page.locator('[data-pg-action="aside-pin"]')).toBeHidden();

  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
});


test('global tab navigation is centered on the viewport and reveals labels on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const header = page.locator('.pg-shell__header');
  const nav = header.getByRole('tablist', { name: 'Інструменти' });
  const tables = nav.getByRole('tab', { name: 'Таблиці' });
  const text = nav.getByRole('tab', { name: 'Текст' });

  await expect(nav).toBeVisible();
  await expect(tables).toHaveAttribute('aria-selected', 'true');
  await expect(text).toHaveAttribute('aria-selected', 'false');
  await expect(tables).toHaveCSS('border-radius', '9999px');
  await expect(text).toHaveCSS('border-radius', '9999px');

  await expect.poll(async () => (await tables.boundingBox()).width).toBeGreaterThan(80);
  await expect.poll(async () => (await text.boundingBox()).width).toBeLessThan(34);

  const n = await nav.boundingBox();
  expect(Math.abs((n.x + n.width / 2) - 720)).toBeLessThan(1);
  expect(n.y).toBeLessThan(24);

  await text.hover();
  await expect.poll(async () => (await text.boundingBox()).width).toBeGreaterThan(60);
  await expect(text.locator('.pg-tabs__label')).toHaveCSS('opacity', '1');
  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  await expect(tables).toHaveAttribute('aria-selected', 'false');

  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Огляд' }).click();
  await expect(page.locator('#pg-local-navigation')).toBeEmpty();
});

test('legacy pills remain usable in mobile and respect reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');

  const nav = page.locator('.pg-shell__header').getByRole('tablist', { name: 'Інструменти' });
  const text = nav.getByRole('tab', { name: 'Текст' });
  const tables = nav.getByRole('tab', { name: 'Таблиці' });

  await expect(nav).toBeVisible();
  await expect(text).toHaveCSS('transition-duration', '0s');
  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');

  const left = await page.locator('[data-pg-action="mobile-menu-toggle"]').boundingBox();
  const right = await page.locator('[data-pg-action="aside-toggle"]').boundingBox();
  const box = await nav.boundingBox();
  expect(box.x).toBeGreaterThan(left.x + left.width);
  expect(box.x + box.width).toBeLessThan(right.x);

  await tables.press('Home');
  await expect(tables).toHaveAttribute('aria-selected', 'true');
});


test('global navigation row stays centered while legacy buttons expand from their icons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');

  const nav = page.locator('.pg-shell__local-nav').getByRole('tablist', { name: 'Інструменти' });
  const tables = nav.getByRole('tab', { name: 'Таблиці' });
  const text = nav.getByRole('tab', { name: 'Текст' });

  await expect(nav.locator('.pg-tabs__slot, .pg-tabs__width-guide')).toHaveCount(0);
  async function metrics() {
    const row = await nav.boundingBox();
    const first = await tables.boundingBox();
    const second = await text.boundingBox();
    return { center: row.x + row.width / 2, width: row.width, x: row.x, first, second };
  }

  const before = await metrics();
  expect(Math.abs(before.center - 720)).toBeLessThan(1);
  expect(before.second.x).toBeGreaterThanOrEqual(before.first.x + before.first.width);

  await text.hover();
  await expect.poll(async () => (await text.boundingBox()).width).toBeGreaterThan(60);
  await text.evaluate(node => Promise.all(node.getAnimations().map(animation => animation.finished)));
  const hover = await metrics();
  expect(Math.abs(hover.center - 720)).toBeLessThan(1);
  expect(hover.width).toBeGreaterThan(before.width + 25);
  expect(hover.x).toBeLessThan(before.x - 12);

  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  expect(Math.abs((await metrics()).center - 720)).toBeLessThan(1);

  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  expect(Math.abs((await metrics()).center - 720)).toBeLessThan(1);
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await page.locator('[data-pg-action="aside-pin"]').click();
  expect(Math.abs((await metrics()).center - 720)).toBeLessThan(1);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(Math.abs((await metrics()).center - 195)).toBeLessThan(1);
  await tables.click();
  expect(Math.abs((await metrics()).center - 195)).toBeLessThan(1);
});
