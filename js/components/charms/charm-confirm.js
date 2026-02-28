// js/components/charms/charm-confirm.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    CONFIRM CHARM                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Декларативне підтвердження дій через HTML атрибут [confirm].            ║
 * ║  Capture-phase делегація — перехоплює click ДО будь-якого обробника.    ║
 * ║                                                                          ║
 * ║  USAGE:                                                                  ║
 * ║  <button confirm>                          — "Ви впевнені?"             ║
 * ║  <button confirm="Текст повідомлення">     — кастомне повідомлення      ║
 * ║  <button confirm confirm-type="reset">     — стиль скидання (warning)   ║
 * ║  <button confirm confirm-type="delete">    — стиль видалення (danger)   ║
 * ║                                                                          ║
 * ║  Cancel → click блокується повністю, жоден обробник не спрацює.        ║
 * ║  OK     → click перезапускається і доходить до обробників.             ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { showConfirmModal, showResetConfirm, showDeleteConfirm } from '../modal/modal-confirm.js';

// ═══════════════════════════════════════════════════════════════════════════
// INIT — одноразова глобальна делегація (capture phase)
// ═══════════════════════════════════════════════════════════════════════════

export function initConfirmCharm() {
    document.addEventListener('click', handleConfirmClick, true);
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════

async function handleConfirmClick(e) {
    // Пропустити вже підтверджені re-dispatched clicks
    if (e._confirmApproved) return;

    const target = e.target.closest('[confirm]');
    if (!target) return;

    // Заблокувати оригінальний click
    e.stopImmediatePropagation();
    e.preventDefault();

    // Визначити тип підтвердження
    const type = target.getAttribute('confirm-type');
    const message = target.getAttribute('confirm') || undefined;

    let confirmed;

    switch (type) {
        case 'reset':
            confirmed = await showResetConfirm({ message });
            break;
        case 'delete':
            confirmed = await showDeleteConfirm({ message });
            break;
        default:
            confirmed = await showConfirmModal({
                message: message || 'Ви впевнені?',
                confirmText: 'Так',
                cancelText: 'Скасувати'
            });
    }

    if (!confirmed) return;

    // Re-dispatch з прапорцем — пройде через capture без блокування
    const approved = new MouseEvent('click', {
        bubbles: true,
        cancelable: true
    });
    approved._confirmApproved = true;
    target.dispatchEvent(approved);
}
