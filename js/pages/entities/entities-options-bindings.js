// js/pages/entities/entities-options-bindings.js

/**
 * Bindings modal for own and marketplace options.
 */

import { runHook } from './entities-plugins.js';
import { getMpOptions } from '../../data/mp-data.js';
import { getMarketplaces } from '../../data/marketplaces-data.js';
import {
    getMappedMpOptions,
    createOptionMapping,
    deleteOptionMapping,
    getMapOptions
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
 * Отримати назву MP опції
 */
function getMpOptionLabel(mpOption) {
    if (!mpOption) return '';
    try {
        const data = typeof mpOption.data === 'string' ? JSON.parse(mpOption.data || '{}') : (mpOption.data || {});
        return extractMpName(data) || extractMpName(mpOption) || mpOption.external_id || mpOption.id;
    } catch {
        return extractMpName(mpOption) || mpOption.external_id || mpOption.id;
    }
}

/**
 * Показати модал прив'язок для власної опції
 * @param {string} ownOptionId - ID власної опції
 * @param {string} ownOptionName - Назва для заголовка
 */
export async function showBindingsModal(ownOptionId, ownOptionName) {
    const MODAL_ID = 'mapper-bindings';

    await showModal(MODAL_ID);

    const modalEl = document.getElementById(`modal-${MODAL_ID}`);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#bindings-modal-title');
    if (titleEl) titleEl.textContent = `Прив'язки: ${ownOptionName || ownOptionId}`;

    const rowsContainer = modalEl.querySelector('#bindings-modal-rows');
    if (!rowsContainer) return;

    modalEl.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.onclick = () => {
            closeModal(MODAL_ID);
            runHook('onDataChanged');
        };
    });

    renderBindingsRows(ownOptionId, rowsContainer);
}

/**
 * Рендерити рядки прив'язок опцій
 */
function renderBindingsRows(ownOptionId, container) {
    const marketplaces = getMarketplaces().filter(m =>
        m.is_active === true || String(m.is_active).toLowerCase() === 'true'
    );
    const allMpOpts = getMpOptions();
    const mappedOpts = getMappedMpOptions(ownOptionId);

    let html = '';

    // Існуючі прів'язки
    mappedOpts.forEach(mpOpt => {
        const mp = marketplaces.find(m => m.id === mpOpt.marketplace_id);
        const mpName = mp?.name || mpOpt.marketplace_id;
        const optLabel = getMpOptionLabel(mpOpt);
        const mappingId = mpOpt._mappingId || '';

        html += `
            <div class="binding-row" data-mapping-id="${escapeHtml(mappingId)}">
                <div class="binding-field">
                    <select disabled>
                        <option selected>${escapeHtml(mpName)}</option>
                    </select>
                </div>
                <div class="binding-field binding-field-grow">
                    <select disabled>
                        <option selected>${escapeHtml(optLabel)}</option>
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
                <select class="binding-opt-select" data-custom-select disabled>
                    <option value="">Опція МП</option>
                </select>
            </div>
            <div class="binding-placeholder"></div>
        </div>
    `;

    container.innerHTML = html;
    initCustomSelects(container);

    // Обробник вибору маркетплейсу
    const mpSelect = container.querySelector('.binding-row-new .binding-mp-select');
    const optSelect = container.querySelector('.binding-row-new .binding-opt-select');

    if (mpSelect) {
        mpSelect.onchange = () => {
            const mpId = mpSelect.value;
            if (!mpId) {
                optSelect.innerHTML = '<option value="">Опція МП</option>';
                optSelect.disabled = true;
                reinitializeCustomSelect(optSelect);
                return;
            }

            const mpOpts = allMpOpts.filter(o => o.marketplace_id === mpId);
            optSelect.disabled = false;
            optSelect.innerHTML = '<option value="">Опція МП</option>';
            mpOpts.forEach(o => {
                const label = getMpOptionLabel(o);
                const opt = document.createElement('option');
                opt.value = o.id;
                opt.textContent = `#${o.external_id} — ${label}`;
                optSelect.appendChild(opt);
            });
            reinitializeCustomSelect(optSelect);
        };
    }

    // Обробник вибору опції → авто-збереження
    if (optSelect) {
        optSelect.onchange = async () => {
            const mpOptionId = optSelect.value;
            if (!mpOptionId) return;

            optSelect.disabled = true;
            try {
                await createOptionMapping(ownOptionId, mpOptionId);
                showToast('Прив\'язку створено', 'success');
                renderBindingsRows(ownOptionId, container);
            } catch (err) {
                showToast('Помилка створення прив\'язки', 'error');
                optSelect.disabled = false;
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
                const mapping = getMapOptions().find(m => m.id === mappingId);
                const undoData = mapping ? { ownId: mapping.option_id, mpId: mapping.mp_option_id } : null;
                await deleteOptionMapping(mappingId);
                renderBindingsRows(ownOptionId, container);
                showToast('Прив\'язку знято', 'success', undoData ? {
                    duration: 6000,
                    action: {
                        label: 'Відмінити',
                        onClick: async () => {
                            await createOptionMapping(undoData.ownId, undoData.mpId);
                            renderBindingsRows(ownOptionId, container);
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
