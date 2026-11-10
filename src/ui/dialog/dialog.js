/**
 * ╔════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — DIALOG / CONFIRM                                                     ║
 * ╠════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Єдине доступне модальне вікно з Promise-результатом.                    ║
 * ║ ЗАЛЕЖНОСТІ: HTMLDialogElement, спільна кнопка UI.                                   ║
 * ║ ПУБЛІЧНИЙ API: mountDialogs(), showDialog(), showConfirmDialog().                   ║
 * ║ ПРИНЦИП: Native showModal/top layer, Confirm використовує Dialog.                  ║
 * ╚════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createIconButton, setButtonColor } from '../button/button.js';

const EXIT_DURATION = 190;
let manager = null;

function validate(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Dialog options must be an object');
  }
  if (typeof options.title !== 'string' || !options.title.trim()) {
    throw new TypeError('Dialog title must be a non-empty string');
  }
  const content = options.content ?? null;
  if (content !== null && !(content instanceof HTMLElement)) {
    throw new TypeError('Dialog content must be an HTMLElement');
  }
  const message = options.message ?? '';
  if (typeof message !== 'string' || (!message.trim() && content === null)) {
    throw new TypeError('Dialog needs text or DOM content');
  }
  const confirmText = options.confirmText ?? 'Зрозуміло';
  const cancelText = options.cancelText ?? null;
  if (typeof confirmText !== 'string' || !confirmText.trim() ||
      (cancelText !== null && (typeof cancelText !== 'string' || !cancelText.trim()))) {
    throw new TypeError('Dialog actions need labels');
  }
  for (const name of ['validate', 'onConfirm', 'closeGuard']) {
    if (options[name] !== undefined && typeof options[name] !== 'function')
      throw new TypeError('Dialog ' + name + ' must be a function');
  }
  const size = options.size ?? 'standard';
  if (!['standard', 'editor'].includes(size)) throw new TypeError('Invalid dialog size');
  const leftAction = options.leftAction ?? null;
  if (leftAction !== null &&
      (typeof leftAction.label !== 'string' || !leftAction.label.trim() ||
       typeof leftAction.onClick !== 'function')) {
    throw new TypeError('leftAction needs label and onClick');
  }
  const destructive = Boolean(options.destructive);
  const confirmTone = options.confirmTone ?? (destructive ? 'danger' : null);
  const confirmAppearance = options.confirmAppearance ?? 'solid';
  if (destructive && (confirmTone !== 'danger' || confirmAppearance !== 'solid')) {
    throw new TypeError('Destructive confirmation must use danger/solid');
  }
  if (!destructive && confirmTone == null && options.confirmAppearance != null) {
    throw new TypeError('Dialog confirmation appearance requires confirmTone');
  }
  return {
    title: options.title, message, content, confirmText, cancelText, size, leftAction,
    confirmTone, confirmAppearance,
    validate: options.validate, onConfirm: options.onConfirm, closeGuard: options.closeGuard,
    destructive,
    closeOnBackdrop: options.closeOnBackdrop !== false,
  };
}

export function mountDialogs() {
  if (manager) throw new Error('Dialog manager is already mounted');

  const doc = document;
  const view = doc.defaultView;
  const queue = [];
  let active = null;
  let destroyed = false;

  function finish(item) {
    if (item.timerId !== null) {
      view.clearTimeout(item.timerId);
      item.timerId = null;
    }
    if (item.element?.open) item.element.close();
    item.element?.remove();
    if (item.focusOrigin?.isConnected) item.focusOrigin.focus({ preventScroll: true });
    if (active === item) active = null;
    item.resolve(item.result);
    showNext();
  }

  function closeNow(item, result = 'cancel') {
    if (!item || item.closing || destroyed || active !== item) return;
    item.closing = true;
    item.result = result;
    item.element.dataset.pgState = 'closing';
    const reduced = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    item.timerId = view.setTimeout(() => finish(item), reduced ? 0 : EXIT_DURATION);
  }

  function setBusy(item, busy) {
    item.busy = busy;
    item.element?.setAttribute('aria-busy', String(busy));
    for (const button of item.actionButtons ?? []) button.disabled = busy;
  }

  function report(item, message, role = 'status') {
    if (!item.status || item.closing) return;
    item.status.textContent = message;
    item.status.hidden = !message;
    item.status.setAttribute('role', role);
  }

  async function requestDismiss(item, reason) {
    if (destroyed || active !== item || item.closing || item.busy) return;
    if (item.options.closeGuard) {
      setBusy(item, true);
      let allowed = false;
      try {
        allowed = (await item.options.closeGuard({ reason })) === true;
      } catch (error) {
        console.error('Dialog close guard failed:', error);
        report(item, 'Не вдалося перевірити можливість закриття.', 'alert');
        return;
      } finally {
        if (!destroyed && active === item && !item.closing) setBusy(item, false);
      }
      if (destroyed || active !== item || item.closing) return;
      if (!allowed) {
        report(item, 'Є незбережені зміни. Щоб вийти, виберіть «Відкинути зміни».');
        item.discardButton.hidden = false;
        item.discardButton.focus({ preventScroll: true });
        return;
      }
    }
    closeNow(item);
  }

  async function handleConfirm(item) {
    if (destroyed || active !== item || item.closing || item.busy) return;
    setBusy(item, true);
    report(item, '');
    try {
      if (item.options.validate && await item.options.validate() !== true) {
        report(item, 'Перевірте позначені поля.', 'alert');
        item.element.querySelector('[aria-invalid="true"]')?.focus({ preventScroll: true });
        return;
      }
      if (destroyed || active !== item || item.closing) return;
      if (item.options.onConfirm && await item.options.onConfirm() !== true) {
        report(item, 'Зміни поки не збережено.', 'alert');
        return;
      }
      if (destroyed || active !== item) return;
      setBusy(item, false);
      closeNow(item, 'confirm');
    } catch (error) {
      console.error('Dialog confirmation failed:', error);
      if (!destroyed && active === item) report(item, 'Помилка збереження. Спробуйте ще раз.', 'alert');
    } finally {
      if (!destroyed && active === item && !item.closing) setBusy(item, false);
    }
  }

  function showNext() {
    if (destroyed || active || !queue.length) return;
    active = queue.shift();
    const item = active;
    try {
      const d = doc.createElement('dialog');
      d.className = 'pg-dialog' + (item.options.size === 'editor' ? ' pg-dialog--editor' : '');
      d.dataset.pgState = 'entering';
      d.setAttribute('aria-labelledby', 'pg-dialog-title');
      if (item.options.message) d.setAttribute('aria-describedby', 'pg-dialog-message');
      item.element = d;

      const panel = doc.createElement('div');
      panel.className = 'pg-dialog__panel';
      const header = doc.createElement('header');
      header.className = 'pg-dialog__header';

      const title = doc.createElement('h2');
      title.id = 'pg-dialog-title';
      title.tabIndex = -1;
      title.className = 'pg-dialog__title';
      title.textContent = item.options.title;

      const closeButton = createIconButton({
        label: 'Закрити діалог',
        icon: 'x',
        action: 'dialog-dismiss',
        onClick: () => { void requestDismiss(item, 'close-button'); },
      });
      closeButton.classList.add('pg-dialog__close');
      header.append(title, closeButton);

      const body = doc.createElement('div');
      body.className = 'pg-dialog__body';
      if (item.options.message) {
        const message = doc.createElement('p');
        message.id = 'pg-dialog-message';
        message.className = 'pg-dialog__message';
        message.textContent = item.options.message;
        body.append(message);
      }
      if (item.options.content) body.append(item.options.content);
      const status = doc.createElement('p');
      status.className = 'pg-dialog__status';
      status.setAttribute('role', 'status');
      status.hidden = true;
      item.status = status;

      const footer = doc.createElement('footer');
      footer.className = 'pg-dialog__footer';
      const left = doc.createElement('div');
      left.className = 'pg-dialog__actions pg-dialog__actions--left';
      const right = doc.createElement('div');
      right.className = 'pg-dialog__actions pg-dialog__actions--right';
      const actionButtons = [closeButton];

      if (item.options.leftAction) {
        const destructiveButton = doc.createElement('button');
        destructiveButton.type = 'button';
        destructiveButton.className = 'pg-dialog__button pg-dialog__button--destructive pg-button pg-button--destructive';
        destructiveButton.textContent = item.options.leftAction.label;
        setButtonColor(destructiveButton, { tone: 'danger', appearance: 'solid' });
        destructiveButton.addEventListener('click', async () => {
          if (item.busy || item.closing) return;
          setBusy(item, true);
          try {
            const done = await item.options.leftAction.onClick();
            if (!destroyed && active === item && done === true) {
              setBusy(item, false);
              closeNow(item, 'left');
            }
          } catch (error) {
            console.error('Dialog left action failed:', error);
            report(item, 'Не вдалося виконати дію.', 'alert');
          } finally {
            if (!destroyed && active === item && !item.closing) setBusy(item, false);
          }
        });
        actionButtons.push(destructiveButton);
        left.append(destructiveButton);
      }

      const discardButton = doc.createElement('button');
      discardButton.type = 'button';
      discardButton.className = 'pg-dialog__button pg-dialog__button--destructive pg-button pg-button--destructive';
      discardButton.textContent = 'Відкинути зміни';
      setButtonColor(discardButton, { tone: 'danger', appearance: 'solid' });
      discardButton.hidden = true;
      discardButton.addEventListener('click', () => closeNow(item, 'cancel'));
      item.discardButton = discardButton;
      actionButtons.push(discardButton);
      left.append(discardButton);

      let cancelButton = null;
      if (item.options.cancelText !== null) {
        cancelButton = doc.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'pg-dialog__button pg-dialog__button--secondary pg-button pg-button--secondary';
        cancelButton.dataset.pgAction = 'dialog-cancel';
        cancelButton.textContent = item.options.cancelText;
        cancelButton.addEventListener('click', () => { void requestDismiss(item, 'cancel-button'); });
        actionButtons.push(cancelButton);
        right.append(cancelButton);
      }
      const confirmButton = doc.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = item.options.destructive
        ? 'pg-dialog__button pg-dialog__button--destructive pg-button pg-button--destructive'
        : 'pg-dialog__button pg-dialog__button--primary pg-button pg-button--primary';
      confirmButton.dataset.pgAction = 'dialog-confirm';
      confirmButton.textContent = item.options.confirmText;
      if (item.options.confirmTone != null) {
        setButtonColor(confirmButton, {
          tone: item.options.confirmTone, appearance: item.options.confirmAppearance,
        });
      }
      confirmButton.addEventListener('click', () => { void handleConfirm(item); });
      actionButtons.push(confirmButton);
      right.append(confirmButton);
      item.actionButtons = actionButtons;
      footer.append(left, right);
      panel.append(header, body, status, footer);
      d.append(panel);

      d.addEventListener('cancel', event => {
        event.preventDefault();
        void requestDismiss(item, 'escape');
      });
      d.addEventListener('click', event => {
        if (event.target === d && item.options.closeOnBackdrop) void requestDismiss(item, 'backdrop');
      });

      doc.body.append(d);
      d.showModal();
      (item.options.size === 'editor'
        ? (item.options.content?.querySelector('[autofocus]') || title)
        : (cancelButton ?? confirmButton)).focus({ preventScroll: true });
      view.requestAnimationFrame(() => {
        if (!destroyed && active === item && !item.closing) {
          d.dataset.pgState = 'visible';
        }
      });
    } catch (error) {
      item.element?.remove();
      active = null;
      item.reject(error);
      showNext();
    }
  }

  function enqueue(options) {
    if (destroyed) throw new Error('Dialog manager has been disposed');
    const clean = validate(options);
    return new Promise((resolve, reject) => {
      queue.push({
        options: clean, focusOrigin: doc.activeElement,
        resolve, reject, closing: false, busy: false, result: 'cancel',
        timerId: null, element: null,
      });
      showNext();
    });
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (active) {
      if (active.timerId !== null) view.clearTimeout(active.timerId);
      if (active.element?.open) active.element.close();
      active.element?.remove();
      active.resolve('cancel');
      active = null;
    }
    for (const item of queue) item.resolve('cancel');
    queue.length = 0;
  }

  const instance = { enqueue, destroy };
  manager = instance;
  return function disposeDialogs() {
    instance.destroy();
    if (manager === instance) manager = null;
  };
}

/** @returns {Promise<'confirm' | 'cancel'>} */
export function showDialog(options) {
  if (!manager) throw new Error('Mount Dialog UI before showing dialogs');
  return manager.enqueue(options);
}

/** Confirm is a specialization of the shared Dialog implementation. */
export async function showConfirmDialog(options) {
  return (await showDialog({
    ...options,
    confirmText: options?.confirmText ?? 'Підтвердити',
    cancelText: options?.cancelText ?? 'Скасувати',
  })) === 'confirm';
}
