/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LOGIN DEMO E2E                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє cloud, тему, поля, валідацію і cleanup.                  ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, login-demo, shared Input/Button/CloudGradient.           ║
 * ║ ПУБЛІЧНИЙ API: Playwright test suite.                                         ║
 * ║ ПРИНЦИП: Жодної серверної автентифікації.                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('login demo uses two shared inputs, a shared button and tertiary canvas behind them', async ({ page }) => {
  await page.goto('/login-demo');
  await expect(page.getByRole('heading', { level: 1, name: 'Демо входу' })).toBeVisible();
  const form = page.getByRole('form', { name: 'Демонстрація входу' });
  await expect(form.locator('.pg-input')).toHaveCount(2);
  await expect(form.locator('input[type="password"]')).toHaveCount(1);
  await expect(form.getByRole('button', { name: 'Увійти' })).toHaveClass(/pg-button--primary/);
  await expect(form.getByLabel('Логін')).toHaveAttribute('autocomplete', 'username');
  await expect(form.getByLabel('Пароль')).toHaveAttribute('autocomplete', 'current-password');

  const cloud = page.locator('.pg-cloud-gradient');
  await expect(cloud).toHaveAttribute('aria-hidden', 'true');
  await expect(cloud.locator('canvas')).toHaveCount(1);
  await expect(cloud).toHaveAttribute('data-pg-renderer', /webgl|fallback/);
  expect(await cloud.evaluate(node =>
    node.style.getPropertyValue('--pg-cloud-gradient-glow').trim()))
    .toBe('var(--pg-tone-tertiary-base)');
  const [cloudBox, formBox] = await Promise.all([cloud, form].map(x => x.boundingBox()));
  expect(formBox.x).toBeGreaterThan(cloudBox.x);
  expect(formBox.x + formBox.width).toBeLessThan(cloudBox.x + cloudBox.width);
});

test('demo action validates inputs without pretending to authenticate', async ({ page }) => {
  await page.goto('/login-demo');
  const login = page.getByLabel('Логін');
  const password = page.getByLabel('Пароль');
  const submit = page.getByRole('button', { name: 'Увійти' });
  await submit.click();
  await expect(login).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(login).toBeFocused();
  await login.fill('demo');
  await submit.click();
  await expect(password).toBeFocused();
  await password.fill('example-only');
  await password.press('Enter');
  await expect(page.getByRole('status')).toHaveText(
    'Демонстрація: форму заповнено. Справжній вхід не виконується.');
  await expect(page).toHaveURL(/\/login-demo$/);
});

test('reduced motion stops shader and mobile keeps form in viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login-demo');
  await expect(page.locator('.pg-cloud-gradient')).toHaveAttribute('data-pg-motion', 'paused');
  const form = page.getByRole('form', { name: 'Демонстрація входу' });
  const box = await form.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test('navigating away disposes canvas and preserves universal shell', async ({ page }) => {
  await page.goto('/login-demo');
  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.locator('.pg-cloud-gradient')).toHaveCount(0);
});
