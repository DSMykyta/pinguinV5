/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E SECTION NAVIGATOR                                                                ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє section navigator у браузері через Playwright.                          ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/section-navigator.spec.js.                             ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

async function mountFixture(page) {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const { createSectionNavigator } = await import('/src/ui/section-navigator/section-navigator.js');
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = '/src/ui/section-navigator/section-navigator.css';
    document.head.append(sheet);
    document.querySelector('#app').remove();
    const main = document.createElement('div');
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Значення');
    main.append(input);
    for (let index = 0; index < 24; index++) {
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Вміст для звичайного прокручування ' + index;
      main.append(paragraph);
    }
    const photos = document.createElement('div');
    photos.textContent = 'Незалежний вміст фото';
    const description = document.createElement('div');
    description.textContent = 'Незалежний опис';
    const events = [];
    const navigator = createSectionNavigator({
      label: 'Тестові блоки',
      items: [
        { id: 'main', label: 'Основне', content: main },
        { id: 'photos', label: 'Фото', content: photos },
        { id: 'description', label: 'Опис', content: description },
      ],
      canNavigate: request => window.pgNavigationTest.guard?.(request) ?? true,
      onChange: request => events.push(request),
    });
    navigator.element.style.blockSize = '520px';
    document.body.append(navigator.element);
    window.pgNavigationTest = { navigator, events, main, input, createSectionNavigator };
  });
  await expect(page.getByRole('heading', { name: 'Основне', exact: true })).toBeVisible();
  await expect(page.locator('.pg-section-navigator__viewport')).toHaveCSS('overflow-y', 'auto');
}

const viewport = page => page.locator('.pg-section-navigator__viewport').first();
const heading = page => page.locator('.pg-section-navigator__title').first();
async function edge(page, direction = 'next') {
  await viewport(page).evaluate((node, direction) => {
    node.scrollTop = direction === 'next' ? node.scrollHeight : 0;
  }, direction);
}
async function wheel(page, count = 3, deltaY = 80) {
  await viewport(page).hover();
  for (let index = 0; index < count; index++) await page.mouse.wheel(0, deltaY);
}
async function activate(button) {
  await button.focus();
  await button.press('Enter');
}
async function drag(page, distance) {
  const button = page.getByRole('button', { name: 'Перейти до розділу «Фото»', exact: true });
  await page.keyboard.press('Tab');
  await button.focus();
  const box = await button.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - distance, { steps: 8 });
  await page.mouse.up();
}

test('section progress counter is absent globally while navigation remains usable', async ({ page }) => {
  await mountFixture(page);
  const navigator = page.locator('.pg-section-navigator');
  await expect(navigator.locator('.pg-section-navigator__counter')).toHaveCount(0);
  await expect(navigator.locator('.pg-section-navigator__title')).toHaveText('Основне');
  await expect(navigator.locator('.pg-section-navigator__handle')).toHaveCount(2);
  await activate(page.getByRole('button', { name: 'Перейти до розділу «Фото»', exact: true }));
  await expect(navigator.locator('.pg-section-navigator__title')).toHaveText('Фото');
  await expect(navigator.locator('.pg-section-navigator__counter')).toHaveCount(0);
});

test('keyboard focus reveals a hidden navigation arrow without a new control', async ({ page }) => {
  await mountFixture(page);
  const next = page.getByRole('button', { name: 'Перейти до розділу «Фото»' });
  await expect(next).toHaveAttribute('data-pg-visible', 'false');
  await expect(next).toHaveCSS('opacity', '0');
  // A real Tab changes modality; focusing that same native control makes
  // the focus ring and indicator visible without needing a wheel gesture.
  await page.keyboard.press('Tab');
  await next.focus();
  await expect(next).toHaveCSS('opacity', '1');
  await expect(next).toHaveCSS('pointer-events', 'auto');
  await next.press('Enter');
  await expect(heading(page)).toHaveText('Фото');
  await expect(next).toHaveAttribute('data-pg-visible', 'false');
});

test('buttons and native keyboard preserve field DOM, values, scroll and focus', async ({ page }) => {
  await mountFixture(page);
  await page.getByRole('textbox', { name: 'Значення' }).fill('Мій товар');
  await edge(page);
  const position = await viewport(page).evaluate(node => node.scrollTop);
  const next = page.getByRole('button', { name: 'Перейти до розділу «Фото»', exact: true });
  await next.focus();
  await next.press('Enter');
  await expect(heading(page)).toHaveText('Фото');
  await expect(heading(page)).toBeFocused();
  await activate(page.getByRole('button', { name: 'Перейти до розділу «Основне»', exact: true }));
  await expect(heading(page)).toHaveText('Основне');
  await expect(page.getByRole('textbox', { name: 'Значення' })).toHaveValue('Мій товар');
  expect(await viewport(page).evaluate(node => node.scrollTop)).toBe(position);
  expect(await page.evaluate(() => window.pgNavigationTest.input === document.querySelector('input'))).toBe(true);
  expect(await page.evaluate(() => window.pgNavigationTest.events.length)).toBe(2);
});

test('normal scrolling to the edge never navigates during the same wheel burst', async ({ page }) => {
  await mountFixture(page);
  await wheel(page, 14, 160);
  await page.waitForTimeout(260);
  await expect(heading(page)).toHaveText('Основне');
  await edge(page);
  await wheel(page);
  await expect(heading(page)).toHaveText('Фото');
  // Residual momentum cannot continue into the short next section.
  await wheel(page, 8);
  await page.waitForTimeout(260);
  await expect(heading(page)).toHaveText('Фото');
  expect(await page.evaluate(() => window.pgNavigationTest.events.length)).toBe(1);
});

test('short pull cancels, threshold commits once, and first/last have no wrap', async ({ page }) => {
  await mountFixture(page);
  await drag(page, 32);
  await expect(heading(page)).toHaveText('Основне');
  await drag(page, 110);
  await expect(heading(page)).toHaveText('Фото');
  expect(await page.evaluate(() => window.pgNavigationTest.events.length)).toBe(1);
  await activate(page.getByRole('button', { name: 'Перейти до розділу «Опис»', exact: true }));
  await expect(page.locator('.pg-section-navigator__handle:visible')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Перейти до розділу «Фото»' })).toBeVisible();
  await edge(page);
  await wheel(page, 6);
  await page.waitForTimeout(260);
  await expect(heading(page)).toHaveText('Опис');
});

test('zoom, non-cancelable wheel, controls and nested scrollers cannot start navigation', async ({ page }) => {
  await mountFixture(page);
  await edge(page);
  await viewport(page).evaluate(node => {
    for (let index = 0; index < 4; index++) {
      node.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, ctrlKey: true, bubbles: true, cancelable: true }));
      node.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: false }));
    }
    const nested = document.createElement('div');
    nested.style.overflowY = 'auto';
    nested.style.height = '80px';
    const tall = document.createElement('div');
    tall.style.height = '400px';
    nested.append(tall);
    node.querySelector('[data-pg-section="main"]').append(nested);
    node.scrollTop = node.scrollHeight;
    for (let index = 0; index < 4; index++) {
      const nestedEvent = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
      nested.dispatchEvent(nestedEvent);
      if (nestedEvent.defaultPrevented) throw new Error('Nested scroll was intercepted');
      const fieldEvent = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
      node.querySelector('input').dispatchEvent(fieldEvent);
      if (fieldEvent.defaultPrevented) throw new Error('Field wheel was intercepted');
    }
  });
  await page.waitForTimeout(260);
  await expect(heading(page)).toHaveText('Основне');
});

test('async guard blocks repeats, reports denial/error, and ignores completion after destroy', async ({ page }) => {
  await mountFixture(page);
  await page.evaluate(() => {
    window.pgNavigationTest.guard = () => new Promise(resolve => { window.pgNavigationTest.resolve = resolve; });
    window.pgNavigationTest.pending = window.pgNavigationTest.navigator.navigate('photos');
  });
  await expect(page.locator('.pg-section-navigator')).toHaveAttribute('aria-busy', 'true');
  expect(await page.evaluate(() => window.pgNavigationTest.navigator.navigate('description'))).toBe(false);
  await page.evaluate(() => window.pgNavigationTest.resolve(false));
  await expect(heading(page)).toHaveText('Основне');
  await expect(page.locator('.pg-section-navigator').getByRole('status')).toContainText('залишаємося');
  await page.evaluate(async () => {
    window.pgNavigationTest.guard = () => { throw new Error('test'); };
    await window.pgNavigationTest.navigator.navigate('photos');
  });
  await expect(page.locator('.pg-section-navigator').getByRole('status')).toContainText('Не вдалося');
  expect(await page.evaluate(async () => {
    const fixture = window.pgNavigationTest;
    fixture.guard = () => new Promise(resolve => { fixture.resolve = resolve; });
    const pending = fixture.navigator.navigate('photos');
    fixture.navigator.destroy();
    fixture.resolve(true);
    return pending;
  })).toBe(false);
  expect(await page.evaluate(() => window.pgNavigationTest.events.length)).toBe(0);
  await expect(page.locator('.pg-section-navigator')).toHaveCount(0);
});

test('instances are isolated, reduced motion removes travel, and mobile stays within the screen', async ({ page }) => {
  await mountFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.evaluate(() => {
    const content = document.createElement('div');
    content.textContent = 'Другий екземпляр';
    const second = window.pgNavigationTest.createSectionNavigator({
      label: 'Інший навігатор', items: [
        { id: 'one', label: 'Один', content },
        { id: 'two', label: 'Два', content: document.createElement('div') },
      ],
    });
    document.body.append(second.element);
    window.pgNavigationTest.second = second;
  });
  const root = page.locator('.pg-section-navigator').first();
  const box = await root.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  for (const meter of await root.locator('.pg-section-navigator__ring-fill').all()) {
    await expect(meter).toHaveCSS('transition-duration', '0s');
  }
  await page.evaluate(() => window.pgNavigationTest.navigator.navigate('photos'));
  expect(await page.evaluate(() => window.pgNavigationTest.second.getActive())).toBe('one');
  const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
  expect(ids.length).toBe(new Set(ids).size);
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('.pg-section-navigator__viewport')) {
      node.scrollTop = node.scrollHeight;
      for (let index = 0; index < 3; index++) {
        node.dispatchEvent(new WheelEvent('wheel', { deltaY: 80, bubbles: true, cancelable: true }));
      }
    }
    window.pgNavigationTest.navigator.destroy();
  });
  await expect.poll(() => page.evaluate(() => window.pgNavigationTest.second.getActive())).toBe('two');
});

test('touch scroll stays native; a new upward pull at the bottom navigates on release', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await mountFixture(page);
  const session = await context.newCDPSession(page);
  const box = await viewport(page).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height - 24;
  async function touch(type, nextY) {
    await session.send('Input.dispatchTouchEvent', {
      type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y: nextY }],
    });
  }
  await touch('touchStart', y);
  await touch('touchMove', y - 40);
  await touch('touchMove', y - 110);
  await touch('touchEnd');
  await expect.poll(() => viewport(page).evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await expect(heading(page)).toHaveText('Основне');
  // Stop native momentum before starting a separate boundary gesture.
  // Native momentum can outlast a fixed timeout in CI. Wait until the viewport
  // reaches a boundary before treating the next gesture as a new pull.
  await edge(page);
  await expect.poll(() => viewport(page).evaluate(node =>
    Math.abs(node.scrollHeight-node.clientHeight-node.scrollTop) < 1
  )).toBe(true);
  await touch('touchStart', y);
  await touch('touchMove', y - 40);
  await touch('touchMove', y - 110);
  await expect(heading(page)).toHaveText('Основне');
  await touch('touchEnd');
  await expect(heading(page)).toHaveText('Фото');
  expect(await page.evaluate(() => window.pgNavigationTest.events[0].source)).toBe('touch');
  await context.close();
});

test('Escape, pointer cancellation and a reversed armed pull do not commit', async ({ page }) => {
  await mountFixture(page);
  const button = page.getByRole('button', { name: 'Перейти до розділу «Фото»', exact: true });
  await page.keyboard.press('Tab');
  await button.focus();
  const box = await button.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 110, { steps: 6 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(heading(page)).toHaveText('Основне');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 110, { steps: 6 });
  await page.mouse.move(x, y - 20, { steps: 6 });
  await page.mouse.up();
  await expect(heading(page)).toHaveText('Основне');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 110, { steps: 6 });
  await button.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(heading(page)).toHaveText('Основне');
});

test('configuration requires string IDs and errors in observers cannot reject navigation', async ({ page }) => {
  await mountFixture(page);
  const result = await page.evaluate(async () => {
    const { createSectionNavigator } = window.pgNavigationTest;
    let invalidRejected = false;
    try {
      createSectionNavigator({ label: 'Invalid', items: [{ label: 'Без id', content: document.createElement('div') }] });
    } catch (error) { invalidRejected = error instanceof TypeError; }
    const instance = createSectionNavigator({
      label: 'Callbacks',
      items: [
        { id: 'one', label: 'One', content: document.createElement('div') },
        { id: 'two', label: 'Two', content: document.createElement('div') },
      ],
      onChange() { throw new Error('Observer failed'); },
      onError() { throw new Error('Reporting failed'); },
    });
    document.body.append(instance.element);
    let succeeded;
    try { succeeded = await instance.navigate('two'); } catch { succeeded = 'rejected'; }
    const active = instance.getActive();
    instance.destroy();
    return { invalidRejected, succeeded, active };
  });
  expect(result).toEqual({ invalidRejected: true, succeeded: true, active: 'two' });
});


test('navigator centers hidden edge indicators and reveals only the active pull', async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 650 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Переходи' }).click();
  const root = page.locator('#pg-tools-panel-navigation > .pg-section-navigator');
  const scroller = page.locator('#pg-tools-panel-navigation');
  await expect(root).toHaveCount(1);
  await expect(root).toHaveAttribute('data-pg-scroll-container', 'external');
  await expect(scroller.locator('.pg-page')).toHaveCount(0);
  await expect(scroller.locator('.pg-tools-section-navigator-demo > .pg-section-navigator')).toHaveCount(0);
  await expect(root.locator('.pg-section-navigator__viewport')).toHaveCSS('overflow-y', 'visible');
  const up = root.locator('.pg-section-navigator__handle[data-pg-direction="previous"]');
  const down = root.locator('.pg-section-navigator__handle[data-pg-direction="next"]');
  await expect(root.locator('.pg-section-navigator__handle')).toHaveCount(2);
  await expect(up).toBeDisabled();
  await expect(down).toBeEnabled();
  await expect(down.locator('.pg-section-navigator__caption')).toHaveText('Фото');
  const upBounds = await up.boundingBox();
  const downBounds = await down.boundingBox();
  const workspace = await scroller.boundingBox();
  expect(upBounds.y).toBeLessThan(downBounds.y);
  for (const buttonBox of [upBounds, downBounds]) {
    expect(Math.abs(buttonBox.x + buttonBox.width / 2 -
      (workspace.x + workspace.width / 2))).toBeLessThan(2);
  }
  await expect(up).toHaveAttribute('data-pg-visible', 'false');
  await expect(down).toHaveAttribute('data-pg-visible', 'false');
  await expect(down).toHaveCSS('opacity', '0');
  for (const button of [up, down]) {
    const circle = await button.locator('.pg-section-navigator__symbol').boundingBox();
    expect(circle.width).toBe(32);
    const caption = await button.locator('.pg-section-navigator__caption').boundingBox();
    if (caption.width > 0) expect(caption.x + caption.width).toBeLessThanOrEqual(circle.x + 1);
  }
  const progress = () => down.locator('.pg-section-navigator__ring-fill')
    .evaluate(node => Number(node.style.strokeDashoffset));
  await scroller.evaluate(node => { node.scrollTop = (node.scrollHeight - node.clientHeight) / 2; });
  await expect.poll(progress).toBe(100);
  await scroller.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect.poll(progress).toBe(100);
  await scroller.evaluate(node => node.dispatchEvent(new WheelEvent('wheel', {
    deltaY: 60, cancelable: true, bubbles: true,
  })));
  await expect.poll(progress).toBeLessThan(100);
  await expect(down).toHaveAttribute('data-pg-visible', 'true');
  await expect(up).toHaveAttribute('data-pg-visible', 'false');
  await expect(down).toHaveCSS('pointer-events', 'none'); // Wheel remains on content.
  await scroller.evaluate(node => {
    node.dispatchEvent(new WheelEvent('wheel', { deltaY: 60, cancelable: true, bubbles: true }));
    node.dispatchEvent(new WheelEvent('wheel', { deltaY: 60, cancelable: true, bubbles: true }));
  });
  await expect(root.locator('.pg-section-navigator__title')).toHaveText('Фото');
  await expect(up).toBeEnabled();
  await expect(up.locator('.pg-section-navigator__caption')).toHaveText('Основне');
  await expect.poll(progress).toBe(100);
  await expect(down).toHaveAttribute('data-pg-visible', 'false');
});

test('top previous arrow returns to the first section after animated next', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Переходи' }).click();
  const root = page.locator('.pg-section-navigator');
  const up = root.locator('.pg-section-navigator__handle[data-pg-direction="previous"]');
  const down = root.locator('.pg-section-navigator__handle[data-pg-direction="next"]');
  await activate(down);
  await expect(root.locator('.pg-section-navigator__title')).toHaveText('Фото');
  await expect(root).toHaveAttribute('aria-busy', 'false');
  await up.focus();
  await up.press('Enter');
  await expect(root.locator('.pg-section-navigator__title')).toHaveText('Основне');
  await expect(up).toBeDisabled();
});


test('compact controls use ordinary cursor; short sections have no artificial blank spacer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Переходи' }).click();
  const root = page.locator('.pg-section-navigator');
  const down = root.locator('[data-pg-direction="next"]');
  const up = root.locator('[data-pg-direction="previous"]');
  await expect(down).toHaveCSS('cursor', 'default');
  await expect(up).toHaveCSS('cursor', 'default');

  const title = root.locator('.pg-section-navigator__title');
  const field = root.locator('[data-pg-section="main"] .pg-tools-section-navigator-demo__fields');
  const header = await title.boundingBox();
  const form = await field.boundingBox();
  expect(Math.abs(header.x - form.x)).toBeLessThan(2);

  await activate(down);
  await expect(title).toHaveText('Фото');
  await expect(root).toHaveAttribute('aria-busy', 'false');
  await activate(down);
  await expect(title).toHaveText('Опис');
  await expect(root).toHaveAttribute('aria-busy', 'false');
  const rootBox = await root.boundingBox();
  const downBounds = await down.boundingBox();
  const headingBox = await title.boundingBox();
  const topRail = await root.locator('[data-pg-placement="top"]').boundingBox();
  const bottomRail = await root.locator('[data-pg-placement="bottom"]').boundingBox();
  // Both indicators are centered overlays; there is no permanent right rail.
  expect(topRail.width).toBeLessThanOrEqual(40);
  expect(bottomRail.width).toBeLessThanOrEqual(40);
  expect(Math.abs(topRail.x + topRail.width / 2 -
    (rootBox.x + rootBox.width / 2))).toBeLessThan(2);
  expect(Math.abs(bottomRail.x + bottomRail.width / 2 -
    (rootBox.x + rootBox.width / 2))).toBeLessThan(2);
  expect(Math.abs(topRail.y - headingBox.y)).toBeLessThan(22);
  expect(Math.abs(rootBox.y + rootBox.height - (downBounds.y + downBounds.height))).toBeLessThan(24);
  const columns = await root.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' '));
  expect(columns).toHaveLength(1);
});

test('external navigator fills a short workspace and keeps the next control at the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Переходи' }).click();
  const panel = page.locator('#pg-tools-panel-navigation');
  const navigator = panel.locator('.pg-section-navigator');
  await expect(navigator).toHaveAttribute('data-pg-scroll-container', 'external');
  await activate(page.getByRole('button', { name: 'Перейти до розділу «Фото»' }));
  await expect(navigator.locator('.pg-section-navigator__title')).toHaveText('Фото');

  const bounds = await panel.evaluate(node => {
    const navigator = node.querySelector('.pg-section-navigator');
    const bottom = node.querySelector('[data-pg-placement="bottom"]');
    const top = node.querySelector('[data-pg-placement="top"]');
    const outer = node.getBoundingClientRect();
    const inner = navigator.getBoundingClientRect();
    const bottomBox = bottom.getBoundingClientRect();
    const topBox = top.getBoundingClientRect();
    return {
      fill: inner.height >= outer.height - 1,
      top: topBox.top - outer.top,
      bottom: outer.bottom - bottomBox.bottom,
      overflow: getComputedStyle(navigator.querySelector('.pg-section-navigator__viewport')).overflowY,
    };
  });
  expect(bounds.fill).toBe(true);
  expect(bounds.top).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom).toBeGreaterThanOrEqual(-1);
  expect(bounds.bottom).toBeLessThan(16); // centered overlay has an 8px edge inset
  expect(bounds.overflow).toBe('visible');
});
