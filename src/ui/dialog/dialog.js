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

import { createIconButton } from '../button/button.js';

const EXIT_DURATION = 190;
let manager = null;

function validate(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Dialog options must be an object');
  }
  const values = {
    title: options.title,
    message: options.message,
    confirmText: options.confirmText ?? 'Зрозуміло',
    cancelText: options.cancelText ?? null,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === null && key === 'cancelText') continue;
    if (typeof value !== 'string' || !value.trim()) {
      throw new TypeError('Dialog ' + key + ' must be a non-empty string');
    }
  }
  return {
    ...values,
    destructive: Boolean(options.destructive),
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

  function close(item, result = 'cancel') {
    if (!item || item.closing || destroyed) return;
    item.closing = true;
    item.result = result;
    item.element.dataset.pgState = 'closing';
    const reduced = view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    item.timerId = view.setTimeout(() => finish(item), reduced ? 0 : EXIT_DURATION);
  }

  function showNext() {
    if (destroyed || active || !queue.length) return;
    active = queue.shift();
    const item = active;
    try {
      const d = doc.createElement('dialog');
      d.className = 'pg-dialog';
      d.dataset.pgState = 'entering';
      d.setAttribute('aria-labelledby', 'pg-dialog-title');
      d.setAttribute('aria-describedby', 'pg-dialog-message');
      item.element = d;

      const panel = doc.createElement('div');
      panel.className = 'pg-dialog__panel';
      const header = doc.createElement('header');
      header.className = 'pg-dialog__header';

      const title = doc.createElement('h2');
      title.id = 'pg-dialog-title';
      title.className = 'pg-dialog__title';
      title.textContent = item.options.title;

      const closeButton = createIconButton({
        label: 'Закрити діалог',
        icon: 'x',
        action: 'dialog-dismiss',
        onClick: () => close(item),
      });
      closeButton.classList.add('pg-dialog__close');
      header.append(title, closeButton);

      const message = doc.createElement('p');
      message.id = 'pg-dialog-message';
      message.className = 'pg-dialog__message';
      message.textContent = item.options.message;
      const footer = doc.createElement('footer');
      footer.className = 'pg-dialog__footer';

      let cancelButton = null;
      if (item.options.cancelText !== null) {
        cancelButton = doc.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'pg-dialog__button pg-dialog__button--secondary';
        cancelButton.dataset.pgAction = 'dialog-cancel';
        cancelButton.textContent = item.options.cancelText;
        cancelButton.addEventListener('click', () => close(item));
        footer.append(cancelButton);
      }

      const confirmButton = doc.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = item.options.destructive
        ? 'pg-dialog__button pg-dialog__button--destructive'
        : 'pg-dialog__button pg-dialog__button--primary';
      confirmButton.dataset.pgAction = 'dialog-confirm';
      confirmButton.textContent = item.options.confirmText;
      confirmButton.addEventListener('click', () => close(item, 'confirm'));
      footer.append(confirmButton);
      panel.append(header, message, footer);
      d.append(panel);

      d.addEventListener('cancel', event => {
        event.preventDefault();
        close(item);
      });
      d.addEventListener('click', event => {
        if (event.target === d && item.options.closeOnBackdrop) close(item);
      });

      doc.body.append(d);
      d.showModal();
      (cancelButton ?? confirmButton).focus({ preventScroll: true });
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
        resolve, reject, closing: false, result: 'cancel',
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
