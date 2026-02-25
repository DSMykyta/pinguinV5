// js/banned-words/banned-words-product-modal.js
// Модальне вікно для перегляду повного тексту товару з підсвіченими забороненими словами

import { bannedWordsState, invalidateCheckCache } from './banned-words-init.js';
import { loadProductFullData, updateProductStatus } from './banned-words-data.js';
import { showModal, closeModal } from '../../components/ui-modal.js';
import { showToast } from '../../components/ui-toast.js';
import { createHighlightEditor } from '../../components/editor/editor-main.js';

// Поточні дані модалу
let currentProductData = null;

// Дані для всіх аркушів (для перемикання між табами)
// Структура: { sheetName: { productData, loaded } }
let allSheetsData = {};

// Поточний активний аркуш та колонка
let activeSheet = null;
let activeColumn = null;

// Всі доступні аркуші та колонки (передаються при відкритті модалу)
let availableSheets = [];
let availableColumns = [];

// Екземпляри редакторів, ключ — назва колонки
let editorInstances = {};

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
 * 4. Заповнити панелі текстом через editor.setValue() — підсвічування виконує editor-plugin-validation
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

        // Скинути стан
        allSheetsData = {};

        // Фільтруємо аркуші - тільки ті де цей товар має результати
        const productResults = bannedWordsState.checkResults?.filter(r => r.id === productId) || [];
        const sheetsWithResults = [...new Set(productResults.map(r => r.sheetName))].filter(s => s && s.trim());

        // Якщо є результати - використовуємо тільки аркуші з результатами, інакше поточний
        availableSheets = sheetsWithResults.length > 0 ? sheetsWithResults : [sheetName];

        // Колонки - фільтруємо пусті значення
        availableColumns = (allColumns.length > 0 ? allColumns : (Array.isArray(columnName) ? columnName : [columnName])).filter(c => c && c.trim());


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

        // 3. ДИНАМІЧНО створити піли колонок та панелі з редакторами
        setupFieldTabs(availableColumns);

        // 4. Завантажити повні дані товару для поточного аркуша
        const productData = await loadProductFullData(sheetName, rowIndex);
        currentProductData = productData;

        // Зберегти в кеш аркушів
        allSheetsData[sheetName] = { productData, loaded: true, rowIndex };


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
        return;
    }

    // Показати контейнер і створити таби
    sheetPillsContainer.classList.remove('u-hidden');


    availableSheets.forEach((sheet, index) => {
        // Пропустити пусті назви аркушів
        if (!sheet || !sheet.trim()) {
            console.warn(`⚠️ Пропускаємо пустий аркуш на позиції ${index}`);
            return;
        }

        const button = document.createElement('button');
        button.className = sheet === activeSheet ? 'chip c-main' : 'chip';
        button.dataset.sheet = sheet;
        button.textContent = sheet;

        sheetPillsContainer.appendChild(button);
    });
}

/**
 * Налаштувати таби полів — ДИНАМІЧНО створити піли та панелі з редакторами
 * @param {string|string[]} columnNames - Назва колонки або масив назв
 */
function setupFieldTabs(columnNames) {

    // Нормалізувати до масиву
    const columnsArray = Array.isArray(columnNames) ? columnNames : [columnNames];

    const pillsContainer = document.getElementById('product-text-field-pills');
    const contentContainer = document.querySelector('.product-text-content');

    if (!pillsContainer || !contentContainer) {
        console.error('❌ КРИТИЧНО: контейнери не знайдено!');
        return;
    }

    // Очистити існуючий контент та інстанси редакторів
    pillsContainer.innerHTML = '';
    contentContainer.innerHTML = '';
    editorInstances = {};

    // ДИНАМІЧНО створити піли та панелі для кожної колонки
    columnsArray.forEach((columnName, index) => {
        // Створити кнопку
        const button = document.createElement('button');
        button.className = 'btn-icon expand';
        button.dataset.field = columnName;
        if (index === 0) button.classList.add('active');

        button.innerHTML = `
            <span class="material-symbols-outlined">${getFieldIcon(columnName)}</span>
            <span class="btn-icon-label">${columnName}</span>
        `;

        pillsContainer.appendChild(button);

        // Створити панель з редактором
        const panel = document.createElement('div');
        panel.className = 'product-text-panel';
        panel.dataset.field = columnName;
        if (index === 0) panel.classList.add('active');

        panel.innerHTML = `<div editor check data-editor-id="bw-${columnName}" data-placeholder="Завантаження..."></div>`;

        contentContainer.appendChild(panel);

        // Ініціалізувати редактор (панель вже в DOM)
        const editorContainer = panel.querySelector('[editor]');
        editorInstances[columnName] = createHighlightEditor(editorContainer);
    });

}

/**
 * Відрендерити модал з даними товару
 * @param {Object} productData - Повні дані товару
 * @param {string|string[]} columnNames - Назва колонки або масив назв колонок що перевірялись
 */
function renderProductModal(productData, columnNames) {

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

    // Мапінг полів модалу до полів Google Sheets
    const fieldMapping = {
        'titleUkr': productData.titleUkr || productData.title_ukr || '',
        'titleRos': productData.titleRos || productData.title_ros || '',
        'descriptionUkr': productData.descriptionUkr || productData.description_ukr || '',
        'descriptionRos': productData.descriptionRos || productData.description_ros || '',
        'short_descriptionUkr': productData.short_descriptionUkr || productData.shortDescriptionUkr || '',
        'short_descriptionRos': productData.short_descriptionRos || productData.shortDescriptionRos || ''
    };

    // Передати текст в редактори — підсвічування виконає editor-plugin-validation
    columnsArray.forEach(field => {
        const text = fieldMapping[field] || productData[field] || '';
        const editor = editorInstances[field];

        if (!editor) {
            console.warn(`⚠️ Не знайдено редактор для поля: ${field}`);
            return;
        }

        editor.setValue(text);
    });
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
    badge.classList.remove('c-green', 'c-red');
    badge.classList.add(isChecked ? 'c-green' : 'c-red');

    const icon = badge.querySelector('.material-symbols-outlined');
    const label = badge.querySelector('span:not(.material-symbols-outlined)');

    if (icon) icon.textContent = isChecked ? 'check_circle' : 'cancel';

    if (label) {
        label.textContent = isChecked ? 'Так' : 'Ні';
    } else {
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
    const tableBadge = document.querySelector(`.badge[data-badge-id="${productId}"]`);
    if (tableBadge) {
        tableBadge.dataset.status = isChecked ? 'TRUE' : 'FALSE';
        setBadgeAppearance(tableBadge, isChecked);
    }
}

/**
 * Ініціалізувати обробники подій модалу
 */
function initModalHandlers() {
    // Перемикання табів колонок (використовуємо btn-icon expand)
    const columnButtons = document.querySelectorAll('#product-text-field-pills .btn-icon.expand');
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
        });
    });

    // Перемикання табів аркушів
    const sheetButtons = document.querySelectorAll('#product-sheet-pills .chip');
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
        return;
    }


    // Оновити активний таб
    const sheetButtons = document.querySelectorAll('#product-sheet-pills .chip');
    sheetButtons.forEach(btn => btn.classList.remove('c-main'));
    button.classList.add('c-main');

    // Оновити активний аркуш
    activeSheet = newSheet;

    // Оновити метадані
    document.getElementById('product-modal-sheet-name').value = newSheet;

    // Перевірити чи є кешовані дані для цього аркуша
    if (allSheetsData[newSheet]?.loaded) {
        currentProductData = allSheetsData[newSheet].productData;
        renderProductModal(currentProductData, availableColumns);
        return;
    }

    // Завантажити дані для нового аркуша
    try {
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

        const productData = await loadProductFullData(newSheet, rowIndex);
        currentProductData = productData;

        // Зберегти в кеш
        allSheetsData[newSheet] = { productData, loaded: true, rowIndex };

        // Відрендерити
        renderProductModal(productData, availableColumns);


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


    } catch (error) {
        console.error('❌ Помилка оновлення статусу:', error);
        showToast('Помилка при оновленні статусу', 'error');
    }
}

/**
 * Обробник кнопки "Копіювати текст"
 */
function handleCopyText() {
    const editor = editorInstances[activeColumn];
    if (!editor) {
        showToast('Немає тексту для копіювання', 'warning');
        return;
    }

    const textToCopy = editor.getPlainText();

    if (!textToCopy || !textToCopy.trim()) {
        showToast('Немає тексту для копіювання', 'warning');
        return;
    }

    // Копіювати в буфер обміну
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast('Опис товару скопійовано', 'success');
        })
        .catch(err => {
            console.error('❌ Помилка копіювання:', err);
            showToast('Помилка копіювання тексту', 'error');
        });
}
