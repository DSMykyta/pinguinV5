// js/pages/brands/lines-delete.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    LINES — DELETE                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 Підтвердження + видалення лінійки.
 */

import { getBrandLineById, deleteBrandLine } from './lines-data.js';
import { runHook } from './brands-plugins.js';
import { showCascadeConfirm, closeModal } from '../../components/modal/modal-main.js';
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

    const confirmed = await showCascadeConfirm({
        title: `Видалити "${line.name_uk}"?`,
        message: 'Ця дія незворотна.',
        details: [
            'Лінійку буде відв\'язано від бренду',
        ],
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
            console.error('❌ Помилка видалення лінійки:', error);
            showToast('Помилка видалення лінійки', 'error');
        }
    }
}
