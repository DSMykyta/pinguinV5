/**
 * PINGUIN NEXT — FORM DIALOG
 * Composition over shared Dialog; validation, persistence and dirty state
 * are callbacks owned by the feature, never inferred from markup.
 */
import { showDialog } from '../dialog/dialog.js';

export function showFormDialog({
  title, content, validate, save, isDirty = () => false, closeGuard,
  leftAction, confirmText = 'Зберегти', cancelText = 'Скасувати',
} = {}) {
  if (!(content instanceof HTMLElement)) throw new TypeError('Form dialog needs DOM content');
  for (const [name, callback] of Object.entries({ validate, save, isDirty })) {
    if (typeof callback !== 'function') throw new TypeError('Form dialog ' + name + ' must be a function');
  }
  if (closeGuard !== undefined && typeof closeGuard !== 'function') {
    throw new TypeError('Form dialog closeGuard must be a function');
  }
  return showDialog({
    title, content, size: 'editor', confirmText, cancelText, leftAction,
    validate, onConfirm: save,
    closeGuard: async context => {
      if (isDirty()) return false;
      return closeGuard ? (await closeGuard(context)) === true : true;
    },
  });
}
