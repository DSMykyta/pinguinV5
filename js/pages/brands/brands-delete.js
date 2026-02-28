// js/pages/brands/brands-delete.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS — DELETE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * 🔌 Підтвердження + видалення бренду.
 */

import { getBrandById, deleteBrand } from './brands-data.js';
import { runHook } from './brands-plugins.js';
import { showConfirmModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';

/**
 * Показати підтвердження видалення бренду
 * @param {string} brandId - ID бренду
 */
export async function showDeleteBrandConfirm(brandId) {
    const brand = getBrandById(brandId);
    if (!brand) {
        showToast('Бренд не знайдено', 'error');
        return;
    }

    const confirmed = await showConfirmModal({
        title: 'Видалити бренд?',
        message: `Ви впевнені, що хочете видалити бренд "${brand.name_uk}"?`,
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
    });

    if (confirmed) {
        try {
            await deleteBrand(brandId);
            showToast('Бренд успішно видалено', 'success');
            runHook('onBrandDelete', brandId);
            runHook('onRender');
        } catch (error) {
            console.error('❌ Помилка видалення бренду:', error);
            showToast('Помилка видалення бренду', 'error');
        }
    }
}
