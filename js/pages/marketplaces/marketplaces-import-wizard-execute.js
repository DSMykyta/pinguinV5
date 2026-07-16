// js/pages/marketplaces/marketplaces-import-wizard-execute.js

/**
 * Import execution for import-as-own wizard.
 */

import { runHook } from './marketplaces-plugins.js';
import { getCategories, getCharacteristics, getOptions, addCategory, addCharacteristic, addOption } from '../../data/entities-data.js';
import { closeModal } from '../../components/modal/modal-main.js';
import { showToast } from '../../components/feedback/toast.js';
import { escapeHtml } from '../../utils/utils-text.js';
import { wizardState } from './marketplaces-import-wizard-state.js';

export async function executeImport() {
    const container = document.getElementById('wizard-content');
    if (!container) return;

    container.innerHTML = `
        <div class="wizard-step wizard-step-4">
            <h3 class="wizard-step-title title-l">Імпорт...</h3>
            <div class="import-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="import-progress-fill"></div>
                </div>
                <div class="progress-text" id="import-progress-text">Підготовка...</div>
            </div>
        </div>
    `;

    // Ховаємо кнопки під час імпорту
    const buttons = document.querySelector('.wizard-buttons');
    if (buttons) buttons.style.display = 'none';

    try {
        await performImport();

        container.innerHTML = `
            <div class="wizard-step wizard-step-complete">
                <div class="success-icon">
                    <span class="material-symbols-outlined">check_circle</span>
                </div>
                <h3 class="wizard-step-title title-l">Імпорт завершено!</h3>
                <p class="wizard-step-desc body-m">Дані успішно імпортовано у власний довідник</p>
            </div>
        `;

        // Показуємо кнопку закриття
        if (buttons) {
            buttons.style.display = 'flex';
            buttons.innerHTML = `
                <button class="btn-primary" id="wizard-close">Закрити</button>
            `;
            document.getElementById('wizard-close')?.addEventListener('click', () => {
                closeModal('mapper-import-wizard');
                runHook('onDataChanged');
            });
        }

        showToast('Імпорт завершено успішно', 'success');

    } catch (error) {
        console.error('Import error:', error);

        container.innerHTML = `
            <div class="wizard-step wizard-step-error">
                <div class="error-icon">
                    <span class="material-symbols-outlined">error</span>
                </div>
                <h3 class="wizard-step-title title-l">Помилка імпорту</h3>
                <p class="wizard-step-desc body-m">${escapeHtml(error.message || 'Невідома помилка')}</p>
            </div>
        `;

        if (buttons) {
            buttons.style.display = 'flex';
        }

        showToast('Помилка імпорту: ' + error.message, 'error');
    }
}

async function performImport() {
    const progress = document.getElementById('import-progress-fill');
    const progressText = document.getElementById('import-progress-text');

    const selectedCategories = Array.from(wizardState.selection.categories);
    const selectedCharacteristics = Array.from(wizardState.selection.characteristics);

    // Фільтруємо MP дані
    const categoriesToImport = wizardState.mpData.categories.filter(c => selectedCategories.includes(c.id));
    const charsToImport = wizardState.mpData.characteristics.filter(c => selectedCharacteristics.includes(c.id));
    const optionsToImport = wizardState.mpData.options.filter(o => {
        const char = charsToImport.find(c => c.mp_id === o.characteristic_id);
        return !!char;
    });

    const total = categoriesToImport.length + charsToImport.length + optionsToImport.length;
    let current = 0;

    // Існуючі власні дані (для перевірки дублікатів)
    const existingCategories = new Set(getCategories().map(c => (c.name_ua || c.name || '').toLowerCase()));
    const existingChars = new Set(getCharacteristics().map(c => (c.name || '').toLowerCase()));
    const existingOptions = new Set(getOptions().map(o => `${o.characteristic_id}:${(o.value || '').toLowerCase()}`));

    // Мапа для зв'язку MP ID -> наш ID
    const categoryIdMap = new Map();
    const charIdMap = new Map();

    // 1. Імпорт категорій
    progressText.textContent = 'Імпорт категорій...';
    for (const cat of categoriesToImport) {
        if (!existingCategories.has(cat.name.toLowerCase())) {
            const result = await addCategory({
                name_ua: cat.name,
                name_original: cat.name,
                source: 'Власний'
            });
            if (result?.id) {
                categoryIdMap.set(cat.mp_id, result.id);
            }
        }
        current++;
        if (progress) progress.style.width = `${(current / total) * 100}%`;
    }

    // 2. Імпорт характеристик
    progressText.textContent = 'Імпорт характеристик...';
    for (const char of charsToImport) {
        if (!existingChars.has(char.name.toLowerCase())) {
            // Визначаємо category_id для власної характеристики
            let ownCategoryId = '';
            if (char.category_ids.length > 0) {
                const mappedCatId = categoryIdMap.get(char.category_ids[0]);
                if (mappedCatId) ownCategoryId = mappedCatId;
            }

            const result = await addCharacteristic({
                name: char.name,
                type: char.type || 'text',
                category_id: ownCategoryId,
                source: 'Власний',
                is_global: char.is_global ? 'Так' : 'Ні'
            });
            if (result?.id) {
                charIdMap.set(char.mp_id, result.id);
            }
        }
        current++;
        if (progress) progress.style.width = `${(current / total) * 100}%`;
    }

    // 3. Імпорт опцій
    progressText.textContent = 'Імпорт опцій...';
    for (const opt of optionsToImport) {
        const ownCharId = charIdMap.get(opt.characteristic_id);
        if (ownCharId) {
            const optionKey = `${ownCharId}:${opt.name.toLowerCase()}`;
            if (!existingOptions.has(optionKey)) {
                await addOption({
                    value: opt.name,
                    characteristic_id: ownCharId,
                    source: 'Власний'
                });
            }
        }
        current++;
        if (progress) progress.style.width = `${(current / total) * 100}%`;
    }

    progressText.textContent = 'Завершено!';
    if (progress) progress.style.width = '100%';
}

// ═══════════════════════════════════════════════════════════════════════════
// НАВІГАЦІЯ WIZARD
// ═══════════════════════════════════════════════════════════════════════════
