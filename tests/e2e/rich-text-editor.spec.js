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
    editorMode: root.getByRole('button', { name: 'Редактор', exact: true }),
    htmlMode: root.getByRole('button', { name: 'HTML', exact: true }),
  };
}

test('one working surface switches from WYSIWYG to editable HTML and back', async ({ page }) => {
  const { root, visual, code, editorMode, htmlMode } = getEditor(page);
  await expect(visual).toBeVisible();
  await expect(code).toBeHidden();
  await expect(root.locator('.pg-rich-text-editor__mirror')).toHaveCount(0);
  await expect(editorMode).toHaveAttribute('aria-pressed', 'true');
  await htmlMode.click();
  await expect(visual).toBeHidden();
  await expect(code).toBeVisible();
  await expect(code).toBeEditable();
  await expect(code).toBeFocused();
  await expect(code).toHaveValue(/<h2>Опис товару<\/h2>/);
  await expect(root.getByRole('button', { name: /Жирний/ })).toBeDisabled();
  await code.fill('<h1>Новий заголовок</h1><p>Опис <strong>оновлено</strong></p>');
  await editorMode.click();
  await expect(code).toBeHidden();
  await expect(visual).toBeVisible();
  await expect(visual.locator('h1')).toHaveText('Новий заголовок');
  await expect(visual.locator('strong')).toHaveText('оновлено');
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
    const noSwitch = second.element.querySelectorAll('.pg-rich-text-editor__mode').length === 0;
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
