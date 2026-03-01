// js/pages/brands/lines-delete.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    LINES — DELETE                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Підтвердження + видалення лінійки.
 */

import { getBrandLineById, deleteBrandLine } from './lines-data.js';
import { runHook } from './brands-plugins.js';
import { showConfirmModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Показати підтвердження видалення лінійки
 * @param {string} lineId - ID лінійки
 */
export async function showDeleteLineConfirm(lineId) {
    const line = getBrandLineById(lineId);
    if (!line) {
        showToast('Лінійку не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: `Видалити <span class="tag c-red">${line.name_uk}</span>?`,
        message: 'Ця дія незворотна.',
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
    });

    if (confirmed) {
        try {
            closeModal();
            await deleteBrandLine(lineId);
            showToast('Лінійку успішно видалено', 'success');
            runHook('onLineDelete', lineId);
            runHook('onRender');
        } catch (error) {
            console.error('Помилка видалення лінійки:', error);
            showToast('Помилка видалення лінійки', 'error');
        }
    }
}
