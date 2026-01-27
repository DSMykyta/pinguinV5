// js/banned-words/banned-words-product-modal.js
// Модальне вікно для перегляду повного тексту товару з підсвіченими забороненими словами

import { bannedWordsState, invalidateCheckCache } from './banned-words-init.js';
import { loadProductFullData, updateProductStatus } from './banned-words-data.js';
import { showModal, closeModal } from '../common/ui-modal.js';
import { highlightText, checkTextForBannedWords } from '../utils/text-utils.js';
import { showToast } from '../common/ui-toast.js';

// Поточні дані модалу
let currentProductData = null;
// Статистика для кожного поля: { fieldName: { wordCountsMap, totalMatches } }
let fieldStats = {};

// Дані для всіх аркушів (для перемикання між табами)
// Структура: { sheetName: { productData, loaded } }
let allSheetsData = {};

// Поточний активний аркуш та колонка
let activeSheet = null;
let activeColumn = null;

// Всі доступні аркуші та колонки (передаються при відкритті модалу)
let availableSheets = [];
let availableColumns = [];

/**
 * Отримати іконку для поля на основі його назви
 */
function getFieldIcon(columnName) {
    if (columnName.startsWith('title')) return 'title';
    if (columnName.includes('description')) return 'description';
    return 'description'; // за замовчуванням
}

/**
 * Відкрити модальне вікно з повним текстом товару
 *
 * FLOW:
 * 1. Завантажити шаблон модалу (з порожніми контейнерами)
 * 2. ДИНАМІЧНО створити піли аркушів (якщо > 1) та піли колонок
 * 3. Завантажити повні дані товару з Google Sheets
 * 4. Заповнити панелі текстом з підсвічуванням ВСІХ заборонених слів
 * 5. Додати event listeners на динамічно створені піли
 *
 * @param {string} productId - ID товару
 * @param {string} sheetName - Назва аркуша (поточний)
 * @param {number} rowIndex - Індекс рядка в Google Sheets
 * @param {string|string[]} columnName - Назва колонки або масив назв
 * @param {string[]} allSheets - Всі обрані аркуші для перевірки
 * @param {string[]} allColumns - Всі обрані колонки для перевірки
 */
export async function showProductTextModal(productId, sheetName, rowIndex, columnName, allSheets = [], allColumns = []) {
    try {
        console.log(`📄 Відкриття модалу для товару: ${productId} (${sheetName}), колонка:`, columnName);
        console.log(`📊 Всі аркуші: ${allSheets.join(', ')}, всі колонки: ${allColumns.join(', ')}`);

        // Скинути стан
        allSheetsData = {};
        fieldStats = {};

        // Фільтруємо аркуші - тільки ті де цей товар має результати
        const productResults = bannedWordsState.checkResults?.filter(r => r.id === productId) || [];
        const sheetsWithResults = [...new Set(productResults.map(r => r.sheetName))].filter(s => s && s.trim());

        // Якщо є результати - використовуємо тільки аркуші з результатами, інакше поточний
        availableSheets = sheetsWithResults.length > 0 ? sheetsWithResults : [sheetName];

        // Колонки - фільтруємо пусті значення
        availableColumns = (allColumns.length > 0 ? allColumns : (Array.isArray(columnName) ? columnName : [columnName])).filter(c => c && c.trim());

        console.log(`📊 Аркуші з результатами для ${productId}:`, availableSheets);

        // Встановити активний аркуш та колонку
        activeSheet = sheetName;
        activeColumn = Array.isArray(columnName) ? columnName[0] : columnName;

        // 1. Відкрити модал з шаблону (порожні контейнери)
        await showModal('product-text-view');

        // Встановити метадані
        document.getElementById('product-modal-product-id').value = productId;
        document.getElementById('product-modal-sheet-name').value = sheetName;
        document.getElementById('product-modal-row-index').value = rowIndex;

        // Додати columnName в метадані (створимо hidden input якщо потрібно)
        let columnInput = document.getElementById('product-modal-column-name');
        if (!columnInput) {
            columnInput = document.createElement('input');
            columnInput.type = 'hidden';
            columnInput.id = 'product-modal-column-name';
            document.querySelector('.modal-body').appendChild(columnInput);
        }
        // Зберігаємо як JSON якщо масив, або просто строку
        columnInput.value = Array.isArray(columnName) ? JSON.stringify(columnName) : columnName;

        // 2. Налаштувати таби аркушів (якщо > 1 аркуша)
        setupSheetTabs();

        // 3. ДИНАМІЧНО створити піли колонок та панелі для перевірених колонок
        setupFieldTabs(availableColumns);

        // Показати loader
        showModalLoader();

        // 4. Завантажити повні дані товару для поточного аркуша
        const productData = await loadProductFullData(sheetName, rowIndex);
        currentProductData = productData;

        // Зберегти в кеш аркушів
        allSheetsData[sheetName] = { productData, loaded: true, rowIndex };

        console.log('✅ Дані товару завантажені:', productData);

        // 5. Відрендерити модал з даними
        renderProductModal(productData, availableColumns);

        // 6. Встановити статус badge на основі даних з checkResults
        updateModalBadge(productId);

        // 7. Ініціалізувати обробники для динамічних елементів
        initModalHandlers();

    } catch (error) {
        console.error('❌ Помилка відкриття модалу:', error);
        showToast('Помилка завантаження даних товару', 'error');
        closeModal();
    }
}

/**
 * Налаштувати таби аркушів - показати якщо обрано > 1 аркуша
 */
function setupSheetTabs() {
    const sheetPillsContainer = document.getElementById('product-sheet-pills');
    if (!sheetPillsContainer) {
        console.warn('⚠️ Контейнер табів аркушів не знайдено');
        return;
    }

    // Очистити контейнер
    sheetPillsContainer.innerHTML = '';

    // Якщо тільки 1 аркуш - приховати контейнер
    if (availableSheets.length <= 1) {
        sheetPillsContainer.classList.add('u-hidden');
        console.log('📊 Тільки 1 аркуш - таби аркушів приховано');
        return;
    }

    // Показати контейнер і створити таби
    sheetPillsContainer.classList.remove('u-hidden');

    console.log(`📊 Створюємо ${availableSheets.length} табів аркушів`);

    availableSheets.forEach((sheet, index) => {
        // Пропустити пусті назви аркушів
        if (!sheet || !sheet.trim()) {
            console.warn(`⚠️ Пропускаємо пустий аркуш на позиції ${index}`);
            return;
        }

        const button = document.createElement('button');
        button.className = 'filter-pill';
        button.dataset.sheet = sheet;
        button.textContent = sheet;

        // Активний таб - поточний аркуш
        if (sheet === activeSheet) {
            button.classList.add('active');
        }

        sheetPillsContainer.appendChild(button);
        console.log(`✅ Створено таб аркуша: ${sheet}`);
    });
}

/**
 * Налаштувати таби полів - ДИНАМІЧНО створити піли та панелі для перевірених колонок
 * @param {string|string[]} columnNames - Назва колонки або масив назв (для майбутніх комплексних перевірок)
 */
function setupFieldTabs(columnNames) {
    console.log('🎯 setupFieldTabs викликано з:', columnNames);

    // Нормалізувати до масиву (для сумісності з майбутніми комплексними перевірками)
    const columnsArray = Array.isArray(columnNames) ? columnNames : [columnNames];

    const pillsContainer = document.getElementById('product-text-field-pills');
    const contentContainer = document.querySelector('.product-text-content');

    if (!pillsContainer || !contentContainer) {
        console.error('❌ КРИТИЧНО: контейнери не знайдено!');
        return;
    }

    // ОЧИСТИТИ існуючий контент
    pillsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    console.log(`📊 Створюємо ${columnsArray.length} піл(ів) динамічно`);

    // ДИНАМІЧНО створити піли та панелі для кожної колонки
    columnsArray.forEach((columnName, index) => {
        // Створити кнопку
        const button = document.createElement('button');
        button.className = 'nav-icon';
        button.dataset.field = columnName;
        if (index === 0) button.classList.add('active');

        // Використовуємо технічну назву колонки безпосередньо
        button.innerHTML = `
            <span class="material-symbols-outlined">${getFieldIcon(columnName)}</span>
            <span class="nav-icon-label">${columnName}</span>
        `;

        pillsContainer.appendChild(button);

        // Створити панель
        const panel = document.createElement('div');
        panel.className = 'product-text-panel';
        panel.dataset.field = columnName;
        if (index === 0) panel.classList.add('active');

        panel.innerHTML = `
            <div class="text-viewer" id="text-viewer-${columnName}">
                <p class="text-muted">Завантаження...</p>
            </div>
        `;

        contentContainer.appendChild(panel);

        console.log(`✅ Створено піл і панель для: ${columnName}`);
    });

    console.log(`✅ Створено ${columnsArray.length} піл(ів): ${columnsArray.join(', ')}`);
}

/**
 * Показати loader в модалі
 */
function showModalLoader() {
    // Панелі вже створені з текстом "Завантаження..." в setupFieldTabs()
    // Ця функція залишена для сумісності
    const viewers = document.querySelectorAll('.text-viewer');
    if (viewers.length > 0) {
        console.log(`📊 Loader вже показаний для ${viewers.length} панелей`);
    }
}

/**
 * Відрендерити модал з даними товару
 * @param {Object} productData - Повні дані товару
 * @param {string|string[]} columnNames - Назва колонки або масив назв колонок що перевірялись
 */
function renderProductModal(productData, columnNames) {
    console.log('🎨 Рендеримо модал з даними:', productData);

    // Нормалізувати до масиву
    const columnsArray = Array.isArray(columnNames) ? columnNames : [columnNames];

    // Встановити заголовок (використовуємо titleRos або titleUkr, що є в наявності)
    const titleElement = document.getElementById('product-modal-title');
    const idElement = document.getElementById('product-modal-id');

    if (!titleElement || !idElement) {
        console.error('❌ Не знайдено елементи заголовку модалу!');
        return;
    }

    // Знайти заголовок в даних (може бути під різними назвами колонок)
    const displayTitle = productData.titleRos || productData.titleUkr ||
                         productData.title || productData.Title ||
                         productData.name || productData.Name || 'Товар';
    titleElement.textContent = displayTitle;

    // Отримати ID з productData або з метаданих модалу
    const displayId = productData.id || productData.ID || productData.Id ||
                      document.getElementById('product-modal-product-id')?.value || 'undefined';
    // Оновлюємо тільки <strong> всередині idElement
    const idStrong = idElement.querySelector('strong');
    if (idStrong) {
        idStrong.textContent = displayId;
    } else {
        idElement.innerHTML = `ID: <strong>${displayId}</strong>`;
    }

    // Отримати ВСІ заборонені слова (обидві мови) для підсвічування
    const allBannedWordsRaw = bannedWordsState.bannedWords.flatMap(w =>
        [...w.name_uk_array, ...w.name_ru_array]
    );

    // ДЕДУПЛІКАЦІЯ: одне слово може бути в кількох рядках таблиці banned, але рахуємо як одне
    const allBannedWords = [...new Set(allBannedWordsRaw.map(w => w.toLowerCase()))];

    console.log(`🔍 Пошук серед ${allBannedWords.length} унікальних заборонених слів (було ${allBannedWordsRaw.length})`);


    // Мапінг полів модалу до полів Google Sheets
    const fieldMapping = {
        'titleUkr': productData.titleUkr || productData.title_ukr || '',
        'titleRos': productData.titleRos || productData.title_ros || '',
        'descriptionUkr': productData.descriptionUkr || productData.description_ukr || '',
        'descriptionRos': productData.descriptionRos || productData.description_ros || '',
        'short_descriptionUkr': productData.short_descriptionUkr || productData.shortDescriptionUkr || '',
        'short_descriptionRos': productData.short_descriptionRos || productData.shortDescriptionRos || ''
    };

    console.log('📦 Доступні дані товару:', Object.keys(productData));
    console.log('📋 Field mapping:', fieldMapping);

    // Очистити попередню статистику
    fieldStats = {};

    // Рендеримо ТІЛЬКИ ті поля що в columnsArray
    columnsArray.forEach(field => {
        // Спробувати знайти текст: спочатку в mapping, потім напряму в productData
        const text = fieldMapping[field] || productData[field] || '';
        const viewer = document.getElementById(`text-viewer-${field}`);

        if (!viewer) {
            console.warn(`⚠️ Не знайдено viewer для поля: ${field}`);
            return;
        }

        if (!text || !text.trim()) {
            viewer.innerHTML = '<p class="text-muted">Немає даних</p>';
            fieldStats[field] = { wordCountsMap: new Map(), totalMatches: 0 };
            return;
        }

        // Перевірити текст на ВСІ заборонені слова
        const foundWords = checkTextForBannedWords(text, allBannedWords);

        // Статистика для цього конкретного поля
        let wordCountsMap = new Map();
        let totalMatches = 0;

        if (foundWords.length > 0) {
            // Є заборонені слова - підсвітити їх ВСІ
            const wordsToHighlight = foundWords.map(f => f.word);
            const highlightedText = highlightText(text, wordsToHighlight, 'highlight-banned-word');

            viewer.innerHTML = highlightedText;

            // Підрахувати статистику для ЦЬОГО поля
            foundWords.forEach(f => {
                const wordKey = f.word.toLowerCase();
                const currentCount = wordCountsMap.get(wordKey) || 0;
                wordCountsMap.set(wordKey, currentCount + f.count);
                totalMatches += f.count;
            });

            console.log(`🔴 Поле ${field}: знайдено ${foundWords.length} слів, ${totalMatches} входжень`);
        } else {
            // Немає заборонених слів - просто показати текст
            viewer.textContent = text;
            console.log(`✅ Поле ${field}: заборонених слів не знайдено`);
        }

        // Зберегти статистику для цього поля
        fieldStats[field] = { wordCountsMap, totalMatches };
    });

    // Показати статистику для ПЕРШОГО (активного) поля
    const firstField = columnsArray[0];
    updateModalStats(firstField);

    // Ініціалізувати tooltip для підсвічених слів
    initBannedWordTooltips();
}

/**
 * Оновити статистику модалу для конкретного поля
 * @param {string} fieldName - Назва поля
 */
function updateModalStats(fieldName) {
    const stats = fieldStats[fieldName];

    if (!stats) {
        console.warn(`⚠️ Немає статистики для поля: ${fieldName}`);
        return;
    }

    const { wordCountsMap, totalMatches } = stats;
    const totalBannedWords = wordCountsMap.size;

    console.log(`📊 Статистика для ${fieldName}: ${totalBannedWords} слів, ${totalMatches} входжень`);

    // Оновити статистику
    const bannedCountEl = document.getElementById('product-modal-banned-count');
    const matchCountEl = document.getElementById('product-modal-match-count');

    if (bannedCountEl) bannedCountEl.textContent = totalBannedWords;
    if (matchCountEl) matchCountEl.textContent = totalMatches;

    // Створити chip'и для заборонених слів з кількістю входжень
    const chipsContainer = document.getElementById('product-modal-banned-chips');
    if (chipsContainer) {
        chipsContainer.innerHTML = '';
        if (wordCountsMap.size > 0) {
            // Сортуємо за алфавітом для консистентності
            const sortedWords = Array.from(wordCountsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            sortedWords.forEach(([word, count]) => {
                const chip = document.createElement('span');
                chip.className = 'chip chip-error';
                chip.textContent = `${word} (${count})`;

                // Додати tooltip обробники для кожного чіпа
                chip.addEventListener('mouseenter', (e) => {
                    const wordInfo = findBannedWordInfo(word);
                    if (wordInfo) {
                        showBannedWordTooltip(e.target, wordInfo);
                    }
                });
                chip.addEventListener('mouseleave', () => {
                    hideBannedWordTooltip();
                });

                chipsContainer.appendChild(chip);
            });
        }
    }
}

/**
 * Оновити badge статусу в модалі на основі даних з checkResults
 * @param {string} productId - ID товару
 */
function updateModalBadge(productId) {
    const badge = document.getElementById('product-modal-status-badge');
    if (!badge) return;

    // Знайти результат перевірки для цього товару
    const result = bannedWordsState.checkResults?.find(r => r.id === productId);
    const isChecked = result?.cheaked_line === 'TRUE' || result?.cheaked_line === true;

    // Встановити data-атрибути
    badge.dataset.badgeId = productId;
    badge.dataset.status = isChecked ? 'TRUE' : 'FALSE';

    // Оновити вигляд badge
    setBadgeAppearance(badge, isChecked);
}

/**
 * Встановити вигляд badge
 * @param {HTMLElement} badge - Badge елемент
 * @param {boolean} isChecked - Чи перевірено
 */
function setBadgeAppearance(badge, isChecked) {
    badge.classList.remove('badge-success', 'badge-neutral');
    badge.classList.add(isChecked ? 'badge-success' : 'badge-neutral');

    const icon = badge.querySelector('.material-symbols-outlined');
    const label = badge.querySelector('.badge-label');

    if (icon) icon.textContent = isChecked ? 'check_circle' : 'cancel';

    // Підтримка обох структур: з .badge-label або без
    if (label) {
        label.textContent = isChecked ? 'Так' : 'Ні';
    } else {
        // Таблична структура - текст йде напряму після іконки
        const textNode = Array.from(badge.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) {
            textNode.textContent = isChecked ? ' Так' : ' Ні';
        }
    }
}

/**
 * Синхронізувати badge в таблиці з badge в модалі
 * @param {string} productId - ID товару
 * @param {boolean} isChecked - Новий статус
 */
function syncTableBadge(productId, isChecked) {
    // Знайти badge в таблиці по data-badge-id
    const tableBadge = document.querySelector(`.badge.clickable[data-badge-id="${productId}"]`);
    if (tableBadge) {
        tableBadge.dataset.status = isChecked ? 'TRUE' : 'FALSE';
        setBadgeAppearance(tableBadge, isChecked);
        console.log(`✅ Badge в таблиці синхронізовано для ${productId}`);
    }
}

/**
 * Ініціалізувати обробники подій модалу
 */
function initModalHandlers() {
    // Перемикання табів колонок (використовуємо nav-icon)
    const columnButtons = document.querySelectorAll('#product-text-field-pills .nav-icon');
    const panels = document.querySelectorAll('.product-text-panel');

    columnButtons.forEach(button => {
        button.addEventListener('click', () => {
            const field = button.dataset.field;

            // Зберегти активну колонку
            activeColumn = field;

            // Оновити активний таб
            columnButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Показати відповідну панель
            panels.forEach(p => p.classList.remove('active'));
            const activePanelEl = document.querySelector(`.product-text-panel[data-field="${field}"]`);
            if (activePanelEl) activePanelEl.classList.add('active');

            // Оновити статистику для цього поля
            updateModalStats(field);
        });
    });

    // Перемикання табів аркушів
    const sheetButtons = document.querySelectorAll('#product-sheet-pills .filter-pill');
    sheetButtons.forEach(button => {
        button.addEventListener('click', () => handleSheetTabClick(button));
    });

    // Badge статусу - клік для зміни
    const statusBadge = document.getElementById('product-modal-status-badge');
    if (statusBadge) {
        statusBadge.addEventListener('click', handleModalBadgeClick);
    }

    // Кнопка "Копіювати текст"
    const copyBtn = document.getElementById('product-modal-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', handleCopyText);
    }
}

/**
 * Обробник кліку на таб аркуша
 * Завантажує дані з іншого аркуша якщо потрібно
 * @param {HTMLElement} button - Кнопка табу
 */
async function handleSheetTabClick(button) {
    const newSheet = button.dataset.sheet;

    // Перевірити чи назва аркуша валідна
    if (!newSheet || !newSheet.trim()) {
        console.error('❌ Назва аркуша пуста або невалідна');
        return;
    }

    if (newSheet === activeSheet) {
        console.log(`📊 Аркуш "${newSheet}" вже активний`);
        return;
    }

    console.log(`🔄 Перемикання на аркуш: ${newSheet}`);

    // Оновити активний таб
    const sheetButtons = document.querySelectorAll('#product-sheet-pills .filter-pill');
    sheetButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Оновити активний аркуш
    activeSheet = newSheet;

    // Оновити метадані
    document.getElementById('product-modal-sheet-name').value = newSheet;

    // Перевірити чи є кешовані дані для цього аркуша
    if (allSheetsData[newSheet]?.loaded) {
        console.log(`📦 Використовуємо кешовані дані для аркуша "${newSheet}"`);
        currentProductData = allSheetsData[newSheet].productData;
        renderProductModal(currentProductData, availableColumns);
        return;
    }

    // Завантажити дані для нового аркуша
    try {
        // Показати loader
        showModalLoader();

        // Потрібно знайти rowIndex для цього товару в новому аркуші
        // Використовуємо productId для пошуку
        const productId = document.getElementById('product-modal-product-id').value;

        // Знайти результат для цього товару в цьому аркуші
        const result = bannedWordsState.checkResults?.find(
            r => r.id === productId && r.sheetName === newSheet
        );

        if (!result) {
            console.warn(`⚠️ Результат для товару ${productId} в аркуші ${newSheet} не знайдено`);
            showToast(`Дані для аркуша "${newSheet}" не знайдено`, 'warning');
            return;
        }

        const rowIndex = parseInt(result._rowIndex);
        console.log(`📥 Завантаження даних з аркуша "${newSheet}", рядок ${rowIndex}`);

        const productData = await loadProductFullData(newSheet, rowIndex);
        currentProductData = productData;

        // Зберегти в кеш
        allSheetsData[newSheet] = { productData, loaded: true, rowIndex };

        // Відрендерити
        renderProductModal(productData, availableColumns);

        console.log(`✅ Дані для аркуша "${newSheet}" завантажені`);

    } catch (error) {
        console.error(`❌ Помилка завантаження даних аркуша "${newSheet}":`, error);
        showToast(`Помилка завантаження даних з аркуша "${newSheet}"`, 'error');
    }
}

/**
 * Обробник кліку на badge статусу в модалі
 * Перемикає статус і синхронізує з таблицею
 */
async function handleModalBadgeClick() {
    const badge = document.getElementById('product-modal-status-badge');
    if (!badge) return;

    const productId = badge.dataset.badgeId;
    const currentStatus = badge.dataset.status;
    const newStatus = currentStatus === 'TRUE' ? 'FALSE' : 'TRUE';
    const isChecked = newStatus === 'TRUE';

    const sheetName = document.getElementById('product-modal-sheet-name').value;
    const columnNameRaw = document.getElementById('product-modal-column-name').value;

    if (!productId || !sheetName || !columnNameRaw) {
        console.error('❌ Відсутні метадані товару');
        return;
    }

    try {
        // Розпарсити columnName (може бути JSON масив або строка)
        let columnsArray;
        try {
            columnsArray = JSON.parse(columnNameRaw);
            if (!Array.isArray(columnsArray)) {
                columnsArray = [columnsArray];
            }
        } catch {
            columnsArray = [columnNameRaw];
        }

        console.log(`🔄 Зміна статусу для ${productId}: ${currentStatus} → ${newStatus}`);

        // Оновити статус в Google Sheets для всіх перевірених колонок
        for (const columnName of columnsArray) {
            await updateProductStatus(sheetName, productId, columnName, newStatus);
        }

        // Інвалідувати кеш - використовуємо ті самі ключі що і при створенні кешу
        const selectedSheets = bannedWordsState.selectedSheets || [bannedWordsState.selectedSheet];
        const selectedColumns = bannedWordsState.selectedColumns || [bannedWordsState.selectedColumn];
        const sheetsKey = [...selectedSheets].sort().join('-');
        const columnsKey = [...selectedColumns].sort().join('-');
        invalidateCheckCache(sheetsKey, bannedWordsState.selectedWord, columnsKey);

        // Оновити локальний стейт
        const result = bannedWordsState.checkResults?.find(r => r.id === productId);
        if (result) {
            result.cheaked_line = newStatus;
        }

        // Оновити badge в модалі
        badge.dataset.status = newStatus;
        setBadgeAppearance(badge, isChecked);

        // Синхронізувати badge в таблиці
        syncTableBadge(productId, isChecked);

        const statusText = isChecked ? 'перевіреним' : 'неперевіреним';
        showToast(`Товар позначено як ${statusText}`, 'success');

        console.log('✅ Статус оновлено');

    } catch (error) {
        console.error('❌ Помилка оновлення статусу:', error);
        showToast('Помилка при оновленні статусу', 'error');
    }
}

/**
 * Обробник кнопки "Копіювати текст"
 */
function handleCopyText() {
    // Знайти активну панель
    const activePanel = document.querySelector('.product-text-panel.active');
    if (!activePanel) {
        console.warn('⚠️ Немає активної панелі для копіювання');
        showToast('Немає тексту для копіювання', 'warning');
        return;
    }

    // Отримати текст з text-viewer (без HTML тегів)
    const viewer = activePanel.querySelector('.text-viewer');
    if (!viewer) {
        console.warn('⚠️ Не знайдено text-viewer');
        return;
    }

    const textToCopy = viewer.textContent || viewer.innerText;

    if (!textToCopy || !textToCopy.trim()) {
        showToast('Немає тексту для копіювання', 'warning');
        return;
    }

    // Копіювати в буфер обміну
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('✅ Текст скопійовано в буфер обміну');
            showToast('Текст скопійовано', 'success');
        })
        .catch(err => {
            console.error('❌ Помилка копіювання:', err);
            showToast('Помилка копіювання тексту', 'error');
        });
}

// ============================================
// ІНТЕРАКТИВНІ TOOLTIP ДЛЯ ЗАБОРОНЕНИХ СЛІВ
// ============================================

// Глобальний tooltip елемент
let tooltipElement = null;

/**
 * Створити або отримати tooltip елемент
 */
function getTooltipElement() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'banned-word-tooltip';
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

/**
 * Знайти інформацію про заборонене слово за його текстом
 * @param {string} wordText - Текст забороненого слова
 * @returns {Object|null} - Об'єкт з інформацією про слово або null
 */
function findBannedWordInfo(wordText) {
    if (!wordText || !bannedWordsState.bannedWords) return null;

    const searchWord = wordText.toLowerCase().trim();

    // Шукаємо слово в усіх записах bannedWords
    for (const bannedWord of bannedWordsState.bannedWords) {
        // Перевірити в українських словах
        if (bannedWord.name_uk_array?.some(w => w === searchWord)) {
            return bannedWord;
        }
        // Перевірити в російських словах
        if (bannedWord.name_ru_array?.some(w => w === searchWord)) {
            return bannedWord;
        }
    }

    return null;
}

/**
 * Обмежити текст до максимальної кількості слів
 * @param {string} text - Оригінальний текст
 * @param {number} maxWords - Максимальна кількість слів
 * @returns {string} Обрізаний текст з "..." якщо було обрізано
 */
function limitWords(text, maxWords = 15) {
    if (!text) return '';
    const words = text.split(/[,\s]+/).filter(Boolean);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(', ') + '...';
}

/**
 * Показати tooltip для забороненого слова
 * @param {HTMLElement} targetElement - Елемент над яким показати tooltip
 * @param {Object} wordInfo - Інформація про заборонене слово
 */
function showBannedWordTooltip(targetElement, wordInfo) {
    const tooltip = getTooltipElement();

    // Сформувати контент tooltip (назва + пояснення + рекомендація)
    let content = '';

    // Назва групи
    if (wordInfo.group_name_ua) {
        content += `<div class="tooltip-title">${wordInfo.group_name_ua}</div>`;
    }

    // Пояснення
    if (wordInfo.banned_explaine && wordInfo.banned_explaine.trim()) {
        content += `<div class="tooltip-description">${wordInfo.banned_explaine}</div>`;
    }

    // Рекомендація (banned_hint)
    if (wordInfo.banned_hint && wordInfo.banned_hint.trim()) {
        content += `<div class="tooltip-hint"><strong>Рекомендація:</strong> ${wordInfo.banned_hint}</div>`;
    }

    tooltip.innerHTML = content;

    // Позиціонувати tooltip з перевіркою меж екрану
    const rect = targetElement.getBoundingClientRect();

    // Спочатку показати щоб отримати реальні розміри
    tooltip.style.visibility = 'hidden';
    tooltip.style.opacity = '0';
    tooltip.style.display = 'block';

    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Перевірити чи tooltip не виходить за межі екрану (знизу)
    if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
    }

    // Перевірити чи tooltip не виходить за межі екрану (справа)
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
    }

    // Не дозволити від'ємний left
    if (left < 10) {
        left = 10;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = '';
    tooltip.style.display = '';
    tooltip.style.opacity = '';
    tooltip.classList.add('visible');
}

/**
 * Приховати tooltip
 */
function hideBannedWordTooltip() {
    const tooltip = getTooltipElement();
    tooltip.classList.remove('visible');
}

/**
 * Ініціалізувати tooltip обробники для підсвічених слів та чіпів
 */
function initBannedWordTooltips() {
    // Обробники для highlight-banned-word елементів
    const highlightedWords = document.querySelectorAll('.text-viewer .highlight-banned-word');
    highlightedWords.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            const wordText = e.target.textContent;
            const wordInfo = findBannedWordInfo(wordText);
            if (wordInfo) {
                showBannedWordTooltip(e.target, wordInfo);
            }
        });

        element.addEventListener('mouseleave', () => {
            hideBannedWordTooltip();
        });
    });

    // Обробники для chip-error елементів (статистика)
    const chipErrors = document.querySelectorAll('#product-modal-banned-chips .chip-error');
    chipErrors.forEach(element => {
        element.addEventListener('mouseenter', (e) => {
            // Витягти слово з тексту чіпа (формат: "слово (N)")
            const chipText = e.target.textContent;
            const wordText = chipText.replace(/\s*\(\d+\)\s*$/, '').trim();
            const wordInfo = findBannedWordInfo(wordText);
            if (wordInfo) {
                showBannedWordTooltip(e.target, wordInfo);
            }
        });

        element.addEventListener('mouseleave', () => {
            hideBannedWordTooltip();
        });
    });

    console.log(`✅ Tooltip ініціалізовано для ${highlightedWords.length} слів та ${chipErrors.length} чіпів`);
}