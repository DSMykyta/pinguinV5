// js/price/price-import.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      PRICE - XLSX IMPORT                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Імпорт даних з XLSX файлу з підтримкою drag-drop.
 */

import { priceState } from './price-init.js';
import { importDataToSheet } from './price-data.js';

let importInitialized = false;

/**
 * Ініціалізувати імпорт XLSX
 */
export function initPriceImport() {
    if (importInitialized) return;
    importInitialized = true;

    initDropZone();
    initFileInput();
    initImportButtons();

    console.log('✅ Price import initialized');
}

/**
 * Ініціалізувати drag-drop зону
 */
function initDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const dropZoneInput = document.getElementById('drop-zone-input');

    if (!dropZone) return;

    // Клік по зоні відкриває file picker
    dropZone.addEventListener('click', () => {
        if (dropZoneInput) {
            dropZoneInput.click();
        }
    });

    // Drag events
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File input в drop zone
    if (dropZoneInput) {
        dropZoneInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
    }
}

/**
 * Ініціалізувати file input (кнопка імпорту в header)
 */
function initFileInput() {
    const importInput = document.getElementById('import-xlsx-input');
    if (!importInput) return;

    importInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

/**
 * Обробити файл
 */
async function handleFile(file) {
    // Перевіряємо тип файлу
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        alert('Підтримуються тільки файли Excel (.xlsx, .xls)');
        return;
    }

    console.log(`📁 Обробка файлу: ${file.name}`);

    try {
        // Читаємо файл
        const data = await readXlsxFile(file);

        if (data.length === 0) {
            alert('Файл порожній або не містить даних');
            return;
        }

        // Зберігаємо імпортовані дані
        priceState.importedData = data;

        // Показуємо превью
        showImportPreview(data);

    } catch (error) {
        console.error('❌ Помилка читання файлу:', error);
        alert('Помилка читання файлу: ' + error.message);
    }
}

/**
 * Читання XLSX файлу
 */
function readXlsxFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                // Перевіряємо чи завантажено XLSX бібліотеку
                if (typeof XLSX === 'undefined') {
                    throw new Error('XLSX library not loaded');
                }

                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Беремо перший аркуш
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Конвертуємо в JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Пропускаємо перші 6 рядків (дані починаються з рядка 7)
                const dataRows = jsonData.slice(6);

                if (dataRows.length === 0) {
                    resolve([]);
                    return;
                }

                // Перший рядок - заголовки
                const headers = dataRows[0];

                // Мапінг заголовків
                const headerMap = mapHeaders(headers);

                // Парсимо дані
                const parsedData = [];
                for (let i = 1; i < dataRows.length; i++) {
                    const row = dataRows[i];
                    if (!row || row.length === 0) continue;

                    const item = {};
                    Object.keys(headerMap).forEach(key => {
                        const index = headerMap[key];
                        item[key] = index !== -1 && row[index] !== undefined
                            ? String(row[index]).trim()
                            : '';
                    });

                    // Пропускаємо порожні рядки
                    if (item.code && item.code.trim() !== '') {
                        // Додаємо дефолтні значення
                        item.status = item.status || 'FALSE';
                        item.check = item.check || 'FALSE';
                        item.payment = item.payment || 'FALSE';
                        parsedData.push(item);
                    }
                }

                console.log(`✅ Розпарсено ${parsedData.length} рядків`);
                resolve(parsedData);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Мапінг заголовків з файлу на внутрішні поля
 */
function mapHeaders(headers) {
    const mapping = {
        code: -1,
        article: -1,
        brand: -1,
        category: -1,
        name: -1,
        packaging: -1,
        flavor: -1,
        shiping_date: -1,
        reserve: -1,
        status: -1,
        check: -1,
        payment: -1
    };

    // Шукаємо відповідні колонки
    headers.forEach((header, index) => {
        const h = String(header).toLowerCase().trim();

        if (h.includes('код') || h === 'code') mapping.code = index;
        else if (h.includes('артикул') || h === 'article' || h === 'sku') mapping.article = index;
        else if (h.includes('бренд') || h === 'brand') mapping.brand = index;
        else if (h.includes('категор') || h === 'category') mapping.category = index;
        else if (h.includes('назва') || h === 'name' || h.includes('найменування')) mapping.name = index;
        else if (h.includes('упаков') || h === 'packaging') mapping.packaging = index;
        else if (h.includes('смак') || h === 'flavor') mapping.flavor = index;
        else if (h.includes('відправ') || h.includes('shiping') || h.includes('shipping')) mapping.shiping_date = index;
        else if (h.includes('резерв') || h === 'reserve') mapping.reserve = index;
        else if (h.includes('виклад') || h === 'status') mapping.status = index;
        else if (h.includes('перевір') || h === 'check') mapping.check = index;
        else if (h.includes('оплат') || h === 'payment') mapping.payment = index;
    });

    console.log('📋 Mapping заголовків:', mapping);
    return mapping;
}

/**
 * Показати превью імпортованих даних
 */
function showImportPreview(data) {
    const previewContainer = document.getElementById('import-preview');
    const previewTable = document.getElementById('import-preview-table');
    const previewStats = document.getElementById('import-preview-stats');

    if (!previewContainer || !previewTable) return;

    // Оновлюємо статистику
    if (previewStats) {
        previewStats.textContent = `Знайдено ${data.length} рядків`;
    }

    // Генеруємо таблицю превью (перші 10 рядків)
    const previewData = data.slice(0, 10);

    const html = `
        <table class="pseudo-table">
            <thead>
                <tr>
                    <th>Код</th>
                    <th>Бренд</th>
                    <th>Назва</th>
                    <th>Категорія</th>
                    <th>Упаковка</th>
                    <th>Відправка</th>
                </tr>
            </thead>
            <tbody>
                ${previewData.map(item => `
                    <tr>
                        <td>${escapeHtml(item.code)}</td>
                        <td>${escapeHtml(item.brand)}</td>
                        <td>${escapeHtml(item.name)}</td>
                        <td>${escapeHtml(item.category)}</td>
                        <td>${escapeHtml(item.packaging)}</td>
                        <td>${escapeHtml(item.shiping_date)}</td>
                    </tr>
                `).join('')}
                ${data.length > 10 ? `
                    <tr>
                        <td colspan="6" class="text-muted text-center">
                            ... та ще ${data.length - 10} рядків
                        </td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
    `;

    previewTable.innerHTML = html;
    previewContainer.classList.remove('u-hidden');

    // Прокручуємо до превью
    previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Ініціалізувати кнопки підтвердження/скасування імпорту
 */
function initImportButtons() {
    const confirmBtn = document.getElementById('btn-confirm-import');
    const cancelBtn = document.getElementById('btn-cancel-import');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            if (priceState.importedData.length === 0) {
                alert('Немає даних для імпорту');
                return;
            }

            if (!confirm(`Імпортувати ${priceState.importedData.length} рядків? Існуючі дані будуть замінені.`)) {
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `
                <span class="material-symbols-outlined rotating">progress_activity</span>
                <span class="label">Завантаження...</span>
            `;

            try {
                await importDataToSheet(priceState.importedData);

                // Ховаємо превью
                hideImportPreview();

                // Оновлюємо таби резервів
                const { populateReserveTabs } = await import('./price-ui.js');
                populateReserveTabs();

                // Перерендерюємо таблицю
                const { renderPriceTable } = await import('./price-table.js');
                await renderPriceTable();

                alert(`Успішно імпортовано ${priceState.importedData.length} рядків`);

                // Очищаємо імпортовані дані
                priceState.importedData = [];

                // Переходимо до секції прайсу
                const priceSection = document.getElementById('tab-price');
                if (priceSection) {
                    priceSection.scrollIntoView({ behavior: 'smooth' });
                }

            } catch (error) {
                console.error('❌ Помилка імпорту:', error);
                alert('Помилка імпорту: ' + error.message);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `
                    <span class="material-symbols-outlined">check</span>
                    <span class="label">Завантажити в таблицю</span>
                `;
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            priceState.importedData = [];
            hideImportPreview();
        });
    }
}

/**
 * Сховати превью імпорту
 */
function hideImportPreview() {
    const previewContainer = document.getElementById('import-preview');
    const previewTable = document.getElementById('import-preview-table');

    if (previewContainer) {
        previewContainer.classList.add('u-hidden');
    }

    if (previewTable) {
        previewTable.innerHTML = '';
    }

    // Очищаємо file inputs
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(input => {
        input.value = '';
    });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
