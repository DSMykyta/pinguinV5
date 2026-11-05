import { test, expect } from '@playwright/test';

test('navigation derives active state and title from the registered overview page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const current = page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Огляд' });
  await expect(current).toHaveAttribute('href', '/');
  await expect(current).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main')).toHaveAttribute('data-pg-page-type', 'overview');
  await expect(page).toHaveTitle('Огляд · Pinguin');

  const navLinks = await page.getByRole('navigation', { name: 'Інструменти' })
    .locator('a').count();
  expect(navLinks).toBe(1);
});

test('unknown URL gets a functioning home link without fake navigation entries', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  await expect(page).toHaveTitle('Сторінку не знайдено · Pinguin');

  const home = page.getByRole('link', { name: 'На головну', exact: true });
  await home.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Робочий простір' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Огляд' })).toHaveAttribute('aria-current', 'page');

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Робочий простір' })).toBeVisible();
});

test('Shell controls remain stable when routing is initialized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('[data-pg-action="mobile-menu-toggle"]').click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-mobile-nav', 'open');
  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Огляд' }).click();
  await expect(page.locator('.pg-shell')).toHaveAttribute('data-pg-mobile-nav', 'closed');

  await page.locator('[data-pg-action="aside-toggle"]').click();
  await expect(page.locator('#pg-aside-panel')).toBeVisible();
});
