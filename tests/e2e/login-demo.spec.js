/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — LOGIN DEMO E2E                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє поля, валідацію й чисте відключення демо.               ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, login-demo, спільні Input і Button.                      ║
 * ║ ПУБЛІЧНИЙ API: Playwright test suite.                                         ║
 * ║ ПРИНЦИП: Жодної серверної автентифікації.                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('login demo keeps two shared inputs and button without decorative gradient', async ({ page }) => {
  await page.goto('/login-demo');
  await expect(page.getByRole('heading', { level: 1, name: 'Демо входу' })).toBeVisible();
  const form = page.getByRole('form', { name: 'Демонстрація входу' });
  await expect(form.locator('.pg-input')).toHaveCount(2);
  await expect(form.locator('input[type="password"]')).toHaveCount(1);
  await expect(form.getByRole('button', { name: 'Показати пароль' })).toHaveCount(1);
  await expect(form.locator('.pg-input__support--sr-only')).toHaveCount(2);
  await expect(form.getByRole('button', { name: 'Увійти' })).toHaveClass(/pg-button--primary/);
  await expect(form.getByLabel('Логін')).toHaveAttribute('autocomplete', 'username');
  await expect(form.getByLabel('Пароль')).toHaveAttribute('autocomplete', 'current-password');

  await expect(page.locator('.pg-cloud-gradient, .pg-animated-gradient, .pg-sparkles')).toHaveCount(0);
  const [sceneBox, formBox] = await Promise.all([
    page.locator('.pg-login-demo__scene').boundingBox(), form.boundingBox(),
  ]);
  expect(formBox.x).toBeGreaterThan(sceneBox.x);
  expect(formBox.x + formBox.width).toBeLessThan(sceneBox.x + sceneBox.width);
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
  await expect(page.locator('.pg-login-demo__status')).toHaveText(
    'Демонстрація: форму заповнено. Справжній вхід не виконується.');
  await expect(page.locator('.pg-login-demo__status')).toHaveCSS('clip-path', 'inset(50%)');
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
  for (const message of await fields.locator('.pg-input__support--sr-only').all()) {
    await expect(message).toHaveCSS('clip-path', 'inset(50%)');
  }
  await unchanged();
  await page.getByLabel('Логін').fill('demo');
  await expect(fields.locator('.pg-input__error:not([hidden])')).toHaveCount(1);
  await unchanged();
  await page.getByLabel('Логін').fill('');
  await expect(fields.locator('.pg-input__error:not([hidden])')).toHaveCount(1);
  await unchanged();
});

test('password visibility can be toggled without changing the form or submitting', async ({ page }) => {
  await page.goto('/login-demo');
  const form = page.getByRole('form', { name: 'Демонстрація входу' });
  const password = form.getByLabel('Пароль');
  const toggle = form.getByRole('button', { name: 'Показати пароль' });
  await password.fill('a passphrase example');
  const bounds = await form.boundingBox();
  await toggle.click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('a passphrase example');
  await expect(form.getByRole('button', { name: 'Приховати пароль' })).toBeVisible();
  await expect(page.locator('.pg-login-demo__status')).toBeHidden();
  await form.getByRole('button', { name: 'Приховати пароль' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('a passphrase example');
  expect(Math.abs((await form.boundingBox()).height - bounds.height)).toBeLessThan(1);
});

test('mobile and reduced-motion keep the form accessible without GPU effects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login-demo');
  await expect(page.locator('.pg-cloud-gradient, .pg-sparkles')).toHaveCount(0);
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

test('navigating away preserves the universal shell without decorative canvas', async ({ page }) => {
  await page.goto('/login-demo');
  await page.getByRole('navigation', { name: 'Інструменти' })
    .getByRole('link', { name: 'Інструменти' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(page.locator('.pg-cloud-gradient, .pg-animated-gradient, .pg-sparkles')).toHaveCount(0);
});
