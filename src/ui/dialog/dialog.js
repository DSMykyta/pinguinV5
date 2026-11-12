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

import { createIconButton, setButtonColor, setButtonLoading } from '../button/button.js';
import { createWorkspaceLayout } from '../workspace-layout/workspace-layout.js';

const EXIT_DURATION = 140;
const WORKSPACE_EXIT_DURATION = 120;
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
  for (const name of ['validate', 'onConfirm', 'closeGuard', 'onRefresh', 'onDelete', 'isDirty']) {
    if (options[name] !== undefined && typeof options[name] !== 'function')
      throw new TypeError('Dialog ' + name + ' must be a function');
  }
  const size = options.size ?? 'standard';
  if (!['standard', 'editor', 'workspace'].includes(size)) throw new TypeError('Invalid dialog size');
  const sections = options.sections ?? [];
  if (size === 'workspace' && !Array.isArray(sections)) throw new TypeError('Workspace sections must be an array');
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
    onRefresh: options.onRefresh, onDelete: options.onDelete, isDirty: options.isDirty,
    sections, destructive,
    closeOnBackdrop: options.closeOnBackdrop ?? (size !== 'workspace'),
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
    item.workspace?.destroy();
    item.workspace = null;
    item.element?.remove();
    doc.dispatchEvent(new Event('pg:modal-change'));
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
    item.timerId = view.setTimeout(
      () => finish(item),
      reduced ? 0 : item.options.size === 'workspace' ? WORKSPACE_EXIT_DURATION : EXIT_DURATION,
    );
  }

  function setBusy(item, busy, source = item.busySource) {
    // The dialog owns orchestration, while the shared Button owns the visual
    // loading state. Keep the initiating action focused and block repeats.
    if (busy) {
      item.busySource = source ?? null;
      item.disabledBeforeBusy = new Map((item.actionButtons ?? []).map(button => [button, button.disabled]));
    }
    item.busy = busy;
    item.element?.setAttribute('aria-busy', String(busy));
    for (const button of item.actionButtons ?? []) {
      if (button === item.busySource) setButtonLoading(button, busy);
      else button.disabled = busy ? true : (item.disabledBeforeBusy?.get(button) ?? false);
    }
    if (!busy) {
      item.busySource = null;
      item.disabledBeforeBusy = null;
    }
  }

  function report(item, message, role = 'status') {
    if (!item.status || item.closing) return;
    item.status.textContent = message;
    item.status.hidden = !message;
    item.status.setAttribute('role', role);
  }

  function hideDecision(item) {
    if (!item.decision) return;
    item.decision.remove();
    item.decision = null;
    if (item.workspace) item.workspace.element.inert = false;
    item.decisionOrigin?.focus({ preventScroll: true });
    item.decisionOrigin = null;
  }

  function showDecision(item, { message, confirmText, onConfirm, danger = false, origin }) {
    if (item.busy || item.closing) return;
    hideDecision(item);
    const overlay = doc.createElement('div');
    overlay.className = 'pg-dialog__decision';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    const description = doc.createElement('p');
    description.className = 'pg-dialog__decision-message';
    description.id = 'pg-dialog-decision-message';
    description.textContent = message;
    overlay.setAttribute('aria-describedby', description.id);
    const actions = doc.createElement('div');
    actions.className = 'pg-dialog__decision-actions';
    const cancel = doc.createElement('button');
    cancel.type = 'button';
    cancel.className = 'pg-button pg-button--secondary';
    cancel.textContent = 'Скасувати';
    const approve = doc.createElement('button');
    approve.type = 'button';
    approve.className = danger
      ? 'pg-button pg-button--destructive' : 'pg-button pg-button--primary';
    approve.textContent = confirmText;
    cancel.addEventListener('click', () => hideDecision(item));
    approve.addEventListener('click', async () => {
      if (item.busy || item.closing) return;
      overlay.dataset.pgPending = 'true';
      approve.disabled = true;
      cancel.disabled = true;
      try {
        await onConfirm();
        if (item.decision === overlay && !item.closing) hideDecision(item);
      } catch (error) {
        console.error('Workspace decision failed:', error);
        if (!item.closing) {
          report(item, 'Не вдалося виконати дію.', 'alert');
          approve.disabled = false;
          cancel.disabled = false;
        }
      }
    });
    actions.append(cancel, approve);
    overlay.append(description, actions);
    item.decision = overlay;
    if (item.workspace) item.workspace.element.inert = true;
    item.decisionOrigin = origin ?? item.element?.querySelector('[data-pg-action="dialog-dismiss"]');
    item.element.querySelector('.pg-dialog__panel').append(overlay);
    cancel.focus({ preventScroll: true });
  }

  async function handleRefresh(item) {
    if (!item.options.onRefresh || item.busy || item.closing) return;
    const perform = async () => {
      setBusy(item, true, item.refreshButton);
      try {
        const ok = await item.options.onRefresh();
        if (!destroyed && active === item && ok !== true) {
          report(item, 'Не вдалося оновити дані.', 'alert');
        } else if (!destroyed && active === item) report(item, 'Дані оновлено.');
      } catch (error) {
        console.error('Workspace refresh failed:', error);
        if (!destroyed && active === item) report(item, 'Помилка оновлення.', 'alert');
      } finally {
        if (!destroyed && active === item && !item.closing) setBusy(item, false);
      }
    };
    if (item.options.isDirty?.()) {
      showDecision(item, {
        message: 'Є незбережені зміни. Відкинути їх і оновити запис?',
        confirmText: 'Оновити', origin: item.refreshButton,
        onConfirm: perform,
      });
    } else await perform();
  }

  function handleDelete(item) {
    if (!item.options.onDelete || item.busy || item.closing) return;
    showDecision(item, {
      message: 'Видалити цей запис? Дію не можна скасувати.',
      confirmText: 'Видалити', danger: true, origin: item.deleteButton,
      onConfirm: async () => {
        setBusy(item, true, item.deleteButton);
        try {
          if (await item.options.onDelete() === true && !destroyed && active === item) {
            hideDecision(item);
            setBusy(item, false);
            closeNow(item, 'delete');
          } else if (!destroyed && active === item) {
            report(item, 'Запис не видалено.', 'alert');
          }
        } finally {
          if (!destroyed && active === item && !item.closing) setBusy(item, false);
        }
      },
    });
  }

  async function requestDismiss(item, reason) {
    if (destroyed || active !== item || item.closing || item.busy) return;
    if (item.decision) { hideDecision(item); return; }
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
        if (item.options.size === 'workspace') {
          showDecision(item, {
            message: 'Є незбережені зміни. Відкинути їх і закрити редактор?',
            confirmText: 'Відкинути зміни', danger: true,
            origin: item.closeButton,
            onConfirm: async () => { hideDecision(item); closeNow(item); },
          });
        } else {
          report(item, 'Є незбережені зміни. Щоб вийти, виберіть «Відкинути зміни».');
          item.discardButton.hidden = false;
          item.discardButton.focus({ preventScroll: true });
        }
        return;
      }
    }
    closeNow(item);
  }

  // Both workspace save buttons share exactly one validation/persistence path.
  // Only the main checkmark closes the dialog after successful persistence.
  async function handleConfirm(item, closeOnSuccess = true) {
    if (destroyed || active !== item || item.closing || item.busy) return;
    setBusy(item, true, closeOnSuccess ? item.confirmButton : item.saveButton);
    report(item, '');
    try {
      if (item.options.validate && await item.options.validate() !== true) {
        report(item, 'Перевірте позначені поля.', 'alert');
        const invalid = item.element.querySelector('[aria-invalid="true"]');
        if (invalid && item.workspace) {
          const section = item.options.sections.find(entry => entry.element.contains(invalid));
          if (section) await item.workspace.activate(section.id, { focus: false });
        }
        if (!destroyed && active === item && !item.closing) {
          invalid?.focus({ preventScroll: true });
        }
        return;
      }
      if (destroyed || active !== item || item.closing) return;
      if (item.options.onConfirm && await item.options.onConfirm() !== true) {
        report(item, 'Зміни поки не збережено.', 'alert');
        return;
      }
      if (destroyed || active !== item) return;
      setBusy(item, false);
      if (closeOnSuccess) closeNow(item, 'confirm');
      else report(item, 'Зміни збережено.');
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
      d.className = 'pg-dialog' + (item.options.size === 'workspace'
        ? ' pg-dialog--workspace' : item.options.size === 'editor' ? ' pg-dialog--editor' : '');
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
      item.closeButton = closeButton;
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

      let cancelButton = null;
      if (item.options.size === 'workspace') {
        const workspace = createWorkspaceLayout({
          title, body, status, sections: item.options.sections,
        });
        const refreshButton = createIconButton({
          label: 'Оновити', icon: 'refresh', variant: 'mini',
          action: 'dialog-refresh', onClick: () => { void handleRefresh(item); },
        });
        refreshButton.disabled = !item.options.onRefresh;
        item.refreshButton = refreshButton;
        const deleteButton = createIconButton({
          label: 'Видалити', icon: 'delete', variant: 'corner',
          action: 'dialog-delete', tone: 'danger', appearance: 'ghost',
          onClick: () => handleDelete(item),
        });
        deleteButton.disabled = !item.options.onDelete;
        item.deleteButton = deleteButton;
        const saveButton = createIconButton({
          label: 'Зберегти', icon: 'save', variant: 'mini',
          action: 'dialog-save',
          onClick: () => { void handleConfirm(item, false); },
        });
        item.saveButton = saveButton;
        const saveCloseButton = createIconButton({
          label: 'Зберегти і закрити', icon: 'check', variant: 'corner',
          action: 'dialog-confirm',
          onClick: () => { void handleConfirm(item, true); },
        });
        item.confirmButton = saveCloseButton;
        closeButton.classList.add('pg-icon-button--corner');
        workspace.topRight.append(closeButton, refreshButton);
        workspace.bottomLeft.append(deleteButton);
        workspace.bottomRight.append(saveButton, saveCloseButton);
        item.actionButtons = [workspace.navToggle, closeButton, refreshButton,
          deleteButton, saveButton, saveCloseButton];
        panel.classList.add('pg-dialog__panel--workspace');
        panel.append(workspace.element);
        item.workspace = workspace;
        d.append(panel);
      } else {
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
        destructiveButton.className = 'pg-dialog__button pg-button pg-button--destructive';
        destructiveButton.textContent = item.options.leftAction.label;
        setButtonColor(destructiveButton, { tone: 'danger', appearance: 'solid' });
        destructiveButton.addEventListener('click', async () => {
          if (item.busy || item.closing) return;
          setBusy(item, true, destructiveButton);
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

      // A plain Dialog/Confirm must not carry an unused discard action.
      // The shared dirty-form guard opts into it only when applicable.
      if (item.options.closeGuard) {
        const discardButton = doc.createElement('button');
        discardButton.type = 'button';
        discardButton.className = 'pg-dialog__button pg-button pg-button--destructive';
        discardButton.textContent = 'Відкинути зміни';
        setButtonColor(discardButton, { tone: 'danger', appearance: 'solid' });
        discardButton.hidden = true;
        discardButton.addEventListener('click', () => closeNow(item, 'cancel'));
        item.discardButton = discardButton;
        actionButtons.push(discardButton);
        left.append(discardButton);
      }

      if (item.options.cancelText !== null) {
        cancelButton = doc.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'pg-dialog__button pg-button pg-button--secondary';
        cancelButton.dataset.pgAction = 'dialog-cancel';
        cancelButton.textContent = item.options.cancelText;
        cancelButton.addEventListener('click', () => { void requestDismiss(item, 'cancel-button'); });
        actionButtons.push(cancelButton);
        right.append(cancelButton);
      }
      const confirmButton = doc.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = item.options.destructive
        ? 'pg-dialog__button pg-button pg-button--destructive'
        : 'pg-dialog__button pg-button pg-button--primary';
      confirmButton.dataset.pgAction = 'dialog-confirm';
      confirmButton.textContent = item.options.confirmText;
      if (item.options.confirmTone != null) {
        setButtonColor(confirmButton, {
          tone: item.options.confirmTone, appearance: item.options.confirmAppearance,
        });
      }
      confirmButton.addEventListener('click', () => { void handleConfirm(item); });
      item.confirmButton = confirmButton;
      actionButtons.push(confirmButton);
      right.append(confirmButton);
      item.actionButtons = actionButtons;
      footer.append(left, right);
      panel.append(header, body, status, footer);
      d.append(panel);
      }

      d.addEventListener('keydown', event => {
        if (event.key === 'Escape' && item.decision) {
          event.preventDefault();
          event.stopPropagation();
          hideDecision(item);
        }
      }, true);
      d.addEventListener('cancel', event => {
        event.preventDefault();
        if (item.decision) { hideDecision(item); return; }
        void requestDismiss(item, 'escape');
      });
      d.addEventListener('click', event => {
        if (event.target === d && item.options.closeOnBackdrop) void requestDismiss(item, 'backdrop');
      });

      doc.body.append(d);
      d.showModal();
      doc.dispatchEvent(new Event('pg:modal-change'));
      (item.options.size === 'editor' || item.options.size === 'workspace'
        ? (item.options.content?.querySelector('[autofocus]') || title)
        : (cancelButton ?? item.confirmButton)).focus({ preventScroll: true });
      view.requestAnimationFrame(() => {
        if (!destroyed && active === item && !item.closing) {
          d.dataset.pgState = 'visible';
        }
      });
    } catch (error) {
      item.workspace?.destroy();
      item.workspace = null;
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
        timerId: null, element: null, busySource: null,
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
      active.workspace?.destroy();
      active.workspace = null;
      active.element?.remove();
      doc.dispatchEvent(new Event('pg:modal-change'));
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
