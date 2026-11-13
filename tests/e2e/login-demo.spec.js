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
  await expect(login).toHaveAttribute('placeholder', 'Вкажіть логін');
  await expect(password).toHaveAttribute('placeholder', 'Вкажіть пароль');
  await expect(login).toBeFocused();
  await login.fill('demo');
  await expect(login).toHaveAttribute('placeholder', ' ');
  await expect(login).not.toHaveAttribute('aria-invalid', 'true');
  await submit.click();
  await expect(password).toBeFocused();
  await password.fill('example-only');
  await expect(password).toHaveAttribute('placeholder', ' ');
  await password.press('Enter');
  await expect(page.getByRole('status')).toHaveText(
    'Демонстрація: форму заповнено. Справжній вхід не виконується.');
  await expect(page).toHaveURL(/\/login-demo$/);
});

test('validation messages do not move or resize inputs and submit', async ({ page }) => {
  await page.goto('/login-demo');
  const fields = page.locator('.pg-login-demo__form > .pg-input');
  const submit = page.getByRole('button', { name: 'Увійти' });
  const items = page.locator('.pg-login-demo__form > .pg-input, .pg-login-demo__submit');
  const positions = async () => items.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  const baseline = await positions();
  const unchanged = async () => {
    const next = await positions();
    next.forEach((rect, index) => {
      for (const key of ['x', 'y', 'width', 'height']) {
        expect(Math.abs(rect[key] - baseline[index][key])).toBeLessThan(1);
      }
    });
  };

  await submit.click();
  await expect(fields.locator('.pg-input__error:not([hidden])')).toHaveCount(2);
  await expect(page.getByLabel('Логін')).toHaveAttribute('placeholder', 'Вкажіть логін');
  await expect(page.getByLabel('Пароль')).toHaveAttribute('placeholder', 'Вкажіть пароль');
  await expect(fields.locator('.pg-input__support--sr-only')).toHaveCount(2);
  await unchanged();
  await page.getByLabel('Логін').fill('demo');
  await expect(page.getByLabel('Логін')).toHaveAttribute('placeholder', ' ');
  await expect(page.getByLabel('Пароль')).toHaveAttribute('placeholder', 'Вкажіть пароль');
  await expect(fields.locator('.pg-input__error:not([hidden])')).toHaveCount(1);
  await unchanged();
  await page.getByLabel('Логін').fill('');
  await expect(fields.locator('.pg-input__error:not([hidden])')).toHaveCount(1);
  await unchanged();
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

test('login route hides unused Shell actions and restores them on tools', async ({ page }) => {
  await page.goto('/login-demo');
  const headerActions = page.locator('.pg-shell__header-actions');
  const search = page.locator('.pg-search');
  const contextButton = page.locator('[data-pg-action="aside-toggle"]');
  const quickFab = page.locator('.pg-fab[data-pg-fab-position="corner"]');
  await expect(page.getByRole('form', { name: 'Демонстрація входу' })).toBeVisible();
  await expect(headerActions).toBeHidden();
  await expect(contextButton).toBeHidden();
  await expect(search).toBeHidden();
  await expect(quickFab).toBeHidden();
  await page.keyboard.press('Control+k');
  await expect(search.locator('input')).not.toBeFocused();

  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(headerActions).toBeVisible();
  await expect(contextButton).toBeVisible();
  await expect(quickFab).toBeVisible();
  await expect(search).toBeHidden();

  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(search).toBeVisible();

  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Демо входу' }).click();
  await expect(page).toHaveURL(/\/login-demo$/);
  await expect(headerActions).toBeHidden();
  await expect(quickFab).toBeHidden();
  await expect(search).toBeHidden();
});

test('navigating away disposes canvas and preserves universal shell', async ({ page }) => {
  await page.goto('/login-demo');
  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.locator('.pg-cloud-gradient')).toHaveCount(0);
});

test('placeholder errors keep the native labels, password toggle and stable layout', async ({ page }) => {
  await page.goto('/login-demo');
  const form = page.getByRole('form', { name: 'Демонстрація входу' });
  const login = form.getByLabel('Логін');
  const password = form.getByLabel('Пароль');
  const toggle = form.getByRole('button', { name: 'Показати пароль' });
  const rects = async () => form.locator('.pg-input, .pg-login-demo__submit').evaluateAll(nodes =>
    nodes.map(node => {
      const r = node.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    }));
  const baseline = await rects();
  await form.getByRole('button', { name: 'Увійти' }).click();
  await expect(login).toHaveAttribute('placeholder', 'Вкажіть логін');
  await expect(password).toHaveAttribute('placeholder', 'Вкажіть пароль');
  await expect(login).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  const descriptions = await form.locator('.pg-input__support--sr-only').all();
  expect(descriptions).toHaveLength(2);
  for (const description of descriptions) {
    await expect(description).toHaveCSS('clip-path', 'inset(50%)');
  }
  const invalid = await rects();
  invalid.forEach((r, i) => r.forEach((coordinate, j) =>
    expect(Math.abs(coordinate - baseline[i][j])).toBeLessThan(1)));
  await password.fill('sample');
  await expect(password).toHaveAttribute('placeholder', ' ');
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('sample');
  await form.getByRole('button', { name: 'Приховати пароль' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('sample');
});
