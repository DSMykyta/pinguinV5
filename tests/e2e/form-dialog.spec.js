/**
 * PINGUIN NEXT — guarded form dialog integration.
 * Test the existing native Dialog manager with a form adapter, no duplicate modal.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tools');
  await page.evaluate(async () => {
    const [{ showFormDialog }, { createInput }] = await Promise.all([
      import('/src/ui/form-dialog/form-dialog.js'),
      import('/src/ui/input/input.js'),
    ]);
    const content = document.createElement('div');
    content.className = 'pg-form-test-content';
    content.style.cssText = 'display:grid;gap:16px;min-height:900px';
    const title = createInput({ label: 'Назва запису' });
    content.append(title.element);
    const filler = document.createElement('p');
    filler.textContent = 'Тест прокручуваного вмісту редактора';
    content.append(filler);
    window.pgFormTest = { title, saves: 0, resolve: null };
    window.pgFormTest.promise = showFormDialog({
      title: 'Новий запис', content,
      validate() {
        const valid = Boolean(title.getValue().trim());
        title.setError(valid ? '' : 'Вкажіть назву');
        return valid;
      },
      async save() {
        window.pgFormTest.saves++;
        await new Promise(resolve => setTimeout(resolve, 60));
        return true;
      },
      isDirty() { return Boolean(title.getValue()); },
    }).then(result => { window.pgFormTest.resolve = result; });
  });
});

test('invalid form stays open and restores focus to bad field before save', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Новий запис' });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox', { name: 'Назва запису' });
  await dialog.getByRole('button', { name: 'Зберегти' }).click();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => window.pgFormTest.saves)).toBe(0);
  await input.fill('Товар');
  await dialog.getByRole('button', { name: 'Зберегти' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => [window.pgFormTest.saves,window.pgFormTest.resolve])).toEqual([1, 'confirm']);
});

test('Escape with dirty state requires explicit discard; header/footer stay fixed', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Новий запис' });
  const field = dialog.getByRole('textbox', { name: 'Назва запису' });
  await field.fill('Незбережений текст');
  const geometry = await dialog.evaluate(node => {
    const header = node.querySelector('.pg-dialog__header').getBoundingClientRect();
    const footer = node.querySelector('.pg-dialog__footer').getBoundingClientRect();
    const body = node.querySelector('.pg-dialog__body');
    const before = { header: header.y, footer: footer.y };
    body.scrollTop = body.scrollHeight;
    const after = {
      header: node.querySelector('.pg-dialog__header').getBoundingClientRect().y,
      footer: node.querySelector('.pg-dialog__footer').getBoundingClientRect().y,
    };
    return {before,after,scrollable:body.scrollHeight>body.clientHeight};
  });
  expect(geometry.scrollable).toBe(true);
  expect(geometry.after).toEqual(geometry.before);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Відкинути зміни' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Відкинути зміни' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => window.pgFormTest.resolve)).toBe('cancel');
});
