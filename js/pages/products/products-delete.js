// js/pages/products/products-delete.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              PRODUCTS — DELETE                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Видалення товару з підтвердженням.
 * Якщо є варіанти — cascade confirm (видалити разом / окремо).
 */

import { deleteProduct, getProductById } from './products-data.js';
import { getVariantsByProductId, deleteProductVariant } from './variants-data.js';
import { showConfirmModal, showCascadeConfirm, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { runHook } from './products-plugins.js';

/**
 * Показати діалог підтвердження видалення товару
 * @param {string} productId - ID товару
 */
export async function showDeleteProductConfirm(productId) {
    const product = getProductById(productId);
    if (!product) {
        showToast('Товар не знайдено', 'error');
        return;
    }

    const variants = getVariantsByProductId(productId);

    // Без варіантів — просте підтвердження
    if (variants.length === 0) {
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'товар',
            name: product.generated_short_ua || product.name_ua || product.product_id,
        });
        if (confirmed) await executeProductDelete(productId);
        return;
    }

    // Є варіанти — каскадний діалог
    const result = await showCascadeConfirm({
        action: 'видалити',
        entity: 'товар',
        name: product.generated_short_ua || product.name_ua || product.product_id,
        count: variants.length,
        countEntity: pluralVariants(variants.length),
    });

    if (!result) return;

    // Каскадний — завжди видаляє варіанти разом з товаром
    await executeProductDelete(productId, variants);
}

// ── Виконання ──

async function executeProductDelete(productId, variantsToDelete = []) {
    try {
        closeModal(); // close confirm

        for (const variant of variantsToDelete) {
            await deleteProductVariant(variant.variant_id);
        }

        await deleteProduct(productId);

        closeModal(); // close product-edit
        showToast('Товар успішно видалено', 'success');
        runHook('onProductDelete', productId);
        runHook('onRender');
    } catch (error) {
        console.error('❌ Помилка видалення товару:', error);
        showToast('Помилка видалення товару', 'error');
    }
}

function pluralVariants(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'варіант';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'варіанти';
    return 'варіантів';
}
