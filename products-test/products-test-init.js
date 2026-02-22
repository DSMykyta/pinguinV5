// products-test/products-test-init.js

/**
 * ТЕСТОВА СТОРІНКА — Форма характеристик товару
 *
 * Завантажує дані з Google Sheets (categories, characteristics, options)
 * і рендерить динамічну форму по обраній категорії.
 */

import { initCustomAuth } from '../js/auth/custom-auth.js';
import { initModals } from '../js/common/ui-modal-init.js';
import { initTheme } from '../js/common/ui-theme.js';
import { callSheetsAPI } from '../js/utils/api-client.js';
import { renderCharacteristicsForm } from '../js/mapper/char-form-renderer.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const state = {
    categories: [],
    characteristics: [],
    options: [],
    currentFormAPI: null
};

const SHEETS = {
    CATEGORIES: 'Mapper_Categories',
    CHARACTERISTICS: 'Mapper_Characteristics',
    OPTIONS: 'Mapper_Options'
};

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initModals();
    initCustomAuth();

    // Чекаємо на авторизацію
    if (window.isAuthorized) {
        await loadAndRender();
    }

    document.addEventListener('auth-state-changed', async (event) => {
        if (event.detail.isAuthorized) {
            await loadAndRender();
        }
    });

    // Event listeners
    document.getElementById('test-category-select')?.addEventListener('change', onCategoryChange);
    document.getElementById('btn-get-values')?.addEventListener('click', onGetValues);
    document.getElementById('btn-close-output')?.addEventListener('click', () => {
        document.getElementById('test-output').style.display = 'none';
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════

async function loadAndRender() {
    try {
        await Promise.all([
            loadCategories(),
            loadCharacteristics(),
            loadOptions()
        ]);
        populateCategorySelect();
    } catch (error) {
        console.error('❌ Помилка завантаження:', error);
    }
}

async function loadCategories() {
    const result = await callSheetsAPI('get', {
        range: `${SHEETS.CATEGORIES}!A:G`,
        spreadsheetType: 'main'
    });

    if (!result || !Array.isArray(result) || result.length <= 1) {
        state.categories = [];
        return;
    }

    const headers = result[0];
    const rows = result.slice(1);

    state.categories = rows.map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
            obj[header] = row[i] || '';
        });
        if (!obj.id && obj.local_id) obj.id = obj.local_id;
        if (!obj.name_ua && obj.name_uk) obj.name_ua = obj.name_uk;
        return obj;
    });
}

async function loadCharacteristics() {
    const result = await callSheetsAPI('get', {
        range: `${SHEETS.CHARACTERISTICS}!A:N`,
        spreadsheetType: 'main'
    });

    if (!result || !Array.isArray(result) || result.length <= 1) {
        state.characteristics = [];
        return;
    }

    const headers = result[0];
    const rows = result.slice(1);

    state.characteristics = rows.map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
            obj[header] = row[i] || '';
        });
        if (!obj.id && obj.local_id) obj.id = obj.local_id;
        if (!obj.name_ua && obj.name_uk) obj.name_ua = obj.name_uk;
        if (!obj.type && obj.param_type) obj.type = obj.param_type;
        return obj;
    });
}

async function loadOptions() {
    const result = await callSheetsAPI('get', {
        range: `${SHEETS.OPTIONS}!A:H`,
        spreadsheetType: 'main'
    });

    if (!result || !Array.isArray(result) || result.length <= 1) {
        state.options = [];
        return;
    }

    const headers = result[0];
    const rows = result.slice(1);

    state.options = rows.map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
            obj[header] = row[i] || '';
        });
        if (!obj.id && obj.local_id) obj.id = obj.local_id;
        if (!obj.characteristic_id && obj.char_local_id) obj.characteristic_id = obj.char_local_id;
        return obj;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════════════════

function populateCategorySelect() {
    const select = document.getElementById('test-category-select');
    if (!select) return;

    // Зберігаємо перший option
    select.innerHTML = '<option value="">— Оберіть категорію —</option>';

    state.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name_ua || cat.id;
        select.appendChild(option);
    });
}

function onCategoryChange(e) {
    const categoryId = e.target.value;
    const container = document.getElementById('product-form-container');
    const emptyEl = document.getElementById('product-form-empty');
    const getValuesBtn = document.getElementById('btn-get-values');
    const output = document.getElementById('test-output');

    // Знищити попередню форму
    if (state.currentFormAPI) {
        state.currentFormAPI.destroy();
        state.currentFormAPI = null;
    }

    // Сховати output
    if (output) output.style.display = 'none';

    if (!categoryId) {
        container.innerHTML = '';
        container.appendChild(createEmptyState());
        if (getValuesBtn) getValuesBtn.disabled = true;
        updateStats(0, 0);
        return;
    }

    // Фільтруємо характеристики для обраної категорії
    const chars = getCharacteristicsForCategory(categoryId);

    if (chars.length === 0) {
        container.innerHTML = '';
        container.appendChild(createEmptyState('Для цієї категорії немає характеристик'));
        if (getValuesBtn) getValuesBtn.disabled = true;
        updateStats(0, 0);
        return;
    }

    // Рахуємо блоки
    const blocks = new Set(chars.map(c => c.block_number || '9'));

    // Рендеримо форму
    container.innerHTML = '';
    state.currentFormAPI = renderCharacteristicsForm(container, chars, state.options);

    if (getValuesBtn) getValuesBtn.disabled = false;
    updateStats(chars.length, blocks.size);
}

/**
 * Отримати характеристики для категорії
 * - Глобальні (is_global = TRUE) завжди включаються
 * - Категорійні — якщо category_ids містить ID обраної категорії
 */
function getCharacteristicsForCategory(categoryId) {
    return state.characteristics.filter(char => {
        const isGlobal = String(char.is_global).toUpperCase() === 'TRUE';
        if (isGlobal) return true;

        const catIds = (char.category_ids || '').split(',').map(id => id.trim());
        return catIds.includes(categoryId);
    });
}

function onGetValues() {
    if (!state.currentFormAPI) return;

    const values = state.currentFormAPI.getValues();
    const output = document.getElementById('test-output');
    const json = document.getElementById('test-output-json');

    if (output && json) {
        json.textContent = JSON.stringify(values, null, 2);
        output.style.display = 'block';
    }
}

function updateStats(charsCount, blocksCount) {
    const totalChars = document.getElementById('stat-total-chars');
    const totalBlocks = document.getElementById('stat-total-blocks');

    if (totalChars) totalChars.textContent = `${charsCount} характеристик`;
    if (totalBlocks) totalBlocks.textContent = `${blocksCount} блоків`;
}

function createEmptyState(message = 'Оберіть категорію щоб побачити форму') {
    const div = document.createElement('div');
    div.id = 'product-form-empty';
    div.style.cssText = 'text-align: center; padding: 48px; color: var(--color-on-surface-v);';
    div.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">category</span>
        <p style="margin-top: 12px;">${message}</p>
    `;
    return div;
}
