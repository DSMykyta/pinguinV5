/**
 * PINGUIN NEXT — UNIVERSAL REVEAL PANEL
 * Tests standalone reversal, accessibility, reduced motion, and the Shell integration.
 */
import { test, expect } from '@playwright/test';

test('generic top and bottom reveals reverse safely without stale close callbacks', async ({ page }) => {
  await page.goto('/tools');
  const values = await page.evaluate(async () => {
    const { createRevealPanel } = await import('/src/ui/reveal-panel/reveal-panel.js');
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = '/src/ui/reveal-panel/reveal-panel.css';
    document.head.append(sheet);
    const node = document.createElement('div');
    node.textContent = 'Universal reveal content';
    document.body.append(node);
    const panel = createRevealPanel({ element: node, direction: 'bottom' });
    const states = [panel.getState(), node.hidden, node.inert];
    panel.setVisible(true);
    states.push(panel.getState(), node.hidden, node.inert);
    let stale = 0;
    panel.setVisible(false, { onHidden: () => stale += 1 });
    states.push(panel.getState(), node.inert, node.getAttribute('aria-hidden'));
    panel.setVisible(true);
    return { states, stale, direction: node.dataset.pgRevealDirection };
  });
  expect(values).toEqual({
    states: ['hidden', true, true, 'visible', false, false, 'leaving', true, 'true'],
    stale: 0, direction: 'bottom',
  });
});

test('contextual toolbar drops down and goes back up without removing outgoing content early', async ({ page }) => {
  await page.goto('/tools');
  const tools = page.locator('.pg-shell__context-tools');
  const contextButton = page.locator('.pg-shell__context-button');
  const position = await contextButton.boundingBox();
  await expect(tools).toBeHidden();
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(tools).toHaveAttribute('data-pg-state', 'visible');
  await expect(tools).toBeVisible();
  await expect(tools.locator('.pg-view-switch')).toHaveCount(1);
  await expect(tools.locator('.pg-search')).toBeVisible();
  const props = await tools.evaluate(node => {
    const css = getComputedStyle(node);
    return { transformTransition: css.transitionProperty.includes('transform'), position: css.position,
      sibling: node.nextElementSibling?.classList.contains('pg-shell__context-button') };
  });
  expect(props.transformTransition).toBe(true);
  expect(props.sibling).toBe(true);

  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(tools).toHaveAttribute('data-pg-state', 'leaving');
  await expect(tools).toHaveAttribute('aria-hidden', 'true');
  await expect(tools.locator('.pg-view-switch')).toHaveCount(1);
  await expect(tools).toBeHidden();
  await expect(tools.locator('.pg-view-switch')).toHaveCount(0);
  await expect(tools.locator('.pg-search')).toBeHidden();
  const again = await contextButton.boundingBox();
  expect(Math.abs(position.x - again.x)).toBeLessThan(2);
  await expect(contextButton).toBeVisible();
});

test('rapid tab reversal cancels exit; no duplicate controls or lost search state', async ({ page }) => {
  await page.goto('/tools');
  const tools = page.locator('.pg-shell__context-tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const search = page.getByRole('searchbox', { name: 'Шукати у таблиці брендів' });
  await search.fill('Pinguin');
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(tools).toHaveAttribute('data-pg-state', 'leaving');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(tools).toHaveAttribute('data-pg-state', 'visible');
  await expect(tools.locator('.pg-view-switch')).toHaveCount(1);
  await expect(tools.locator('.pg-search')).toHaveCount(1);
  await expect(search).toHaveValue('Pinguin');
  await page.waitForTimeout(450);
  await expect(tools).toBeVisible();
  await expect(tools.locator('.pg-view-switch')).toHaveCount(1);
});

test('reduced motion removes travel and toolbar is immediately hidden', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const tools = page.locator('.pg-shell__context-tools');
  await expect(tools).toHaveCSS('transition-duration', '0s');
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(tools).toBeHidden();
});


test('pagination comes up from below and exits below using the same reveal controller', async ({ page }) => {
  await page.goto('/tools');
  const footer = page.locator('.pg-shell__footer');
  await expect(footer).toBeEmpty();
  await expect(footer).toHaveCSS('height', '56px');

  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const panel = footer.locator('.pg-reveal-panel.pg-shell__footer-panel');
  const pagination = panel.locator('.pg-pagination');
  await expect(panel).toHaveAttribute('data-pg-reveal-direction', 'bottom');
  await expect(panel).toHaveAttribute('data-pg-state', 'visible');
  await expect(pagination).toHaveCount(1);
  await expect(pagination.locator('.pg-pagination__status')).toHaveText('Показано 25 з 32');
  await expect(footer).toHaveCSS('height', '56px');

  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(footer).toHaveAttribute('data-pg-has-content', 'false');
  await expect(panel).toHaveAttribute('data-pg-state', 'leaving');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
  await expect(pagination).toHaveCount(1);
  await expect(panel).toBeHidden();
  await expect(footer).toBeEmpty();
  await expect(footer).toHaveCSS('height', '56px');
});

test('footer exit reverses without cloning pagination, losing state or duplicating FAB', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const footer = page.locator('.pg-shell__footer');
  const panel = footer.locator('.pg-shell__footer-panel');
  const pager = panel.locator('.pg-pagination');
  await expect(pager).toHaveCount(1);
  await page.getByRole('button', { name: 'Наступна сторінка' }).click();
  await expect(pager.locator('.pg-pagination__status')).toHaveText('Показано 7 з 32');
  await page.getByRole('tab', { name: 'Переходи' }).click();
  await expect(panel).toHaveAttribute('data-pg-state', 'leaving');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await expect(panel).toHaveAttribute('data-pg-state', 'visible');
  await expect(pager).toHaveCount(1);
  await expect(pager.locator('.pg-pagination__status')).toHaveText('Показано 7 з 32');
  await expect(footer.locator('[data-pg-action="page-fab-toggle"]')).toHaveCount(1);
  await page.waitForTimeout(450);
  await expect(panel).toBeVisible();
});

test('reduced motion hides footer pagination immediately without removing the rail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const panel = page.locator('.pg-shell__footer-panel');
  await expect(panel).toHaveCSS('transition-duration', '0s');
  await page.getByRole('tab', { name: 'Текст' }).click();
  await expect(page.locator('.pg-shell__footer')).toBeEmpty();
  await expect(page.locator('.pg-shell__footer')).toHaveCSS('height', '56px');
});
