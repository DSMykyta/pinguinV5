/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — MATERIAL BUTTON GROUP E2E                                                           ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевірити Material 3 групи, вкладки і незалежні selected states.                       ║
 * ║ ЗАЛЕЖНОСТІ: Playwright, /tools і shared Button Group.                                               ║
 * ║ ПУБЛІЧНИЙ API: Browser tests.                                                                       ║
 * ║ ПРИНЦИП: Жодних демонстраційних кнопок у Shell; тимчасові екземпляри тільки в тесті.                 ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test('tools tabs reuse a connected ghost button group without losing tab semantics', async ({ page }) => {
  await page.goto('/tools');
  const group = page.getByRole('tablist', { name: 'Інструменти' });
  const first = group.getByRole('tab', { name: 'Таблиці' });
  const middle = group.getByRole('tab', { name: 'Медіатека' });
  const text = group.getByRole('tab', { name: 'Елементи' });
  const last = group.getByRole('tab', { name: 'Переходи' });

  await expect(group).toHaveClass(/pg-button-group/);
  await expect(group).toHaveAttribute('data-pg-variant', 'connected');
  await expect(group).toHaveAttribute('data-pg-appearance', 'ghost');
  await expect(group).toHaveAttribute('data-pg-shape', 'square');
  await expect(first).toHaveAttribute('aria-selected', 'true');

  const metrics = await group.evaluate(node => {
    const buttons = [...node.querySelectorAll('[role=tab]')];
    const styles = buttons.map(button => getComputedStyle(button));
    const box = button => button.getBoundingClientRect();
    return {
      gap: getComputedStyle(node).gap,
      height: box(buttons[0]).height,
      firstOuter: styles[0].borderTopLeftRadius,
      middleInner: styles[2].borderTopLeftRadius,
      lastOuter: styles.at(-1).borderTopRightRadius,
      idleBg: styles[2].backgroundColor,
      selectedBg: styles[0].backgroundColor,
      distance: box(buttons[1]).left - box(buttons[0]).right,
    };
  });
  expect(metrics.gap).toBe('2px');
  expect(metrics.height).toBe(40);
  expect(metrics.distance).toBeCloseTo(2, 0);
  expect(metrics.middleInner).toBe('8px');
  expect(metrics.lastOuter).toBe('8px');
  expect(metrics.idleBg).toBe('rgba(0, 0, 0, 0)');
  expect(metrics.selectedBg).not.toBe(metrics.idleBg);
  expect(metrics.firstOuter).toBe('9999px');

  // Edge tabs never become capsules on hover. Only selected gets full rounding.
  await last.hover();
  await expect.poll(() => last.evaluate(button => getComputedStyle(button).borderTopRightRadius)).toBe('8px');
  await last.click();
  await expect.poll(() => last.evaluate(button => getComputedStyle(button).borderTopRightRadius)).toBe('9999px');
  await first.hover();
  await expect.poll(() => first.evaluate(button => getComputedStyle(button).borderTopLeftRadius)).toBe('8px');
  await expect(first).toHaveAttribute('aria-selected', 'false');

  await text.click();
  await expect(text).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#pg-tools-panel-elements')).toBeVisible();
  await expect(page.locator('#pg-tools-panel-tables')).toBeHidden();
  await expect(middle).toHaveAttribute('aria-selected', 'false');
  await text.press('ArrowLeft');
  await expect(middle).toBeFocused();
  await last.click();
  await expect(last).toHaveAttribute('aria-selected', 'true');
});

test('independent filled, tonal and standard groups support native selection', async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createButtonGroup } = await import('/src/ui/button-group/button-group.js');
    const filled = createButtonGroup({
      label: 'Filled group', appearance: 'filled', shape: 'square', variant: 'connected',
      items: [{ id: 'first', label: 'First' }, { id: 'second', label: 'Second' }],
    });
    const standard = createButtonGroup({
      label: 'Standard group', variant: 'standard', appearance: 'tonal', shape: 'square',
      selection: 'multiple', items: [
        { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C', disabled: true },
      ],
    });
    document.body.append(filled.element, standard.element);
  });

  const filled = page.getByRole('group', { name: 'Filled group' });
  const standard = page.getByRole('group', { name: 'Standard group' });
  await expect(filled).toHaveAttribute('data-pg-appearance', 'filled');
  await expect(standard).toHaveAttribute('data-pg-variant', 'standard');
  expect(await standard.evaluate(node => getComputedStyle(node).gap)).toBe('12px');
  await expect(filled.getByRole('button', { name: 'First' })).toHaveAttribute('aria-pressed', 'true');
  await filled.getByRole('button', { name: 'Second' }).click();
  await expect(filled.getByRole('button', { name: 'First' })).toHaveAttribute('aria-pressed', 'false');
  await expect(filled.getByRole('button', { name: 'Second' })).toHaveAttribute('aria-pressed', 'true');

  await standard.getByRole('button', { name: 'B', exact: true }).click();
  await expect(standard.getByRole('button', { name: 'A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(standard.getByRole('button', { name: 'B', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await standard.getByRole('button', { name: 'A', exact: true }).click();
  await standard.getByRole('button', { name: 'B', exact: true }).click();
  await expect(standard.getByRole('button', { name: 'B', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(standard.getByRole('button', { name: 'C', exact: true })).toBeDisabled();
});

test('group style adapter does not replace the host role or own tab state', async ({ page }) => {
  await page.goto('/tools');
  const role = await page.evaluate(async () => {
    const { configureButtonGroup } = await import('/src/ui/button-group/button-group.js');
    const div = document.createElement('div');
    div.setAttribute('role', 'tablist');
    configureButtonGroup(div, { variant: 'standard', appearance: 'filled', shape: 'square', size: 'xs' });
    return {
      role: div.getAttribute('role'),
      variant: div.dataset.pgVariant,
      size: div.dataset.pgSize,
      hasButtons: div.childElementCount,
    };
  });
  expect(role).toEqual({ role: 'tablist', variant: 'standard', size: 'xs', hasButtons: 0 });
});
