/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — UNIVERSAL PAGE TABS                                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Розміщення вкладок у основній області та контекст aside.                        ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, Vite і спільні UI-компоненти.                                            ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                                    ║
 * ║ ПРИНЦИП: Перевіряємо глобальну схему без винятків для сторінок.                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('the universal header and tabs remain aligned with an isolated Toast preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const title = page.getByRole('heading', { level: 1, name: 'Інструменти' });
  const tabs = page.locator('.pg-shell__local-nav')
    .getByRole('tablist', { name: 'Інструменти' });
  const main = page.locator('.pg-shell__content');

  await expect(title).toBeVisible();
  await expect(tabs).toBeVisible();
  await expect(main.locator('#pg-tools-panel-tables .pg-page')).toBeVisible();
  await expect(main.locator('#pg-tools-panel-elements .pg-page')).toBeHidden();
  await expect(page.locator('.pg-sidebar').getByRole('tab')).toHaveCount(0);

  const [titleBox, tabsBox, mainBox] = await Promise.all([title,tabs,main].map(x => x.boundingBox()));
  const pad = await main.locator('#pg-tools-panel-tables .pg-page').evaluate(node => parseFloat(getComputedStyle(node).paddingLeft));
  expect(Math.abs(titleBox.x - tabsBox.x)).toBeLessThan(1);
  expect(Math.abs(titleBox.x - mainBox.x)).toBeLessThan(1);
  expect(tabsBox.y).toBeGreaterThan(titleBox.y + titleBox.height);
  expect(mainBox.y).toBeGreaterThan(tabsBox.y);

  const text = tabs.getByRole('tab', { name: 'Елементи' });
  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  await expect(title).toHaveText('Інструменти');
  await expect(main.locator('#pg-tools-panel-tables .pg-page')).toBeHidden();
  await expect(main.locator('#pg-tools-panel-elements .pg-page')).toBeVisible();
  await expect(main.locator('#pg-tools-panel-elements .pg-rich-text-editor')).toHaveCount(0);
  await expect(page.locator('#pg-aside-panel .pg-aside__heading')).toHaveText('Елементи');
  await text.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Медіатека' })).toBeFocused();
  await tabs.getByRole('tab', { name: 'Медіатека' }).press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Макети даних' })).toBeFocused();
  await tabs.getByRole('tab', { name: 'Макети даних' }).press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'Таблиці' })).toBeFocused();
});

test('Elements and Texts keep independent workspaces with a full-height editor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи', exact: true }).click();
  await expect(page.locator('#pg-tools-panel-elements .pg-tools-field-demo')).toBeVisible();
  await expect(page.locator('#pg-tools-panel-elements .pg-rich-text-editor')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Тексти', exact: true }).click();
  const panel = page.locator('#pg-tools-panel-texts');
  const editor = panel.locator('.pg-rich-text-editor');
  await expect(panel).toHaveAttribute('data-pg-scroll', 'contained');
  await expect(editor).toHaveAttribute('data-pg-layout', 'contained');
  await expect(editor).toBeVisible();
  await expect(panel.locator('.pg-tools-field-demo,.pg-tools-button-demo')).toHaveCount(0);
  const geometry = await panel.evaluate(node => {
    const frame = node.querySelector('.pg-rich-text-editor__main').getBoundingClientRect();
    const bounds = node.getBoundingClientRect();
    return { frameTop: frame.top, frameBottom: frame.bottom,
      panelTop: bounds.top, panelBottom: bounds.bottom };
  });
  expect(geometry.frameTop).toBeCloseTo(geometry.panelTop, 0);
  expect(geometry.frameBottom).toBeCloseTo(geometry.panelBottom, 0);
});

test('tabs remain in workspace when sidebar collapses or on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const tabs = page.locator('.pg-shell__local-nav')
    .getByRole('tablist', { name: 'Інструменти' });
  await page.locator('[data-pg-action="sidebar-toggle"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await tabs.getByRole('tab', { name: 'Елементи' }).click();
  await expect(tabs.getByRole('tab', { name: 'Елементи' })).toHaveAttribute('aria-selected', 'true');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'Елементи' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.pg-sidebar').getByRole('tab')).toHaveCount(0);
});

test('pinned aside preserves content geometry and independent tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const aside = page.locator('#pg-aside-panel');
  const workspace = page.locator('.pg-shell__workspace');
  const initialWidth = (await workspace.boundingBox()).width;
  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(aside).toBeVisible();
  const initialStyle = await aside.evaluate(element => {
    const s = getComputedStyle(element);
    return [s.width, s.borderRadius, s.boxShadow, s.position, s.backgroundColor];
  });
  await page.locator('[data-pg-action="aside-pin"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-mode', 'docked');
  await expect.poll(async () => (await workspace.boundingBox()).width)
    .toBeLessThan(initialWidth - 250);
  expect(await aside.evaluate(element => {
    const s = getComputedStyle(element);
    return [s.width, s.borderRadius, s.boxShadow, s.position, s.backgroundColor];
  })).toEqual(initialStyle);

  await page.getByRole('tab', { name: 'Елементи' }).click();
  await expect(aside.locator('.pg-aside__heading')).toHaveText('Елементи');
  await expect(aside).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aside).toBeVisible();
});


test('Shell reveal stays independent of the chosen tab and its permanent context button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  const reveal = page.locator('.pg-reveal-panel.pg-shell__context-tools');
  const contextButton = page.locator('.pg-shell__context-button');
  const before = await contextButton.boundingBox();
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(reveal).toBeVisible();
  await expect(reveal.locator('.pg-view-switch')).toHaveCount(1);
  const after = await contextButton.boundingBox();
  expect(Math.abs(before.x - after.x)).toBeLessThan(2);
  await page.getByRole('tab', { name: 'Переходи' }).click();
  await expect(reveal).toBeHidden();
  await expect(contextButton).toBeVisible();
});
