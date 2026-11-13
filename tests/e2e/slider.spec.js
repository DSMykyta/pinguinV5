/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — SLIDER BROWSER TESTS                                      ║
 * ╠════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Перевіряє range, геометрію M3, жести й життєвий цикл.      ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test, справжня сторінка Tools та createSlider.   ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/slider.spec.js.              ║
 * ║ ПРИНЦИП: Вимірює видимі частини й перевіряє нативні дії користувача.    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function mount(page, options = {}) {
  await page.goto('/tools');
  await page.evaluate(async options => {
    const { createSlider } = await import('/src/ui/slider/slider.js');
    const form = document.createElement('form');
    form.id = 'pg-slider-test';
    form.style.width = '300px';
    form.style.margin = '24px';
    const calls = [];
    const first = createSlider({
      label: 'Тестова гучність', name: 'volume', value: 50,
      formatValue: value => `${value}%`, description: 'Гучність звуку',
      onInput: value => calls.push(['input', value]),
      onChange: value => calls.push(['change', value]), ...options,
    });
    const second = createSlider({ label: 'Інший слайдер', value: 20 });
    form.append(first.element, second.element);
    document.body.replaceChildren(form);
    form.testSliders = { first, second, calls };
  }, options);
  return page.getByRole('slider', { name: 'Тестова гучність' });
}

async function geometry(page) {
  return page.locator('#pg-slider-test .pg-slider').first().evaluate(root => {
    const box = part => {
      const rect = root.querySelector('.pg-slider__' + part).getBoundingClientRect();
      return { x: rect.x, right: rect.right, width: rect.width, height: rect.height, y: rect.y };
    };
    return { active: box('active'), inactive: box('inactive'), handle: box('handle'), rail: box('rail') };
  });
}

test('Slider is integrated in Tools text tab with working and disabled examples', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Елементи', exact: true }).click();
  const slider = page.getByRole('slider', { name: 'Гучність', exact: true });
  await slider.scrollIntoViewIfNeeded();
  await expect(slider).toHaveValue('50');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('51');
  await expect(page.locator('.pg-slider__value').first()).toHaveText('51%');
  await expect(page.getByRole('slider', { name: 'Яскравість — недоступно' })).toBeDisabled();
});

test('Native keyboard respects nonzero min, fractional steps, names and formatted accessible values', async ({ page }) => {
  const input = await mount(page, { min: 10, max: 20, step: 0.5, value: 15 });
  await input.focus();
  await input.press('ArrowRight');
  await expect(input).toHaveValue('15.5');
  await expect(input).toHaveAttribute('aria-valuetext', '15.5%');
  await expect(input).toHaveAttribute('aria-describedby', /-description$/);
  await input.press('End');
  await expect(input).toHaveValue('20');
  await input.press('Home');
  await expect(input).toHaveValue('10');
  const result = await page.locator('form').evaluate(form => ({
    entries: [...new FormData(form)], calls: form.testSliders.calls,
  }));
  expect(result.entries).toContainEqual(['volume', '10']);
  expect(result.calls.slice(0, 2)).toEqual([['input', 15.5], ['change', 15.5]]);
});

test('Track and handle follow shared 32px controls, asymmetric 16/10px tracks and endpoint clipping', async ({ page }) => {
  await mount(page);
  const initial = await geometry(page);
  expect(initial.handle.width).toBe(4);
  expect(initial.handle.height).toBe(32);
  expect(initial.inactive.height).toBe(10);
  expect(initial.active.height).toBe(16);
  expect(initial.handle.x - initial.active.right).toBeCloseTo(6, 1);
  expect(initial.inactive.x - initial.handle.right).toBeCloseTo(6, 1);
  const dot = await page.locator('.pg-slider__inactive').first().evaluate(node => {
    const style = getComputedStyle(node, '::after');
    return [style.width, style.height, style.insetInlineEnd];
  });
  expect(dot).toEqual(['4px', '4px', '6px']);
  for (const value of [0, 1, 99, 100]) {
    await page.locator('form').evaluate((form, value) => form.testSliders.first.setValue(value), value);
    const current = await geometry(page);
    expect(current.active.width).toBeGreaterThanOrEqual(0);
    expect(current.inactive.width).toBeGreaterThanOrEqual(0);
    expect(current.handle.x).toBeGreaterThanOrEqual(current.rail.x - 2);
    expect(current.handle.right).toBeLessThanOrEqual(current.rail.right + 2);
    if (value === 0) expect(current.active.width).toBe(0);
    if (value === 100) expect(current.inactive.width).toBe(0);
  }
});

test('Mouse drag thins handle, tracks pointer beyond the input and commits once', async ({ page }) => {
  const input = await mount(page);
  const rect = await input.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await expect(page.locator('.pg-slider').first()).toHaveAttribute('data-pg-pressed', 'true');
  await expect.poll(async () => (await geometry(page)).handle.width).toBeCloseTo(2, 1);
  const pressed = await geometry(page);
  expect(pressed.handle.x - pressed.active.right).toBeCloseTo(6, 1);
  expect(pressed.inactive.x - pressed.handle.right).toBeCloseTo(6, 1);
  await page.mouse.move(rect.x + rect.width + 40, rect.y + rect.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(input).toHaveValue('100');
  await expect(page.locator('.pg-slider').first()).not.toHaveAttribute('data-pg-pressed');
  const calls = await page.locator('form').evaluate(form => form.testSliders.calls);
  expect(calls.filter(([type]) => type === 'change')).toEqual([['change', 100]]);
  await expect.poll(async () => (await geometry(page)).handle.width).toBe(4);
});

test('Instances are independent; silent updates clamp, form resets and destroy removes listeners', async ({ page }) => {
  const input = await mount(page);
  await page.locator('form').evaluate(form => form.testSliders.first.setValue(200));
  await expect(input).toHaveValue('100');
  await expect(page.getByRole('slider', { name: 'Інший слайдер' })).toHaveValue('20');
  await expect(page.locator('.pg-slider__value').first()).toHaveText('100%');
  expect(await page.locator('form').evaluate(form => form.testSliders.calls.length)).toBe(0);
  await page.locator('form').evaluate(form => form.reset());
  await expect(input).toHaveValue('50');
  await expect(page.locator('.pg-slider__value').first()).toHaveText('50%');
  await page.locator('form').evaluate(form => form.testSliders.first.setDisabled(true));
  await expect(input).toBeDisabled();
  await page.keyboard.press('Tab');
  await expect(input).not.toBeFocused();
  await page.locator('form').evaluate(form => {
    const { first, calls } = form.testSliders;
    first.setDisabled(false);
    first.destroy();
    first.input.dispatchEvent(new Event('input', { bubbles: true }));
    if (calls.length) throw new Error('Destroyed listener is still active');
  });
  await expect(input).toHaveCount(0);
});

test('RTL reverses both native pointer mapping and decorative fill', async ({ page }) => {
  const input = await mount(page, { value: 25 });
  await page.locator('form').evaluate(form => { form.dir = 'rtl'; });
  const start = await geometry(page);
  expect(start.active.x).toBeGreaterThan(start.handle.x);
  const rect = await input.boundingBox();
  await page.mouse.click(rect.x + 2, rect.y + 24);
  await expect(input).toHaveValue('100');
  await input.focus();
  await input.press('ArrowRight');
  await expect(input).toHaveValue('99');
});

test('Mobile touch works in 48px target without horizontal overflow', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const input = await mount(page, { value: 0 });
  const rect = await input.boundingBox();
  expect(rect.height).toBeGreaterThanOrEqual(48);
  await page.touchscreen.tap(rect.x + rect.width * .75, rect.y + 24);
  expect(Number(await input.inputValue())).toBeGreaterThan(70);
  expect(Number(await input.inputValue())).toBeLessThan(80);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('Themes, keyboard focus, reduced motion and forced colors remain usable', async ({ page }, testInfo) => {
  const input = await mount(page);
  const colors = [];
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    colors.push(await page.locator('.pg-slider__handle').first().evaluate(node => getComputedStyle(node).backgroundColor));
    const palette = await page.locator('.pg-slider').first().evaluate(root => {
      const style = getComputedStyle(root);
      return {
        active: style.getPropertyValue('--pg-color-accent').trim(),
        handle: getComputedStyle(root.querySelector('.pg-slider__handle')).backgroundColor,
        track: getComputedStyle(root.querySelector('.pg-slider__inactive')).backgroundColor,
      };
    });
    const normalize = color => color.startsWith('#')
      ? `rgb(${color.slice(1).match(/../g).map(value => parseInt(value, 16)).join(', ')})` : color;
    expect(palette.handle).toBe(normalize(palette.active));
    expect(palette.track).not.toBe(palette.handle);
    await page.locator('form').screenshot({ path: testInfo.outputPath('slider-' + theme + '.png') });
  }
  expect(colors[0]).not.toBe(colors[1]);
  await input.focus();
  await expect.poll(async () => (await geometry(page)).handle.width).toBe(2);
  expect(await input.evaluate(node => getComputedStyle(node.parentElement).outlineStyle)).toBe('solid');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.pg-slider__handle').first().evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(input).toBeVisible();
  expect(await input.evaluate(node => getComputedStyle(node).opacity)).toBe('1');
  await expect(page.locator('.pg-slider__rail').first()).toBeHidden();
  await input.press('ArrowRight');
  await expect(input).toHaveValue('51');
});
