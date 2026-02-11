// js/mapper/mapper-import-etalon.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              MAPPER - ETALON IMPORT ADAPTER                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Імпорт даних з HTML таблиць адмін-панелі в еталонні таблиці.          ║
 * ║                                                                        ║
 * ║  Потік:                                                                ║
 * ║  1. Обрати "Еталон" як маркетплейс                                    ║
 * ║  2. Обрати тип сутності (категорії/характеристики/опції)               ║
 * ║  3. Обрати батька (категорію для хар-к, характеристику для опцій)       ║
 * ║  4. Вставити HTML з адмінки в textarea                                 ║
 * ║  5. Парсити → перевірити дублікати → імпортувати                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { registerImportAdapter } from './mapper-import.js';
import { mapperState } from './mapper-state.js';
import {
    getCategories, getCharacteristics, getOptions,
    addCategory, addCharacteristic, addOption,
    updateCharacteristic
} from './mapper-data.js';
import { showToast } from '../common/ui-toast.js';
import { initCustomSelects, reinitializeCustomSelect } from '../common/ui-select.js';

// ═══════════════════════════════════════════════════════════════════════════
// HTML PARSER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Парсити HTML таблицю з адмін-панелі
 * @param {string} html - HTML код таблиці
 * @returns {Array<{id: string, name_ua: string, name_ru: string}>} Масив розпарсених рядків
 */
function parseAdminHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const table = doc.querySelector('table');
    if (!table) {
        throw new Error('HTML не містить таблицю (<table>)');
    }

    const rows = table.querySelectorAll('tbody tr[data-id]');
    if (!rows.length) {
        throw new Error('Таблиця не містить рядків з data-id');
    }

    const results = [];

    rows.forEach(tr => {
        const externalId = tr.getAttribute('data-id');
        const cells = tr.querySelectorAll('td');

        // Шукаємо клітинку з назвою (містить /укр та /рус)
        let nameUa = '';
        let nameRu = '';
        let foundName = false;

        for (const cell of cells) {
            const divs = cell.querySelectorAll('div');
            if (divs.length >= 2) {
                const firstText = divs[0]?.textContent || '';
                const secondText = divs[1]?.textContent || '';

                if (firstText.includes('/укр') && secondText.includes('/рус')) {
                    nameUa = firstText.replace(/\s*\/укр\s*$/, '').trim();
                    nameRu = secondText.replace(/\s*\/рус\s*$/, '').trim();
                    foundName = true;
                    break;
                }
            }
        }

        // Якщо не знайшли укр/рус формат — беремо текст другої клітинки
        if (!foundName && cells.length >= 2) {
            nameUa = cells[1]?.textContent?.trim() || '';
        }

        if (externalId && nameUa) {
            results.push({
                external_id: externalId,
                name_ua: nameUa,
                name_ru: nameRu
            });
        }
    });

    return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// UI BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Побудувати UI вибору типу сутності
 */
function buildEntityTypeUI() {
    const wrapper = document.createElement('div');
    wrapper.id = 'etalon-extra-ui';
    wrapper.classList.add('form-group');

    wrapper.innerHTML = `
        <div class="form-group">
            <label for="etalon-entity-type">
                Тип сутності
                <span class="required">*</span>
            </label>
            <select id="etalon-entity-type" data-custom-select placeholder="Оберіть тип">
                <option value="">— Оберіть тип —</option>
                <option value="options">Опції</option>
                <option value="characteristics">Характеристики</option>
                <option value="categories">Категорії</option>
            </select>
        </div>
        <div id="etalon-parent-group" class="form-group u-hidden"></div>
        <div id="etalon-html-group" class="form-group u-hidden">
            <label for="etalon-html-input">
                HTML код таблиці
                <span class="required">*</span>
            </label>
            <textarea id="etalon-html-input" class="input-main" rows="8"
                placeholder="Вставте HTML код таблиці з адмін-панелі..."></textarea>
            <div id="etalon-parse-info" class="u-mt-8"></div>
        </div>
    `;

    return wrapper;
}

/**
 * Побудувати вибір батьківської характеристики (для опцій)
 */
function buildCharacteristicSelect() {
    const characteristics = getCharacteristics();
    const sorted = [...characteristics].sort((a, b) =>
        (a.name_ua || '').localeCompare(b.name_ua || '', 'uk')
    );

    let html = `
        <label for="etalon-parent-select">
            Характеристика
            <span class="required">*</span>
        </label>
        <select id="etalon-parent-select" data-custom-select placeholder="Оберіть характеристику">
            <option value="">— Оберіть характеристику —</option>
    `;

    sorted.forEach(ch => {
        html += `<option value="${ch.id}">${ch.name_ua || ch.id} (${ch.id})</option>`;
    });

    html += '</select>';
    return html;
}

/**
 * Побудувати мульти-вибір категорій (для характеристик)
 */
function buildCategoryMultiSelect() {
    const categories = getCategories();
    const sorted = [...categories].sort((a, b) =>
        (a.name_ua || '').localeCompare(b.name_ua || '', 'uk')
    );

    let html = `
        <label>Категорії (прив'язка)</label>
        <input type="text" class="u-mb-4" placeholder="Пошук категорій..." id="etalon-cat-search" />
        <div id="etalon-categories-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-m);padding:4px;">
    `;

    sorted.forEach(cat => {
        html += `<label style="display:flex;align-items:center;gap:6px;padding:2px 4px;cursor:pointer;" class="etalon-multi-item">
                <input type="checkbox" value="${cat.id}" />
                <span style="font-size:13px;">${cat.name_ua || cat.id}</span>
            </label>`;
    });

    html += '</div>';
    return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Імпорт опцій в еталонну таблицю
 */
async function importOptions(parsedRows, characteristicId, onProgress) {
    const existingOptions = getOptions().filter(o => o.characteristic_id === characteristicId);
    const existingByDir = new Set(existingOptions.map(o => String(o.id_directory || '')).filter(Boolean));
    const existingByName = new Map(existingOptions.map(o => [o.value_ua?.toLowerCase()?.trim(), o]));

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        onProgress(Math.round((i / parsedRows.length) * 80) + 10, `Опції: ${i + 1}/${parsedRows.length}`);

        // Перевірка дублікатів по id_directory
        if (existingByDir.has(String(row.external_id))) {
            skipped++;
            continue;
        }

        // Перевірка дублікатів по назві
        if (existingByName.has(row.name_ua?.toLowerCase()?.trim())) {
            skipped++;
            continue;
        }

        await addOption({
            characteristic_id: characteristicId,
            value_ua: row.name_ua,
            value_ru: row.name_ru,
            sort_order: String(i + 1)
        });

        // Оновлюємо id_directory останньої доданої опції
        const lastOpt = mapperState.options[mapperState.options.length - 1];
        if (lastOpt) {
            lastOpt.id_directory = row.external_id;
            await updateOptionIdDirectory(lastOpt, row.external_id);
        }

        added++;
    }

    return { added, skipped };
}

/**
 * Імпорт характеристик в еталонну таблицю
 */
async function importCharacteristics(parsedRows, categoryIds, onProgress) {
    const existingChars = getCharacteristics();
    const existingByDir = new Set(existingChars.map(c => String(c.id_directory || '')).filter(Boolean));
    const existingByName = new Map(existingChars.map(c => [c.name_ua?.toLowerCase()?.trim(), c]));

    let added = 0;
    let skipped = 0;
    let linked = 0;

    for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        onProgress(Math.round((i / parsedRows.length) * 80) + 10, `Характеристики: ${i + 1}/${parsedRows.length}`);

        const nameLower = row.name_ua?.toLowerCase()?.trim();

        // Перевірка дублікатів по id_directory
        if (existingByDir.has(String(row.external_id))) {
            // Знайти існуючу, додати категорії якщо потрібно
            const existing = existingChars.find(c => String(c.id_directory || '') === String(row.external_id));
            if (existing && categoryIds) {
                linked += await mergeCategoryIds(existing, categoryIds);
            }
            skipped++;
            continue;
        }

        // Перевірка дублікатів по назві
        if (existingByName.has(nameLower)) {
            const existing = existingByName.get(nameLower);
            if (existing && categoryIds) {
                linked += await mergeCategoryIds(existing, categoryIds);
            }
            skipped++;
            continue;
        }

        await addCharacteristic({
            name_ua: row.name_ua,
            name_ru: row.name_ru,
            category_ids: categoryIds || ''
        });

        // Оновити id_directory
        const lastChar = mapperState.characteristics[mapperState.characteristics.length - 1];
        if (lastChar) {
            lastChar.id_directory = row.external_id;
            await updateCharIdDirectory(lastChar, row.external_id);
        }

        added++;
    }

    return { added, skipped, linked };
}

/**
 * Імпорт категорій в еталонну таблицю
 */
async function importCategories(parsedRows, onProgress) {
    const existingCats = getCategories();
    const existingByName = new Map(existingCats.map(c => [c.name_ua?.toLowerCase()?.trim(), c]));

    let added = 0;
    let skipped = 0;

    for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        onProgress(Math.round((i / parsedRows.length) * 80) + 10, `Категорії: ${i + 1}/${parsedRows.length}`);

        if (existingByName.has(row.name_ua?.toLowerCase()?.trim())) {
            skipped++;
            continue;
        }

        await addCategory({
            name_ua: row.name_ua,
            name_ru: row.name_ru
        });

        added++;
    }

    return { added, skipped };
}

/**
 * Злити category_ids для існуючої характеристики
 */
async function mergeCategoryIds(characteristic, newCategoryIds) {
    const currentIds = String(characteristic.category_ids || '').split(',')
        .map(id => id.trim()).filter(Boolean);
    const newIds = String(newCategoryIds).split(',')
        .map(id => id.trim()).filter(Boolean);

    const merged = [...new Set([...currentIds, ...newIds])];
    if (merged.length === currentIds.length) return 0; // нічого нового

    await updateCharacteristic(characteristic.id, {
        category_ids: merged.join(',')
    });

    return 1;
}

/**
 * Оновити id_directory опції через Sheets API
 */
async function updateOptionIdDirectory(option, idDirectory) {
    const { callSheetsAPI } = await import('../utils/api-client.js');
    const range = `Mapper_Options!B${option._rowIndex}`;
    await callSheetsAPI('update', {
        range,
        values: [[idDirectory]],
        spreadsheetType: 'main'
    });
}

/**
 * Оновити id_directory характеристики через Sheets API
 */
async function updateCharIdDirectory(char, idDirectory) {
    const { callSheetsAPI } = await import('../utils/api-client.js');
    const range = `Mapper_Characteristics!B${char._rowIndex}`;
    await callSheetsAPI('update', {
        range,
        values: [[idDirectory]],
        spreadsheetType: 'main'
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTER
// ═══════════════════════════════════════════════════════════════════════════

const etalonAdapter = {

    match(marketplace) {
        const slug = String(marketplace.slug || marketplace.id || '').toLowerCase();
        const name = String(marketplace.name || '').toLowerCase();
        return slug === 'etalon' || name.includes('еталон');
    },

    getConfig() {
        return {
            dataType: 'etalon',
            hideDataTypeSelect: true,
            hideHeaderRowSelect: true,
            hideMappingUI: true
        };
    },

    onMarketplaceSelected(importState, modalBody) {
        // Ховаємо файл — замість нього textarea
        const fileGroup = document.getElementById('import-file-group');
        fileGroup?.classList.add('u-hidden');

        // Видаляємо попередній UI
        document.getElementById('etalon-extra-ui')?.remove();

        // Будуємо UI
        const ui = buildEntityTypeUI();
        fileGroup?.parentNode?.insertBefore(ui, fileGroup);

        // Ініціалізуємо custom select
        initCustomSelects(ui);

        // Обробник вибору типу сутності
        const entitySelect = document.getElementById('etalon-entity-type');
        entitySelect?.addEventListener('change', (e) => {
            handleEntityTypeChange(e.target.value, importState);
        });
    },

    /**
     * Повністю заміняє стандартний імпорт
     */
    async executeImport(importState, onProgress) {
        const entityType = document.getElementById('etalon-entity-type')?.value;
        const htmlInput = document.getElementById('etalon-html-input')?.value?.trim();

        if (!entityType) throw new Error('Оберіть тип сутності');
        if (!htmlInput) throw new Error('Вставте HTML код таблиці');

        onProgress(5, 'Парсинг HTML...');
        const parsedRows = parseAdminHtml(htmlInput);

        if (!parsedRows.length) {
            throw new Error('Не вдалося розпарсити жодного рядка з HTML');
        }

        onProgress(10, `Розпарсено ${parsedRows.length} рядків...`);

        let result;

        if (entityType === 'options') {
            const charId = document.getElementById('etalon-parent-select')?.value;
            if (!charId) throw new Error('Оберіть характеристику');
            result = await importOptions(parsedRows, charId, onProgress);
        } else if (entityType === 'characteristics') {
            const categoryIds = getSelectedCategoryIds();
            result = await importCharacteristics(parsedRows, categoryIds, onProgress);
        } else if (entityType === 'categories') {
            result = await importCategories(parsedRows, onProgress);
        }

        onProgress(95, 'Завершення...');

        let msg = `Додано: ${result.added}`;
        if (result.skipped) msg += `, пропущено (дублікати): ${result.skipped}`;
        if (result.linked) msg += `, оновлено зв'язки: ${result.linked}`;

        showToast(msg, 'success');
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function handleEntityTypeChange(entityType, importState) {
    const parentGroup = document.getElementById('etalon-parent-group');
    const htmlGroup = document.getElementById('etalon-html-group');
    const importBtn = document.getElementById('execute-mapper-import');

    parentGroup.innerHTML = '';
    parentGroup.classList.add('u-hidden');
    htmlGroup.classList.add('u-hidden');

    if (!entityType) {
        if (importBtn) importBtn.disabled = true;
        return;
    }

    if (entityType === 'options') {
        parentGroup.innerHTML = buildCharacteristicSelect();
        parentGroup.classList.remove('u-hidden');
        initCustomSelects(parentGroup);

        const parentSelect = document.getElementById('etalon-parent-select');
        parentSelect?.addEventListener('change', () => {
            if (parentSelect.value) {
                htmlGroup.classList.remove('u-hidden');
                attachHtmlListener();
            } else {
                htmlGroup.classList.add('u-hidden');
            }
            validateEtalon();
        });
    } else if (entityType === 'characteristics') {
        parentGroup.innerHTML = buildCategoryMultiSelect();
        parentGroup.classList.remove('u-hidden');
        htmlGroup.classList.remove('u-hidden');
        attachHtmlListener();
        attachCategorySearch();
    } else if (entityType === 'categories') {
        htmlGroup.classList.remove('u-hidden');
        attachHtmlListener();
    }

    validateEtalon();
}

function attachHtmlListener() {
    const textarea = document.getElementById('etalon-html-input');
    const parseInfo = document.getElementById('etalon-parse-info');

    if (!textarea) return;

    // Уникаємо подвійних listener-ів
    if (textarea._etalonListenerAttached) return;
    textarea._etalonListenerAttached = true;

    textarea.addEventListener('input', () => {
        const html = textarea.value.trim();
        if (!html) {
            parseInfo.textContent = '';
            validateEtalon();
            return;
        }

        try {
            const rows = parseAdminHtml(html);
            parseInfo.innerHTML = `<span style="color: var(--color-success)">Розпарсено: ${rows.length} записів</span>`;
            if (rows.length > 0) {
                const preview = rows.slice(0, 3).map(r => r.name_ua).join(', ');
                parseInfo.innerHTML += `<br><small>${preview}${rows.length > 3 ? '...' : ''}</small>`;
            }
        } catch (err) {
            parseInfo.innerHTML = `<span style="color: var(--color-error)">${err.message}</span>`;
        }

        validateEtalon();
    });
}

function attachCategorySearch() {
    const searchInput = document.getElementById('etalon-cat-search');
    const list = document.getElementById('etalon-categories-list');
    if (!searchInput || !list) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        list.querySelectorAll('.etalon-multi-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

function getSelectedCategoryIds() {
    const list = document.getElementById('etalon-categories-list');
    if (!list) return '';

    const checked = list.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checked).map(cb => cb.value).join(',');
}

function validateEtalon() {
    const importBtn = document.getElementById('execute-mapper-import');
    if (!importBtn) return;

    const entityType = document.getElementById('etalon-entity-type')?.value;
    const html = document.getElementById('etalon-html-input')?.value?.trim();

    let valid = !!entityType && !!html;

    if (entityType === 'options') {
        valid = valid && !!document.getElementById('etalon-parent-select')?.value;
    }

    // Перевіряємо чи HTML парситься
    if (valid && html) {
        try {
            const rows = parseAdminHtml(html);
            valid = rows.length > 0;
        } catch {
            valid = false;
        }
    }

    importBtn.disabled = !valid;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

registerImportAdapter(etalonAdapter);
