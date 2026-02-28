// js/pages/brands/brands-delete.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    BRANDS — DELETE                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Підтвердження + видалення бренду.
 * Якщо у бренду є лінійки — каскадний діалог (видалити/перенести).
 * Якщо лінійок нема — звичайне підтвердження.
 */

import { getBrandById, getBrands, deleteBrand } from './brands-data.js';
import { getBrandLinesByBrandId, deleteBrandLine, updateBrandLine } from './lines-data.js';
import { runHook } from './brands-plugins.js';
import { showCascadeConfirm, showDeleteConfirm, closeModal } from '../../components/modal/modal-main.js';
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

    const lines = getBrandLinesByBrandId(brandId);

    // Без дітей — просте підтвердження
    if (lines.length === 0) {
        const confirmed = await showDeleteConfirm({
            itemName: brand.name_uk,
        });
        if (confirmed) {
            await executeBrandDelete(brandId);
        }
        return;
    }

    // Є діти — каскадний діалог
    const otherBrands = getBrands()
        .filter(b => b.brand_id !== brandId)
        .map(b => ({ value: b.brand_id, text: b.name_uk }));

    const result = await showCascadeConfirm({
        title: `Видалити "${brand.name_uk}"?`,
        message: `Ви впевнені, що хочете видалити <span class="tag c-red">${brand.name_uk}</span>? Ця дія незворотна.`,
        children: {
            count: lines.length,
            countLabel: pluralLines(lines.length),
            checkboxLabel: `Видалити лінійки разом з брендом`,
            moveLabel: `Оберіть куди перенести лінійки "${brand.name_uk}"`,
            moveOptions: otherBrands,
            orphanLabel: 'Якщо не обрати — лінійки лишаться без бренду',
        },
        confirmText: 'Видалити',
        cancelText: 'Скасувати',
    });

    if (!result) return;

    if (result.deleteChildren) {
        // Видалити всі лінійки
        await executeBrandDelete(brandId, lines);
    } else if (result.moveTargetId) {
        // Перенести лінійки до іншого бренду
        await moveLinesToBrand(lines, result.moveTargetId);
        await executeBrandDelete(brandId);
    } else {
        // Зробити лінійки сиротами (brand_id = '')
        await orphanLines(lines);
        await executeBrandDelete(brandId);
    }
}

/**
 * Виконати видалення бренду (+ опціонально лінійок)
 */
async function executeBrandDelete(brandId, linesToDelete = []) {
    try {
        closeModal();

        // Видалити лінійки (якщо є)
        for (const line of linesToDelete) {
            await deleteBrandLine(line.line_id);
        }

        await deleteBrand(brandId);
        showToast('Бренд успішно видалено', 'success');
        runHook('onBrandDelete', brandId);
        runHook('onRender');
    } catch (error) {
        console.error('Помилка видалення бренду:', error);
        showToast('Помилка видалення бренду', 'error');
    }
}

/**
 * Перенести лінійки до іншого бренду
 */
async function moveLinesToBrand(lines, targetBrandId) {
    for (const line of lines) {
        await updateBrandLine(line.line_id, { brand_id: targetBrandId });
    }
}

/**
 * Зробити лінійки сиротами (очистити brand_id)
 */
async function orphanLines(lines) {
    for (const line of lines) {
        await updateBrandLine(line.line_id, { brand_id: '' });
    }
}

/**
 * Відмінювання "лінійка" українською
 */
function pluralLines(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'лінійка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'лінійки';
    return 'лінійок';
}
