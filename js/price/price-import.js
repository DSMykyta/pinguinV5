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
import { showConfirmModal } from '../common/ui-modal-confirm.js';
import { showToast } from '../common/ui-toast.js';

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
        showToast('Підтримуються тільки файли Excel (.xlsx, .xls)', 'error');
        return;
    }

    console.log(`📁 Обробка файлу: ${file.name}`);

    try {
        // Читаємо файл
        const data = await readXlsxFile(file);

        if (data.length === 0) {
            showToast('Файл порожній або не містить даних', 'error');
            return;
        }

        // Підтвердження імпорту
        const confirmed = await showConfirmModal({
            title: 'Імпорт прайсу',
            message: `Імпортувати ${data.length} рядків з файлу "${file.name}"?`,
            confirmText: 'Імпортувати',
            cancelText: 'Скасувати',
            confirmClass: 'btn-primary'
        });

        if (!confirmed) {
            return;
        }

        // Імпортуємо дані напряму в Google Sheets
        const result = await importDataToSheet(data);

        // Оновлюємо таби резервів
        const { populateReserveTabs } = await import('./price-ui.js');
        populateReserveTabs();

        // Повний перерендер бо нові дані з файлу
        const { renderPriceTable } = await import('./price-table.js');
        await renderPriceTable();

        // Реініціалізуємо фільтри з новими даними
        const { initPriceColumnFilters } = await import('./price-events.js');
        const { priceState } = await import('./price-init.js');
        if (priceState.columnFiltersAPI) {
            priceState.columnFiltersAPI.destroy();
        }
        initPriceColumnFilters();

        // Показуємо результат
        let message = `Оновлено: ${result.updated}, Додано: ${result.added}`;
        if (result.unavailable > 0) {
            message += `, Ненаявно: ${result.unavailable}`;
        }
        showToast(message, 'success', 5000);

    } catch (error) {
        console.error('❌ Помилка імпорту:', error);
        showToast('Помилка імпорту: ' + error.message, 'error', 5000);
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
                // A(0)=Код, B(1)=артикул, C(2)=виробник, D(3)=категорія,
                // E(4)=назва, F(5)=фасування, G(6)=смак, H(7)=ррц(skip),
                // I(8)=ціна(skip), J(9)=ціна5000(skip), K(10)=кіл-сть(skip),
                // L(11)=сума(skip), M(12)=дата відправки
                const COL = {
                    CODE: 0,        // A - Код
                    ARTICLE: 1,     // B - артикул
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

                    // Код має бути 11 цифр з ведучими нулями
                    let code = '';
                    if (row[COL.CODE]) {
                        code = String(row[COL.CODE]).trim();
                        // Якщо це число - додаємо ведучі нулі до 11 символів
                        if (/^\d+$/.test(code)) {
                            code = code.padStart(11, '0');
                        }
                    }
                    if (!code) continue; // Пропускаємо порожні рядки

                    // Артикул теж може мати ведучі нулі
                    let article = '';
                    if (row[COL.ARTICLE]) {
                        article = String(row[COL.ARTICLE]).trim();
                        // Якщо це число - додаємо ведучі нулі до 11 символів
                        if (/^\d+$/.test(article)) {
                            article = article.padStart(11, '0');
                        }
                    }

                    // Конвертуємо дату Excel (serial number) в текст
                    const rawShipDate = row[COL.SHIP_DATE];
                    let shipDate = '';
                    if (rawShipDate) {
                        if (typeof rawShipDate === 'number') {
                            // Excel serial number → Date
                            const excelDate = new Date((rawShipDate - 25569) * 86400 * 1000);
                            const day = String(excelDate.getDate()).padStart(2, '0');
                            const month = String(excelDate.getMonth() + 1).padStart(2, '0');
                            const year = String(excelDate.getFullYear()).slice(-2);
                            shipDate = `${day}.${month}.${year}`;
                        } else {
                            shipDate = String(rawShipDate).trim();
                            // Очищуємо "Очікувати X день при замовленні до XX:XX" → "X день"
                            if (shipDate.toLowerCase().startsWith('очікувати')) {
                                shipDate = shipDate
                                    .replace(/^очікувати\s*/i, '')
                                    .replace(/\s*при замовленні.*$/i, '')
                                    .trim();
                            }
                        }
                    }

                    // Якщо є артикул - автоматично встановлюємо status і check в TRUE
                    const hasArticle = article !== '';

                    const item = {
                        code: code,
                        article: article,
                        brand: row[COL.BRAND] ? String(row[COL.BRAND]).trim() : '',
                        category: row[COL.CATEGORY] ? String(row[COL.CATEGORY]).trim() : '',
                        name: row[COL.NAME] ? String(row[COL.NAME]).trim() : '',
                        packaging: row[COL.PACKAGING] ? String(row[COL.PACKAGING]).trim() : '',
                        flavor: row[COL.FLAVOR] ? String(row[COL.FLAVOR]).trim() : '',
                        shiping_date: shipDate,
                        reserve: '',      // Призначається користувачем
                        status: hasArticle ? 'TRUE' : 'FALSE',
                        status_date: '',
                        check: hasArticle ? 'TRUE' : 'FALSE',
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

