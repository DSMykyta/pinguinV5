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
    initAsideImport();
    initImportButtons();

    console.log('✅ Price import initialized');
}

/**
 * Ініціалізувати імпорт з aside панелі
 */
function initAsideImport() {
    const importInput = document.getElementById('import-xlsx-aside');
    if (!importInput) return;

    importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        await handleFile(file);
        importInput.value = '';
    });
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
 * Структура XLSX прайсу:
 * - Рядок 6 = заголовки
 * - Рядок 7+ = дані
 * - Колонки A-M: Код, артикул, виробник, категорія, назва, фасування/розмір, смак/колір, ррц, ціна, ціна5000, кіл-сть, сума, дата відправки
 */
function readXlsxFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                if (typeof XLSX === 'undefined') {
                    throw new Error('XLSX library not loaded');
                }

                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Конвертуємо в JSON (raw array)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Рядок 6 = заголовки (індекс 5)
                // Рядок 7+ = дані (індекс 6+)
                const HEADER_ROW = 5;
                const DATA_START_ROW = 6;

                if (jsonData.length <= DATA_START_ROW) {
                    resolve([]);
                    return;
                }

                const headers = jsonData[HEADER_ROW];
                console.log('📋 Заголовки XLSX (рядок 6):', headers);

                // Фіксований мапінг колонок XLSX:
                // A(0)=Код, B(1)=артикул(skip), C(2)=виробник, D(3)=категорія,
                // E(4)=назва, F(5)=фасування, G(6)=смак, H(7)=ррц(skip),
                // I(8)=ціна(skip), J(9)=ціна5000(skip), K(10)=кіл-сть(skip),
                // L(11)=сума(skip), M(12)=дата відправки
                const COL = {
                    CODE: 0,        // A - Код
                    BRAND: 2,       // C - виробник
                    CATEGORY: 3,    // D - категорія
                    NAME: 4,        // E - назва
                    PACKAGING: 5,   // F - фасування/розмір
                    FLAVOR: 6,      // G - смак/колір
                    SHIP_DATE: 12   // M - дата відправки
                };

                const parsedData = [];
                for (let i = DATA_START_ROW; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const code = row[COL.CODE] ? String(row[COL.CODE]).trim() : '';
                    if (!code) continue; // Пропускаємо порожні рядки

                    const item = {
                        code: code,
                        article: '',  // Вводиться вручну
                        brand: row[COL.BRAND] ? String(row[COL.BRAND]).trim() : '',
                        category: row[COL.CATEGORY] ? String(row[COL.CATEGORY]).trim() : '',
                        name: row[COL.NAME] ? String(row[COL.NAME]).trim() : '',
                        packaging: row[COL.PACKAGING] ? String(row[COL.PACKAGING]).trim() : '',
                        flavor: row[COL.FLAVOR] ? String(row[COL.FLAVOR]).trim() : '',
                        shiping_date: row[COL.SHIP_DATE] ? String(row[COL.SHIP_DATE]).trim() : '',
                        reserve: '',      // Призначається користувачем
                        status: 'FALSE',
                        status_date: '',
                        check: 'FALSE',
                        check_date: '',
                        payment: 'FALSE',
                        payment_date: '',
                        update_date: ''
                    };

                    parsedData.push(item);
                }

                console.log(`✅ Розпарсено ${parsedData.length} рядків з XLSX`);
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
                const result = await importDataToSheet(priceState.importedData);

                // Ховаємо превью
                hideImportPreview();

                // Оновлюємо таби резервів
                const { populateReserveTabs } = await import('./price-ui.js');
                populateReserveTabs();

                // Перерендерюємо таблицю
                const { renderPriceTable } = await import('./price-table.js');
                await renderPriceTable();

                // Показуємо результат
                let message = `Імпорт завершено:\n`;
                message += `• Оновлено: ${result.updated}\n`;
                message += `• Додано нових: ${result.added}`;
                if (result.unavailable > 0) {
                    message += `\n• Позначено "ненаявно": ${result.unavailable}`;
                }
                alert(message);

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
