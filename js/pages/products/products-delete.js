// js/pages/products/products-delete.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — DELETE                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Видалення товару з підтвердженням.
 * Якщо є варіанти — cascade confirm (видалити разом).
 */

import { deleteProduct, getProductById } from './products-data.js';
import { getVariantsByProductId, deleteProductVariant } from './variants-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { runHook } from './products-plugins.js';
import { renderAvatarState } from '../../components/avatar/avatar-ui-states.js';

/**
 * Показати діалог підтвердження видалення товару
 * @param {string} productId - ID товару
 */
export async function showDeleteProductConfirm(productId) {
    const product = getProductById(productId);
    if (!product) return;

    const variants = getVariantsByProductId(productId);

    await showModal('modal-confirm', null);

    const title = document.querySelector('[data-modal-id="modal-confirm"] .modal-title');
    const message = document.querySelector('[data-modal-id="modal-confirm"] .modal-message');
    const avatar = document.querySelector('[data-modal-id="modal-confirm"] .modal-avatar');
    const confirmBtn = document.querySelector('[data-confirm-action="confirm"]');
    const cancelBtn = document.querySelector('[data-confirm-action="cancel"]');

    if (title) title.textContent = 'Видалити товар?';

    if (variants.length > 0) {
        if (message) message.textContent = `Товар "${product.name_ua}" має ${variants.length} варіант(ів). Вони будуть видалені разом з товаром.`;
    } else {
        if (message) message.textContent = `Ви впевнені, що хочете видалити товар "${product.name_ua}"?`;
    }

    if (avatar) {
        avatar.innerHTML = renderAvatarState('warning', {
            size: 'medium',
            containerClass: '',
            avatarClass: '',
        });
    }

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            closeModal(); // close confirm

            try {
                // Видалити всі варіанти
                for (const variant of variants) {
                    await deleteProductVariant(variant.variant_id);
                }

                // Видалити товар
                await deleteProduct(productId);

                closeModal(); // close product-edit
                showToast(`Товар "${product.name_ua}" видалено`, 'success');
                runHook('onProductDelete', productId);
                runHook('onRender');
            } catch (error) {
                console.error('❌ Помилка видалення товару:', error);
                showToast('Помилка видалення товару', 'error');
            }
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => closeModal();
    }
}
