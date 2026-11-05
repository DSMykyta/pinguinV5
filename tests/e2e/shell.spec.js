import { test, expect } from '@playwright/test';

test('desktop shell persists navigation, aside and theme preferences', async ({ page }) => {
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Один простір. Власні інструменти.' })).toBeVisible();

  const shell = page.locator('.pg-shell');
  const sidebarButton = page.locator('[data-pg-action="sidebar-toggle"]');
  const asideButton = page.locator('[data-pg-action="aside-toggle"]');

  await sidebarButton.click();
  await expect(shell).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await asideButton.click();
  await expect(page.locator('#pg-aside-panel')).toBeHidden();
  await asideButton.click();
  await page.getByRole('radio', { name: 'Темна', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(shell).toHaveAttribute('data-pg-sidebar-state', 'collapsed');
  await expect(page.getByRole('radio', { name: 'Темна', exact: true })).toBeChecked();
  expect(exceptions).toEqual([]);
});

test('narrow screen opens and closes independent overlay panels', async ({ page }) => {
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const shell = page.locator('.pg-shell');
  const mobileMenu = page.locator('[data-pg-action="mobile-menu-toggle"]');
  const asideToggle = page.locator('[data-pg-action="aside-toggle"]');

  await mobileMenu.click();
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'open');
  await expect(page.locator('#pg-sidebar-panel')).not.toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-pg-mobile-nav', 'closed');

  await asideToggle.click();
  await expect(shell).toHaveAttribute('data-pg-aside-state', 'open');
  await page.getByRole('radio', { name: 'Світла', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.locator('.pg-shell__backdrop').click({ position: { x: 12, y: 420 } });
  await expect(shell).toHaveAttribute('data-pg-aside-state', 'closed');
  await expect(page.locator('.pg-shell__backdrop')).toBeHidden();
  expect(exceptions).toEqual([]);
});
