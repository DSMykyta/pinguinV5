/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DECORATIVE EFFECTS PARKED                                                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Захист від випадкового повернення прибраних градієнтів та іскор.                ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, tools, login-demo, shared Dialog.                                  ║
 * ║ ПУБЛІЧНИЙ API: Browser regression test for temporarily parked effects.                    ║
 * ║ ПРИНЦИП: Демо та Canvas відсутні; форми, Toast і Progress залишаються доступними.           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('tools do not render gradient, cloud, Aurora or Sparkles demos', async ({ page }) => {
  await page.goto('/tools');
  const tables = page.locator('#pg-tools-panel-tables');
  await expect(tables).toBeVisible();
  await expect(tables.locator('[data-pg-action="animated-gradient-demo"]')).toHaveCount(0);
  await expect(tables.locator('[data-pg-action="aurora-gradient-demo"]')).toHaveCount(0);
  await expect(page.locator('.pg-animated-gradient, .pg-cloud-gradient, .pg-sparkles')).toHaveCount(0);
  await expect(tables.locator('.pg-tools-toast-demo')).toHaveCount(1);
});

test('login form keeps the established cloud while experimental gradients and sparkles stay parked', async ({ page }) => {
  await page.goto('/login-demo');
  const form = page.getByRole('form', { name: 'Демонстрація входу' });
  await expect(form.getByLabel('Логін')).toBeVisible();
  await expect(form.getByLabel('Пароль')).toBeVisible();
  await expect(form.getByRole('button', { name: 'Увійти' })).toBeEnabled();
  await expect(page.locator('.pg-animated-gradient, .pg-sparkles')).toHaveCount(0);
  const cloud = page.locator('.pg-login-demo__cloud.pg-cloud-gradient');
  await expect(cloud).toHaveCount(1);
  await expect(cloud.locator('canvas')).toHaveCount(1);
  await expect(cloud).toHaveAttribute('data-pg-renderer', /webgl|fallback/);
  await form.getByRole('button', { name: 'Увійти' }).click();
  await expect(form.getByLabel('Логін')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByLabel('Пароль')).toHaveAttribute('aria-invalid', 'true');
});
