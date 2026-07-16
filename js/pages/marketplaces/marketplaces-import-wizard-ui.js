// js/pages/marketplaces/marketplaces-import-wizard-ui.js

/**
 * Modal UI and navigation for import-as-own wizard.
 */

import { getMarketplaces } from '../../data/marketplaces-data.js';
import { showModal } from '../../components/modal/modal-main.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { wizardState, resetWizardState } from './marketplaces-import-wizard-state.js';
import { getMpStats, loadMpData } from './marketplaces-import-wizard-data.js';
import { renderTreeNodes, renderSelectionSummary, initTreeSelectHandlers } from './marketplaces-import-wizard-tree.js';
import { executeImport } from './marketplaces-import-wizard-execute.js';

export async function showImportAsOwnWizard() {
    // Скидаємо стан
    resetWizardState();

    // Показуємо модальне вікно
    await showModal('mapper-import-wizard', null, {
        title: 'Імпорт довідника як власний',
        size: 'large'
    });

    // Ініціалізуємо UI
    initWizardUI();
}

function initWizardUI() {
    const modal = document.getElementById('modal-mapper-import-wizard');
    if (!modal) return;

    // Рендеримо крок 1
    renderStep1();
}

/**
 * Крок 1: Вибір маркетплейсу
 */
function renderStep1() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    const marketplaces = getMarketplaces().filter(mp => {
        // Тільки активні маркетплейси з даними
        const isActive = mp.is_active === true || String(mp.is_active).toLowerCase() === 'true';
        return isActive;
    });

    container.innerHTML = `
        <div class="wizard-step wizard-step-1">
            <h3 class="wizard-step-title title-l">Крок 1: Оберіть маркетплейс</h3>
            <p class="wizard-step-desc body-m">Виберіть маркетплейс, довідник якого хочете імпортувати як власний</p>

            <div class="mp-select-grid">
                ${marketplaces.map(mp => `
                    <button class="mp-select-card" data-mp-id="${mp.id}" data-mp-name="${escapeHtml(mp.name || mp.slug)}" data-mp-slug="${mp.slug || ''}">
                        <span class="mp-name">${escapeHtml(mp.name || mp.slug)}</span>
                        <span class="mp-stats">${getMpStats(mp.id)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // Обробники
    container.querySelectorAll('.mp-select-card').forEach(card => {
        card.addEventListener('click', () => selectMarketplace(card));
    });

    updateWizardButtons();
}

function selectMarketplace(card) {
    // Знімаємо вибір з інших
    document.querySelectorAll('.mp-select-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    wizardState.selectedMp = {
        id: card.dataset.mpId,
        name: card.dataset.mpName,
        slug: card.dataset.mpSlug
    };

    updateWizardButtons();
}

/**
 * Крок 2: TreeSelect вибору категорій/характеристик
 */

function renderStep2() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    // Завантажуємо дані MP
    loadMpData();

    container.innerHTML = `
        <div class="wizard-step wizard-step-2">
            <h3 class="wizard-step-title title-l">Крок 2: Оберіть що імпортувати</h3>
            <p class="wizard-step-desc body-m">
                Розгорніть категорії щоб побачити характеристики.
                <strong>Опції імпортуються автоматично разом з характеристиками.</strong>
            </p>

            <div class="tree-toolbar">
                <button class="btn-text" id="tree-select-all">
                    <span class="material-symbols-outlined">check_box</span>
                    Вибрати все
                </button>
                <button class="btn-text" id="tree-deselect-all">
                    <span class="material-symbols-outlined">check_box_outline_blank</span>
                    Зняти все
                </button>
                <button class="btn-text" id="tree-expand-all">
                    <span class="material-symbols-outlined">unfold_more</span>
                    Розгорнути
                </button>
                <button class="btn-text" id="tree-collapse-all">
                    <span class="material-symbols-outlined">unfold_less</span>
                    Згорнути
                </button>
            </div>

            <div class="tree-container" id="tree-container">
                ${renderTreeNodes()}
            </div>

            <div class="tree-selection-summary" id="tree-selection-summary">
                ${renderSelectionSummary()}
            </div>
        </div>
    `;

    // Обробники
    initTreeSelectHandlers(updateWizardButtons);
    updateWizardButtons();
}

function renderStep3() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    const { stats } = wizardState;

    container.innerHTML = `
        <div class="wizard-step wizard-step-3">
            <h3 class="wizard-step-title title-l">Крок 3: Підтвердження</h3>
            <p class="wizard-step-desc body-m">Перевірте що буде імпортовано як власний довідник</p>

            <div class="preview-box">
                <div class="preview-source">
                    <span class="material-symbols-outlined">cloud_download</span>
                    <span>З маркетплейсу: <strong>${escapeHtml(wizardState.selectedMp?.name || '')}</strong></span>
                </div>

                <div class="preview-arrow">
                    <span class="material-symbols-outlined">arrow_downward</span>
                </div>

                <div class="preview-target">
                    <span class="material-symbols-outlined">folder</span>
                    <span>У власний довідник</span>
                </div>

                <div class="preview-stats">
                    <div class="preview-stat">
                        <span class="preview-stat-value">${stats.categories}</span>
                        <span class="preview-stat-label">Категорій</span>
                    </div>
                    <div class="preview-stat">
                        <span class="preview-stat-value">${stats.characteristics}</span>
                        <span class="preview-stat-label">Характеристик</span>
                    </div>
                    <div class="preview-stat">
                        <span class="preview-stat-value">${stats.options}</span>
                        <span class="preview-stat-label">Опцій</span>
                    </div>
                </div>
            </div>

            <div class="preview-warning">
                <span class="material-symbols-outlined">info</span>
                <span>Дублікати (за назвою) будуть пропущені автоматично</span>
            </div>
        </div>
    `;

    updateWizardButtons();
}

/**
 * Крок 4: Імпорт
 */

function updateWizardButtons() {
    const buttons = document.querySelector('.wizard-buttons');
    if (!buttons) return;

    const canNext = canGoNext();
    const canBack = wizardState.step > 1;
    const isLastStep = wizardState.step === 3;

    buttons.innerHTML = `
        ${canBack ? `
            <button class="btn-text" id="wizard-back">
                <span class="material-symbols-outlined">arrow_back</span>
                Назад
            </button>
        ` : '<div></div>'}

        ${isLastStep ? `
            <button class="btn-primary" id="wizard-import" ${canNext ? '' : 'disabled'}>
                <span class="material-symbols-outlined">download</span>
                Імпортувати
            </button>
        ` : `
            <button class="btn-primary" id="wizard-next" ${canNext ? '' : 'disabled'}>
                Далі
                <span class="material-symbols-outlined">arrow_forward</span>
            </button>
        `}
    `;

    document.getElementById('wizard-back')?.addEventListener('click', goBack);
    document.getElementById('wizard-next')?.addEventListener('click', goNext);
    document.getElementById('wizard-import')?.addEventListener('click', executeImport);
}

function canGoNext() {
    switch (wizardState.step) {
        case 1:
            return !!wizardState.selectedMp;
        case 2:
            return wizardState.selection.characteristics.size > 0;
        case 3:
            return true;
        default:
            return false;
    }
}

function goNext() {
    if (!canGoNext()) return;

    wizardState.step++;

    switch (wizardState.step) {
        case 2:
            renderStep2();
            break;
        case 3:
            renderStep3();
            break;
    }
}

function goBack() {
    if (wizardState.step <= 1) return;

    wizardState.step--;

    switch (wizardState.step) {
        case 1:
            renderStep1();
            break;
        case 2:
            renderStep2();
            break;
    }
}
