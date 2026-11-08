/**
 * PINGUIN NEXT — SECTION NAVIGATOR BROWSER TESTS
 * ПРИЗНАЧЕННЯ: Перевіряє реальні незалежні панелі й локальні жести.
 * ЗАЛЕЖНОСТІ: Playwright, native Section navigator.
 * ПУБЛІЧНИЙ API: npm run test:e2e.
 * ПРИНЦИП: Тести не потребують готового редактора товарів.
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
async function drag(page, distance) {
  const box = await page.getByRole('button', { name: 'Далі: Фото', exact: true }).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - distance, { steps: 8 });
  await page.mouse.up();
}

test('buttons and native keyboard preserve field DOM, values, scroll and focus', async ({ page }) => {
  await mountFixture(page);
  await page.getByRole('textbox', { name: 'Значення' }).fill('Мій товар');
  await edge(page);
  const position = await viewport(page).evaluate(node => node.scrollTop);
  const next = page.getByRole('button', { name: 'Далі: Фото', exact: true });
  await next.focus();
  await next.press('Enter');
  await expect(heading(page)).toHaveText('Фото');
  await expect(heading(page)).toBeFocused();
  await page.getByRole('button', { name: 'Назад: Основне', exact: true }).click();
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
  await page.getByRole('button', { name: 'Далі: Опис', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Останній блок', exact: true })).toBeDisabled();
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
  for (const meter of await root.locator('.pg-section-navigator__meter').all()) {
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
  await page.waitForTimeout(350);
  await edge(page);
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
  const button = page.getByRole('button', { name: 'Далі: Фото', exact: true });
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
