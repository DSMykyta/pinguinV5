/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — E2E RICH TEXT EDITOR                                                                 ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: E2E: перевіряє rich text editor у браузері через Playwright.                           ║
 * ║ ЗАЛЕЖНОСТІ: @playwright/test                                                                        ║
 * ║ ПУБЛІЧНИЙ API: npx playwright test tests/e2e/rich-text-editor.spec.js.                              ║
 * ║ ПРИНЦИП: Перевіряє спостережувану поведінку; production-компоненти не змінюються.                   ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

function getEditor(page) {
  const root = page.locator('#pg-tools-panel-text .pg-rich-text-editor');
  return {
    root,
    visual: root.getByRole('textbox', { name: 'Редактор тексту' }),
    code: root.getByRole('textbox', { name: 'HTML-код тексту' }),
    editorMode: root.locator('.pg-rich-text-editor__mode-switch .pg-segment-switch__label').nth(0),
    htmlMode: root.locator('.pg-rich-text-editor__mode-switch .pg-segment-switch__label').nth(1),
  };
}

test('one working surface switches from WYSIWYG to editable HTML and back', async ({ page }) => {
  const { root, visual, code, editorMode, htmlMode } = getEditor(page);
  await expect(visual).toBeVisible();
  await expect(code).toBeHidden();
  await expect(root.locator('.pg-rich-text-editor__mirror')).toHaveCount(0);
  await root.locator('[data-pg-action="toggle-formatting"]').click();
  await expect(root.getByRole('radio',{name:'Редактор',exact:true})).toBeChecked();
  await htmlMode.click();
  await expect(visual).toBeHidden();
  await expect(code).toBeVisible();
  await expect(code).toBeEditable();
  await expect(code).toBeFocused();
  await expect(code).toHaveValue(/<h2>Опис товару<\/h2>/);
  await expect(root.locator('[data-pg-action="bold"]')).toBeDisabled();
  await expect(root.locator('[data-pg-action="toggle-formatting"]')).toBeHidden();
  await expect(root.locator('.pg-rich-text-editor__toolbar')).toBeHidden();
  await code.fill('<h1>Новий заголовок</h1><p>Опис <strong>оновлено</strong></p>');
  await editorMode.click();
  // Tooltip intentionally removes native title attributes on first hover.
  // Never use [title] as an interaction hook: label text and radio identity persist.
  await expect(root.locator('.pg-rich-text-editor__mode-switch .pg-segment-switch__label')).toHaveCount(2);
  await expect(code).toBeHidden();
  await expect(visual).toBeVisible();
  await expect(visual.locator('h1')).toHaveText('Новий заголовок');
  await expect(visual.locator('strong')).toHaveText('оновлено');
  await root.locator('[data-pg-action="toggle-formatting"]').click();
  await expect(root.getByRole('button', { name: /Жирний/ })).toBeEnabled();
  await htmlMode.click();
  await expect(code).toHaveValue('<h1>Новий заголовок</h1><p>Опис <strong>оновлено</strong></p>');
});

test('edits in source mode stay raw while typing, but export and commit are sanitized', async ({ page }) => {
  const { root, visual, code, editorMode, htmlMode } = getEditor(page);
  await htmlMode.click();
  const risky = '<p>Текст<img src=x onerror="alert(1)"><a href="javascript:alert(1)">link</a><script>alert(2)</script></p>';
  await code.fill(risky);
  await expect(code).toHaveValue(risky);
  const sanitized = await root.evaluate(async element => {
    const { createRichTextEditor } = await import('/src/ui/rich-text-editor/rich-text-editor.js');
    const instance = createRichTextEditor({ content: '<p></p>', toolbar: false, stats: false });
    element.after(instance.element);
    instance.setMode('html');
    instance.source.value = '<p><img src=x onerror="alert(1)"><script>alert(2)</script>текст</p>';
    const output = instance.getHTML();
    instance.destroy();
    return output;
  });
  expect(sanitized).not.toMatch(/<img|<script|onerror/);
  await editorMode.click();
  await expect(visual).toContainText('Текст');
  await expect(visual.locator('img, script')).toHaveCount(0);
  await expect(root.locator('.pg-rich-text-editor__notice')).toBeVisible();
  await htmlMode.click();
  await expect(code).not.toHaveValue(/onerror|javascript:|<script/);
});

test('HTML changes are undoable after returning to editor; WYSIWYG formatting works', async ({ page }) => {
  const { root, visual, code, editorMode, htmlMode } = getEditor(page);
  await htmlMode.click();
  await code.fill('<p>Нова версія</p>');
  await editorMode.click();
  await expect(visual).toContainText('Нова версія');
  await root.locator('[data-pg-action="toggle-formatting"]').click();
  await root.getByRole('button', { name: /Скасувати/ }).click();
  await expect(visual).toContainText('Опис товару');
  await root.getByRole('button', { name: /Повторити/ }).click();
  await expect(visual).toContainText('Нова версія');
  await visual.evaluate(node => {
    const text = node.querySelector('p').firstChild;
    const selection = node.ownerDocument.getSelection();
    const range = node.ownerDocument.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 4);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await root.getByRole('button', { name: /Жирний/ }).click();
  await expect(visual.locator('strong')).toContainText('Нова');
  await htmlMode.click();
  await expect(code).toHaveValue(/<strong>Нова<\/strong>/);
});

test('HTML is optional, source and visual honor readonly, instances are isolated', async ({ page }) => {
  const { visual, code, editorMode, htmlMode } = getEditor(page);
  await expect(visual).toBeVisible();
  const result = await page.evaluate(async () => {
    const { createRichTextEditor } = await import('/src/ui/rich-text-editor/rich-text-editor.js');
    const first = createRichTextEditor({ content: '<p>Перший</p>', toolbar: false, stats: false });
    const second = createRichTextEditor({ content: '<p>Другий</p>', toolbar: false, code: false, stats: false });
    document.body.append(first.element, second.element);
    first.setMode('html');
    first.source.value = '<p>Змінено</p>';
    first.source.dispatchEvent(new Event('input', { bubbles: true }));
    const values = [first.getHTML(), second.getHTML()];
    first.setEditable(false);
    const readonly = first.source.readOnly;
    first.destroy();
    const alive = second.element.isConnected;
    const noSwitch = second.element.querySelectorAll('.pg-rich-text-editor__mode-switch').length === 0;
    second.destroy();
    return { values, readonly, alive, noSwitch };
  });
  expect(result).toEqual({ values: ['<p>Змінено</p>', '<p>Другий</p>'], readonly: true, alive: true, noSwitch: true });
  await htmlMode.click();
  await expect(code).toBeEditable();
  await editorMode.click();
  await expect(visual).toBeVisible();
});

test('editor and source use same full-width workspace on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { root, visual, code, htmlMode } = getEditor(page);
  await expect(visual).toBeVisible();
  await htmlMode.click();
  await expect(code).toBeVisible();
  const dimensions = await root.evaluate(node => {
    const root = node.getBoundingClientRect();
    const source = node.querySelector('.pg-rich-text-editor__source').getBoundingClientRect();
    return {
      root: root.width,
      window: document.documentElement.clientWidth,
      source: source.width,
    };
  });
  expect(dimensions.root).toBeLessThanOrEqual(dimensions.window);
  expect(dimensions.source).toBeLessThanOrEqual(dimensions.root);
});

test('plain WYSIWYG typing and keyboard undo remain available', async ({ page }) => {
  const { visual, htmlMode, code } = getEditor(page);
  await visual.click();
  await visual.press('ControlOrMeta+End');
  await visual.press('End');
  await visual.pressSequentially(' Тест');
  await expect(visual).toContainText('Тест');
  await visual.press('ControlOrMeta+z');
  await expect(visual).not.toContainText('Тест');
  await htmlMode.click();
  await expect(code).not.toHaveValue(/ Тест/);
});

test('rich HTML paste uses allowlist without executing content', async ({ page }) => {
  const { visual, htmlMode, code } = getEditor(page);
  await visual.click();
  const result = await visual.evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', '<strong>Вставлено</strong><img src=x onerror="alert(1)"><script>alert(2)</script>');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    return element.innerHTML;
  });
  expect(result).toContain('<strong>Вставлено</strong>');
  expect(result).not.toMatch(/onerror|<script|<img/);
  await htmlMode.click();
  await expect(code).toHaveValue(/<strong>Вставлено<\/strong>/);
});


test('HTML source pasted as plain text becomes formatted WYSIWYG', async ({ page }) => {
  const { visual, htmlMode, code } = getEditor(page);
  const html = '<p><strong>Sport Magnesium</strong> — опис</p>\n<h3>Особливості</h3>\n<ul><li>Магній</li><li>Цинк</li></ul>';
  await visual.evaluate((element, plain) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', plain);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  }, html);
  await expect(visual.locator('strong')).toContainText('Sport Magnesium');
  await expect(visual.locator('h3')).toHaveText('Особливості');
  await expect(visual.locator('li')).toHaveCount(2);
  await expect(visual).not.toContainText('<p>');
  await htmlMode.click();
  await expect(code).toHaveValue(/<strong>Sport Magnesium<\/strong>/);
});

test('code wrapper rich clipboard renders HTML and unsafe markup is removed', async ({ page }) => {
  const { visual } = getEditor(page);
  await visual.evaluate(element => {
    const selection = document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', '<p><strong>Вставлено</strong><img src=x onerror="alert(1)"><script>alert(2)</script></p>');
    clipboardData.setData('text/html', '<pre><code>&lt;p&gt;&lt;strong&gt;Вставлено&lt;/strong&gt;&lt;img src=x onerror="alert(1)"&gt;&lt;script&gt;alert(2)&lt;/script&gt;&lt;/p&gt;</code></pre>');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(visual.locator('strong')).toContainText('Вставлено');
  await expect(visual.locator('img,script')).toHaveCount(0);
  await expect(visual).not.toContainText('alert(2)');
  await visual.press('ControlOrMeta+z');
  await expect(visual).not.toContainText('Вставлено');
});

test('plain text with incomplete HTML stays literal in visual mode', async ({ page }) => {
  const { visual } = getEditor(page);
  await visual.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'Ціна < 10; незакритий <strong> тег');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(visual).toContainText('незакритий <strong> тег');
});

test('icon switch and expandable formatting share one outer border', async ({ page }) => {
  const { root, visual, code, htmlMode } = getEditor(page);
  const trigger = root.locator('[data-pg-action="toggle-formatting"]');
  const toolbar = root.getByRole('toolbar', { name: 'Форматування тексту' });

  await expect(root.locator('.pg-rich-text-editor__mode-switch svg')).toHaveCount(2);
  await expect(trigger.locator('svg')).toHaveCount(1);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(root.locator('.pg-rich-text-editor__toolbar')).toBeHidden();
  await expect(root.locator('.pg-rich-text-editor__header')).toHaveCSS('border-bottom-width', '0px');
  await expect(root.locator('.pg-rich-text-editor__main')).toHaveCSS('border-top-width', '1px');
  await expect(root.locator('.pg-rich-text-editor__stats')).toBeVisible();

  const collapsedArrow = await trigger.boundingBox();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(toolbar).toBeVisible();
  const expandedArrow = await trigger.boundingBox();
  expect(expandedArrow.x).toBeCloseTo(collapsedArrow.x, 1);
  const order = await root.locator('.pg-rich-text-editor__header').evaluate(header =>
    [...header.children].map(child => child.className));
  expect(order).toEqual([
    'pg-rich-text-editor__mode-host',
    'pg-rich-text-editor__toolbar-toggle-host',
    'pg-rich-text-editor__tools-host',
  ]);
  await expect(toolbar.locator('button.pg-mini-button')).toHaveCount(12);
  await expect(toolbar.locator('button svg')).toHaveCount(12);
  await htmlMode.click();
  await expect(code).toBeVisible();
  await expect(trigger).toBeHidden();
  await expect(toolbar).toBeHidden();
  await expect(root.locator('[data-pg-action="bold"]')).toBeDisabled();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(visual).toBeHidden();
  await expect(root.locator('.pg-rich-text-editor__stats')).toBeVisible();
});

test('compact expanded toolbar fits the editor on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { root } = getEditor(page);
  await root.locator('[data-pg-action="toggle-formatting"]').click();
  await expect(root.getByRole('toolbar', { name: 'Форматування тексту' })).toBeVisible();
  const widths = await root.evaluate(node => {
    const editor = node.getBoundingClientRect();
    const header = node.querySelector('.pg-rich-text-editor__header').getBoundingClientRect();
    return { editor: editor.width, header: header.width, viewport: document.documentElement.clientWidth };
  });
  expect(widths.editor).toBeLessThanOrEqual(widths.viewport);
  expect(widths.header).toBeLessThanOrEqual(widths.editor);
  const layout = await root.evaluate(node => {
    const bounds = selector => node.querySelector(selector).getBoundingClientRect();
    const mode = bounds('.pg-rich-text-editor__mode-host');
    const tools = bounds('.pg-rich-text-editor__tools-host');
    const arrow = bounds('.pg-rich-text-editor__toolbar-toggle-host');
    return { modeRight: mode.right, arrowLeft: arrow.left, arrowRight: arrow.right,
      toolsLeft: tools.left, sameRow: Math.abs((tools.top + tools.bottom) / 2 - (arrow.top + arrow.bottom) / 2) < 2 };
  });
  expect(layout.modeRight).toBeLessThanOrEqual(layout.arrowLeft);
  expect(layout.arrowRight).toBeLessThanOrEqual(layout.toolsLeft);
  expect(layout.sameRow).toBe(true);
});

test('toolbar arrows navigate one enabled action group', async ({ page }) => {
  const { root } = getEditor(page);
  await root.locator('[data-pg-action="toggle-formatting"]').click();
  const bold = root.locator('[data-pg-action="bold"]');
  const italic = root.locator('[data-pg-action="italic"]');
  await bold.focus();
  await bold.press('ArrowRight');
  await expect(italic).toBeFocused();
  await italic.press('Home');
  await expect(bold).toBeFocused();
});

test('Material floating toolbar and filled slider retain one field outline without focus recolor', async ({ page }) => {
  const { root, visual, htmlMode } = getEditor(page);
  const main = root.locator('.pg-rich-text-editor__main');
  const trigger = root.locator('[data-pg-action="toggle-formatting"]');
  const mode = root.locator('.pg-rich-text-editor__mode-switch');
  const idleBorder = await main.evaluate(node => getComputedStyle(node).borderColor);

  await visual.focus();
  await expect(main).toHaveCSS('border-color', idleBorder);
  await expect(mode).toHaveAttribute('data-pg-variant', 'filled');
  await expect(trigger).toHaveAttribute('data-pg-disclosure', 'true');
  const animation = await trigger.locator('svg').evaluate(icon => getComputedStyle(icon).transitionDuration);
  expect(animation).not.toBe('0s');

  await trigger.click();
  const toolbar = root.getByRole('toolbar', { name: 'Форматування тексту' });
  await expect(toolbar).toBeVisible();
  await expect(toolbar).toHaveClass(/pg-toolbar/);
  await expect(toolbar).toHaveAttribute('data-pg-variant', 'floating');
  await expect(toolbar).toHaveAttribute('data-pg-density', 'compact');
  await expect(toolbar).toHaveCSS('border-radius', /.+/);
  await htmlMode.click();
  await expect(main).not.toHaveCSS('border-color', idleBorder);
  await expect(main).toHaveCSS('background-color', 'rgb(30, 32, 37)');
  await expect(root.locator('.pg-rich-text-editor__source')).toHaveCSS('font-family', /monospace/);
  await expect(trigger).toBeHidden();
});

test('disclosure animation respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { root } = getEditor(page);
  const trigger = root.locator('[data-pg-action="toggle-formatting"]');
  const duration = await trigger.locator('svg').evaluate(icon => getComputedStyle(icon).transitionDuration);
  expect(duration).toBe('0s');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('showing and hiding the floating toolbar never moves the input, stats or frame', async ({ page }) => {
  const { root, visual, htmlMode, code } = getEditor(page);
  const toggle = root.locator('[data-pg-action="toggle-formatting"]');
  const toolbar = root.getByRole('toolbar', { name: 'Форматування тексту' });

  const geometry = () => root.evaluate(editor => {
    const rect = selector => {
      const box = editor.querySelector(selector).getBoundingClientRect();
      return { top: box.top, height: box.height, left: box.left, width: box.width };
    };
    return {
      header: rect('.pg-rich-text-editor__header'),
      visual: rect('.pg-rich-text-editor__input'),
      stats: rect('.pg-rich-text-editor__stats'),
      main: rect('.pg-rich-text-editor__main'),
    };
  });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const closed = await geometry();
    await toggle.click();
    await expect(toolbar).toBeVisible();
    expect(await geometry()).toEqual(closed);
    await toggle.click();
    await expect(toolbar).toBeHidden();
    expect(await geometry()).toEqual(closed);

    await htmlMode.click();
    await expect(toggle).toBeHidden();
    await expect(toolbar).toBeHidden();
    const htmlClosed = await geometry();
    expect((await geometry()).main).toEqual(htmlClosed.main);
    await root.locator('.pg-rich-text-editor__mode-switch .pg-segment-switch__label').first().click();
    await expect(toggle).toBeVisible();
    await expect(visual).toBeVisible();
    await expect(code).toBeHidden();
  }
});


test('copying a visual selection writes HTML markup into plain and rich clipboard formats', async ({ page }) => {
  const { visual } = getEditor(page);
  const copied = await visual.evaluate(node => {
    const selection = node.ownerDocument.getSelection();
    const range = node.ownerDocument.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    const data = new DataTransfer();
    const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: data });
    node.dispatchEvent(event);
    return { plain: data.getData('text/plain'), html: data.getData('text/html'), prevented: event.defaultPrevented };
  });
  expect(copied.prevented).toBe(true);
  expect(copied.plain).toBe(copied.html);
  expect(copied.plain).toContain('<h2>Опис товару</h2>');
  expect(copied.plain).toContain('<strong>Жирний</strong>');
  expect(copied.plain).toContain('<em>Курсив</em>');
});

test('copying part of a formatted line preserves enclosing paragraph and inline tags', async ({ page }) => {
  const { visual } = getEditor(page);
  const copied = await visual.evaluate(node => {
    const text = node.querySelector('strong').firstChild;
    const range = node.ownerDocument.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 3);
    const selection = node.ownerDocument.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const data = new DataTransfer();
    node.dispatchEvent(new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: data }));
    return data.getData('text/plain');
  });
  expect(copied).toBe('<p><strong>Жир</strong></p>');
});

test('source mode keeps native copy and selections outside editor are ignored', async ({ page }) => {
  const { visual, code, htmlMode } = getEditor(page);
  const outside = await visual.evaluate(node => {
    const selection = document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node.closest('.pg-tools-rich-text-editor-demo').querySelector('h3'));
    selection.removeAllRanges();
    selection.addRange(range);
    const data = new DataTransfer();
    const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: data });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(outside).toBe(false);
  await htmlMode.click();
  const native = await code.evaluate(node => {
    node.select();
    const data = new DataTransfer();
    const event = new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData: data });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(native).toBe(false);
});

test('formatting header sticks inside the scrollable tab while editing a long document', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 600 });
  const { root } = getEditor(page);
  const positions = await root.evaluate(rootNode => {
    const input = rootNode.querySelector('.pg-rich-text-editor__input');
    const header = rootNode.querySelector('.pg-rich-text-editor__header');
    const panel = rootNode.closest('.pg-tabs__panel');
    input.insertAdjacentHTML('beforeend', '<p>Довгий текст для прокрутки.</p>'.repeat(90));
    const initial = header.getBoundingClientRect();
    const scroller = panel.getBoundingClientRect();
    panel.scrollTop = initial.top - scroller.top + panel.scrollTop + 45;
    const stuck = header.getBoundingClientRect();
    panel.scrollTop += 120;
    const stuckAgain = header.getBoundingClientRect();
    return {
      position: getComputedStyle(header).position,
      clipping: getComputedStyle(rootNode.querySelector('.pg-rich-text-editor__main')).overflowY,
      scrollTop: panel.scrollTop,
      scrollContainerTop: scroller.top,
      stuckTop: stuck.top,
      stuckAgainTop: stuckAgain.top,
      headerBottom: stuck.bottom,
      textTop: input.getBoundingClientRect().top,
    };
  });
  expect(positions.position).toBe('sticky');
  expect(positions.clipping).toBe('clip');
  expect(positions.scrollTop).toBeGreaterThan(0);
  expect(Math.abs(positions.stuckTop - positions.scrollContainerTop)).toBeLessThan(3);
  expect(Math.abs(positions.stuckAgainTop - positions.stuckTop)).toBeLessThan(2);
  expect(positions.headerBottom).toBeGreaterThan(positions.textTop);
});
