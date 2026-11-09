/** PINGUIN NEXT — RICH TEXT EDITOR browser verification in the Text workspace. */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('tab', { name: 'Текст' }).click();
});

test('edits formatted text and mirrors HTML without a second editable surface', async ({ page }) => {
  const editor = page.locator('#pg-tools-panel-text .pg-rich-text-editor');
  const input = editor.getByRole('textbox', { name: 'Редактор тексту' });
  await expect(input).toBeVisible();
  await expect(editor.locator('.pg-rich-text-editor__formatted')).toContainText('Опис товару');
  await input.evaluate(element => {
    const node = [...element.querySelectorAll('p')].flatMap(p => [...p.childNodes])
      .find(child => child.nodeType === Node.TEXT_NODE && child.nodeValue.includes('Виділіть'));
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 'Виділіть'.length);
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await editor.getByRole('button', { name: /Жирний/ }).click();
  await expect(input.locator('strong').filter({hasText:'Виділіть'}).first()).toContainText('Виділіть');
  await expect(editor.locator('.pg-rich-text-editor__formatted strong').filter({hasText:'Виділіть'}).first()).toContainText('Виділіть');
  await editor.getByRole('button', { name: 'Перемкнути вигляд і HTML-код' }).click();
  await expect(editor.locator('.pg-rich-text-editor__code')).toContainText('<strong>Виділіть</strong>');
  await editor.getByRole('button', { name: /Скасувати/ }).click();
  await expect(editor.locator('.pg-rich-text-editor__code')).not.toContainText('<strong>Виділіть</strong>');
  await editor.getByRole('button', { name: /Повторити/ }).click();
  await expect(editor.locator('.pg-rich-text-editor__code')).toContainText('<strong>Виділіть</strong>');
  await expect(editor.locator('[contenteditable="true"]')).toHaveCount(1);
});

test('native typing synchronizes mirror and keyboard undo', async ({ page }) => {
  const editor = page.locator('#pg-tools-panel-text .pg-rich-text-editor');
  const input = editor.getByRole('textbox', { name: 'Редактор тексту' });
  await input.click();
  await input.press('ControlOrMeta+End');
  await input.press('End');
  await input.type(' Тест');
  await expect(editor.locator('.pg-rich-text-editor__formatted')).toContainText('Тест');
  await input.press('ControlOrMeta+z');
  await expect(editor.locator('.pg-rich-text-editor__formatted')).not.toContainText('Тест');
});

test('sanitizes inserted HTML and keeps separate instances', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createRichTextEditor } = await import('/src/ui/rich-text-editor/rich-text-editor.js');
    const first = createRichTextEditor({ content: '<p>One</p>', toolbar: false });
    const second = createRichTextEditor({ content: '<p>Two</p>', mirror: false, stats: false, toolbar: false });
    document.body.append(first.element, second.element);
    first.setHTML('<p>Safe<img src=x onerror="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)">link</a></p>');
    const safe = first.getHTML();
    const independent = second.getText();
    first.destroy();
    const stillMounted = second.element.isConnected;
    second.destroy();
    return { safe, independent, stillMounted };
  });
  expect(result.safe).not.toMatch(/onerror|<script|javascript:|<img/);
  expect(result.safe).toContain('Safe');
  expect(result.independent).toContain('Two');
  expect(result.stillMounted).toBe(true);
});


test('pasted HTML is sanitized before insertion', async ({ page }) => {
  const editor = page.locator('#pg-tools-panel-text .pg-rich-text-editor');
  const input = editor.getByRole('textbox', { name: 'Редактор тексту' });
  await input.click();
  const result = await input.evaluate(element => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/html', '<strong>Вставлено</strong><img src=x onerror="alert(1)"><script>alert(2)</script>');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    return element.innerHTML;
  });
  expect(result).toContain('<strong>Вставлено</strong>');
  expect(result).not.toMatch(/onerror|<script|<img/);
  await expect(editor.locator('.pg-rich-text-editor__formatted')).toContainText('Вставлено');
});

test('editor and mirror stack at mobile width without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const editor = page.locator('#pg-tools-panel-text .pg-rich-text-editor');
  await expect(editor).toBeVisible();
  const geometry = await editor.evaluate(node => {
    const own = node.getBoundingClientRect();
    const parts = [...node.children].map(child => child.getBoundingClientRect());
    return { width: own.width, widthAvailable: document.documentElement.clientWidth, panelsStack: parts[1].top >= parts[0].bottom - 1 };
  });
  expect(geometry.panelsStack).toBe(true);
  expect(geometry.width).toBeLessThanOrEqual(geometry.widthAvailable);
});
