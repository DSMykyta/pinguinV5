/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — TOAST END-TO-END TESTS                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє глобальний Toast у браузері без тестових кнопок у Shell.      ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, mountToasts() в застосунку.                                 ║
 * ║ ПУБЛІЧНИЙ API: Браузерні тести.                                                     ║
 * ║ ПРИНЦИП: Немає змін approved skeleton; 20/20, FIFO, доступність, тема, таймери.    ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function notify(page, message, options = {}) {
  await page.evaluate(async ({ message, options }) => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    showToast(message, options);
  }, { message, options });
}

test('legacy 20px bottom-left position overlays theme temporarily without moving it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  const themeBefore = await theme.boundingBox();
  await notify(page, 'Дані скопійовано', { type: 'success', duration: 500 });
  const toast = page.locator('.pg-toast');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute('data-pg-type', 'success');
  await expect(toast).toHaveCSS('background-color', 'rgb(36, 36, 40)');
  await expect(page.locator('.pg-toast-host')).toHaveCSS('bottom', '20px');
  await expect(page.locator('.pg-toast-host')).toHaveCSS('left', '20px');
  // Wait for entrance transform: getBoundingClientRect is animated.
  await toast.evaluate(el => Promise.all(
    el.getAnimations().map(animation => animation.finished.catch(() => {}))));
  const rect = await toast.boundingBox();
  expect(rect.x).toBe(20);
  expect(Math.abs(rect.y + rect.height - 880)).toBeLessThan(1);
  expect(rect.x).toBeLessThan(themeBefore.x + themeBefore.width);
  expect(rect.y).toBeLessThan(themeBefore.y + themeBefore.height);
  await expect(toast).toHaveCount(0, { timeout: 3000 });
  expect(await theme.boundingBox()).toEqual(themeBefore);
});

test('status icons, safe text and error alert are accessible', async ({ page }) => {
  await page.goto('/tools');
  const src = '<img src=x onerror=alert(1)> Рядок';
  await notify(page, src, { type: 'info', duration: 0 });
  await expect(page.locator('.pg-toast__message')).toHaveText(src);
  await expect(page.locator('.pg-toast img')).toHaveCount(0);
  await expect(page.locator('.pg-toast__announcer[role="status"]')).toHaveText(src);
  await page.locator('[data-pg-action="toast-dismiss"]').click();
  await expect(page.locator('.pg-toast')).toHaveCount(0);
  await notify(page, 'Помилка збереження', { type: 'error', duration: 0 });
  await expect(page.locator('.pg-toast__announcer[role="alert"]')).toHaveText('Помилка збереження');
  await expect(page.locator('.pg-toast__icon')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.pg-toast [data-pg-action="toast-dismiss"]')).toHaveAttribute(
    'aria-label', 'Закрити повідомлення');
});

test('one toast at a time; FIFO with deduplication and manually dismissible waiting item', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    showToast('Перше', { duration: 0 });
    showToast('Перше', { duration: 0 });
    const next = showToast('Друге', { duration: 0 });
    showToast('Третє', { duration: 0 });
    next.dismiss();
  });
  await expect(page.locator('.pg-toast')).toHaveCount(1);
  await expect(page.locator('.pg-toast__message')).toHaveText('Перше');
  await page.locator('[data-pg-action="toast-dismiss"]').click();
  await expect(page.locator('.pg-toast__message')).toHaveText('Третє');
  await expect(page.locator('.pg-toast')).toHaveCount(1);
});

test('action persists, executes once, and Escape from focused toast restores origin focus', async ({ page }) => {
  await page.goto('/tools');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await theme.focus();
  await page.evaluate(async () => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    showToast('Не вдалося виконати', {
      type: 'error',
      action: {
        label: 'Повторити',
        onClick: () => {
          document.body.dataset.pgToastActionCount = String(
            Number(document.body.dataset.pgToastActionCount || 0) + 1);
        },
      },
    });
  });
  await page.waitForTimeout(700);
  await expect(page.locator('.pg-toast')).toHaveCount(1);
  const action = page.locator('[data-pg-action="toast-action"]');
  await action.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pg-toast')).toHaveCount(0);
  await expect(theme).toBeFocused();
  // A subsequent action is still available; it invokes its callback only once.
  await page.evaluate(async () => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    showToast('Повторити операцію', {
      action: {
        label: 'Повторити',
        onClick: () => {
          document.body.dataset.pgToastActionCount = String(
            Number(document.body.dataset.pgToastActionCount || 0) + 1);
        },
      },
    });
  });
  await page.locator('[data-pg-action="toast-action"]').click();
  await expect(page.locator('.pg-toast')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-pg-toast-action-count', '1');
});

test('timer pauses during hover and keyboard focus and resumes afterwards', async ({ page }) => {
  await page.goto('/tools');
  await notify(page, 'Hover pause', { duration: 400 });
  const toast = page.locator('.pg-toast');
  await toast.hover();
  await page.waitForTimeout(650);
  await expect(toast).toBeVisible();
  await page.mouse.move(700, 350);
  await expect(toast).toHaveCount(0, { timeout: 3000 });

  await notify(page, 'Keyboard pause', { duration: 400 });
  await page.locator('[data-pg-action="toast-dismiss"]').focus();
  await page.waitForTimeout(650);
  await expect(toast).toBeVisible();
  await page.locator('[data-pg-action="theme-cycle"]').focus();
  await expect(toast).toHaveCount(0, { timeout: 3000 });
});

test('mobile long message stays within viewport and reduced motion remains supported', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await notify(page, 'Дуже довгий текст повідомлення '.repeat(14), {
    type: 'warning', duration: 0,
  });
  const toast = page.locator('.pg-toast');
  await expect(toast).toBeVisible();
  const box = await toast.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(19);
  expect(box.x + box.width).toBeLessThanOrEqual(370);
  expect(box.y + box.height).toBeLessThanOrEqual(824);
  await expect(toast).toHaveCSS('transition-duration', '0s');
  await page.locator('[data-pg-action="toast-dismiss"]').click();
  await expect(toast).toHaveCount(0);
});
