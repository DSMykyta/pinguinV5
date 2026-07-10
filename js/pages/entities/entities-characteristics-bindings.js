// js/pages/entities/entities-characteristics-bindings.js

/**
 * Bindings modal for own and marketplace characteristics.
 */

import { runHook } from './entities-plugins.js';
import { getMpCharacteristics } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    getMappedMpCharacteristics,
    createCharacteristicMapping,
    deleteCharacteristicMapping,
    getMapCharacteristics
} from '../../data/mappings-data.js';
import { showModal, closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { initCustomSelects, reinitializeCustomSelect } from '../../components/forms/select.js';
import { escapeHtml } from '../../utils/utils-text.js';

// МОДАЛ ПРИВ'ЯЗОК (BINDINGS MODAL)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Витягнути назву з об'єкта MP
 */
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

/**
 * Отримати назву MP характеристики
 */
function getMpCharacteristicLabel(mpChar) {
    if (!mpChar) return '';
    try {
        const data = typeof mpChar.data === 'string' ? JSON.parse(mpChar.data || '{}') : (mpChar.data || {});
        return extractMpName(data) || extractMpName(mpChar) || mpChar.external_id || mpChar.id;
    } catch {
        return extractMpName(mpChar) || mpChar.external_id || mpChar.id;
    }
}

/**
 * Показати модал прив'язок для власної характеристики
 * @param {string} ownCharId - ID власної характеристики
 * @param {string} ownCharName - Назва для заголовка
 */
export async function showBindingsModal(ownCharId, ownCharName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownCharName || ownCharId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            runHook('onDataChanged');
        };
    });

    renderBindingsRows(ownCharId, rowsContainer);
}

/**
 * Рендерити рядки прив'язок характеристик
 */
function renderBindingsRows(ownCharId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpChars = getMpCharacteristics();
    const mappedChars = getMappedMpCharacteristics(ownCharId);

    let html = '';

    // Існуючі прив'язки
    mappedChars.forEach(mpChar => {
        const mp = marketplaces.find(m => m.id === mpChar.marketplace_id);
        const mpName = mp?.name || mpChar.marketplace_id;
        const charLabel = getMpCharacteristicLabel(mpChar);
        const mappingId = mpChar._mappingId || '';

        html += `
            <div class="binding-row" data-mapping-id="${escapeHtml(mappingId)}">
                <div class="binding-field">
                    <select disabled>
                        <option selected>${escapeHtml(mpName)}</option>
                    </select>
                </div>
                <div class="binding-field binding-field-grow">
                    <select disabled>
                        <option selected>${escapeHtml(charLabel)}</option>
                    </select>
                </div>
                <button class="btn-icon binding-delete" data-mapping-id="${escapeHtml(mappingId)}" aria-label="Видалити">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `;
    });

    // Порожній рядок для додавання
    html += `
        <div class="binding-row binding-row-new">
            <div class="binding-field">
                <select class="binding-mp-select" data-custom-select>
                    <option value="">Маркетплейс</option>
                    ${marketplaces.map(mp => `<option value="${escapeHtml(mp.id)}">${escapeHtml(mp.name || mp.id)}</option>`).join('')}
                </select>
            </div>
            <div class="binding-field binding-field-grow">
                <select class="binding-char-select" data-custom-select disabled>
                    <option value="">Характеристика МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    // Обробник вибору маркетплейсу
    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const charSelect = container.querySelector('.binding-row-new .binding-char-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                charSelect.innerHTML = '<option value="">Характеристика МП</option>';
                charSelect.disabled = true;
                reinitializeCustomSelect(charSelect);
                return;
            }

            const mpChars = allMpChars.filter(c => c.marketplace_id === mpId);
            charSelect.disabled = false;
            charSelect.innerHTML = '<option value="">Характеристика МП</option>';
            mpChars.forEach(c => {
                const label = getMpCharacteristicLabel(c);
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `#${c.external_id} — ${label}`;
                charSelect.appendChild(opt);
            });
            reinitializeCustomSelect(charSelect);
        };
    }

    // Обробник вибору характеристики → авто-збереження
    if (charSelect) {
        charSelect.onchange = async () => {
            const mpCharId = charSelect.value;
            if (!mpCharId) return;

            charSelect.disabled = true;
            try {
                await createCharacteristicMapping(ownCharId, mpCharId);
                showToast('Прив\'язку створено', 'success');
                renderBindingsRows(ownCharId, container);
            } catch (err) {
                showToast('Помилка створення прив\'язки', 'error');
                charSelect.disabled = false;
            }
        };
    }

    // Обробники видалення
    container.querySelectorAll('.binding-delete').forEach(btn => {
        btn.onclick = async () => {
            const mappingId = btn.dataset.mappingId;
            if (!mappingId) return;

            btn.disabled = true;
            try {
                const mapping = getMapCharacteristics().find(m => m.id === mappingId);
                const undoData = mapping ? { ownId: mapping.characteristic_id, mpId: mapping.mp_characteristic_id } : null;
                await deleteCharacteristicMapping(mappingId);
                renderBindingsRows(ownCharId, container);
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createCharacteristicMapping(undoData.ownId, undoData.mpId);
                            renderBindingsRows(ownCharId, container);
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
