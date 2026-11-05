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
  await expect(page.locator('.pg-toast__host')).toHaveCSS('bottom', '20px');
  await expect(page.locator('.pg-toast__host')).toHaveCSS('left', '20px');
  // Wait for entrance transform: getBoundingClientRect is animated.
  await expect(toast).toHaveAttribute('data-pg-state', 'visible');
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

test('three visible notifications stack above one another; identical messages stay distinct', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    showToast('Перше', { duration: 0 });
    showToast('Перше', { duration: 0 });
    showToast('Друге', { duration: 0 });
    showToast('Третє', { duration: 0 }); // waiting, not ignored
  });

  const visible = page.locator('.pg-toast');
  const messages = page.locator('.pg-toast__message');
  await expect(visible).toHaveCount(3);
  await expect(messages).toHaveText(['Друге', 'Перше', 'Перше']);
  await page.locator('.pg-toast__host').hover();
  await expect(page.locator('.pg-toast__host')).toHaveAttribute('data-pg-expanded', 'true');
  await visible.evaluateAll(elements => Promise.all(elements.flatMap(
    element => element.getAnimations().map(a => a.finished.catch(() => {})))));
  const boxes = await visible.evaluateAll(elements => elements.map(el => {
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom };
  }));
  expect(boxes[1].bottom).toBeLessThan(boxes[0].top);
  expect(boxes[2].bottom).toBeLessThan(boxes[1].top);

  await visible.first().locator('[data-pg-action="toast-dismiss"]').click();
  await expect(messages).toHaveText(['Третє', 'Перше', 'Перше']);
  await expect(visible).toHaveCount(3);
  await visible.nth(1).locator('[data-pg-action="toast-dismiss"]').click();
  await expect(messages).toHaveText(['Третє', 'Перше']);
});

test('a pending toast can be dismissed without removing visible notifications', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    for (const title of ['А', 'Б', 'В']) showToast(title, { duration: 0 });
    const waiting = showToast('Не показувати', { duration: 0 });
    document.body.dataset.pgWaitingDismissed = String(waiting.dismiss());
  });
  await expect(page.locator('body')).toHaveAttribute('data-pg-waiting-dismissed', 'true');
  await expect(page.locator('.pg-toast__message')).toHaveText(['В', 'Б', 'А']);
  await page.locator('.pg-toast').first().locator('[data-pg-action="toast-dismiss"]').click();
  await expect(page.locator('.pg-toast__message')).toHaveText(['Б', 'А']);
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
  await notify(page, 'Hover pause', { duration: 1200 });
  const toast = page.locator('.pg-toast');
  await expect(toast).toHaveAttribute('data-pg-state', 'visible');
  await toast.evaluate(el => Promise.all(el.getAnimations().map(
    animation => animation.finished.catch(() => {}))));
  await toast.hover();
  await page.waitForTimeout(1350);
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

test('Toast colors follow the current theme without overriding Shell geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  const theme = page.locator('[data-pg-action="theme-cycle"]');
  await theme.click();
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const before = await theme.boundingBox();

  await notify(page, 'Темне оформлення', { type: 'success', duration: 0 });
  await expect(page.locator('.pg-toast')).toHaveCSS('background-color', 'rgb(241, 241, 241)');
  await expect(page.locator('.pg-toast')).toHaveCSS('color', 'rgb(36, 36, 40)');
  await page.locator('[data-pg-action="toast-dismiss"]').click();
  await expect(page.locator('.pg-toast')).toHaveCount(0);
  expect(await theme.boundingBox()).toEqual(before);
});

test('waiting queue stays bounded for regular items and preserves actions', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { showToast } = await import('/src/ui/toast/toast.js');
    showToast('Активне', { duration: 0 });
    for (let index = 0; index < 10; index++) {
      showToast('Очікування ' + index, { duration: 0 });
    }
    const rejected = showToast('Зайве', { duration: 0 });
    document.body.dataset.pgToastOverflowRejected = String(!rejected.dismiss());
    showToast('Дія в черзі', {
      action: {
        label: 'Повторити',
        onClick: () => { document.body.dataset.pgToastActionInvoked = 'true'; },
      },
    });
  });

  await expect(page.locator('body')).toHaveAttribute('data-pg-toast-overflow-rejected', 'true');
  await expect(page.locator('.pg-toast')).toHaveCount(3);
  // Older cards are intentionally inert while compact. Hover expands the
  // stack before interacting with their individual close controls.
  await page.locator('.pg-toast__host').hover();
  await expect(page.locator('.pg-toast__host')).toHaveAttribute('data-pg-expanded', 'true');
  // Queue order is a state-machine check. Click the close control directly:
  // older collapsed cards are inert and cannot be physically clicked until
  // expanded; pointer interaction is covered by the separate hover test.
  const current = page.locator('.pg-toast:not([data-pg-state="closing"])');
  for (const title of ['Активне', ...Array.from({ length: 10 }, (_, i) => 'Очікування ' + i)]) {
    await expect(current.locator('.pg-toast__message').last()).toHaveText(title);
    await current.last().evaluate(el => {
      el.querySelector('[data-pg-action="toast-dismiss"]').click();
    });
    await expect(current.locator('.pg-toast__message').last()).not.toHaveText(title);
  }
  await expect(page.locator('.pg-toast__message')).toHaveText(['Дія в черзі']);
  await page.locator('[data-pg-action="toast-action"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-pg-toast-action-invoked', 'true');
  await expect(page.locator('.pg-toast')).toHaveCount(0);
});

test('compact stack expands on hover and returns without an abrupt layout jump', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  for (const title of ['Перший', 'Другий', 'Третій']) {
    await notify(page, title, { duration: 0 });
  }
  const host = page.locator('.pg-toast__host');
  const elements = page.locator('.pg-toast');
  await expect(host).toHaveAttribute('data-pg-expanded', 'false');
  await expect(elements).toHaveCount(3);
  await expect(elements).toHaveText(['Третій', 'Другий', 'Перший']);

  const collapsed = await elements.evaluateAll(all => all.map(el =>
    el.getBoundingClientRect().top));
  expect(collapsed[0]).toBeGreaterThan(collapsed[1]);
  expect(collapsed[1]).toBeGreaterThan(collapsed[2]);

  await host.hover();
  await expect(host).toHaveAttribute('data-pg-expanded', 'true');
  await expect(elements.nth(1)).not.toHaveAttribute('inert', '');
  await elements.evaluateAll(els => Promise.all(els.flatMap(el =>
    el.getAnimations().map(a => a.finished.catch(() => {})))));
  const expanded = await elements.evaluateAll(all => all.map(el =>
    el.getBoundingClientRect().top));
  expect(expanded[0] - expanded[1]).toBeGreaterThan(45);
  expect(expanded[1] - expanded[2]).toBeGreaterThan(45);

  await page.mouse.move(800, 360);
  await expect(host).toHaveAttribute('data-pg-expanded', 'false');
  await elements.evaluateAll(els => Promise.all(els.flatMap(el =>
    el.getAnimations().map(a => a.finished.catch(() => {})))));
  const folded = await elements.evaluateAll(all => all.map(el =>
    el.getBoundingClientRect().top));
  expect(Math.abs(folded[0] - folded[1])).toBeLessThan(24);
});

test('closing Toast travels down before being removed; neighbours settle smoothly', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await notify(page, 'Older message', { duration: 0 });
  await notify(page, 'Slides downward', { duration: 0 });
  const toast = page.locator('.pg-toast').filter({ hasText: 'Slides downward' });
  await expect(toast).toHaveAttribute('data-pg-state', 'visible');
  await toast.evaluate(el => Promise.all(el.getAnimations().map(
    animation => animation.finished.catch(() => {}))));
  const initialTop = (await toast.boundingBox()).y;

  await toast.locator('[data-pg-action="toast-dismiss"]').click();
  await expect(toast).toHaveAttribute('data-pg-state', 'closing');
  await page.waitForTimeout(130);
  const movingTop = (await toast.boundingBox()).y;
  expect(movingTop - initialTop).toBeGreaterThan(15);
  await expect(toast).toHaveCount(0, { timeout: 2000 });

  const survivor = page.locator('.pg-toast').filter({ hasText: 'Older message' });
  await expect(survivor).toHaveCount(1);
  await survivor.evaluate(el => Promise.all(el.getAnimations().map(
    animation => animation.finished.catch(() => {}))));
  const settled = await survivor.boundingBox();
  expect(Math.abs(settled.y + settled.height - 880)).toBeLessThan(2);
});
