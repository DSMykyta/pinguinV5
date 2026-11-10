/**
 * ╔═════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — FORM DIALOG                                                                          ║
 * ╠═════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Composition over shared Dialog; validation, persistence and dirty state                ║
 * ║ ЗАЛЕЖНОСТІ: ../dialog/dialog.js                                                                     ║
 * ║ ПУБЛІЧНИЙ API: showFormDialog()                                                                     ║
 * ║ ПРИНЦИП: are callbacks owned by the feature, never inferred from markup.                            ║
 * ╚═════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { showDialog } from '../dialog/dialog.js';

export function showFormDialog({
  title, content, validate, save, isDirty = () => false, closeGuard,
  leftAction, confirmText = 'Зберегти', cancelText = 'Скасувати',
  confirmTone, confirmAppearance, layout = 'editor', sections = [], onRefresh, onDelete,
} = {}) {
  if (!(content instanceof HTMLElement)) throw new TypeError('Form dialog needs DOM content');
  if (!['editor', 'workspace'].includes(layout)) throw new TypeError('Unknown form dialog layout');
  for (const [name, callback] of Object.entries({ onRefresh, onDelete })) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new TypeError('Form dialog ' + name + ' must be a function');
    }
  }
  for (const [name, callback] of Object.entries({ validate, save, isDirty })) {
    if (typeof callback !== 'function') throw new TypeError('Form dialog ' + name + ' must be a function');
  }
  if (closeGuard !== undefined && typeof closeGuard !== 'function') {
    throw new TypeError('Form dialog closeGuard must be a function');
  }
  return showDialog({
    title, content, size: layout, sections, onRefresh, onDelete, isDirty,
    confirmText, cancelText, leftAction, confirmTone, confirmAppearance,
    validate, onConfirm: save,
    closeGuard: async context => {
      if (isDirty()) return false;
      return closeGuard ? (await closeGuard(context)) === true : true;
    },
  });
}
