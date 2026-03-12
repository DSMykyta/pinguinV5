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
import { showConfirmModal, showCascadeConfirm, closeModal } from '../../components/modal/modal-main.js';
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
        const confirmed = await showConfirmModal({
            action: 'видалити',
            entity: 'бренд',
            name: brand.name_uk,
        });
        if (confirmed) await executeBrandDelete(brandId);
        return;
    }

    // Є діти — каскадний діалог
    const otherBrands = getBrands()
        .filter(b => b.brand_id !== brand.brand_id)
        .map(b => ({ value: b.brand_id, text: b.name_uk }));

    const result = await showCascadeConfirm({
        action: 'видалити',
        entity: 'бренд',
        name: brand.name_uk,
        count: lines.length,
        countEntity: pluralLines(lines.length),
        children: {
            switchLabel: 'Видалити лінійки з брендом',
            moveLabel: 'Перенести лінійки до',
            moveOptions: otherBrands,
            orphanLabel: 'Якщо не обрати — лінійки лишаться без бренду',
        },
    });

    if (!result) return;

    if (result.deleteChildren) {
        await executeBrandDelete(brandId, lines);
    } else if (result.moveTargetId) {
        await moveLinesToBrand(lines, result.moveTargetId);
        await executeBrandDelete(brandId);
    } else {
        await orphanLines(lines);
        await executeBrandDelete(brandId);
    }
}


// ── Виконання ──

async function executeBrandDelete(brandId, linesToDelete = []) {
    try {
        closeModal();

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

async function moveLinesToBrand(lines, targetBrandId) {
    for (const line of lines) {
        await updateBrandLine(line.line_id, { brand_id: targetBrandId });
    }
}

async function orphanLines(lines) {
    for (const line of lines) {
        await updateBrandLine(line.line_id, { brand_id: '' });
    }
}

function pluralLines(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'лінійку';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'лінійки';
    return 'лінійок';
}
