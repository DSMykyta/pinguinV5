/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E REVEAL PANEL                                                                     ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє reveal panel у браузері через Playwright.                               ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/reveal-panel.spec.js.                                  ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
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
  await expect(panel).toHaveCSS('border-top-style', 'solid');
  await expect(footer).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
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


test('FAB action list is dark, visible and readable in both themes without white action surfaces', async ({ page }) => {
  const ratio = (first, second) => {
    const toRgb = str => str.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = str => toRgb(str).map(c => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(first), b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  await page.goto('/tools');
  const originalFab = page.locator('[data-pg-action="aside-fab-toggle"]');
  await originalFab.click();
  const actions = page.locator('#pg-fab-actions .pg-fab__item');
  await expect(actions).toHaveCount(2);
  const checkColors = async () => actions.first().evaluate(node => {
    const label = node.querySelector('.pg-fab__label');
    const symbol = node.querySelector('.pg-fab__symbol');
    const surface = getComputedStyle(label);
    const icon = getComputedStyle(symbol);
    return { background: surface.backgroundColor, foreground: surface.color,
      symbolBackground: icon.backgroundColor, symbolForeground: icon.color,
      pageBackground: getComputedStyle(document.documentElement).getPropertyValue('--pg-color-page').trim() };
  });
  let light = await checkColors();
  expect(light.symbolBackground).toBe(light.background);
  expect(ratio(light.foreground, light.background)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(light.background, 'rgb(255, 255, 255)')).toBeGreaterThanOrEqual(3);

  // Theme preference is global; use the existing sidebar button to change it.
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  // Shared FAB tokens animate over 150ms; measure only after the new theme settles.
  await expect(actions.first().locator('.pg-fab__label'))
    .toHaveCSS('background-color', 'rgb(96, 112, 123)');
  let dark = await checkColors();
  expect(dark.symbolBackground).toBe(dark.background);
  expect(dark.background).not.toBe('rgb(255, 255, 255)');
  expect(dark.background).not.toBe('rgb(241, 241, 241)');
  expect(dark.background).toBe('rgb(96, 112, 123)');
  expect(ratio(dark.foreground, dark.background)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(dark.background, 'rgb(33, 33, 33)')).toBeGreaterThanOrEqual(3);

  // The page-size FAB must use the exact same shared palette.
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  await page.locator('[data-pg-action="page-fab-toggle"]').click();
  const pageAction = page.locator('#pg-page-fab-actions .pg-fab__item').first();
  const actual = await pageAction.locator('.pg-fab__symbol').evaluate(node => getComputedStyle(node).backgroundColor);
  expect(actual).toBe(dark.background);
  await expect(pageAction).toBeVisible();
});


test('both FABs preserve the approved corner tilt and quarter-turn instead of scale', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const controls = [
    page.locator('[data-pg-action="aside-fab-toggle"]'),
    page.locator('[data-pg-action="page-fab-toggle"]'),
  ];
  const faceStyle = control => control.locator('.pg-fab__face').evaluate(node => {
    const style = getComputedStyle(node);
    return { transform: style.transform, duration: style.transitionDuration,
      timing: style.transitionTimingFunction };
  });
  const settle = control => control.locator('.pg-fab__face').evaluate(node =>
    Promise.all(node.getAnimations().map(a => a.finished.catch(() => {}))));
  const hoverTransforms = [];
  const openTransforms = [];
  for (const control of controls) {
    await expect(control.locator('.pg-fab__face')).toHaveCount(1);
    await control.hover();
    await settle(control);
    hoverTransforms.push(await faceStyle(control));
    await control.click();
    await settle(control);
    openTransforms.push(await faceStyle(control));
  }
  expect(hoverTransforms[0]).toEqual(hoverTransforms[1]);
  expect(openTransforms[0]).toEqual(openTransforms[1]);
  // Matrix translations vary by font rounding: compare rotation and unit scale only.
  for (const state of hoverTransforms) {
    const [a,b] = state.transform.match(/-?[\d.]+/g).slice(0,4).map(Number);
    expect(a).toBeCloseTo(Math.cos(Math.PI/15), 3);
    expect(b).toBeCloseTo(-Math.sin(Math.PI/15), 3);
    expect(a*a+b*b).toBeCloseTo(1, 3);
  }
  for (const state of openTransforms) {
    const [a,b] = state.transform.match(/-?[\d.]+/g).slice(0,4).map(Number);
    expect(a).toBeCloseTo(Math.SQRT1_2, 3);
    expect(b).toBeCloseTo(Math.SQRT1_2, 3);
    expect(a*a+b*b).toBeCloseTo(1, 3);
  }
});

test('selected pagination FAB action still gets the same hover response as global FAB links', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  const globalFab = page.locator('[data-pg-action="aside-fab-toggle"]');
  const pageFab = page.locator('[data-pg-action="page-fab-toggle"]');
  await pageFab.click();
  const selected = page.locator('#pg-page-fab-actions .pg-fab__item[aria-pressed="true"]');
  await expect(selected).toHaveCount(1);
  const bg = selected.locator('.pg-fab__symbol');
  const before = await bg.evaluate(node => getComputedStyle(node).backgroundColor);
  await selected.hover();
  const expectedHover = await bg.evaluate(node => {
    const sample = document.createElement('span');
    sample.style.background = 'var(--pg-color-fab-action-hover)';
    node.ownerDocument.body.append(sample);
    const value = getComputedStyle(sample).backgroundColor;
    sample.remove();
    return value;
  });
  await expect(bg).toHaveCSS('background-color', expectedHover);
  const after = await bg.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(after).not.toBe(before);
  await pageFab.click();
  await globalFab.click();
  const link = page.locator('#pg-fab-actions .pg-fab__item').first();
  await link.hover();
  await expect(link.locator('.pg-fab__symbol')).toHaveCSS('background-color', after);
});

test('FAB shared hover has no transform motion under reduced-motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Макети даних' }).click();
  for (const action of ['aside-fab-toggle','page-fab-toggle']) {
    const button = page.locator('[data-pg-action="' + action + '"]');
    await button.hover();
    await expect(button.locator('.pg-fab__face')).toHaveCSS('transform', 'none');
    await expect(button.locator('.pg-fab__face')).toHaveCSS('transition-duration', '0s');
  }
});
