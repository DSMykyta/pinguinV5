// js/pages/entities/entities-categories-bindings.js

/**
 * Bindings modal for own and marketplace categories.
 */

import { runHook } from './entities-plugins.js';
import { getMpCategories } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    getMappedMpCategories,
    createCategoryMapping,
    deleteCategoryMapping,
    getMapCategories
} from '../../data/mappings-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { escapeHtml } from '../../utils/utils-text.js';

// МОДАЛ ПРИВ'ЯЗОК (BINDINGS MODAL)
// ═══════════════════════════════════════════════════════════════════════════

function extractMpName(obj) {
    if (!obj || typeof obj !== 'object') return '';
    if (obj.name_ua) return obj.name_ua;
    if (obj.nameUa) return obj.nameUa;
    if (obj.titleUk) return obj.titleUk;
    if (obj.titleRu) return obj.titleRu;
    if (obj.name) return obj.name;
    if (obj.name_ru) return obj.name_ru;
    if (obj.nameRu) return obj.nameRu;
    const nameKey = Object.keys(obj).find(k => {
        const lower = k.toLowerCase();
        return lower.includes('name') || lower.includes('title');
    });
    return nameKey ? obj[nameKey] : '';
}

function getMpCategoryLabel(mpCat) {
    if (!mpCat) return '';
    try {
        const data = typeof mpCat.data === 'string' ? JSON.parse(mpCat.data || '{}') : (mpCat.data || {});
        return extractMpName(data) || extractMpName(mpCat) || mpCat.external_id || mpCat.id;
    } catch {
        return extractMpName(mpCat) || mpCat.external_id || mpCat.id;
    }
}

export async function showBindingsModal(ownCatId, ownCatName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownCatName || ownCatId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            runHook('onDataChanged');
        };
    });

    renderBindingsRows(ownCatId, rowsContainer);
}

function renderBindingsRows(ownCatId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpCats = getMpCategories();
    const mappedCats = getMappedMpCategories(ownCatId);

    let html = '';

    mappedCats.forEach(mpCat => {
        const mp = marketplaces.find(m => m.id === mpCat.marketplace_id);
        const mpName = mp?.name || mpCat.marketplace_id;
        const catLabel = getMpCategoryLabel(mpCat);
        const mappingId = mpCat._mappingId || '';

        html += `
            <div class="binding-row" data-mapping-id="${escapeHtml(mappingId)}">
                <div class="binding-field">
                    <select disabled>
                        <option selected>${escapeHtml(mpName)}</option>
                    </select>
                </div>
                <div class="binding-field binding-field-grow">
                    <select disabled>
                        <option selected>${escapeHtml(catLabel)}</option>
                    </select>
                </div>
                <button class="btn-icon binding-delete" data-mapping-id="${escapeHtml(mappingId)}" aria-label="Видалити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
    });

    html += `
        <div class="binding-row binding-row-new">
            <div class="binding-field">
                <select class="binding-mp-select" data-custom-select>
                    <option value="">Маркетплейс</option>
                    ${marketplaces.map(mp => `<option value="${escapeHtml(mp.id)}">${escapeHtml(mp.name || mp.id)}</option>`).join('')}
                </select>
            </div>
            <div class="binding-field binding-field-grow">
                <select class="binding-cat-select" data-custom-select disabled>
                    <option value="">Категорiя МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const catSelect = container.querySelector('.binding-row-new .binding-cat-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                catSelect.innerHTML = '<option value="">Категорiя МП</option>';
                catSelect.disabled = true;
                reinitializeCustomSelect(catSelect);
                return;
            }

            const mpCats = allMpCats.filter(c => c.marketplace_id === mpId);
            catSelect.disabled = false;
            catSelect.innerHTML = '<option value="">Категорiя МП</option>';
            mpCats.forEach(c => {
                const label = getMpCategoryLabel(c);
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `#${c.external_id} — ${label}`;
                catSelect.appendChild(opt);
            });
            reinitializeCustomSelect(catSelect);
        };
    }

    if (catSelect) {
        catSelect.onchange = async () => {
            const mpCatId = catSelect.value;
            if (!mpCatId) return;

            catSelect.disabled = true;
            try {
                await createCategoryMapping(ownCatId, mpCatId);
                showToast('Прив\'язку створено', 'success');
                renderBindingsRows(ownCatId, container);
            } catch (err) {
                showToast('Помилка створення прив\'язки', 'error');
                catSelect.disabled = false;
            }
        };
    }

    container.querySelectorAll('.binding-delete').forEach(btn => {
        btn.onclick = async () => {
            const mappingId = btn.dataset.mappingId;
            if (!mappingId) return;

            btn.disabled = true;
            try {
                const mapping = getMapCategories().find(m => m.id === mappingId);
                const undoData = mapping ? { ownId: mapping.category_id, mpId: mapping.mp_category_id } : null;
                await deleteCategoryMapping(mappingId);
                renderBindingsRows(ownCatId, container);
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Вiдмiнити',
                        onClick: async () => {
                            await createCategoryMapping(undoData.ownId, undoData.mpId);
                            renderBindingsRows(ownCatId, container);
                        }
                    }
                } : 3000);
            } catch (err) {
                showToast('Помилка видалення', 'error');
                btn.disabled = false;
            }
        };
    });
}
