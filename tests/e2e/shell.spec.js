import { test, expect } from '@playwright/test';

test('desktop shell persists navigation, aside and theme preferences', async ({ page }) => {
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Робочий простір' })).toBeVisible();

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


test('panels animate on desktop while maintaining keyboard-safe hidden states', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const shell = page.locator('.pg-shell');
  const context = page.locator('#pg-aside-panel');
  const shellTransition = await shell.evaluate(element => getComputedStyle(element).transitionProperty);
  expect(shellTransition).toContain('grid-template-columns');

  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(shell).toHaveAttribute('data-pg-aside-state', 'closed');
  await expect(context).toHaveAttribute('aria-hidden', 'true');
  await expect(context).toHaveAttribute('inert', '');
  await expect(context).toBeHidden();

  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(context).toHaveAttribute('aria-hidden', 'false');
  await expect(context).toBeVisible();
});

test('reduced-motion preference suppresses shell movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const transition = await page.locator('.pg-shell')
    .evaluate(element => getComputedStyle(element).transitionDuration);
  expect(transition).toBe('0s');
});


test('four-corner shell restores round moving icons and theme in lower-left', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const navToggle = page.locator('[data-pg-action="sidebar-toggle"]');
  const contextToggle = page.locator('[data-pg-action="aside-toggle"]');
  const themeToggle = page.locator('[data-pg-action="theme-cycle"]');

  for (const button of [navToggle, contextToggle, themeToggle]) {
    await expect(button).toHaveCSS('border-radius', '9999px');
  }

  const navBox = await navToggle.boundingBox();
  const contextBox = await contextToggle.boundingBox();
  const themeBox = await themeToggle.boundingBox();
  expect(navBox.x).toBeLessThan(48);
  expect(navBox.y).toBeLessThan(48);
  expect(contextBox.x).toBeGreaterThan(1380);
  expect(contextBox.y).toBeLessThan(48);
  expect(themeBox.x).toBeLessThan(48);
  expect(themeBox.y).toBeGreaterThan(800);

  await navToggle.click();
  await expect(navToggle).toHaveAttribute('aria-expanded', 'false');
  await navToggle.click();
  await expect(navToggle).toHaveAttribute('aria-expanded', 'true');

  // Lower-left corner cycles system -> light -> dark -> system.
  await expect(themeToggle).toHaveAttribute('data-pg-theme', 'system');
  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('radio', { name: 'Світла', exact: true })).toBeChecked();
  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');

  await page.reload();
  await expect(themeToggle).toHaveAttribute('data-pg-theme', 'system');
});

test('mobile corner buttons stay accessible over sliding panels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const leftToggle = page.locator('[data-pg-action="mobile-menu-toggle"]');
  const rightToggle = page.locator('[data-pg-action="aside-toggle"]');

  await expect(leftToggle).toHaveCSS('border-radius', '9999px');
  await expect(rightToggle).toHaveCSS('border-radius', '9999px');

  await leftToggle.click();
  await expect(leftToggle).toHaveAttribute('aria-expanded', 'true');
  await leftToggle.click();
  await expect(leftToggle).toHaveAttribute('aria-expanded', 'false');

  await rightToggle.click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-state', 'open');
  await rightToggle.click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-aside-state', 'closed');
});
