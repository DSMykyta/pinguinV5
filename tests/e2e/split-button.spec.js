/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SPLIT BUTTON E2E                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє незалежні дії, форму, фокус і якір.                                       ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, реальний компонент.                                                ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/split-button.spec.js                                ║
 * ║ ПРИНЦИП: Перевірка через DOM, без дублювання production-логіки.                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('split primary and secondary actions are independent', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи' }).click();
  const group = page.locator('.pg-split-button');
  const primary = group.getByRole('button', { name: 'Зберегти', exact: true });
  const trigger = group.getByRole('button', { name: 'Варіанти збереження' });
  const panel = group.getByRole('menu');
  const status = page.locator('.pg-tools-button-demo__status');
  await primary.click();
  await expect(status).toHaveText('Демо: зберегти.');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const before = await group.boundingBox();
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(status).toHaveText('Демо: зберегти.');
  await expect.poll(() => trigger.evaluate(node =>
    getComputedStyle(node).borderTopLeftRadius === getComputedStyle(node).borderTopRightRadius)).toBe(true);
  await expect.poll(() => trigger.locator('svg').evaluate(node =>
    getComputedStyle(node).transform)).toBe('matrix(-1, 0, 0, -1, 0, 0)');
  const after = await group.boundingBox();
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  const geometry = await group.evaluate(node => {
    const g = node.getBoundingClientRect();
    const p = node.querySelector('[role=menu]').getBoundingClientRect();
    return { dx: p.left - g.left, end: p.right - g.right,
      gap: Math.max(p.top - g.bottom, g.top - p.bottom) };
  });
  expect(Math.min(Math.abs(geometry.dx), Math.abs(geometry.end))).toBeLessThan(2);
  expect(geometry.gap).toBeCloseTo(4, 0);
  await panel.getByRole('menuitem', { name: 'Створити копію' }).click();
  await expect(status).toHaveText('Демо: Створити копію.');
  await expect(trigger).toBeFocused();
  await expect(panel).toBeHidden();
  await trigger.press('ArrowDown');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('split can disable its primary action without disabling the menu', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createSplitButton } = await import('/src/ui/split-button/split-button.js');
    const split = createSplitButton({
      label: 'Тестова дія', items: [{ label: 'Варіант' }],
      primaryDisabled: true, onAction: () => {},
    });
    document.body.append(split.element);
  });
  const group = page.getByRole('group', { name: 'Тестова дія' });
  await expect(group.getByRole('button', { name: 'Тестова дія' })).toBeDisabled();
  await group.getByRole('button', { name: 'Додаткові дії' }).click();
  await expect(group.getByRole('menu')).toBeVisible();
});
