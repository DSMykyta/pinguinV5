/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PASSWORD INPUT E2E                                                            ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Native password, keyboard reveal, paste, disabled and aria.                     ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, shared Input, IconButton, Field.                               ║
 * ║ ПУБЛІЧНИЙ API: tests/e2e/password-input.spec.js.                                            ║
 * ║ ПРИНЦИП: Перевіряє спільний парольний інпут без дублювання.                                  ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('shared PasswordInput preserves a real native field and allows keyboard reveal', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createPasswordInput } = await import('/src/ui/input/password-input.js');
    const root = document.createElement('section');
    root.id = 'pg-password-test';
    root.style.cssText = 'position:fixed;top:80px;left:60px;width:320px;z-index:99';
    const active = createPasswordInput({ name: 'password' });
    const disabled = createPasswordInput({ label: 'Неактивний пароль', disabled: true });
    root.append(active.element, disabled.element);
    document.body.append(root);
    window.pgPasswordTest = { active, disabled };
  });
  const password = page.locator('#pg-password-test input[name="password"]');
  const toggle = page.locator('#pg-password-test [data-pg-action="password-visibility-toggle"]').first();
  const disabledToggle = page.locator('#pg-password-test [data-pg-action="password-visibility-toggle"]').last();

  await expect(password).toHaveAccessibleName('Пароль');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveAttribute('autocomplete', 'current-password');
  await expect(toggle).toHaveAttribute('aria-controls', await password.getAttribute('id'));
  await expect(toggle).toHaveAttribute('type', 'button');
  await expect(toggle).toHaveClass(/pg-mini-button/);
  await expect(disabledToggle).toBeDisabled();

  await password.fill('example phrase to reveal');
  await password.focus();
  await toggle.click();
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('example phrase to reveal');
  await expect(toggle).toHaveAccessibleName('Приховати пароль');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(toggle).toBeFocused();

  const pasteAllowed = await password.evaluate(element => {
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    return element.dispatchEvent(paste);
  });
  expect(pasteAllowed).toBe(true);

  await page.evaluate(() => {
    window.pgPasswordTest.active.setError('Пароль обов’язковий');
  });
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#' + await password.getAttribute('aria-describedby')))
    .toHaveText('Пароль обов’язковий');
});
